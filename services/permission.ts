import { ROUTE_PATHS } from "@/services/constant";
import type { ProtectedCmsRoutePath } from "@/services/routes";

export const permissions = {
  DASHBOARD_SHOW: "dashboard.show",
  SUBMISSION_SHOW: "submission.show",
  SUBMISSION_CREATE: "submission.create",
  SUBMISSION_DELETE: "submission.delete",
  SUBMISSION_UPDATE_STATUS: "submission.updateSubmissionStatus",
  SUBMISSION_UPDATE_VALIDITY: "submission.updateSubmissionValidity",
  ACCOUNT_SHOW: "account.show",
  ACCOUNT_CREATE: "account.create",
  ACCOUNT_UPDATE: "account.update",
  ACCOUNT_DELETE: "account.delete",
  ACCOUNT_RESET_PASSWORD: "account.resetPasswordPermission",
  ROLE_SHOW: "role.show",
  ROLE_CREATE: "role.create",
  ROLE_UPDATE: "role.update",
  ROLE_DELETE: "role.delete",
} as const;

export type PermissionKey = (typeof permissions)[keyof typeof permissions];
export type DefaultPermissions = Partial<
  Record<"show" | "create" | "update" | "delete", PermissionKey>
>;
export type PermissionRules = DefaultPermissions & { custom?: PermissionKey[] };
interface PermissionModule {
  key: string;
  defaults: DefaultPermissions;
  custom: readonly PermissionKey[];
}
export interface PagePermission {
  show: boolean;
  create: boolean;
  update: boolean;
  delete: boolean;
  custom: string[];
}

export const permissionModules: readonly PermissionModule[] = [
  {
    key: "dashboard",
    defaults: { show: permissions.DASHBOARD_SHOW },
    custom: [],
  },
  {
    key: "submission",
    defaults: {
      show: permissions.SUBMISSION_SHOW,
      create: permissions.SUBMISSION_CREATE,
      delete: permissions.SUBMISSION_DELETE,
    },
    custom: [
      permissions.SUBMISSION_UPDATE_STATUS,
      permissions.SUBMISSION_UPDATE_VALIDITY,
    ],
  },
  {
    key: "account",
    defaults: {
      show: permissions.ACCOUNT_SHOW,
      create: permissions.ACCOUNT_CREATE,
      update: permissions.ACCOUNT_UPDATE,
      delete: permissions.ACCOUNT_DELETE,
    },
    custom: [permissions.ACCOUNT_RESET_PASSWORD],
  },
  {
    key: "role",
    defaults: {
      show: permissions.ROLE_SHOW,
      create: permissions.ROLE_CREATE,
      update: permissions.ROLE_UPDATE,
      delete: permissions.ROLE_DELETE,
    },
    custom: [],
  },
];

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
  custom: [
    permissions.SUBMISSION_UPDATE_STATUS,
    permissions.SUBMISSION_UPDATE_VALIDITY,
  ],
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

export const CMS_LANDING_ROUTES = [
  [ROUTE_PATHS.DASHBOARD, permissions.DASHBOARD_SHOW],
  [ROUTE_PATHS.SUBMISSIONS, permissions.SUBMISSION_SHOW],
  [ROUTE_PATHS.ACCOUNTS, permissions.ACCOUNT_SHOW],
  [ROUTE_PATHS.ROLES, permissions.ROLE_SHOW],
] as const;

export function checkPermission(
  scopes: readonly string[],
  permission: string,
): boolean {
  return scopes.includes("*") || scopes.includes(permission);
}

export function resolvePermission(
  scopes: readonly string[],
  rules?: PermissionRules,
): PagePermission {
  const wildcard = scopes.includes("*");
  return {
    show: !rules?.show || checkPermission(scopes, rules.show),
    create:
      wildcard ||
      !rules ||
      Boolean(rules.create && checkPermission(scopes, rules.create)),
    update:
      wildcard ||
      !rules ||
      Boolean(rules.update && checkPermission(scopes, rules.update)),
    delete:
      wildcard ||
      !rules ||
      Boolean(rules.delete && checkPermission(scopes, rules.delete)),
    custom: (rules?.custom ?? []).filter((permission) =>
      checkPermission(scopes, permission),
    ),
  };
}
