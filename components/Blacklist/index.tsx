"use client";

import { useCallback, useEffect, useId, useMemo, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";
import { useTranslations } from "next-intl";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { History, ShieldOff } from "lucide-react";
import { getCmsBlacklist, getCmsBlacklistHistory, getCmsBlacklistSummary, revokeCmsBlacklist } from "@/services/cms/blacklist";
import type { CmsBlacklistEvent, CmsBlacklistRecord } from "@/services/cms/blacklist/types";
import type { CmsPageProps, CrudListParams } from "@/services/shared/types";
import { permissions } from "@/services/permission";
import { useCRUDPage } from "@/hooks/useCRUDPage";
import { useCmsStore } from "@/store/cmsStore";
import { formatDateTime } from "@/lib/utils";
import { Header } from "@/components/shared/Header";
import { CmsPageContent } from "@/components/shared/CmsPageContent";
import { Breadcrumbs } from "@/components/shared/Breadcrumbs";
import { Table, type Column } from "@/components/shared/Table";
import { ErrorNotice } from "@/components/shared/Forms";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Select } from "@/components/ui/select";
import { Modal, useModal } from "@/components/ui/modal";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { constants } from "@/app/api/constant";

const FILTER_KEYS = ["status", "scope"] as const;
const SCOPES = ["browser", "network"] as const;
const ACTION_COLUMN_WIDTH_PX = 120;
const FILTER_WIDTH_PX = 200;
const HISTORY_MODAL_WIDTH_PX = 960;
const FIRST_PAGE = 1;
const DEFAULT_HISTORY_PAGE_SIZE = 20;
const blacklistServices = {
  listService: (params: CrudListParams, signal?: AbortSignal) => getCmsBlacklist(params, {
    signal
  })
};
function DateCell({
  value
}: {
  value: string | null;
}) {
  return value ? (
    <time
      className="whitespace-nowrap"
      dateTime={value}
    >
      {formatDateTime(value)}
    </time>
  ) : (
    <>
      —
    </>
  );
}

function BlacklistHistory({
  record,
  onClose
}: {
  record: CmsBlacklistRecord;
  onClose: () => void;
}) {
  const t = useTranslations();
  const userId = useCmsStore(state => state.user?.id);
  const [page, setPage] = useState(FIRST_PAGE);
  const [pageSize, setPageSize] = useState(DEFAULT_HISTORY_PAGE_SIZE);
  const history = useQuery({
    queryKey: ["cms", "blacklist-history", userId, record.id, page, pageSize],
    queryFn: ({
      signal
    }) => getCmsBlacklistHistory(record.id, page, pageSize, {
      signal
    })
  });
  const columns = useMemo<Column<CmsBlacklistEvent>[]>(() => [{
    key: "ip",
    title: t("blacklist.ip"),
    dataIndex: "ip"
  }, {
    key: "createdAt",
    title: t("blacklist.blockedAt"),
    render: (_, row) => <DateCell value={row.createdAt} />
  }, {
    key: "expiresAt",
    title: t("blacklist.expiresAt"),
    render: (_, row) => <DateCell value={row.expiresAt} />
  }, {
    key: "endedAt",
    title: t("blacklist.endedAt"),
    render: (_, row) => <DateCell value={row.endedAt} />
  }, {
    key: "endReason",
    title: t("blacklist.endReason"),
    render: (_, row) => row.endReason ? t(`blacklist.${row.endReason}`) : "—"
  }, {
    key: "revokedBy",
    title: t("blacklist.revokedBy"),
    render: (_, row) => row.revokedBy ?? "—"
  }], [t]);
  const target = record.scope === "browser" ? record.targetId : record.ip;
  return (
    <Modal
      open
      title={t("blacklist.historyTitle", {
        ip: target
      })}
      description={t("blacklist.historyRetention", {
        days: constants.BLACKLIST_EVENT_RETENTION_DAYS
      })}
      onCancel={onClose}
      closeLabel={t("common.close")}
      footer={null}
      width={HISTORY_MODAL_WIDTH_PX}
    >
      <Table
        hiddenToolbar
        datasource={history.data?.items ?? []}
        columns={columns}
        rowKey="id"
        pagination={history.data?.metadata ?? {
          page: FIRST_PAGE,
          pageSize,
          total: 0,
          totalPages: FIRST_PAGE
        }}
        onChangePage={setPage}
        onChangePageSize={size => {
          setPageSize(size);
          setPage(FIRST_PAGE);
        }}
        loading={history.isPending}
        fetching={history.isFetching}
        error={history.error}
        onRetry={() => void history.refetch()}
        navigationKey={`${record.id}:${page}:${pageSize}`}
      />
    </Modal>
  );
}

