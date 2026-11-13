"use client";

import { PAGE_SIZES } from "@/services/constant";
import { memo, useId } from "react";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { Select } from "@/components/ui/select";
import { cn } from "@/lib/utils";
import type { PaginationMetadata } from "@/services/shared/pagination";

const FIRST_PAGE = 1;
const PAGE_STEP = 1;

export interface PaginationProps {
  pagination: PaginationMetadata;
  onChangePage: (page: number) => void;
  onChangePageSize: (pageSize: number) => void;
  disabled?: boolean;
  pageSizes?: readonly number[];
  className?: string;
}

export const Pagination = memo(function Pagination({
  pagination,
  onChangePage,
  onChangePageSize,
  disabled = false,
  pageSizes = PAGE_SIZES,
  className,
}: PaginationProps) {
  const t = useTranslations();
  const id = useId();

  return (
    <nav
      className={cn("cms-pagination", className)}
      aria-label={t("common.pagination")}
    >
      <span className="cms-muted">
        {t("common.total", { count: pagination.total })}
      </span>
      <div className="cms-paginationPages">
        <Button
          variant="outline"
          className="h-10"
          type="button"
          aria-label={t("common.previous")}
          disabled={disabled || pagination.page <= FIRST_PAGE}
          onClick={() => onChangePage(pagination.page - PAGE_STEP)}
        >
          ‹
        </Button>
        <span aria-live="polite">
          {t("common.page", {
            page: pagination.page,
            total: pagination.totalPages,
          })}
        </span>
        <Button
          variant="outline"
          className="h-10"
          type="button"
          aria-label={t("common.next")}
          disabled={disabled || pagination.page >= pagination.totalPages}
          onClick={() => onChangePage(pagination.page + PAGE_STEP)}
        >
          ›
        </Button>
      </div>
      <label className="cms-pageSize" htmlFor={`${id}-size`}>
        {t("common.pageSize")}
        <Select
          allowClear={false}
          popupClassName="cms-popup"
          id={`${id}-size`}
          disabled={disabled}
          value={String(pagination.pageSize)}
          onValueChange={(value) => onChangePageSize(Number(value))}
          options={pageSizes.map((size) => ({
            value: String(size),
            label: String(size),
          }))}
        />
      </label>
    </nav>
  );
});
