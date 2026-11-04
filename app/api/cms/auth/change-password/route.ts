import { hashPassword, verifyPassword } from "better-auth/crypto";
import { requireCmsSession } from "@/handlers/auth";
import { cmsJson, CmsHttpError, parseBody, withCmsRequest } from "@/handlers/http";
import { prisma } from "@/lib/prisma";
import { changePasswordSchema } from "@/services/schemas";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Login required - Permission: none
export async function POST(request: Request) {
  return withCmsRequest(request, async () => {
    const identity = await requireCmsSession(request.headers);
    const body = await parseBody(request, changePasswordSchema);
    const account = await prisma.account.findFirst({
      where: { userId: identity.id, providerId: "credential" },
    });
    if (
      !account?.password ||
      !(await verifyPassword({
        hash: account.password,
        password: body.currentPassword,
      }))
    ) {
      throw new CmsHttpError(422, "errors.validation", {
        currentPassword: ["errors.currentPassword"],
      });
    }
    const password = await hashPassword(body.newPassword);
    await prisma.$transaction([
      prisma.user.update({ where: { id: identity.id }, data: { updatedBy: identity.name } }),
      prisma.account.update({ where: { id: account.id }, data: { password } }),
      prisma.session.deleteMany({
        where: { userId: identity.id, id: { not: identity.sessionId } },
      }),
    ]);
    return cmsJson({ ok: true });
  });
}
