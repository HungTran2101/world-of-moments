import { registerClientAccount, getClientRecord, clientIdentity } from "@/lib/clientAccounts";
import { getClientAuth } from "@/app/api/_handlers/clientAuth";
import { sendClientVerification } from "@/lib/clientVerification";
import { withAuthCaptcha } from "@/lib/clientCaptcha";
import { admitAuthRequest } from "@/lib/clientAuthLimits";
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
    const admission = await admitAuthRequest(request, "register");
    const body = clientCredentialsSchema.parse(await request.json());
    getClientAuth();
    const user = await withAuthCaptcha(request, admission, body.captchaToken, () =>
      registerClientAccount(body.email, body.password, admission),
    );
    const session = await signInClient(request, body.email, body.password);
    let emailError = false;
    let emailErrorCode: ClientVerificationEmailError | undefined;
    try {
      await sendClientVerification(user.id, body.locale);
    } catch (error) {
      emailError = true;
      emailErrorCode = error instanceof ClientHttpError &&
        ["emailDomainInvalid", "emailDnsTemporary", "emailUndeliverable"].includes(error.code)
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
