import { getClientAuth } from "@/app/api/_handlers/clientAuth";
import { appendAuthCookies } from "@/app/api/_handlers/clientCredentials";
import { clientJson, withClientRequest } from "@/app/api/_handlers/clientHttp";
export const runtime = "nodejs";
export async function POST(request: Request) {
  return withClientRequest(request, async () => {
    const result = await getClientAuth().api.signOut({
      headers: request.headers,
      returnHeaders: true,
    });
    return appendAuthCookies(clientJson({ ok: true }), result.headers);
  });
}
