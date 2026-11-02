import "server-only";

import { prisma } from "@/lib/prisma";
import type { PaginatedResponse } from "@/services/shared/pagination";
import type { CmsRoleRecord } from "@/services/cms/roles/types";
import { permissions } from "@/services/permission";
import { deleteSchema, listSchema, roleSchema } from "@/services/schemas";
import { requireCmsSession } from "@/handlers/auth";
import { cmsJson, CmsHttpError, parseBody } from "@/handlers/http";

export async function handleRoles(request: Request, parts: string[]) {
  const method = request.method;
  const id = parts[0];
  if (method === "GET") {
    await requireCmsSession(request.headers, permissions.ROLE_SHOW);
    if (id) {
      const role = await prisma.cmsRole.findUnique({ where: { id } });
      if (!role) throw new CmsHttpError(404, "errors.notFound");
      return cmsJson(role);
    }
    const params = await listSchema.validate(
      Object.fromEntries(new URL(request.url).searchParams),
      { abortEarly: false, stripUnknown: true },
    );
    const where = params.search
      ? { name: { contains: params.search, mode: "insensitive" as const } }
      : {};
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
          items,
          metadata: { page, pageSize: params.pageSize, total, totalPages },
        };
      },
      { isolationLevel: "RepeatableRead" },
    );
    return cmsJson(result satisfies PaginatedResponse<CmsRoleRecord>);
  }

  if (method === "POST" && id === "bulk-delete") {
    await requireCmsSession(request.headers, permissions.ROLE_DELETE);
    const { ids: input } = await parseBody(request, deleteSchema);
    const ids = [...new Set(input)];
    await prisma.$transaction(
      async (tx) => {
        const count = await tx.cmsRole.count({
          where: { id: { in: ids }, isSystem: false },
        });
        if (count !== ids.length)
          throw new CmsHttpError(409, "errors.protectedRole");
        if (await tx.cmsUserRole.count({ where: { roleId: { in: ids } } }))
          throw new CmsHttpError(409, "errors.roleInUse");
        await tx.cmsRole.deleteMany({
          where: { id: { in: ids }, isSystem: false },
        });
      },
      { isolationLevel: "Serializable" },
    );
    return cmsJson({ ok: true });
  }

  if (method === "POST" && !id) {
    await requireCmsSession(request.headers, permissions.ROLE_CREATE);
    const data = await parseBody(request, roleSchema);
    return cmsJson(
      await prisma.cmsRole.create({
        data: { ...data, permissions: [...new Set(data.permissions)] },
      }),
      201,
    );
  }

  if (method === "PATCH" && id && parts.length === 1) {
    await requireCmsSession(request.headers, permissions.ROLE_UPDATE);
    const data = await parseBody(request, roleSchema);
    return cmsJson(
      await prisma.$transaction(
        async (tx) => {
          const existing = await tx.cmsRole.findUnique({ where: { id } });
          if (!existing) throw new CmsHttpError(404, "errors.notFound");
          if (existing.isSystem)
            throw new CmsHttpError(409, "errors.protectedRole");
          return tx.cmsRole.update({
            where: { id },
            data: { ...data, permissions: [...new Set(data.permissions)] },
          });
        },
        { isolationLevel: "Serializable" },
      ),
    );
  }
  throw new CmsHttpError(404, "errors.notFound");
}
