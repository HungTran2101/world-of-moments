import type { CrudListParams } from "@/services/shared/types";

export const PAGE_SIZES = [10, 20, 50, 100] as const;

export function listQuery(params: CrudListParams) {
  return new URLSearchParams({
    ...params.filters,
    page: String(params.page),
    pageSize: String(params.pageSize),
    search: params.search,
  }).toString();
}

export function readCrudQuery(
  query: URLSearchParams,
  filterKeys: readonly string[] = [],
): CrudListParams {
  const inputPage = Number(query.get("page") || 1);
  const inputSize = Number(query.get("pageSize") || 20);
  return {
    page:
      Number.isSafeInteger(inputPage) && inputPage > 0 && inputPage <= 1_000_000
        ? inputPage
        : 1,
    pageSize: PAGE_SIZES.includes(inputSize as (typeof PAGE_SIZES)[number])
      ? inputSize
      : 20,
    search: (query.get("search") || "").trim().slice(0, 200),
    filters: Object.fromEntries(
      filterKeys.map((key) => [key, query.get(key) || ""]),
    ),
  };
}

export function patchCrudQuery(
  query: URLSearchParams,
  patch: Record<string, string | number>,
) {
  const next = new URLSearchParams(query);
  for (const [key, value] of Object.entries(patch)) {
    if (
      value === "" ||
      (key === "page" && value === 1) ||
      (key === "pageSize" && value === 20)
    )
      next.delete(key);
    else next.set(key, String(value));
  }
  return next;
}
