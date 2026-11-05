"use client";

import { useQueryClient } from "@tanstack/react-query";
import { Select } from "@/components/ui/select";
import { permissions } from "@/services/permission";
import {
  SUBMISSION_STATUSES,
  SUBMISSION_VALIDITIES,
  type SubmissionStatus,
  type SubmissionValidity,
} from "@/services/submissions/constants";
import { usePublishConfirmation } from "./usePublishConfirmation";
import { ROUTE_PATHS } from "@/services/routes";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useId, useState } from "react";
import { useTranslations } from "next-intl";
import { Eye, Trash2 } from "lucide-react";
import { useCRUDPage } from "@/hooks/useCRUDPage";
import {
  bulkModerateCmsSubmissions,
  deleteCmsSubmissions,
  getCmsSubmissions,
} from "@/services/cms/submissions";
import type { CmsSubmissionRecord } from "@/services/cms/submissions/types";
import type { CmsPageProps, CrudListParams } from "@/services/shared/types";
import { formatDateTime } from "@/lib/utils";
import { Header } from "@/components/shared/Header";
import { CmsPageContent } from "@/components/shared/CmsPageContent";
import { Breadcrumbs } from "@/components/shared/Breadcrumbs";
import { Table, type Column } from "@/components/shared/Table";
import { ErrorNotice } from "@/components/shared/Forms";
import { Button } from "@/components/ui/button";
import { Badge, type BadgeColor } from "@/components/ui/badge";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";

const FILTER_KEYS = ["status", "validity"] as const;

const ACTION_COLUMN_WIDTH_PX = 150;

const VALIDITY_BADGE_COLORS = {
  valid: "success",
  invalid: "error",
  "need-inspect": "warning",
} satisfies Record<SubmissionValidity, BadgeColor>;

const submissionServices = {
  listService: (params: CrudListParams, signal?: AbortSignal) =>
    getCmsSubmissions(params, { signal }),
  deleteService: (ids: string[]) => deleteCmsSubmissions(ids),
};