export function BlacklistPage({
  permission
}: CmsPageProps) {
  const t = useTranslations();
  const params = useSearchParams();
  const context = params.toString();
  const filterId = useId();
  const tabsId = useId();
  const client = useQueryClient();
  const userId = useCmsStore(state => state.user?.id);
  const [modal, contextHolder] = useModal();
  const confirming = useRef(false);
  const [history, setHistory] = useState<{
    context: string;
    record: CmsBlacklistRecord;
  } | null>(null);
  const crud = useCRUDPage({
    queryKey: ["cms", "blacklist"],
    services: blacklistServices,
    filterKeys: FILTER_KEYS
  });
  const { filters, onChangeFilters } = crud;
  const scope = filters.scope === "network" ? "network" : "browser";
  const summary = useQuery({
    queryKey: ["cms", "blacklist-summary", userId],
    queryFn: ({
      signal
    }) => getCmsBlacklistSummary({
      signal
    }),
    enabled: Boolean(userId)
  });
  const revocation = useMutation({
    mutationFn: ({
      id,
      eventId
    }: {
      id: string;
      eventId: string;
    }) => revokeCmsBlacklist(id, eventId),
    onSuccess: async () => {
      await Promise.all([client.invalidateQueries({
        queryKey: ["cms", "blacklist"]
      }), client.invalidateQueries({
        queryKey: ["cms", "blacklist-summary"]
      }), client.invalidateQueries({
        queryKey: ["cms", "blacklist-history"]
      })]);
    },
    onError: () => {
      void client.invalidateQueries({
        queryKey: ["cms", "blacklist"]
      });
      void client.invalidateQueries({
        queryKey: ["cms", "blacklist-summary"]
      });
    }
  });
  useEffect(() => () => modal.destroyAll(), [context, modal]);
  const {
    mutate,
    isPending
  } = revocation;
  const revoke = useCallback(async (row: CmsBlacklistRecord) => {
    if (confirming.current || isPending || !row.isActive || !row.latestEvent) return;
    confirming.current = true;
    try {
      const target = row.scope === "browser" ? row.targetId : row.ip;
      const confirmed = await modal.confirm({
        title: t("blacklist.revoke"),
        content: t("blacklist.confirmRevoke", {
          ip: target,
          days: constants.BLACKLIST_EVENT_RETENTION_DAYS
        }),
        okText: t("blacklist.revoke"),
        cancelText: t("common.cancel")
      });
      if (confirmed) mutate({
        id: row.id,
        eventId: row.latestEvent.id
      });
    } finally {
      confirming.current = false;
    }
  }, [isPending, modal, mutate, t]);
  const canRevoke = permission.custom.includes(permissions.BLACKLIST_REVOKE);
  const columns = useMemo<Column<CmsBlacklistRecord>[]>(() => [...(scope === "browser" ? [{
    key: "targetId",
    title: t("blacklist.browserId"),
    render: (_: unknown, row: CmsBlacklistRecord) => (
      <span title={row.targetId}>
        {row.targetId}
      </span>
    )
  }] : []), {
    key: "ip",
    title: t(scope === "browser" ? "blacklist.latestIp" : "blacklist.ip"),
    dataIndex: "ip"
  }, {
    key: "status",
    title: t("blacklist.status"),
    render: (_, row) => (
      <Badge color={row.isActive ? "error" : "default"}>
        {t(`blacklist.${row.status}`)}
      </Badge>
    )
  }, {
    key: "blacklistCount",
    title: t("blacklist.count"),
    dataIndex: "blacklistCount",
    align: "center"
  }, {
    key: "lastBlockedAt",
    title: t("blacklist.lastBlockedAt"),
    render: (_, row) => <DateCell value={row.lastBlockedAt} />
  }, ...(scope === "network" ? [{
    key: "expiresAt",
    title: t("blacklist.expiresAt"),
    render: (_: unknown, row: CmsBlacklistRecord) => <DateCell value={row.expiresAt} />
  }] : []), {
    key: "revokedAt",
    title: t("blacklist.revokedAt"),
    render: (_, row) => <DateCell value={row.latestEvent?.revokedAt ?? null} />
  }, {
    key: "revokedBy",
    title: t("blacklist.revokedBy"),
    render: (_, row) => row.latestEvent?.revokedBy ?? "—"
  }, {
    key: "createdAt",
    title: t("common.createdAt"),
    render: (_, row) => <DateCell value={row.createdAt} />
  }, {
    key: "actions",
    title: t("common.actions"),
    align: "center",
    fixed: "right",
    width: ACTION_COLUMN_WIDTH_PX,
    render: (_, row) => (
      <div className="flex items-center justify-center gap-2">
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              type="button"
              variant="outline"
              size="icon"
              aria-label={t("blacklist.history")}
              onClick={() => setHistory({
                context,
                record: row
              })}
            >
              <History aria-hidden="true" />
            </Button>
          </TooltipTrigger>
          <TooltipContent>
            {t("blacklist.history")}
          </TooltipContent>
        </Tooltip>
        {canRevoke && row.isActive && row.latestEvent && (
          <Tooltip>
            <TooltipTrigger asChild>
              <span className="inline-flex">
                <Button
                  type="button"
                  variant="outline"
                  size="icon"
                  aria-label={t("blacklist.revoke")}
                  disabled={isPending || crud.fetching}
                  loading={isPending && revocation.variables?.id === row.id}
                  onClick={() => void revoke(row)}
                >
                  <ShieldOff aria-hidden="true" />
                </Button>
              </span>
            </TooltipTrigger>
            <TooltipContent>
              {t("blacklist.revoke")}
            </TooltipContent>
          </Tooltip>
        )}
      </div>
    )
  }], [t, scope, canRevoke, context, isPending, crud.fetching, revocation.variables?.id, revoke]);
  const changeScope = (next: typeof scope) => crud.onChangeFilters({
    scope: next === "browser" ? "" : next,
    status: ""
  });
  const extraTools = useMemo(() => (
    <div className="cms-searchFilter">
      <label htmlFor={`${filterId}-status`}>
        {t("blacklist.status")}
      </label>
      <Select
        id={`${filterId}-status`}
        popupClassName="cms-popup"
        aria-label={t("blacklist.status")}
        allowClear={false}
        value={filters.status || "all"}
        onValueChange={status => onChangeFilters({
          status: status === "all" ? "" : status
        })}
        style={{
          width: FILTER_WIDTH_PX
        }}
        options={(scope === "network"
          ? ["active", "revoked", "expired", "all"]
          : ["active", "revoked", "all"]
        ).map(value => ({
          value,
          label: t(`blacklist.${value}`)
        }))}
      />
    </div>
  ), [filterId, t, scope, filters.status, onChangeFilters]);

  return (
    <>
      <Header title={t("nav.blacklist")} />
      <CmsPageContent>
        <Breadcrumbs
          label={t("common.breadcrumbs")}
          items={[{
            label: t("nav.blacklist")
          }]}
        />
        <div
          role="tablist"
          aria-label={t("nav.blacklist")}
          className="mb-4 flex flex-wrap gap-2"
        >
          {SCOPES.map(tab => {
            const count = tab === "browser" ? summary.data?.activeBrowserBlocks : summary.data?.activeNetworkBans;
            return (
              <Button
                key={tab}
                id={`${tabsId}-${tab}`}
                type="button"
                role="tab"
                aria-selected={scope === tab}
                aria-controls={`${tabsId}-panel`}
                tabIndex={scope === tab ? 0 : -1}
                variant={scope === tab ? "primary" : "outline"}
                onClick={() => changeScope(tab)}
                onKeyDown={event => {
                  if (!["ArrowLeft", "ArrowRight", "Home", "End"].includes(event.key)) return;
                  event.preventDefault();
                  const next = event.key === "Home" ? "browser" : event.key === "End" ? "network" : tab === "browser" ? "network" : "browser";
                  changeScope(next);
                  document.getElementById(`${tabsId}-${next}`)?.focus();
                }}
              >
                {t(`blacklist.${tab}Tab`)}
                {" "}
                <span aria-live="polite">
                  (
                  {count ?? (summary.isPending ? "..." : t("blacklist.unavailable"))}
                  )
                </span>
              </Button>
            );
          })}
        </div>
        {summary.isError && (
          <div className="mb-4">
            <ErrorNotice error={summary.error} />
            <Button
              type="button"
              variant="outline"
              loading={summary.isFetching}
              onClick={() => void summary.refetch()}
            >
              {t("common.retry")}
            </Button>
          </div>
        )}
        {revocation.isError && <ErrorNotice error={revocation.error} />}
        <div
          role="tabpanel"
          id={`${tabsId}-panel`}
          aria-labelledby={`${tabsId}-${scope}`}
        >
          <Table
            datasource={crud.list?.items ?? []}
            columns={columns}
            rowKey="id"
            pagination={crud.list?.metadata ?? {
              page: crud.currentPage,
              pageSize: crud.currentPageSize,
              total: 0,
              totalPages: 1
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
            scroll={{
              x: "max-content"
            }}
            extraTools={extraTools}
          />
        </div>
      </CmsPageContent>
      {history?.context === context && (
        <BlacklistHistory
          key={history.record.id}
          record={history.record}
          onClose={() => setHistory(null)}
        />
      )}
      {contextHolder}
    </>
  );
}
