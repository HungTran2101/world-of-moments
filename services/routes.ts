import {
  checkPermission,
  permissions,
  type PermissionRules,
} from "@/services/permission";

export const ROUTE_PATHS = {
  DASHBOARD: "/cms",
  LOGIN: "/cms/login",
  SUBMISSIONS: "/cms/submissions",
  SUBMISSION_DETAIL: "/cms/submissions/detail",
  ACCOUNTS: "/cms/accounts",
  ACCOUNT_DETAIL: "/cms/accounts/detail",
  ROLES: "/cms/roles",
  ROLE_DETAIL: "/cms/roles/detail",
  PROFILE: "/cms/profile",
  CHANGE_PASSWORD: "/cms/profile/change-password",
  GENERAL: "/cms/general",
} as const;

export type CmsRoutePath = (typeof ROUTE_PATHS)[keyof typeof ROUTE_PATHS];
export type ProtectedCmsRoutePath = Exclude<
  CmsRoutePath,
  typeof ROUTE_PATHS.LOGIN
>;

const ACCOUNT_PERMISSION_RULES: PermissionRules = {
  show: permissions.ACCOUNT_SHOW,
  create: permissions.ACCOUNT_CREATE,
  update: permissions.ACCOUNT_UPDATE,
  delete: permissions.ACCOUNT_DELETE,
  custom: [permissions.ACCOUNT_RESET_PASSWORD],
};

const ROLE_PERMISSION_RULES: PermissionRules = {
  show: permissions.ROLE_SHOW,
  create: permissions.ROLE_CREATE,
  update: permissions.ROLE_UPDATE,
  delete: permissions.ROLE_DELETE,
};

const SUBMISSION_PERMISSION_RULES: PermissionRules = {
  show: permissions.SUBMISSION_SHOW,
  create: permissions.SUBMISSION_CREATE,
  delete: permissions.SUBMISSION_DELETE,
  custom: [permissions.SUBMISSION_UPDATE_STATUS, permissions.SUBMISSION_UPDATE_VALIDITY],
};

export const ROUTES_PERMISSIONS = {
  [ROUTE_PATHS.SUBMISSIONS]: SUBMISSION_PERMISSION_RULES,
  [ROUTE_PATHS.SUBMISSION_DETAIL]: SUBMISSION_PERMISSION_RULES,
  [ROUTE_PATHS.DASHBOARD]: { show: permissions.DASHBOARD_SHOW },
  [ROUTE_PATHS.ACCOUNTS]: ACCOUNT_PERMISSION_RULES,
  [ROUTE_PATHS.ACCOUNT_DETAIL]: ACCOUNT_PERMISSION_RULES,
  [ROUTE_PATHS.ROLES]: ROLE_PERMISSION_RULES,
  [ROUTE_PATHS.ROLE_DETAIL]: ROLE_PERMISSION_RULES,
  [ROUTE_PATHS.CHANGE_PASSWORD]: undefined,
  [ROUTE_PATHS.PROFILE]: undefined,
  [ROUTE_PATHS.GENERAL]: undefined,
} satisfies Record<ProtectedCmsRoutePath, PermissionRules | undefined>;

const CMS_LANDING_ROUTES = [
  [ROUTE_PATHS.DASHBOARD, permissions.DASHBOARD_SHOW],
  [ROUTE_PATHS.SUBMISSIONS, permissions.SUBMISSION_SHOW],
  [ROUTE_PATHS.ACCOUNTS, permissions.ACCOUNT_SHOW],
  [ROUTE_PATHS.ROLES, permissions.ROLE_SHOW],
] as const;

export function getCmsLandingPath(scopes: readonly string[]) {
  return CMS_LANDING_ROUTES.find(([, permission]) =>
    checkPermission(scopes, permission),
  )?.[0];
}
