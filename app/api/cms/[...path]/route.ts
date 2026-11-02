import { handleAccounts } from "@/handlers/accounts";
import { handleAuth } from "@/handlers/auth-actions";
import { assertTrustedOrigin, cmsError, CmsHttpError } from "@/handlers/http";
import { handleRoles } from "@/handlers/roles";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

async function handle(
  request: Request,
  context: { params: Promise<{ path: string[] }> },
) {
  try {
    const { path } = await context.params;
    if (request.method !== "GET") assertTrustedOrigin(request);
    if (
      path[0] === "auth" &&
      path.length === 2 &&
      request.method === "POST" &&
      ["login", "logout", "change-password"].includes(path[1])
    )
      return await handleAuth(request, path[1]);
    if (path[0] === "accounts" && path.length <= 3)
      return await handleAccounts(request, path.slice(1));
    if (path[0] === "roles" && path.length <= 2)
      return await handleRoles(request, path.slice(1));
    throw new CmsHttpError(404, "errors.notFound");
  } catch (error) {
    return cmsError(error);
  }
}

export { handle as GET, handle as POST, handle as PATCH };
