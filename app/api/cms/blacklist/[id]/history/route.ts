import { requireCmsSession } from "@/handlers/auth";
import { cmsJson, CmsHttpError, withCmsRequest } from "@/handlers/http";
import { serializeBlacklistEvent } from "@/lib/blacklistSerialization";
import { pruneBlacklistEvents } from "@/lib/blacklistRetention";
import { prisma } from "@/lib/prisma";
import { permissions } from "@/services/permission";
import { listSchema } from "@/services/schemas";
import type { PaginatedResponse } from "@/services/shared/pagination";
import type { CmsBlacklistEvent } from "@/services/cms/blacklist/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Login required - Permission: blacklist.show
export async function GET(request: Request, context: RouteContext<"/api/cms/blacklist/[id]/history">) {
  return withCmsRequest(request, async () => {
    await requireCmsSession(request.headers, permissions.BLACKLIST_SHOW);
    const {
      id
    } = await context.params;
    const params = await listSchema.validate(Object.fromEntries(new URL(request.url).searchParams), {
      abortEarly: false,
      stripUnknown: true
    });
    await pruneBlacklistEvents();
    const result = await prisma.$transaction(async tx => {
      if (!(await tx.submissionBlacklist.findUnique({
        where: {
          id
        },
        select: {
          id: true
        }
      }))) throw new CmsHttpError(404, "errors.notFound");
      const where = {
        blacklistId: id
      };
      const total = await tx.blacklistEvent.count({
        where
      });
      const totalPages = Math.max(1, Math.ceil(total / params.pageSize));
      const page = Math.min(params.page, totalPages);
      const records = await tx.blacklistEvent.findMany({
        where,
        orderBy: [{
          createdAt: "desc"
        }, {
          id: "desc"
        }],
        skip: (page - 1) * params.pageSize,
        take: params.pageSize
      });
      const now = new Date();
      const items = records.map(event => serializeBlacklistEvent(event, now));
      return {
        items,
        metadata: {
          page,
          pageSize: params.pageSize,
          total,
          totalPages
        }
      };
    }, {
      isolationLevel: "RepeatableRead"
    });
    return cmsJson(result satisfies PaginatedResponse<CmsBlacklistEvent>);
  });
}
