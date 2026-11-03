"use client";

import { useTranslations } from "next-intl";
import { deleteCmsAccounts, getCmsAccounts } from "@/services/cms/accounts";
import type { CmsAccountRecord } from "@/services/cms/accounts/types";
import type {
  CmsPageProps,
  CrudListParams,
} from "@/services/shared/types";
import { CrudListPage } from "@/components/List";

const accountServices = {
  listService: (params: CrudListParams, signal?: AbortSignal) =>
    getCmsAccounts(params, { signal }),
  deleteService: (ids: string[]) => deleteCmsAccounts(ids),
};

export function AccountsPage({ permission }: CmsPageProps) {
  const t = useTranslations();
  return (
    <CrudListPage<CmsAccountRecord>
      module="accounts"
      permission={permission}
      services={accountServices}
      columns={[
        {
          key: "username",
          title: t("account.username"),
          dataIndex: "username",
        },
        { key: "name", title: t("account.name"), dataIndex: "name" },
        {
          key: "roles",
          title: t("account.roles"),
          render: (_, row) => row.roles.map(({ name }) => name).join(", "),
        },
        {
          key: "status",
          title: t("account.status"),
          render: (_, row) => (
            <span
              className={`Cms-status ${row.isActive ? "Cms-status-active" : ""}`}
            >
              {t(row.isActive ? "account.active" : "account.inactive")}
            </span>
          ),
        },
      ]}
    />
  );
}
