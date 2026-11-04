import { prisma } from "@/lib/prisma";
import { requireCmsSession } from "@/handlers/auth";
import { cmsJson, CmsHttpError, parseBody, withCmsRequest } from "@/handlers/http";
import { permissions } from "@/services/permission";
import { roleSchema } from "@/services/schemas";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Login required - Permission: role.show
export async function GET(
  request: Request,
  context: RouteContext<"/api/cms/roles/[id]">,
) {
  return withCmsRequest(request, async () => {
    const { id } = await context.params;
    await requireCmsSession(request.headers, permissions.ROLE_SHOW);
    const role = await prisma.cmsRole.findUnique({ where: { id } });
    if (!role) throw new CmsHttpError(404, "errors.notFound");
    return cmsJson(role);
  });
}

// Login required - Permission: role.update
export async function PATCH(
  request: Request,
  context: RouteContext<"/api/cms/roles/[id]">,
) {
  return withCmsRequest(request, async () => {
    const { id } = await context.params;
    const actor = await requireCmsSession(request.headers, permissions.ROLE_UPDATE);
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
            data: { ...data, updatedBy: actor.name, permissions: [...new Set(data.permissions)] },
          });
        },
        { isolationLevel: "Serializable" },
      ),
    );
  });
}
