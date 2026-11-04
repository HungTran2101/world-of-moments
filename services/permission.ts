export const permissions = {
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
export type PermissionRules = Partial<
  Record<"show" | "create" | "update" | "delete", PermissionKey>
> & { custom?: PermissionKey[] };
export interface PagePermission {
  show: boolean;
  create: boolean;
  update: boolean;
  delete: boolean;
  custom: string[];
}

export const permissionModules = [
  {
    key: "submission",
    defaults: [
      permissions.SUBMISSION_SHOW,
      permissions.SUBMISSION_CREATE,
      null,
      permissions.SUBMISSION_DELETE,
    ],
    custom: [
      permissions.SUBMISSION_UPDATE_STATUS,
      permissions.SUBMISSION_UPDATE_VALIDITY,
    ],
  },
  {
    key: "account",
    defaults: [
      permissions.ACCOUNT_SHOW,
      permissions.ACCOUNT_CREATE,
      permissions.ACCOUNT_UPDATE,
      permissions.ACCOUNT_DELETE,
    ],
    custom: [permissions.ACCOUNT_RESET_PASSWORD],
  },
  {
    key: "role",
    defaults: [
      permissions.ROLE_SHOW,
      permissions.ROLE_CREATE,
      permissions.ROLE_UPDATE,
      permissions.ROLE_DELETE,
    ],
    custom: [],
  },
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
