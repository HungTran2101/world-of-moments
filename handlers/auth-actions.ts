import "server-only";

import { getAuth, getCmsIdentity, requireCmsSession } from "@/handlers/auth";
import { assertTrustedOrigin, cmsJson, CmsHttpError, parseBody } from "@/handlers/http";
import { loginSchema, changePasswordSchema } from "@/services/schemas";
import { prisma } from "@/lib/prisma";
import { hashPassword, verifyPassword } from "better-auth/crypto";
import { createHash } from "node:crypto";
import { constants } from "@/app/api/constant";

// Giới hạn đăng nhập theo IP và tên đăng nhập, dùng DB để chia sẻ giữa các server.
async function limitLogin(request: Request, username: string) {
  const now = Date.now();
  const windowId = Math.floor(now / constants.CMS_LOGIN_RATE_LIMIT_WINDOW_MS);
  const ip =
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";
  const limits = [
    { identifier: `ip:${ip}`, maxAttempts: constants.CMS_LOGIN_MAX_ATTEMPTS_PER_IP },
    {
      identifier: `user:${username}`,
      maxAttempts: constants.CMS_LOGIN_MAX_ATTEMPTS_PER_USERNAME,
    },
  ];
  await prisma.cmsLoginLimit.deleteMany({
    where: { expiresAt: { lt: new Date(now) } },
  });
  for (const { identifier, maxAttempts } of limits) {
    const key = `${windowId}:${createHash("sha256").update(identifier).digest("hex")}`;
    const entry = await prisma.cmsLoginLimit.upsert({
      where: { key },
      create: {
        key,
        attempts: 1,
        expiresAt: new Date((windowId + 1) * constants.CMS_LOGIN_RATE_LIMIT_WINDOW_MS),
      },
      update: { attempts: { increment: 1 } },
    });
    if (entry.attempts > maxAttempts)
      throw new CmsHttpError(429, "errors.rateLimited");
  }
}

export async function handleAuth(request: Request, action: string) {
  assertTrustedOrigin(request);
  const auth = getAuth();
  if (action === "login") {
    const body = await parseBody(request, loginSchema);
    await limitLogin(request, body.username);
    let result;
    try {
      result = await auth.api.signInUsername({
        body,
        headers: request.headers,
        returnHeaders: true,
      });
    } catch {
      throw new CmsHttpError(401, "errors.credentials");
    }

    try {
      const user = await getCmsIdentity(result.response.user.id);
      const response = cmsJson({ user });
      for (const cookie of result.headers.getSetCookie())
        response.headers.append("Set-Cookie", cookie);
      return response;
    } catch (error) {
      await prisma.session.deleteMany({
        where: { token: result.response.token },
      });
      throw error;
    }
  }

  const identity = await requireCmsSession(request.headers);
  if (action === "logout") {
    const result = await auth.api.signOut({
      headers: request.headers,
      returnHeaders: true,
    });
    const response = cmsJson({ ok: true });
    for (const cookie of result.headers.getSetCookie())
      response.headers.append("Set-Cookie", cookie);
    return response;
  }
  if (action === "change-password") {
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
      prisma.account.update({ where: { id: account.id }, data: { password } }),
      prisma.session.deleteMany({
        where: { userId: identity.id, id: { not: identity.sessionId } },
      }),
    ]);
    return cmsJson({ ok: true });
  }
  throw new CmsHttpError(404, "errors.notFound");
}
