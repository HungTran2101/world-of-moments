import { ROUTE_PATHS } from "@/services/routes";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { requireCmsSession } from "@/handlers/auth";
import { CmsHttpError } from "@/handlers/http";
import { LoginPage } from "@/components/Login";

export default async function Page() {
  let authenticated = false;
  try {
    await requireCmsSession(await headers());
    authenticated = true;
  } catch (error) {
    if (!(error instanceof CmsHttpError && error.status === 401)) throw error;
  }
  if (authenticated) redirect(ROUTE_PATHS.OVERVIEW);
  return <LoginPage />;
}
