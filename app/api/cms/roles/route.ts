import { prisma } from "@/lib/prisma";
import type { Prisma } from "@prisma/client";
import { requireCmsSession } from "@/handlers/auth";
import { cmsJson, parseBody, withCmsRequest } from "@/handlers/http";
import { permissions } from "@/services/permission";
import { listSchema, roleSchema } from "@/services/schemas";
import type { PaginatedResponse } from "@/services/shared/pagination";
import type { CmsRoleRecord } from "@/services/cms/roles/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Login required - Permission: role.show
export async function GET(request: Request) {
  return withCmsRequest(request, async () => {
    await requireCmsSession(request.headers, permissions.ROLE_SHOW);
    const params = await listSchema.validate(
      Object.fromEntries(new URL(request.url).searchParams),
      { abortEarly: false, stripUnknown: true },
    );
    const where: Prisma.CmsRoleWhereInput = {
      isSystem: false,
      ...(params.search
        ? { name: { contains: params.search, mode: "insensitive" } }
        : {}),
    };
    const result = await prisma.$transaction(
      async (tx) => {
        const total = await tx.cmsRole.count({ where });
        const totalPages = Math.max(1, Math.ceil(total / params.pageSize));
        const page = Math.min(params.page, totalPages);
        const items = await tx.cmsRole.findMany({
          where,
          orderBy: [{ createdAt: "desc" }, { id: "desc" }],
          skip: (page - 1) * params.pageSize,
          take: params.pageSize,
        });
        return {
          items: items.map((role) => ({
            ...role,
            createdAt: role.createdAt.toISOString(),
            updatedAt: role.updatedAt.toISOString(),
          })),
          metadata: { page, pageSize: params.pageSize, total, totalPages },
        };
      },
      { isolationLevel: "RepeatableRead" },
    );
    return cmsJson(result satisfies PaginatedResponse<CmsRoleRecord>);
  });
}

// Login required - Permission: role.create
export async function POST(request: Request) {
  return withCmsRequest(request, async () => {
    const actor = await requireCmsSession(request.headers, permissions.ROLE_CREATE);
    const data = await parseBody(request, roleSchema);
    return cmsJson(
      await prisma.cmsRole.create({
        data: { ...data, updatedBy: actor.name, permissions: [...new Set(data.permissions)] },
      }),
      201,
    );
  });
}
