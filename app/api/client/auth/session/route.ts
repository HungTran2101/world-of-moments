import { getClientSession } from "@/app/api/_handlers/clientAuth";
import { clientJson, withClientRequest } from "@/app/api/_handlers/clientHttp";
export const runtime = "nodejs";
export async function GET(request: Request) {
  return withClientRequest(request, async () =>
    clientJson({ user: await getClientSession(request.headers) }),
  );
}
