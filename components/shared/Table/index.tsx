"use client";

import { LoadingDots } from "@/components/shared/LoadingDots";
import { Button } from "@/components/ui/button";

import { Checkbox } from "@/components/ui/checkbox";
import { Select } from "@/components/ui/select";

import { useEffect, useId, useState, type ReactNode } from "react";
import { useTranslations } from "next-intl";
import type { PaginationMetadata } from "@/services/shared/pagination";
import { Pagination } from "@/components/shared/Pagination";
import { SearchInput } from "@/components/shared/SearchInput";
import { ErrorNotice } from "@/components/shared/Forms";

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

function SelectAll({
  checked,
  indeterminate,
  disabled,
  onChange,
  label,
}: {
  checked: boolean;
  indeterminate: boolean;
  disabled: boolean;
  onChange: () => void;
  label: string;
}) {
  return (
    <Checkbox
      aria-label={label}
      checked={indeterminate ? "indeterminate" : checked}
      disabled={disabled}
      onCheckedChange={onChange}
    />
  );
}

export function Table<T extends object>({
  datasource,
  columns,
  rowKey,
  pagination,
  search,
  onSearch,
  onChangePage,
  onChangePageSize,
  selection,
  bulkAction = [],
  onBulkAction,
  onBulkDelete,
  loading = false,
  fetching = false,
  error,
  onRetry,
  navigationKey,
}: {
  datasource: T[];
  columns: Column<T>[];
  rowKey: keyof T & string;
  pagination: PaginationMetadata;
  search: string;
  onSearch: (value: string) => void;
  onChangePage: (page: number) => void;
  onChangePageSize: (pageSize: number) => void;
  selection?: TableSelection<T>;
  bulkAction?: BulkAction[];
  onBulkAction?: (action: string, selectedRecords: T[]) => void | Promise<void>;
  onBulkDelete?: (selectedRowKeys: string[]) => Promise<void>;
  loading?: boolean;
  fetching?: boolean;
  error?: unknown;
  onRetry?: () => void;
  navigationKey: string;
}) {
  const t = useTranslations();
  const id = useId();
  const [action, setAction] = useState("");
  const [executing, setExecuting] = useState(false);
  const [bulkError, setBulkError] = useState<unknown>(null);
  const [listAction, setListAction] = useState<"search" | "retry" | null>(null);

  useEffect(() => {
    // Bỏ thao tác khi tải xong hoặc chuyển sang URL đã có dữ liệu mới trong cache.
    if (!fetching) setListAction(null);
  }, [fetching, navigationKey]);
  const keyOf = (record: T) => String(record[rowKey]);
  const eligible = datasource.filter(
    (row) => !selection?.getCheckboxProp?.(row).disabled,
  );
  const selectedRows = eligible.filter((row) =>
    selection?.selectedRowKeys.includes(keyOf(row)),
  );
  const selectedKeys = selectedRows.map(keyOf);
  const actions: BulkAction[] = [
    ...bulkAction.filter((item) => item.action !== "delete"),
    ...(onBulkDelete ? [{ action: "delete", label: t("common.delete") }] : []),
  ];
  const activeAction = actions.find((item) => item.action === action);
  const canExecute = Boolean(
    selection &&
    selectedRows.length &&
    activeAction &&
    !activeAction.disabled &&
    (action === "delete" ? onBulkDelete : onBulkAction),
  );

  const select = (keys: string[]) =>
    selection?.onChange(
      keys,
      datasource.filter((row) => keys.includes(keyOf(row))),
    );
  const execute = async () => {
    if (!canExecute || executing || fetching) return;
    if (
      action === "delete" &&
      !window.confirm(t("common.confirmDelete", { count: selectedKeys.length }))
    )
      return;
    setExecuting(true);
    setBulkError(null);
    try {
      if (action === "delete") await onBulkDelete?.(selectedKeys);
      else await onBulkAction?.(action, selectedRows);
      selection?.onChange([], []);
      setAction("");
    } catch (error) {
      setBulkError(error);
    } finally {
      setExecuting(false);
    }
  };

  return (
    <section
      className="cms-tableSection"
      aria-busy={loading || fetching || executing}
    >
      <div className="cms-tableToolbar">
        <SearchInput
          value={search}
          onSearch={(value) => {
            setListAction("search");
            onSearch(value);
          }}
          loading={fetching && listAction === "search"}
          navigationKey={navigationKey}
        />
        {selection && (
          <div className="cms-bulk">
            <label className="visually-hidden" htmlFor={`${id}-action`}>
              {t("common.bulkAction")}
            </label>
            <Select
              popupClassName="cms-popup"
              id={`${id}-action`}
              value={action}
              disabled={executing}
              onValueChange={setAction}
              placeholder={t("common.bulkAction")}
              options={actions.map((item) => ({
                value: item.action,
                label: item.label,
                disabled: item.disabled,
              }))}
            />
            <Button
              variant="primary"
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
        className="cms-tableScroll"
        tabIndex={0}
        role="region"
        aria-label={t("common.table")}
      >
        <table>
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
                    onChange={() =>
                      select(
                        selectedRows.length === eligible.length
                          ? []
                          : eligible.map(keyOf),
                      )
                    }
                  />
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
                <tr key={keyOf(row)}>
                  {selection && (
                    <td className="cms-selection">
                      <Checkbox
                        aria-label={t("common.selectRow", { key: keyOf(row) })}
                        checked={selection.selectedRowKeys.includes(keyOf(row))}
                        disabled={
                          selection.getCheckboxProp?.(row).disabled ||
                          executing ||
                          fetching
                        }
                        onCheckedChange={(checked) =>
                          select(
                            checked === true
                              ? [
                                ...new Set([
                                  ...selection.selectedRowKeys,
                                  keyOf(row),
                                ]),
                              ]
                              : selection.selectedRowKeys.filter(
                                (key) => key !== keyOf(row),
                              ),
                          )
                        }
                      />
                    </td>
                  )}
                  {columns.map((column) => {
                    const value = column.dataIndex
                      ? row[column.dataIndex]
                      : undefined;
                    return (
                      <td
                        key={column.key}
                        style={{ textAlign: column.align }}
                        className={
                          column.fixed === "right"
                            ? "cms-fixedRight"
                            : undefined
                        }
                      >
                        {column.render
                          ? column.render(value, row, index)
                          : value == null
                            ? "—"
                            : String(value)}
                      </td>
                    );
                  })}
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
    </section>
  );
}
