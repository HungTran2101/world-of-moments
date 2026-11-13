import { getClientRecord, clientIdentity } from "@/lib/clientAccounts";
import { withAuthCaptcha } from "@/lib/clientCaptcha";
import { admitAuthRequest } from "@/lib/clientAuthLimits";
import { ClientHttpError } from "@/lib/clientErrors";
import { clientJson, withClientRequest } from "@/app/api/_handlers/clientHttp";
import {
  appendAuthCookies,
  clientCredentialsSchema,
  signInClient,
} from "@/app/api/_handlers/clientCredentials";
export const runtime = "nodejs";
export async function POST(request: Request) {
  return withClientRequest(request, async () => {
    const admission = await admitAuthRequest(request, "login");
    const body = clientCredentialsSchema.parse(await request.json());
    const result = await withAuthCaptcha(request, admission, body.captchaToken, () =>
      signInClient(request, body.email, body.password),
    );
    const user = await getClientRecord(result.response.user.id);
    if (!user) throw new ClientHttpError(401, "credentials");
    return appendAuthCookies(clientJson({ user: clientIdentity(user) }), result.headers);
  });
}
