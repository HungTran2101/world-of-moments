import { getAuth, requireCmsSession } from "@/app/api/_handlers/auth";
import { cmsJson, withCmsRequest } from "@/app/api/_handlers/http";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Login required - Permission: none
export async function POST(request: Request) {
  return withCmsRequest(request, async () => {
    const auth = getAuth();
    await requireCmsSession(request.headers);
    const result = await auth.api.signOut({
      headers: request.headers,
      returnHeaders: true,
    });
    const response = cmsJson({ ok: true });
    for (const cookie of result.headers.getSetCookie())
      response.headers.append("Set-Cookie", cookie);
    return response;
  });
}
