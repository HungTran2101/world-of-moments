"use client";

import { useTranslations } from "next-intl";
import { deleteCmsRoles, getCmsRoles } from "@/services/cms/roles";
import type { CmsRoleRecord } from "@/services/cms/roles/types";
import type {
  CmsPageProps,
  CrudListParams,
} from "@/services/shared/types";
import { CrudListPage } from "@/components/List";

const roleServices = {
  listService: (params: CrudListParams, signal?: AbortSignal) =>
    getCmsRoles(params, { signal }),
  deleteService: (ids: string[]) => deleteCmsRoles(ids),
};

export function RolesPage({ permission }: CmsPageProps) {
  const t = useTranslations();
  return (
    <CrudListPage<CmsRoleRecord>
      module="roles"
      permission={permission}
      services={roleServices}
      columns={[
        { key: "name", title: t("role.name"), dataIndex: "name" },
        {
          key: "permissions",
          title: t("role.permissions"),
          render: (_, row) =>
            row.isSystem ? t("role.fullAccess") : row.permissions.length,
        },
        {
          key: "system",
          title: t("role.type"),
          render: (_, row) => t(row.isSystem ? "role.system" : "role.custom"),
        },
      ]}
    />
  );
}
