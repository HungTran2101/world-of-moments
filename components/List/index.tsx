"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useState } from "react";
import { useTranslations } from "next-intl";
import { useCRUDPage } from "@/hooks/useCRUDPage";
import type { PagePermission } from "@/services/permission";
import type { CrudListParams } from "@/services/shared/types";
import type { PaginatedResponse } from "@/services/shared/pagination";
import { Header } from "@/components/shared/Header";
import { Breadcrumbs } from "@/components/shared/Breadcrumbs";
import { Table, type Column } from "@/components/shared/Table";
import { ErrorNotice } from "@/components/shared/Forms";

export function CrudListPage<T extends { id: string; isSystem?: boolean }>({
  module,
  permission,
  columns,
  services,
}: {
  module: "accounts" | "roles";
  permission: PagePermission;
  columns: Column<T>[];
  services: {
    listService: (
      params: CrudListParams,
      signal?: AbortSignal,
    ) => Promise<PaginatedResponse<T>>;
    deleteService: (ids: string[]) => Promise<unknown>;
  };
}) {
  const t = useTranslations();
  const params = useSearchParams();
  const context = params.toString();
  const [selection, setSelection] = useState({ context, keys: [] as string[] });
  const [error, setError] = useState<unknown>(null);
  const crud = useCRUDPage({ queryKey: ["cms", module], services });
  const detailHref = (id?: string) => {
    const query = new URLSearchParams(params);
    if (id) query.set("id", id);
    else query.delete("id");
    return `/cms/${module}/detail${query.size ? `?${query}` : ""}`;
  };
  const deleteRow = async (id: string) => {
    if (!window.confirm(t("common.confirmDelete", { count: 1 }))) return;
    setError(null);
    try {
      await crud.onDelete([id]);
    } catch (error) {
      setError(error);
    }
  };
  const allColumns: Column<T>[] = [
    ...columns,
    {
      key: "actions",
      title: t("common.actions"),
      fixed: "right",
      width: 150,
      render: (_, record) => (
        <div className="Cms-rowActions">
          <Link href={detailHref(record.id)}>{t("common.detail")}</Link>
          {permission.delete && (
            <button
              type="button"
              className="Cms-dangerLink"
              disabled={record.isSystem || crud.deleteLoading || crud.fetching}
              onClick={() => void deleteRow(record.id)}
            >
              {t("common.delete")}
            </button>
          )}
        </div>
      ),
    },
  ];

  return (
    <>
      <Header title={t(`nav.${module}`)}>
        <Link
          className="Cms-button"
          href={detailHref()}
          aria-disabled={!permission.create}
          onClick={(event) => {
            if (!permission.create) event.preventDefault();
          }}
        >
          {t("common.create")}
        </Link>
      </Header>
      <Breadcrumbs
        label={t("common.breadcrumbs")}
        items={[
          { label: t("nav.home"), href: "/cms" },
          { label: t(`nav.${module}`) },
        ]}
      />
      <div className="Cms-content">
        {Boolean(error) && <ErrorNotice error={error} />}
        <Table
          datasource={crud.list?.items ?? []}
          columns={allColumns}
          rowKey="id"
          pagination={
            crud.list?.metadata ?? {
              page: crud.currentPage,
              pageSize: crud.currentPageSize,
              total: 0,
              totalPages: 1,
            }
          }
          search={crud.search}
          onSearch={crud.onSearch}
          onChangePage={crud.onChangePage}
          onChangePageSize={crud.onChangePageSize}
          loading={crud.loading}
          fetching={crud.fetching}
          error={crud.error}
          onRetry={() => void crud.refetch()}
          navigationKey={context}
          selection={
            permission.delete
              ? {
                  selectedRowKeys:
                    selection.context === context ? selection.keys : [],
                  onChange: (keys) => setSelection({ context, keys }),
                  getCheckboxProp: (record) => ({ disabled: record.isSystem }),
                }
              : undefined
          }
          onBulkDelete={permission.delete ? crud.onDelete : undefined}
        />
      </div>
    </>
  );
}
