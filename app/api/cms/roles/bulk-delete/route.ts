import { permissions } from "@/services/constant";
import { prisma } from "@/lib/prisma";
import { requireCmsSession } from "@/handlers/auth";
import { cmsJson, CmsHttpError, parseBody, withCmsRequest } from "@/handlers/http";
import { deleteSchema } from "@/services/schemas";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Login required - Permission: role.delete
export async function POST(request: Request) {
  return withCmsRequest(request, async () => {
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
  });
}
