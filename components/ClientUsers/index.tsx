"use client";

import { ROUTE_PATHS } from "@/services/constant";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useTranslations } from "next-intl";
import { Eye, Trash2 } from "lucide-react";
import { useCRUDPage } from "@/hooks/useCRUDPage";
import { deleteCmsClientUsers, getCmsClientUsers } from "@/services/cms/client-users";
import type { CmsClientUserRecord } from "@/services/cms/client-users/types";
import type { CmsPageProps, CrudListParams } from "@/services/shared/types";
import { formatDateTime } from "@/lib/utils";
import { Header } from "@/components/shared/Header";
import { CmsPageContent } from "@/components/shared/CmsPageContent";
import { Breadcrumbs } from "@/components/shared/Breadcrumbs";
import { Table, type Column } from "@/components/shared/Table";
import { ErrorNotice } from "@/components/shared/Forms";
import { Button } from "@/components/ui/button";
import { useModal } from "@/components/ui/modal";
import { CLIENT_STATUSES } from "@/app/api/client/constant";
import { Select } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";

const ACTION_COLUMN_WIDTH_PX = 150;
const FILTER_KEYS = ["status"] as const;

const clientUserServices = {
  listService: (params: CrudListParams, signal?: AbortSignal) =>
    getCmsClientUsers(params, { signal }),
  deleteService: (ids: string[]) => deleteCmsClientUsers(ids),
};

export function ClientUsersPage({ permission }: CmsPageProps) {
  const t = useTranslations();
  const [modal, contextHolder] = useModal();
  const confirmingDeleteRef = useRef(false);
  const params = useSearchParams();
  const context = params.toString();
  useEffect(() => () => modal.destroyAll(), [context, modal]);
  // Chỉ giữ lựa chọn trong cùng URL để không thao tác nhầm bản ghi sau khi đổi trang/bộ lọc.
  const [selection, setSelection] = useState({ context, keys: [] as string[] });
  const [error, setError] = useState<unknown>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const crud = useCRUDPage({
    queryKey: ["cms", "client-users"],
    services: clientUserServices,
    filterKeys: FILTER_KEYS,
  });
  const { deleteLoading, fetching, deleteRecords } = crud;
  const detailHref = useCallback(
    (id?: string) => {
      const query = new URLSearchParams(context);
      if (id) query.set("id", id);
      else query.delete("id");
      return `${ROUTE_PATHS.CLIENT_USER_DETAIL}${query.size ? `?${query}` : ""}`;
    },
    [context],
  );
  const deleteRow = useCallback(
    async (id: string) => {
      if (confirmingDeleteRef.current || deleteLoading || fetching) return;
      confirmingDeleteRef.current = true;
      try {
        const confirmed = await modal.confirm({
          title: t("common.delete"),
          content: t("common.confirmDelete", { count: 1 }),
          okText: t("common.delete"),
          cancelText: t("common.cancel"),
          okButtonProps: { variant: "destructive" },
        });
        if (!confirmed) return;
        setError(null);
        setDeletingId(id);
        deleteRecords([id], {
          onError: setError,
          onSettled: () => setDeletingId(null),
        });
      } finally {
        confirmingDeleteRef.current = false;
      }
    },
    [deleteLoading, fetching, modal, t, deleteRecords],
  );
  const columns = useMemo<Column<CmsClientUserRecord>[]>(
    () => [
      {
        key: "email",
        title: t("clientUser.email"),
        render: (_, row) => <Link href={detailHref(row.id)}>{row.email}</Link>,
      },
      {
        key: "status",
        title: t("clientUser.status"),
        render: (_, row) => (
          <Badge
            color={
              row.status === "verified" ? "success" : row.status === "banned" ? "error" : "warning"
            }
          >
            {t(`clientUser.statuses.${row.status}`)}
          </Badge>
        ),
      },
      {
        key: "suspendedUntil",
        title: t("clientUser.suspendedUntil"),
        render: (_, row) => (row.suspendedUntil ? formatDateTime(row.suspendedUntil) : "—"),
      },
      {
        key: "suspensionCount",
        title: t("clientUser.suspensionCount"),
        dataIndex: "suspensionCount",
      },
      {
        key: "updatedAt",
        title: t("common.updatedAt"),
        render: (_, row) => (
          <time
            className="whitespace-nowrap"
            dateTime={row.updatedAt}
          >
            {formatDateTime(row.updatedAt)}
          </time>
        ),
      },
      {
        key: "updatedBy",
        title: t("common.updatedBy"),
        render: (_, row) => row.updatedByName ?? row.updatedBy ?? t("clientUser.system"),
      },
      {
        key: "createdAt",
        title: t("common.createdAt"),
        dataIndex: "createdAt",
        render: (_, row) => (
          <time
            className="whitespace-nowrap"
            dateTime={row.createdAt}
          >
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
          <div className="clientUsers-rowActions">
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  asChild
                  variant="outline"
                  size="icon"
                >
                  <Link
                    href={detailHref(record.id)}
                    aria-label={t("common.detail")}
                  >
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
                      disabled={deleteLoading || fetching}
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
    ],
    [t, detailHref, permission.delete, deletingId, deleteLoading, fetching, deleteRow],
  );

  return (
    <>
      <Header
        title={t("nav.clientUsers")}
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
          items={[{ label: t("nav.clientUsers") }]}
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
          extraTools={
            <div className="cms-searchFilter">
              <label htmlFor="client-user-status-filter">{t("clientUser.status")}</label>
              <Select
                id="client-user-status-filter"
                popupClassName="cms-popup"
                allowClear={false}
                value={crud.filters.status || "all"}
                onValueChange={(status) =>
                  crud.onChangeFilters({ status: status === "all" ? "" : status })
                }
                options={[
                  { value: "all", label: t("clientUser.allStatuses") },
                  ...CLIENT_STATUSES.map((value) => ({
                    value,
                    label: t(`clientUser.statuses.${value}`),
                  })),
                ]}
              />
            </div>
          }
          search={crud.search}
          onSearch={crud.onSearch}
          onChangePage={crud.onChangePage}
          onChangePageSize={crud.onChangePageSize}
          loading={crud.loading}
          fetching={fetching}
          error={crud.error}
          onRetry={() => void crud.refetch()}
          navigationKey={context}
          selection={
            permission.delete
              ? {
                  selectedRowKeys: selection.context === context ? selection.keys : [],
                  onChange: (keys) => setSelection({ context, keys }),
                }
              : undefined
          }
          onBulkDelete={permission.delete ? crud.onDelete : undefined}
        />
      </CmsPageContent>
      {contextHolder}
    </>
  );
}
