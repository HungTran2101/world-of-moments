"use client";

import { ROUTE_PATHS } from "@/services/routes";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useState } from "react";
import { useTranslations } from "next-intl";
import { Eye, Trash2 } from "lucide-react";
import { useCRUDPage } from "@/hooks/useCRUDPage";
import { deleteCmsAccounts, getCmsAccounts } from "@/services/cms/accounts";
import type { CmsAccountRecord } from "@/services/cms/accounts/types";
import type { CmsPageProps, CrudListParams } from "@/services/shared/types";
import { formatDateTime } from "@/lib/utils";
import { Header } from "@/components/shared/Header";
import { CmsPageContent } from "@/components/shared/CmsPageContent";
import { Breadcrumbs } from "@/components/shared/Breadcrumbs";
import { Table, type Column } from "@/components/shared/Table";
import { ErrorNotice } from "@/components/shared/Forms";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";

const ACTION_COLUMN_WIDTH_PX = 150;

const accountServices = {
  listService: (params: CrudListParams, signal?: AbortSignal) =>
    getCmsAccounts(params, { signal }),
  deleteService: (ids: string[]) => deleteCmsAccounts(ids),
};

export function AccountsPage({ permission }: CmsPageProps) {
  const t = useTranslations();
  const params = useSearchParams();
  const context = params.toString();
  // Chỉ giữ lựa chọn trong cùng URL để không thao tác nhầm bản ghi sau khi đổi trang/bộ lọc.
  const [selection, setSelection] = useState({ context, keys: [] as string[] });
  const [error, setError] = useState<unknown>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const crud = useCRUDPage({
    queryKey: ["cms", "accounts"],
    services: accountServices,
  });
  const detailHref = (id?: string) => {
    const query = new URLSearchParams(params);
    if (id) query.set("id", id);
    else query.delete("id");
    return `${ROUTE_PATHS.ACCOUNT_DETAIL}${query.size ? `?${query}` : ""}`;
  };
  const deleteRow = async (id: string) => {
    if (crud.deleteLoading || crud.fetching) return;
    if (!window.confirm(t("common.confirmDelete", { count: 1 }))) return;
    setError(null);
    setDeletingId(id);
    try {
      await crud.onDelete([id]);
    } catch (error) {
      setError(error);
    } finally {
      setDeletingId(null);
    }
  };
  const columns: Column<CmsAccountRecord>[] = [
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
          className={`cms-status ${row.isActive ? "cms-status-active" : ""}`}
        >
          {t(row.isActive ? "account.active" : "account.inactive")}
        </span>
      ),
    },
    {
      key: "updatedAt", title: t("common.updatedAt"),
      render: (_, row) => <time className="whitespace-nowrap" dateTime={row.updatedAt}>{formatDateTime(row.updatedAt)}</time>,
    },
    { key: "updatedBy", title: t("common.updatedBy"), render: (_, row) => row.updatedBy ?? t("common.unknown") },
    {
      key: "createdAt",
      title: t("common.createdAt"),
      dataIndex: "createdAt",
      render: (_, row) => (
        <time className="whitespace-nowrap" dateTime={row.createdAt}>
          {formatDateTime(row.createdAt)}
        </time>
      ),
    },
    {
      key: "actions",
      title: t("common.actions"),
      align: "center",
      fixed: "right",
      width: ACTION_COLUMN_WIDTH_PX,
      render: (_, record) => (
        <div className="accounts-rowActions">
          <Tooltip>
            <TooltipTrigger asChild>
              <Button asChild variant="outline" size="icon">
                <Link href={detailHref(record.id)} aria-label={t("common.detail")}>
                  <Eye aria-hidden="true" />
                </Link>
              </Button>
            </TooltipTrigger>
            <TooltipContent>{t("common.detail")}</TooltipContent>
          </Tooltip>
          {permission.delete && (
            <Tooltip>
              <TooltipTrigger asChild>
                <span className="inline-flex">
                  <Button
                    variant="destructive"
                    size="icon"
                    type="button"
                    aria-label={t("common.delete")}
                    loading={deletingId === record.id}
                    disabled={crud.deleteLoading || crud.fetching}
                    onClick={() => void deleteRow(record.id)}
                  >
                    <Trash2 aria-hidden="true" />
                  </Button>
                </span>
              </TooltipTrigger>
              <TooltipContent>{t("common.delete")}</TooltipContent>
            </Tooltip>
          )}
        </div>
      ),
    },
  ];

  return (
    <>
      <Header
        title={t("nav.accounts")}
        actions={
          <Button
            asChild
            variant="primary"
            className="h-10 aria-disabled:cursor-not-allowed aria-disabled:opacity-70"
          >
            <Link
              href={detailHref()}
              aria-disabled={!permission.create}
              onClick={(event) => {
                if (!permission.create) event.preventDefault();
              }}
            >
              {t("common.create")}
            </Link>
          </Button>
        }
      />
      <CmsPageContent>
        <Breadcrumbs
          label={t("common.breadcrumbs")}
          items={[
            { label: t("nav.accounts") },
          ]}
        />
        {Boolean(error) && <ErrorNotice error={error} />}
        <Table
          datasource={crud.list?.items ?? []}
          columns={columns}
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
              }
              : undefined
          }
          onBulkDelete={permission.delete ? crud.onDelete : undefined}
        />
      </CmsPageContent>
    </>
  );
}
