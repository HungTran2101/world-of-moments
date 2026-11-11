import { createClientAccount, getClientRecord, clientIdentity } from "@/lib/clientAccounts";
import { getClientAuth } from "@/app/api/_handlers/clientAuth";
import { sendClientVerification } from "@/lib/clientVerification";
import { withAuthIpLimit } from "@/lib/clientCaptcha";
import { clientJson, withClientRequest } from "@/app/api/_handlers/clientHttp";
import {
  appendAuthCookies,
  clientCredentialsSchema,
  signInClient,
} from "@/app/api/_handlers/clientCredentials";
export const runtime = "nodejs";
export async function POST(request: Request) {
  return withClientRequest(request, async () => {
    const body = clientCredentialsSchema.parse(await request.json());
    getClientAuth();
    const user = await withAuthIpLimit(request, "register", body.captchaToken, () =>
      createClientAccount(body.email, body.password),
    );
    const session = await signInClient(request, body.email, body.password);
    let emailError = false;
    try {
      await sendClientVerification(user.id, body.locale);
    } catch {
      emailError = true;
    }
    const current = await getClientRecord(user.id);
    return appendAuthCookies(
      clientJson({ user: current ? clientIdentity(current) : null, emailError }, 201),
      session.headers,
    );
  });
}
