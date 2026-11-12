import "server-only";
import { prisma } from "@/lib/prisma";
import { ClientHttpError } from "@/lib/clientErrors";
import { CLIENT_LIMITS } from "@/app/api/client/constant";

import {
  clientIp,
  lockAuthIp,
  readAuthIpState,
  persistAuthIpState,
  type AuthIpAdmission,
} from "@/lib/clientAuthLimits";

function captchaAttemptLimit(action: AuthIpAdmission["action"]) {
  return action === "register"
    ? CLIENT_LIMITS.REGISTER_ATTEMPTS_WITHOUT_CAPTCHA
    : CLIENT_LIMITS.LOGIN_ATTEMPTS_WITHOUT_CAPTCHA;
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
async function recordCaptchaAttempt(admission: AuthIpAdmission) {
  await prisma.$transaction(async (tx) => {
    await lockAuthIp(tx, admission.key);
    const now = new Date();
    const state = await readAuthIpState(tx, admission.key, now);
    state.attemptsAt = [...state.attemptsAt, now].slice(
      -captchaAttemptLimit(admission.action),
    );
    await persistAuthIpState(tx, admission.key, state, now);
  }, { timeout: CLIENT_LIMITS.AUTH_TRANSACTION_TIMEOUT_MS });
}

export async function withAuthCaptcha<T>(
  request: Request,
  admission: AuthIpAdmission,
  token: string | undefined,
  authenticate: () => Promise<T>,
) {
  const requiresCaptcha = await prisma.$transaction(async (tx) => {
    await lockAuthIp(tx, admission.key);
    const now = new Date();
    const state = await readAuthIpState(tx, admission.key, now);
    const required = state.attemptsAt.length >= captchaAttemptLimit(admission.action);
    if (admission.action === "register" && !required) {
      state.attemptsAt.push(now);
      await persistAuthIpState(tx, admission.key, state, now);
    }
    return required;
  }, { timeout: CLIENT_LIMITS.AUTH_TRANSACTION_TIMEOUT_MS });

  // CAPTCHA và kiểm tra mật khẩu chạy ngoài transaction để không giữ kết nối/khóa khi chờ mạng.
  if (requiresCaptcha) {
    await validateCaptcha(token, admission.action, request);
    if (admission.action === "register") await recordCaptchaAttempt(admission);
  }
  try {
    return await authenticate();
  } catch (error) {
    if (admission.action === "login" && error instanceof ClientHttpError && error.code === "credentials") {
      await recordCaptchaAttempt(admission);
    }
    throw error;
  }
}
