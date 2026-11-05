import { permissions } from "@/services/constant";

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
