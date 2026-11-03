import { prisma } from "@/lib/prisma";
import { requireCmsSession } from "@/handlers/auth";
import { cmsJson, CmsHttpError, parseBody, withCmsRequest } from "@/handlers/http";
import { permissions } from "@/services/permission";
import { accountUpdateSchema } from "@/services/schemas";
import { accountSelect, serializeAccount, assertRoles } from "../_shared";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Login required - Permission: account.show
export async function GET(
  request: Request,
  context: RouteContext<"/api/cms/accounts/[id]">,
) {
  return withCmsRequest(request, async () => {
    const { id } = await context.params;
    await requireCmsSession(request.headers, permissions.ACCOUNT_SHOW);
    const user = await prisma.user.findFirst({
      where: { id, isSystem: false },
      select: accountSelect,
    });
    if (!user) throw new CmsHttpError(404, "errors.notFound");
    return cmsJson(serializeAccount(user));
  });
}

// Login required - Permission: account.update
export async function PATCH(
  request: Request,
  context: RouteContext<"/api/cms/accounts/[id]">,
) {
  return withCmsRequest(request, async () => {
    const { id } = await context.params;
    await requireCmsSession(request.headers, permissions.ACCOUNT_UPDATE);
    const { roleIds, ...data } = await parseBody(request, accountUpdateSchema);
    const user = await prisma.$transaction(
      async (tx) => {
        const existing = await tx.user.findFirst({
          where: { id, isSystem: false },
          select: { id: true },
        });
        if (!existing) throw new CmsHttpError(404, "errors.notFound");
        await assertRoles(tx, roleIds);
        await tx.cmsUserRole.deleteMany({ where: { userId: id } });
        if (!data.isActive)
          await tx.session.deleteMany({ where: { userId: id } });
        return tx.user.update({
          where: { id },
          data: {
            ...data,
            displayUsername: data.username,
            roles: {
              create: [...new Set(roleIds)].map((roleId) => ({ roleId })),
            },
          },
          select: accountSelect,
        });
      },
      { isolationLevel: "Serializable" },
    );
    return cmsJson(serializeAccount(user));
  });
}
