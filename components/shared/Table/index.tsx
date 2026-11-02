"use client";

import "./index.scss";

import { useEffect, useId, useRef, useState, type ReactNode } from "react";
import { useTranslations } from "next-intl";
import type { PaginationMetadata } from "@/services/shared/pagination";
import { PAGE_SIZES } from "@/services/query-state";
import { SearchInput } from "@/components/shared/SearchInput";
import { ErrorNotice } from "@/components/shared/Forms";

export interface Column<T> {
  key: string;
  title: ReactNode;
  dataIndex?: keyof T;
  render?: (value: unknown, record: T, index: number) => ReactNode;
  width?: number | string;
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
  const ref = useRef<HTMLInputElement>(null);
  useEffect(() => {
    if (ref.current) ref.current.indeterminate = indeterminate;
  }, [indeterminate]);
  return (
    <input
      ref={ref}
      type="checkbox"
      aria-label={label}
      checked={checked}
      disabled={disabled}
      onChange={onChange}
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
      className="Cms-tableSection"
      aria-busy={loading || fetching || executing}
    >
      <div className="Cms-tableToolbar">
        <SearchInput
          value={search}
          onSearch={onSearch}
          navigationKey={navigationKey}
        />
        {selection && (
          <div className="Cms-bulk">
            <label className="visually-hidden" htmlFor={`${id}-action`}>
              {t("common.bulkAction")}
            </label>
            <select
              id={`${id}-action`}
              value={action}
              disabled={executing}
              onChange={(event) => setAction(event.target.value)}
            >
              <option value="">{t("common.bulkAction")}</option>
              {actions.map((item) => (
                <option
                  key={item.action}
                  value={item.action}
                  disabled={item.disabled}
                >
                  {item.label}
                </option>
              ))}
            </select>
            <button
              type="button"
              disabled={!canExecute || executing || fetching}
              onClick={() => void execute()}
            >
              {t(executing ? "common.executing" : "common.execute")}
            </button>
            <span className="Cms-muted" role="status">
              {t("common.selected", { count: selectedKeys.length })}
            </span>
          </div>
        )}
      </div>
      {(Boolean(error) || Boolean(bulkError)) && (
        <ErrorNotice error={bulkError || error} onRetry={onRetry} />
      )}
      <div
        className="Cms-tableScroll"
        tabIndex={0}
        role="region"
        aria-label={t("common.table")}
      >
        <table>
          <thead>
            <tr>
              {selection && (
                <th className="Cms-selection">
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
                  style={{ width: column.width }}
                  className={
                    column.fixed === "right" ? "Cms-fixedRight" : undefined
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
                  className="Cms-tableEmpty"
                  role="status"
                >
                  {t("common.loading")}
                </td>
              </tr>
            ) : datasource.length === 0 ? (
              <tr>
                <td
                  colSpan={columns.length + (selection ? 1 : 0)}
                  className="Cms-tableEmpty"
                >
                  {t(error ? "errors.server" : "common.empty")}
                </td>
              </tr>
            ) : (
              datasource.map((row, index) => (
                <tr key={keyOf(row)}>
                  {selection && (
                    <td className="Cms-selection">
                      <input
                        type="checkbox"
                        aria-label={t("common.selectRow", { key: keyOf(row) })}
                        checked={selection.selectedRowKeys.includes(keyOf(row))}
                        disabled={
                          selection.getCheckboxProp?.(row).disabled ||
                          executing ||
                          fetching
                        }
                        onChange={(event) =>
                          select(
                            event.target.checked
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
                        className={
                          column.fixed === "right"
                            ? "Cms-fixedRight"
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
      <nav className="Cms-pagination" aria-label={t("common.pagination")}>
        <span className="Cms-muted">
          {t("common.total", { count: pagination.total })}
        </span>
        <div className="Cms-paginationPages">
          <button
            type="button"
            aria-label={t("common.previous")}
            disabled={pagination.page <= 1 || fetching}
            onClick={() => onChangePage(pagination.page - 1)}
          >
            ‹
          </button>
          <span aria-live="polite">
            {t("common.page", {
              page: pagination.page,
              total: pagination.totalPages,
            })}
          </span>
          <button
            type="button"
            aria-label={t("common.next")}
            disabled={pagination.page >= pagination.totalPages || fetching}
            onClick={() => onChangePage(pagination.page + 1)}
          >
            ›
          </button>
        </div>
        <label className="Cms-pageSize" htmlFor={`${id}-size`}>
          {t("common.pageSize")}
          <select
            id={`${id}-size`}
            value={pagination.pageSize}
            onChange={(event) => onChangePageSize(Number(event.target.value))}
          >
            {PAGE_SIZES.map((size) => (
              <option key={size} value={size}>
                {size}
              </option>
            ))}
          </select>
        </label>
      </nav>
    </section>
  );
}
