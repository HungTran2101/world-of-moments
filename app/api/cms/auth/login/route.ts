import { createHash } from "node:crypto";
import { constants } from "@/app/api/constant";
import { getAuth, getCmsIdentity } from "@/handlers/auth";
import { cmsJson, CmsHttpError, parseBody, withCmsRequest } from "@/handlers/http";
import { prisma } from "@/lib/prisma";
import { loginSchema } from "@/services/schemas";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

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

// Login not required - Permission: none
export async function POST(request: Request) {
  return withCmsRequest(request, async () => {
    const auth = getAuth();
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
  });
}
