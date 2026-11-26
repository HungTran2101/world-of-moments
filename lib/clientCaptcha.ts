import "server-only";
import { ClientHttpError } from "@/lib/clientErrors";
import { CLIENT_LIMITS } from "@/app/api/client/constant";
import { clientIp, countAuthRequest, type AuthIpAdmission } from "@/lib/clientAuthLimits";

export async function requireAuthCaptcha(
  request: Request,
  admission: AuthIpAdmission,
  token: string | undefined,
) {
  // Yêu cầu hợp lệ thiếu token không xử lý tài khoản và không tính lượt theo IP.
  if (!token) throw new ClientHttpError(403, "captchaRequired");
  await countAuthRequest(admission);

  // Chốt lượt theo IP trước khi gọi Cloudflare để không giữ khóa giao dịch khi chờ mạng.
  const secret = process.env.TURNSTILE_SECRET_KEY;
  if (!secret) throw new ClientHttpError(503, "unavailable");
  let result: { success?: boolean; hostname?: string; action?: string } | null;
  try {
    const response = await fetch("https://challenges.cloudflare.com/turnstile/v0/siteverify", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        secret,
        response: token,
        remoteip: clientIp(request),
      }),
      signal: AbortSignal.timeout(CLIENT_LIMITS.REQUEST_TIMEOUT_MS),
    });
    if (!response.ok) throw new Error("Siteverify unavailable");
    result = await response.json();
    if (typeof result?.success !== "boolean") throw new Error("Invalid Siteverify response");
  } catch {
    throw new ClientHttpError(503, "unavailable");
  }
  const hostname = new URL(process.env.NEXT_PUBLIC_APP_URL || request.url).hostname;
  if (result.success !== true || result.hostname !== hostname || result.action !== admission.action)
    throw new ClientHttpError(403, "captchaRequired");
}
