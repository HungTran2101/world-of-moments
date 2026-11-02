import "server-only";

import { cache } from "react";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { requireCmsSession } from "@/handlers/auth";
import { CmsHttpError } from "@/handlers/http";
import { CmsRoute } from "@/components/shared/Route";

export const getPageIdentity = cache(async () => {
  try {
    const { id, username, name, scopes } = await requireCmsSession(await headers());
    return { id, username, name, scopes };
  } catch (error) {
    if (error instanceof CmsHttpError && error.status === 401)
      redirect("/cms/login");
    throw error;
  }
});

export async function ProtectedPage({ routeKey }: { routeKey: string }) {
  const user = await getPageIdentity();
  return <CmsRoute routeKey={routeKey} user={user} />;
}
