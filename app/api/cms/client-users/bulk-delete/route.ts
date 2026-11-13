import { requireCmsSession } from "@/app/api/_handlers/auth";
import { cmsJson, parseBody, withCmsRequest } from "@/app/api/_handlers/http";
import { permissions } from "@/services/permission";
import { deleteSchema } from "@/services/schemas";
import { deleteClientAccounts } from "@/lib/clientAccounts";
export const runtime = "nodejs";
export async function POST(request: Request) {
  return withCmsRequest(request, async () => {
    await requireCmsSession(request.headers, permissions.CLIENT_USER_DELETE);
    const { ids } = await parseBody(request, deleteSchema);
    await deleteClientAccounts([...new Set(ids)]);
    return cmsJson({ ok: true });
  });
}
