import { prisma } from "@/lib/prisma";
import { requireCmsSession } from "@/handlers/auth";
import { cmsJson, CmsHttpError, parseBody, withCmsRequest } from "@/handlers/http";
import { permissions } from "@/services/permission";
import { hashPassword } from "better-auth/crypto";
import { resetPasswordSchema } from "@/services/schemas";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Login required - Permission: account.resetPasswordPermission
export async function POST(
  request: Request,
  context: RouteContext<"/api/cms/accounts/[id]/reset-password">,
) {
  return withCmsRequest(request, async () => {
    const { id } = await context.params;
    await requireCmsSession(
      request.headers,
      permissions.ACCOUNT_RESET_PASSWORD,
    );
    const body = await parseBody(request, resetPasswordSchema);
    const password = await hashPassword(body.newPassword);
    await prisma.$transaction(async (tx) => {
      const user = await tx.user.findFirst({
        where: { id, isSystem: false },
        select: { id: true },
      });
      if (!user) throw new CmsHttpError(404, "errors.notFound");
      await tx.account.updateMany({
        where: { userId: id, providerId: "credential" },
        data: { password },
      });
      await tx.session.deleteMany({ where: { userId: id } });
    });
    return cmsJson({ ok: true });
  });
}
