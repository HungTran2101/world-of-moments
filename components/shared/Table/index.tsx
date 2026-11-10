"use client";

import { LoadingDots } from "@/components/shared/LoadingDots";
import { Button } from "@/components/ui/button";
import { useModal } from "@/components/ui/modal";

import { Checkbox } from "@/components/ui/checkbox";
import { Select } from "@/components/ui/select";

import { useMutation } from "@tanstack/react-query";
import {
  memo,
  useCallback,
  useEffect,
  useId,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { useTranslations } from "next-intl";
import type { PaginationMetadata } from "@/services/shared/pagination";
import { Pagination } from "@/components/shared/Pagination";
import { SearchInput } from "@/components/shared/SearchInput";
import { ErrorNotice } from "@/components/shared/Forms";

const SCROLL_EDGE_TOLERANCE_PX = 1;
const EMPTY_SELECTED_ROW_KEYS: string[] = [];
const EMPTY_BULK_ACTIONS: BulkAction[] = [];

export interface Column<T> {
  key: string;
  title: ReactNode;
  dataIndex?: keyof T;
  render?: (value: unknown, record: T, index: number) => ReactNode;
  width?: number | string;
  align?: "left" | "center" | "right";
  fixed?: "right";
}
export interface TableSelection<T> {
  selectedRowKeys: string[];
  onChange: (keys: string[], selectedRows: T[]) => void;
  getCheckboxProp?: (record: T) => { disabled?: boolean };
}
export interface BulkAction {
  action: string;
  label: string;
  disabled?: boolean;
}

export interface TableScroll {
  x?: number | string | true;
  y?: number | string;
}

type TableToolbarProps = {
  hiddenToolbar?: false;
  search: string;
  onSearch: (value: string) => void;
} | {
  hiddenToolbar: true;
  search?: string;
  onSearch?: (value: string) => void;
};

const SelectAll = memo(function SelectAll({
  checked,
  indeterminate,
  disabled,
  onChange,
  label,
}: {
  checked: boolean;
  indeterminate: boolean;
  disabled: boolean;
  onChange: (checked: boolean) => void;
  label: string;
}) {
  return (
    <Checkbox
      aria-label={label}
      checked={indeterminate ? "indeterminate" : checked}
      disabled={disabled}
      onCheckedChange={(value) => onChange(value === true)}
    />
  );
});

const RowCheckbox = memo(function RowCheckbox({
  rowKeyValue,
  checked,
  disabled,
  label,
  onChange,
}: {
  rowKeyValue: string;
  checked: boolean;
  disabled: boolean;
  label: string;
  onChange: (key: string, checked: boolean) => void;
}) {
  return (
    <Checkbox
      aria-label={label}
      checked={checked}
      disabled={disabled}
      onCheckedChange={(value) => onChange(rowKeyValue, value === true)}
    />
  );
});

const BulkActionSelect = memo(function BulkActionSelect({
  id,
  action,
  actions,
  disabled,
  onChange,
}: {
  id: string;
  action: string;
  actions: BulkAction[];
  disabled: boolean;
  onChange: (action: string) => void;
}) {
  const t = useTranslations();
  return (
    <>
      <label className="visually-hidden" htmlFor={id}>
        {t("common.bulkAction")}
      </label>
      <Select
        labels={{ clear: t("common.clearSelection") }}
        popupClassName="cms-popup"
        id={id}
        value={action}
        className={action === "delete" ? "text-destructive" : undefined}
        disabled={disabled}
        onValueChange={onChange}
        placeholder={t("common.bulkAction")}
        options={actions.map((item) => ({
          value: item.action,
          label: item.label,
          disabled: item.disabled,
          variant: item.action === "delete" ? "destructive" : "default",
        }))}
      />
    </>
  );
});

function TableRowCellsContent<T extends object>({
  row,
  index,
  columns,
}: {
  row: T;
  index: number;
  columns: Column<T>[];
}) {
  return (
    <>
      {columns.map((column) => {
        const value = column.dataIndex ? row[column.dataIndex] : undefined;
        return (
          <td
            key={column.key}
            style={{ textAlign: column.align }}
            className={column.fixed === "right" ? "cms-fixedRight" : undefined}
          >
            {column.render
              ? column.render(value, row, index)
              : value == null
                ? "—"
                : String(value)}
            {column.fixed === "right" && (
              <span className="cms-fixedColumnShadow" aria-hidden="true" />
            )}
          </td>
        );
      })}
    </>
  );
}

// Tách ô dữ liệu khỏi lựa chọn để đổi checkbox không dựng lại nội dung và nút thao tác.
const TableRowCells = memo(TableRowCellsContent) as typeof TableRowCellsContent;

export function Table<T extends object>({
  scroll,
  extraTools,
  datasource,
  columns,
  rowKey,
  pagination,
  search = "",
  onSearch,
  hiddenToolbar = false,
  onChangePage,
  onChangePageSize,
  selection,
  bulkAction = EMPTY_BULK_ACTIONS,
  onBulkAction,
  onBulkDelete,
  loading = false,
  fetching = false,
  error,
  onRetry,
  navigationKey,
}: {
  scroll?: TableScroll;
  extraTools?: ReactNode;
  datasource: T[];
  columns: Column<T>[];
  rowKey: keyof T & string;
  pagination: PaginationMetadata;
  onChangePage: (page: number) => void;
  onChangePageSize: (pageSize: number) => void;
  selection?: TableSelection<T>;
  bulkAction?: BulkAction[];
  onBulkAction?: (action: string, selectedRecords: T[]) => void | boolean | Promise<void | boolean>;
  onBulkDelete?: (selectedRowKeys: string[]) => Promise<void>;
  loading?: boolean;
  fetching?: boolean;
  error?: unknown;
  onRetry?: () => void;
  navigationKey: string;
} & TableToolbarProps) {
  const t = useTranslations();
  const [modal, contextHolder] = useModal();
  const id = useId();
  const scrollRef = useRef<HTMLDivElement>(null);
  const executionLockRef = useRef(false);
  const [action, setAction] = useState("");
  const [bulkError, setBulkError] = useState<unknown>(null);
  const [listAction, setListAction] = useState<"search" | "retry" | null>(null);
  const selectionRef = useRef(selection);

  useLayoutEffect(() => {
    // Handler ổn định đọc lựa chọn đã commit mới nhất, tránh giữ khóa cũ khi memo bỏ qua render.
    selectionRef.current = selection;
  }, [selection]);

  useEffect(() => () => modal.destroyAll(), [modal, navigationKey]);

  useEffect(() => {
    const viewport = scrollRef.current;
    const table = viewport?.querySelector("table");
    if (!viewport || !table) return;

    const updateShadows = () => {
      const maxScrollLeft = viewport.scrollWidth - viewport.clientWidth;
      // Bỏ sai số làm tròn để bóng tắt hẳn khi đã cuộn tới mép bảng.
      viewport.dataset.scrollLeft = String(viewport.scrollLeft > SCROLL_EDGE_TOLERANCE_PX);
      viewport.dataset.scrollRight = String(maxScrollLeft - viewport.scrollLeft > SCROLL_EDGE_TOLERANCE_PX);
    };

    // Theo dõi cả khung và bảng vì dữ liệu, font hoặc kích thước trang có thể đổi độ tràn.
    const observer = new ResizeObserver(updateShadows);
    observer.observe(viewport);
    observer.observe(table);
    viewport.addEventListener("scroll", updateShadows, { passive: true });
    updateShadows();

    return () => {
      observer.disconnect();
      viewport.removeEventListener("scroll", updateShadows);
    };
  }, []);

  useEffect(() => {
    // Bỏ thao tác khi tải xong hoặc chuyển sang URL đã có dữ liệu mới trong cache.
    if (!fetching) setListAction(null);
  }, [fetching, navigationKey]);
  const keyOf = useCallback((record: T) => String(record[rowKey]), [rowKey]);
  const selectionEnabled = Boolean(selection);
  const selectedRowKeys = selection?.selectedRowKeys ?? EMPTY_SELECTED_ROW_KEYS;
  const getCheckboxProp = selection?.getCheckboxProp;
  const selectedKeySet = useMemo(() => new Set(selectedRowKeys), [selectedRowKeys]);
  const eligible = useMemo(
    () => selectionEnabled
      ? datasource.filter((row) => !getCheckboxProp?.(row).disabled)
      : [],
    [datasource, selectionEnabled, getCheckboxProp],
  );
  const eligibleKeys = useMemo(() => eligible.map(keyOf), [eligible, keyOf]);
  const selectedRows = useMemo(
    () => eligible.filter((row) => selectedKeySet.has(keyOf(row))),
    [eligible, selectedKeySet, keyOf],
  );
  const selectedKeys = useMemo(() => selectedRows.map(keyOf), [selectedRows, keyOf]);
  const hasBulkDelete = Boolean(onBulkDelete);
  const actions = useMemo<BulkAction[]>(() => [
    ...bulkAction.filter((item) => item.action !== "delete"),
    ...(hasBulkDelete ? [{ action: "delete", label: t("common.delete") }] : []),
  ], [bulkAction, hasBulkDelete, t]);
  const activeAction = actions.find((item) => item.action === action);
  const canExecute = Boolean(
    selection &&
    selectedRows.length &&
    activeAction &&
    !activeAction.disabled &&
    (action === "delete" ? onBulkDelete : onBulkAction),
  );

  const select = useCallback((keys: string[]) => {
    const keysToSelect = new Set(keys);
    selectionRef.current?.onChange(
      keys,
      datasource.filter((row) => keysToSelect.has(keyOf(row))),
    );
  }, [datasource, keyOf]);
  const handleRowSelection = useCallback((key: string, checked: boolean) => {
    const currentSelection = selectionRef.current;
    if (!currentSelection) return;
    select(checked
      ? [...new Set([...currentSelection.selectedRowKeys, key])]
      : currentSelection.selectedRowKeys.filter((selectedKey) => selectedKey !== key));
  }, [select]);
  const handleSelectAll = useCallback(
    (checked: boolean) => select(checked ? eligibleKeys : []),
    [select, eligibleKeys],
  );
  const handleSearch = useCallback((value: string) => {
    setListAction("search");
    onSearch?.(value);
  }, [onSearch]);
  const execution = useMutation({
    mutationFn: async ({ action, keys, rows }: {
      action: string;
      keys: string[];
      rows: T[];
      onSelectionChange?: TableSelection<T>["onChange"];
    }) => {
      if (action === "delete") {
        const confirmed = await modal.confirm({
          title: t("common.delete"),
          content: t("common.confirmDelete", { count: keys.length }),
          okText: t("common.delete"),
          cancelText: t("common.cancel"),
          okButtonProps: { variant: "destructive" },
        });
        if (!confirmed) return false;
        await onBulkDelete?.(keys);
        return true;
      }
      return onBulkAction?.(action, rows);
    },
    onMutate: () => setBulkError(null),
    onSuccess: (completed, { onSelectionChange }) => {
      if (completed === false) return;
      onSelectionChange?.([], []);
      setAction("");
    },
    onError: setBulkError,
    onSettled: () => { executionLockRef.current = false; },
  });
  const executing = execution.isPending;
  const execute = () => {
    if (!canExecute || executionLockRef.current || fetching) return;
    executionLockRef.current = true;
    // Chốt action và bản ghi trước khi chờ xác nhận bất đồng bộ để không đổi mục tiêu thao tác.
    execution.mutate({
      action,
      keys: [...selectedKeys],
      rows: selectedRows,
      onSelectionChange: selection?.onChange,
    });
  };

  return (
    <section
      className="cms-tableSection"
      aria-busy={loading || fetching || executing}
    >
      {!hiddenToolbar && (
        <div className="cms-tableToolbar">
          <SearchInput
            extraTools={extraTools}
            value={search}
            onSearch={handleSearch}
            loading={fetching && listAction === "search"}
            navigationKey={navigationKey}
          />
          {selection && (
            <div className="cms-bulk">
              <BulkActionSelect
                id={`${id}-action`}
                action={action}
                actions={actions}
                disabled={executing}
                onChange={setAction}
              />
              <Button
                variant={action === "delete" ? "destructive" : "primary"}
                className="h-10"
                type="button"
                disabled={!canExecute || fetching}
                onClick={() => void execute()}
                aria-label={t(executing ? "common.executing" : "common.execute")}
                loading={executing}
              >
                {t("common.execute")}
              </Button>
              <span className="cms-muted" role="status">
                {t("common.selected", { count: selectedKeys.length })}
              </span>
            </div>
          )}
        </div>
      )}
      {(Boolean(error) || Boolean(bulkError)) && (
        <ErrorNotice
          error={bulkError || error}
          onRetry={
            onRetry
              ? () => {
                setListAction("retry");
                onRetry();
              }
              : undefined
          }
          retryLoading={fetching && listAction === "retry"}
        />
      )}
      <div
        ref={scrollRef}
        className={`cms-tableScroll${scroll?.y !== undefined ? " cms-tableScroll--fixedHeader" : ""}`}
        style={{ maxHeight: scroll?.y }}
        tabIndex={0}
        role="region"
        aria-label={t("common.table")}
      >
        <table
          style={
            scroll?.x !== undefined
              ? {
                  width: scroll.x === true ? "max-content" : scroll.x,
                  minWidth: "100%",
                }
              : undefined
          }
        >
          <thead>
            <tr>
              {selection && (
                <th className="cms-selection">
                  <SelectAll
                    label={t("common.selectAll")}
                    checked={
                      eligible.length > 0 &&
                      selectedRows.length === eligible.length
                    }
                    indeterminate={
                      selectedRows.length > 0 &&
                      selectedRows.length < eligible.length
                    }
                    disabled={!eligible.length || executing || fetching}
                    onChange={handleSelectAll}
                  />
                  <span className="cms-fixedColumnShadow" aria-hidden="true" />
                </th>
              )}
              {columns.map((column) => (
                <th
                  scope="col"
                  key={column.key}
                  style={{ width: column.width, textAlign: column.align }}
                  className={
                    column.fixed === "right" ? "cms-fixedRight" : undefined
                  }
                >
                  {column.title}
                  {column.fixed === "right" && <span className="cms-fixedColumnShadow" aria-hidden="true" />}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td
                  colSpan={columns.length + (selection ? 1 : 0)}
                  className="cms-tableEmpty"
                  role="status"
                  aria-label={t("common.loading")}
                >
                  <LoadingDots />
                </td>
              </tr>
            ) : datasource.length === 0 ? (
              <tr>
                <td
                  colSpan={columns.length + (selection ? 1 : 0)}
                  className="cms-tableEmpty"
                >
                  {t(error ? "errors.server" : "common.empty")}
                </td>
              </tr>
            ) : (
              datasource.map((row, index) => (
                <tr
                  key={keyOf(row)}
                  data-state={selectedKeySet.has(keyOf(row)) ? "selected" : undefined}
                >
                  {selection && (
                    <td className="cms-selection">
                      <RowCheckbox
                        rowKeyValue={keyOf(row)}
                        label={t("common.selectRow", { key: keyOf(row) })}
                        checked={selectedKeySet.has(keyOf(row))}
                        disabled={
                          Boolean(getCheckboxProp?.(row).disabled) ||
                          executing ||
                          fetching
                        }
                        onChange={handleRowSelection}
                      />
                      <span className="cms-fixedColumnShadow" aria-hidden="true" />
                    </td>
                  )}
                  <TableRowCells row={row} index={index} columns={columns} />
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
      <Pagination
        pagination={pagination}
        onChangePage={onChangePage}
        onChangePageSize={onChangePageSize}
        disabled={fetching}
      />
      {contextHolder}
    </section>
  );
}
