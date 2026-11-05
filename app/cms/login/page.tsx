import { ROUTE_PATHS, getCmsLandingPath } from "@/services/routes";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { requireCmsSession } from "@/handlers/auth";
import { CmsHttpError } from "@/handlers/http";
import { LoginPage } from "@/components/Login";

export default async function Page() {
  let scopes: string[] | undefined;
  try {
    scopes = (await requireCmsSession(await headers())).scopes;
  } catch (error) {
    if (!(error instanceof CmsHttpError && error.status === 401)) throw error;
  }
  if (scopes) redirect(getCmsLandingPath(scopes) ?? ROUTE_PATHS.DASHBOARD);
  return <LoginPage />;
}
