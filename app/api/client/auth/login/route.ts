import { getClientRecord, clientIdentity } from "@/lib/clientAccounts";
import { requireAuthCaptcha } from "@/lib/clientCaptcha";
import { admitAuthRequest, countAuthRequest } from "@/lib/clientAuthLimits";
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
    // Kiểm tra lệnh chặn trước khi đọc dữ liệu và xác minh CAPTCHA.
    const admission = await admitAuthRequest(request, "login");
    const body = await (async () => {
      try {
        return clientCredentialsSchema.parse(await request.json());
      } catch (error) {
        await countAuthRequest(admission);
        throw error;
      }
    })();
    await requireAuthCaptcha(request, admission, body.captchaToken);
    const result = await signInClient(request, body.email, body.password);
    const user = await getClientRecord(result.response.user.id);
    if (!user) throw new ClientHttpError(401, "credentials");
    return appendAuthCookies(clientJson({ user: clientIdentity(user) }), result.headers);
  });
}
