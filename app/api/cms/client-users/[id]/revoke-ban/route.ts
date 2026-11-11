import { requireCmsSession } from "@/app/api/_handlers/auth";
import { cmsJson, withCmsRequest } from "@/app/api/_handlers/http";
import { permissions } from "@/services/permission";
import { changeClientStatus } from "@/lib/clientAccounts";
export const runtime = "nodejs";
export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  return withCmsRequest(request, async () => {
    const actor = await requireCmsSession(request.headers, permissions.CLIENT_USER_REVOKE_BAN);
    const { id } = await params;
    await changeClientStatus(id, "verified", actor.id, true);
    return cmsJson({ ok: true });
  });
}
