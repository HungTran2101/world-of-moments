import { memo } from "react";
import { useTranslations } from "next-intl";
import { useWatch, type Control, type UseFormGetValues } from "react-hook-form";
import { Checkbox } from "@/components/ui/checkbox";
import { Select } from "@/components/ui/select";
import { permissionModules, type PermissionKey } from "@/services/permission";
import type { RoleValues } from "@/services/schemas";

export const DEFAULT_PERMISSION_COLUMNS = [
  "show",
  "create",
  "update",
  "delete",
] as const;

type PermissionModuleRowProps = {
  module: (typeof permissionModules)[number];
  control: Control<RoleValues>;
  getValues: UseFormGetValues<RoleValues>;
  onChange: (permissions: string[]) => void;
  onBlur: () => void;
  disabled: boolean;
  isSystem: boolean;
};

export const PermissionModuleRow = memo(function PermissionModuleRow({
  module,
  control,
  getValues,
  onChange,
  onBlur,
  disabled,
  isSystem,
}: PermissionModuleRowProps) {
  const t = useTranslations();
  const modulePermissions: PermissionKey[] = [
    ...Object.values(module.defaults),
    ...module.custom,
  ].filter((key): key is PermissionKey => key !== undefined);
  // Chỉ đăng ký phần quyền của hàng này để thay đổi module khác không render lại hàng.
  const selectedPermissions = useWatch({
    control,
    name: "permissions",
    compute: (permissions) =>
      modulePermissions.filter((key) => permissions.includes(key)),
  });
  const hasPermissions = Boolean(modulePermissions.length);
  const allChecked =
    hasPermissions &&
    (isSystem ||
      modulePermissions.every((key) => selectedPermissions.includes(key)));
  const someChecked = selectedPermissions.length > 0;

  function updatePermissions(
    keys: readonly PermissionKey[],
    selected: readonly string[],
  ) {
    // Đọc giá trị mới nhất lúc tương tác để giữ mọi thay đổi ở các module khác.
    onChange([
      ...getValues("permissions").filter((key) => !keys.includes(key)),
      ...selected,
    ]);
  }

  return (
    <tr>
      <th scope="row">
        <label
          className="inline-flex cursor-pointer items-center gap-2 has-disabled:cursor-not-allowed"
          htmlFor={`cms-role-module-${module.key}`}
        >
          <Checkbox
            id={`cms-role-module-${module.key}`}
            disabled={!hasPermissions || disabled}
            checked={allChecked ? true : someChecked ? "indeterminate" : false}
            onBlur={onBlur}
            onCheckedChange={(checked) =>
              updatePermissions(
                modulePermissions,
                checked === true ? modulePermissions : [],
              )
            }
          />
          {t(`modules.${module.key}`)}
        </label>
      </th>
      {DEFAULT_PERMISSION_COLUMNS.map((action) => {
        const key = module.defaults[action];
        return (
          <td key={action}>
            {key ? (
              <Checkbox
                disabled={disabled}
                checked={isSystem || selectedPermissions.includes(key)}
                aria-label={`${t(`modules.${module.key}`)}: ${t(`role.${action}`)}`}
                onCheckedChange={(checked) =>
                  updatePermissions([key], checked === true ? [key] : [])
                }
              />
            ) : (
              <span className="cms-muted">—</span>
            )}
          </td>
        );
      })}
      <td>
        {module.custom.length > 0 ? (
          <Select
            popupClassName="cms-popup"
            multiple
            placeholder={t("common.selectPlaceholder")}
            labels={{
              empty: t("common.noOptions"),
              toggle: t("common.toggleOptions"),
              clear: t("common.clearSelection"),
              remove: (label) => t("common.removeSelection", { label }),
            }}
            disabled={disabled}
            aria-label={`${t(`modules.${module.key}`)}: ${t("role.extra")}`}
            value={
              isSystem
                ? [...module.custom]
                : selectedPermissions.filter((value) =>
                    module.custom.includes(value),
                  )
            }
            options={module.custom.map((key) => ({
              value: key,
              label: t(`permissionNames.${key}`),
            }))}
            onBlur={onBlur}
            onValueChange={(selected) =>
              updatePermissions(module.custom, selected)
            }
          />
        ) : (
          <span className="cms-muted">—</span>
        )}
      </td>
    </tr>
  );
});