export function SubmissionsPage({ permission }: CmsPageProps) {
  const t = useTranslations();
  const filterId = useId();
  const client = useQueryClient();
  const confirmPublish = usePublishConfirmation();
  const canStatus = permission.custom.includes(
    permissions.SUBMISSION_UPDATE_STATUS,
  );
  const canValidity = permission.custom.includes(
    permissions.SUBMISSION_UPDATE_VALIDITY,
  );
  const params = useSearchParams();
  const context = params.toString();
  // Chỉ giữ lựa chọn trong cùng URL để không thao tác nhầm bản ghi sau khi đổi trang/bộ lọc.
  const [selection, setSelection] = useState({ context, keys: [] as string[] });
  const [error, setError] = useState<unknown>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const crud = useCRUDPage({
    queryKey: ["cms", "submissions"],
    services: submissionServices,
    filterKeys: FILTER_KEYS,
  });
  const detailHref = (id?: string) => {
    const query = new URLSearchParams(params);
    if (id) query.set("id", id);
    else query.delete("id");
    return `${ROUTE_PATHS.SUBMISSION_DETAIL}${query.size ? `?${query}` : ""}`;
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
  const columns: Column<CmsSubmissionRecord>[] = [
    {
      key: "description",
      title: t("submission.description"),
      width: 150,
      render: (_, row) => (
        <span className="block max-w-80 truncate" title={row.description}>
          {row.description}
        </span>
      ),
    },
    {
      key: "coordinates",
      title: t("submission.coordinates"),
      width: 150,
      render: (_, row) => `${row.lat}, ${row.lng}`,
    },
    {
      key: "status",
      title: t("submission.status"),
      align: "center",
      render: (_, row) => (
        <Badge color={row.status === "published" ? "success" : "default"}>
          {t(`submission.statuses.${row.status}`)}
        </Badge>
      ),
    },
    {
      key: "validity",
      title: t("submission.validity"),
      align: "center",
      render: (_, row) => (
        <Badge color={VALIDITY_BADGE_COLORS[row.validity]}>
          {t(`submission.validities.${row.validity}`)}
        </Badge>
      ),
    },
    {
      key: "createdBy",
      align: "center",
      title: t("common.createdBy"),
      dataIndex: "createdBy",
    },
    {
      key: "createdFrom",
      title: t("submission.createdFrom"),
      align: "center",
      render: (_, row) => (
        <Badge color={row.createdFrom === "cms" ? "geekblue" : "cyan"}>
          {t(`submission.sources.${row.createdFrom}`)}
        </Badge>
      ),
    },
    {
      key: "updatedAt",
      title: t("common.updatedAt"),
      render: (_, row) => (
        <time className="whitespace-nowrap" dateTime={row.updatedAt}>
          {formatDateTime(row.updatedAt)}
        </time>
      ),
    },
    {
      key: "updatedBy",
      title: t("common.updatedBy"),
      render: (_, row) => row.updatedBy ?? t("common.unknown"),
    },
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
        <div className="flex justify-center gap-2">
          <Tooltip>
            <TooltipTrigger asChild>
              <Button asChild variant="outline" size="icon">
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
        title={t("nav.submissions")}
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
          items={[{ label: t("nav.submissions") }]}
        />
        {Boolean(error) && <ErrorNotice error={error} />}
        <Table
          scroll={{ x: "max-content" }}
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
            <>
              <div className="cms-searchFilter">
                <label htmlFor={`${filterId}-status`}>{t("submission.status")}</label>
                <Select
                  id={`${filterId}-status`}
                  popupClassName="cms-popup"
                  aria-label={t("submission.status")}
                  labels={{ clear: `${t("common.clearSelection")}: ${t("submission.status")}` }}
                  placeholder={t("submission.allStatuses")}
                  value={crud.filters.status}
                  onValueChange={(status) =>
                    crud.onChangeFilters({
                      status,
                    })
                  }
                  style={{
                    width: 200
                  }}
                  options={SUBMISSION_STATUSES.map((value) => ({
                    value,
                    label: t(`submission.statuses.${value}`),
                  }))}
                />
              </div>
              <div className="cms-searchFilter">
                <label htmlFor={`${filterId}-validity`}>{t("submission.validity")}</label>
                <Select
                  id={`${filterId}-validity`}
                  popupClassName="cms-popup"
                  aria-label={t("submission.validity")}
                  labels={{ clear: `${t("common.clearSelection")}: ${t("submission.validity")}` }}
                  placeholder={t("submission.allValidities")}
                  value={crud.filters.validity}
                  style={{
                    width: 200
                  }}
                  onValueChange={(validity) =>
                    crud.onChangeFilters({
                      validity,
                    })
                  }
                  options={SUBMISSION_VALIDITIES.map((value) => ({
                    value,
                    label: t(`submission.validities.${value}`),
                  }))}
                />
              </div>
            </>
          }
          bulkAction={[
            ...(canStatus
              ? SUBMISSION_STATUSES.map((value) => ({
                action: `status:${value}`,
                label: t(`submission.actions.${value}`),
              }))
              : []),
            ...(canValidity
              ? SUBMISSION_VALIDITIES.map((value) => ({
                action: `validity:${value}`,
                label: t(`submission.actions.${value}`),
              }))
              : []),
          ]}
          onBulkAction={async (action, rows) => {
            const [field, value] = action.split(":");
            const change =
              field === "status"
                ? { status: value as SubmissionStatus }
                : { validity: value as SubmissionValidity };
            const completed = await confirmPublish((confirmed) =>
              bulkModerateCmsSubmissions(
                rows.map(({ id }) => id),
                { ...change, confirmPublish: confirmed },
              ),
            );
            if (!completed) return false;
            await client.invalidateQueries({
              queryKey: ["cms", "submissions"],
            });
          }}
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
            permission.delete || canStatus || canValidity
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
