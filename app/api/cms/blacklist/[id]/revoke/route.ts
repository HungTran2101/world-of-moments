import { requireCmsSession } from "@/handlers/auth";
import { cmsJson, CmsHttpError, parseBody, withCmsRequest } from "@/handlers/http";
import { revokeBlacklist } from "@/lib/submissionProtection";
import { permissions } from "@/services/permission";
import { blacklistRevokeSchema } from "@/services/schemas";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Login required - Permission: blacklist.revoke
export async function POST(request: Request, context: RouteContext<"/api/cms/blacklist/[id]/revoke">) {
  return withCmsRequest(request, async () => {
    const actor = await requireCmsSession(request.headers, permissions.BLACKLIST_REVOKE);
    const {
      eventId
    } = await parseBody(request, blacklistRevokeSchema);
    const {
      id
    } = await context.params;
    const result = await revokeBlacklist(id, eventId, actor.name);
    if (result === "not-found") throw new CmsHttpError(404, "errors.notFound");
    if (result === "conflict") throw new CmsHttpError(409, "errors.conflict");
    return cmsJson({
      ok: true
    });
  });
}
