import "server-only";
import { constants } from "@/app/api/constant";
import { CmsHttpError } from "@/app/api/_handlers/http";
import { cmsLoginIp } from "@/lib/cmsLoginLimits";

export async function validateCmsLoginCaptcha(request: Request, token: string | undefined) {
  if (!token) throw new CmsHttpError(403, "errors.captchaRequired");
  if (!process.env.TURNSTILE_SECRET_KEY) throw new CmsHttpError(503, "errors.loginUnavailable");
  let result: { success?: boolean; hostname?: string; action?: string } | null;
  try {
    const response = await fetch("https://challenges.cloudflare.com/turnstile/v0/siteverify", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        secret: process.env.TURNSTILE_SECRET_KEY,
        response: token,
        remoteip: cmsLoginIp(request),
      }),
      signal: AbortSignal.timeout(constants.CMS_LOGIN_CAPTCHA_TIMEOUT_MS),
    });
    if (!response.ok) throw new Error("Siteverify unavailable");
    result = await response.json();
  } catch {
    throw new CmsHttpError(503, "errors.loginUnavailable");
  }
  const hostname = new URL(
    process.env.CMS_AUTH_URL || process.env.NEXT_PUBLIC_APP_URL || request.url,
  ).hostname;
  // Token chỉ dùng cho CMS trên đúng hostname; không nhận token của đăng nhập công khai.
  if (result?.success !== true || result.hostname !== hostname || result.action !== constants.CMS_LOGIN_CAPTCHA_ACTION) {
    throw new CmsHttpError(403, "errors.captchaRequired");
  }
}
