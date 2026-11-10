import type { Prisma } from "@prisma/client";
import { requireCmsSession } from "@/handlers/auth";
import { cmsJson, withCmsRequest } from "@/handlers/http";
import { prisma } from "@/lib/prisma";
import { activeBlacklistWhere } from "@/lib/submissionProtection";
import { serializeBlacklist } from "@/lib/blacklistSerialization";
import { pruneBlacklistEvents } from "@/lib/blacklistRetention";
import { permissions } from "@/services/permission";
import { blacklistListSchema } from "@/services/schemas";
import type { PaginatedResponse } from "@/services/shared/pagination";
import type { CmsBlacklistRecord } from "@/services/cms/blacklist/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Login required - Permission: blacklist.show
export async function GET(request: Request) {
  return withCmsRequest(request, async () => {
    await requireCmsSession(request.headers, permissions.BLACKLIST_SHOW);
    const params = await blacklistListSchema.validate(Object.fromEntries(new URL(request.url).searchParams), {
      abortEarly: false,
      stripUnknown: true
    });
    const now = new Date();
    await pruneBlacklistEvents(now);
    const state: Prisma.SubmissionBlacklistWhereInput = params.status === "active" ? activeBlacklistWhere(params.scope, now) : params.status === "expired" ? {
      scope: "network",
      expiresAt: {
        lte: now
      },
      OR: [{
        isActive: true
      }, {
        endReason: "expired"
      }]
    } : params.status === "revoked" ? {
      scope: params.scope,
      isActive: false,
      endReason: "revoked"
    } : {
      scope: params.scope === "network" ? {
        in: ["network", "legacy"]
      } : "browser"
    };
    const where: Prisma.SubmissionBlacklistWhereInput = {
      AND: [state, ...(params.search ? [{
        OR: [{
          ip: {
            contains: params.search,
            mode: "insensitive" as const
          }
        }, {
          events: {
            some: {
              ip: {
                contains: params.search,
                mode: "insensitive" as const
              }
            }
          }
        }]
      }] : [])]
    };
    const result = await prisma.$transaction(async tx => {
      const total = await tx.submissionBlacklist.count({
        where
      });
      const totalPages = Math.max(1, Math.ceil(total / params.pageSize));
      const page = Math.min(params.page, totalPages);
      const records = await tx.submissionBlacklist.findMany({
        where,
        orderBy: [{
          createdAt: "desc"
        }, {
          id: "desc"
        }],
        skip: (page - 1) * params.pageSize,
        take: params.pageSize,
        include: {
          events: {
            orderBy: [{
              createdAt: "desc"
            }, {
              id: "desc"
            }],
            take: 1
          }
        }
      });
      return {
        items: records.map(record => serializeBlacklist(record, now)),
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
    return cmsJson(result satisfies PaginatedResponse<CmsBlacklistRecord>);
  });
}
