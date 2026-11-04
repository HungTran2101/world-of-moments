import "server-only";

import { cache, type ComponentType } from "react";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { requireCmsSession } from "@/handlers/auth";
import { CmsHttpError } from "@/handlers/http";
import { CmsRoute } from "@/components/shared/Route";
import { resolvePermission } from "@/services/permission";
import {
  ROUTE_PATHS,
  ROUTES_PERMISSIONS,
  type ProtectedCmsRoutePath,
} from "@/services/routes";
import type { CmsPageProps } from "@/services/shared/types";

export const getPageIdentity = cache(async () => {
  try {
    const { id, username, name, scopes } = await requireCmsSession(await headers());
    return { id, username, name, scopes };
  } catch (error) {
    if (error instanceof CmsHttpError && error.status === 401)
      redirect(ROUTE_PATHS.LOGIN);
    throw error;
  }
});

export function createProtectedPage(
  Component: ComponentType<CmsPageProps>,
  routePath: ProtectedCmsRoutePath,
) {
  return async function Page() {
    const user = await getPageIdentity();
    const permission = resolvePermission(user.scopes, ROUTES_PERMISSIONS[routePath]);

    // Chặn nội dung ngay trên server; layout có thể được giữ lại khi chuyển trang.
    return (
      <CmsRoute user={user} permission={permission}>
        {permission.show ? <Component permission={permission} /> : null}
      </CmsRoute>
    );
  };
}
