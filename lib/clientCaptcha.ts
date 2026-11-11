import "server-only";
import { createHash } from "node:crypto";
import { prisma } from "@/lib/prisma";
import { submissionClientIp } from "@/lib/submissionIp";
import { ClientHttpError } from "@/lib/clientErrors";
import { CLIENT_LIMITS } from "@/app/api/client/constant";

export function clientIp(request: Request) {
  const ip = submissionClientIp(request.headers, process.env.NODE_ENV === "production");
  if (!ip) throw new ClientHttpError(503, "unavailable");
  return ip;
}
export async function validateCaptcha(
  token: string | undefined,
  action: "login" | "register",
  request: Request,
) {
  if (!token) throw new ClientHttpError(403, "captchaRequired");
  if (!process.env.TURNSTILE_SECRET_KEY) throw new ClientHttpError(503, "unavailable");
  let result;
  try {
    const response = await fetch("https://challenges.cloudflare.com/turnstile/v0/siteverify", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        secret: process.env.TURNSTILE_SECRET_KEY,
        response: token,
        remoteip: clientIp(request),
      }),
      signal: AbortSignal.timeout(CLIENT_LIMITS.REQUEST_TIMEOUT_MS),
    });
    if (!response.ok) throw new Error("Siteverify unavailable");
    result = (await response.json()) as { success?: boolean; hostname?: string; action?: string };
  } catch {
    throw new ClientHttpError(503, "unavailable");
  }
  const hostname = new URL(process.env.NEXT_PUBLIC_APP_URL || request.url).hostname;
  if (result.success !== true || result.hostname !== hostname || result.action !== action)
    throw new ClientHttpError(403, "captchaRequired");
}
export async function withAuthIpLimit<T>(
  request: Request,
  action: "login" | "register",
  token: string | undefined,
  authenticate: () => Promise<T>,
) {
  const key = `${action}:${createHash("sha256").update(clientIp(request)).digest("hex")}`;
  const result = await prisma.$transaction(
    async (tx) => {
      // Khóa IP xuyên tiến trình; lỗi đăng nhập vẫn được ghi khi trả kết quả từ chối.
      await tx.$queryRaw`SELECT 1 AS locked FROM pg_advisory_xact_lock(hashtextextended(${`client-auth:${key}`}, 0))`;
      const now = new Date();
      const row = await tx.clientAuthIpLimit.findUnique({ where: { key } });
      const attemptsAt = (row?.attemptsAt ?? []).filter(
        (date) => date.getTime() > now.getTime() - CLIENT_LIMITS.IP_WINDOW_MS,
      );
      const requiresCaptcha =
        action === "register"
          ? attemptsAt.length >= CLIENT_LIMITS.IP_ATTEMPTS_WITHOUT_CAPTCHA
          : attemptsAt.length > CLIENT_LIMITS.IP_ATTEMPTS_WITHOUT_CAPTCHA;
      if (requiresCaptcha) {
        try {
          await validateCaptcha(token, action, request);
        } catch (error) {
          return { error };
        }
      }
      if (action === "register") {
        attemptsAt.push(now);
        await tx.clientAuthIpLimit.upsert({
          where: { key },
          create: {
            key,
            attemptsAt,
            expiresAt: new Date(now.getTime() + CLIENT_LIMITS.IP_WINDOW_MS),
          },
          update: {
            attemptsAt: attemptsAt.slice(-CLIENT_LIMITS.IP_ATTEMPTS_WITHOUT_CAPTCHA - 1),
            expiresAt: new Date(now.getTime() + CLIENT_LIMITS.IP_WINDOW_MS),
          },
        });
        return { registrationAllowed: true };
      }
      try {
        return { value: await authenticate() };
      } catch (error) {
        if (error instanceof ClientHttpError && error.code === "credentials") {
          const failedAt = new Date();
          const failed = [...attemptsAt, failedAt].slice(
            -CLIENT_LIMITS.IP_ATTEMPTS_WITHOUT_CAPTCHA - 1,
          );
          await tx.clientAuthIpLimit.upsert({
            where: { key },
            create: {
              key,
              attemptsAt: failed,
              expiresAt: new Date(failedAt.getTime() + CLIENT_LIMITS.IP_WINDOW_MS),
            },
            update: {
              attemptsAt: failed,
              expiresAt: new Date(failedAt.getTime() + CLIENT_LIMITS.IP_WINDOW_MS),
            },
          });
        }
        return { error };
      }
    },
    { timeout: CLIENT_LIMITS.AUTH_TRANSACTION_TIMEOUT_MS },
  );
  if ("error" in result) throw result.error;
  return "registrationAllowed" in result ? authenticate() : result.value!;
}
