import { prisma } from "@/lib/prisma";
import { requireCmsSession } from "@/app/api/_handlers/auth";
import { cmsJson, CmsHttpError, parseBody, withCmsRequest } from "@/app/api/_handlers/http";
import { permissions } from "@/services/permission";
import { clientUserStatusSchema } from "@/services/schemas";
import { changeClientStatus, getClientRecord } from "@/lib/clientAccounts";
import { serializeClientUser } from "@/lib/clientUserSerialization";
export const runtime = "nodejs";
type Context = { params: Promise<{ id: string }> };
export async function GET(request: Request, { params }: Context) {
  return withCmsRequest(request, async () => {
    await requireCmsSession(request.headers, permissions.CLIENT_USER_SHOW);
    const { id } = await params;
    const user = await getClientRecord(id);
    if (!user) throw new CmsHttpError(404, "errors.notFound");
    const actor = user.statusUpdatedBy
      ? await prisma.user.findFirst({
          where: { id: user.statusUpdatedBy, kind: "cms" },
          select: { name: true },
        })
      : null;
    return cmsJson(serializeClientUser(user, actor?.name ?? null));
  });
}
export async function PATCH(request: Request, { params }: Context) {
  return withCmsRequest(request, async () => {
    const actor = await requireCmsSession(request.headers, permissions.CLIENT_USER_CHANGE_STATUS);
    const { id } = await params;
    const { status } = await parseBody(request, clientUserStatusSchema);
    await changeClientStatus(id, status, actor.id);
    return cmsJson({ ok: true });
  });
}
