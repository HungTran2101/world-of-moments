import { checkPermission, CMS_LANDING_ROUTES } from "@/services/permission";
import { ROUTE_PATHS } from "@/services/constant";

export type CmsRoutePath = (typeof ROUTE_PATHS)[keyof typeof ROUTE_PATHS];
export type ProtectedCmsRoutePath = Exclude<
  CmsRoutePath,
  typeof ROUTE_PATHS.LOGIN
>;

export function getCmsLandingPath(scopes: readonly string[]) {
  return CMS_LANDING_ROUTES.find(([, permission]) =>
    checkPermission(scopes, permission),
  )?.[0];
}
