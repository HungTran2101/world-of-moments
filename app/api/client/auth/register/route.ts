import { registerClientAccount, getClientRecord, clientIdentity } from "@/lib/clientAccounts";
import { getClientAuth } from "@/app/api/_handlers/clientAuth";
import { sendClientVerification } from "@/lib/clientVerification";
import { requireAuthCaptcha } from "@/lib/clientCaptcha";
import { admitAuthRequest, countAuthRequest } from "@/lib/clientAuthLimits";
import { clientJson, withClientRequest } from "@/app/api/_handlers/clientHttp";
import { ClientHttpError } from "@/lib/clientErrors";
import type { ClientVerificationEmailError } from "@/services/client-auth/types";
import {
  appendAuthCookies,
  clientCredentialsSchema,
  signInClient,
} from "@/app/api/_handlers/clientCredentials";
export const runtime = "nodejs";
export async function POST(request: Request) {
  return withClientRequest(request, async () => {
    // Kiểm tra lệnh chặn trước khi đọc dữ liệu và xác minh CAPTCHA.
    const admission = await admitAuthRequest(request, "register");
    const body = await (async () => {
      try {
        return clientCredentialsSchema.parse(await request.json());
      } catch (error) {
        await countAuthRequest(admission);
        throw error;
      }
    })();
    await requireAuthCaptcha(request, admission, body.captchaToken);
    getClientAuth();
    const user = await registerClientAccount(body.email, body.password, admission);
    const session = await signInClient(request, body.email, body.password);
    let emailError = false;
    let emailErrorCode: ClientVerificationEmailError | undefined;
    try {
      await sendClientVerification(user.id, body.locale);
    } catch (error) {
      emailError = true;
      emailErrorCode = error instanceof ClientHttpError &&
        ["emailDomainInvalid", "emailDnsTemporary", "emailUndeliverable", "emailQuotaExceeded"].includes(error.code)
        ? error.code as ClientVerificationEmailError : "emailFailed";
    }
    const current = await getClientRecord(user.id);
    return appendAuthCookies(
      clientJson({
        user: current ? clientIdentity(current) : null, emailError,
        ...(emailErrorCode ? { emailErrorCode } : {}),
      }, 201),
      session.headers,
    );
  });
}
