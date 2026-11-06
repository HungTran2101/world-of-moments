"use client";

import {
  useMutation,
  useQuery,
  useQueryClient,
  type QueryKey,
} from "@tanstack/react-query";
import { useSearchParams } from "next/navigation";
import { useEffect, useMemo } from "react";
import type { PaginatedResponse } from "@/services/shared/pagination";
import type { CrudListParams } from "@/services/shared/types";
import { patchCrudQuery, readCrudQuery } from "@/services/query-state";
import { useCmsStore } from "@/store/cmsStore";

const NO_FILTERS: readonly string[] = [];

export function useCRUDPage<T>({
  queryKey,
  services,
  filterKeys = NO_FILTERS,
}: {
  queryKey: QueryKey;
  services: {
    listService: (
      params: CrudListParams,
      signal?: AbortSignal,
    ) => Promise<PaginatedResponse<T>>;
    deleteService: (ids: string[]) => Promise<unknown>;
  };
  filterKeys?: readonly string[];
}) {
  const searchParams = useSearchParams();
  const userId = useCmsStore((state) => state.user?.id);
  const queryClient = useQueryClient();
  const queryString = searchParams.toString();
  const params = useMemo(
    () => readCrudQuery(new URLSearchParams(queryString), filterKeys),
    [queryString, filterKeys],
  );
  const scopedKey = [...queryKey, userId];
  const query = useQuery({
    queryKey: [...scopedKey, params],
    queryFn: ({ signal }) => services.listService(params, signal),
    enabled: Boolean(userId),
  });

  const changeQuery = (
    patch: Record<string, string | number>,
    replace = false,
  ) => {
    // Đọc URL mới nhất ngay lúc cập nhật để các thao tác liên tiếp không ghi đè nhau.
    const next = patchCrudQuery(
      new URLSearchParams(window.location.search),
      patch,
    ).toString();
    const url = `${window.location.pathname}${next ? `?${next}` : ""}${window.location.hash}`;
    window.history[replace ? "replaceState" : "pushState"](null, "", url);
  };

  useEffect(() => {
    if (
      query.data &&
      query.data.metadata.page !== params.page &&
      !query.isFetching
    ) {
      const next = patchCrudQuery(new URLSearchParams(window.location.search), {
        page: query.data.metadata.page,
      });
      window.history.replaceState(
        null,
        "",
        `${window.location.pathname}${next.size ? `?${next}` : ""}`,
      );
    }
  }, [query.data, query.isFetching, params.page]);

  const deletion = useMutation({
    mutationFn: services.deleteService,
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: scopedKey });
    },
  });

  return {
    list: query.data,
    currentPage: query.data?.metadata.page ?? params.page,
    currentPageSize: params.pageSize,
    onChangePage: (page: number) => changeQuery({ page }),
    onChangePageSize: (pageSize: number) => changeQuery({ pageSize, page: 1 }),
    onDelete: async (ids: string[]) => {
      if (ids.length) await deletion.mutateAsync([...new Set(ids)]);
    },
    loading: query.isPending,
    fetching: query.isFetching,
    deleteLoading: deletion.isPending,
    deleteRecords: deletion.mutate,
    search: params.search,
    filters: params.filters,
    onSearch: (search: string) => {
      const normalized = search.trim().slice(0, 200);
      if (normalized === params.search) void query.refetch();
      else changeQuery({ search: normalized, page: 1 }, true);
    },
    onChangeFilters: (filters: Record<string, string>) =>
      changeQuery({
        ...Object.fromEntries(
          Object.entries(filters).filter(([key]) => filterKeys.includes(key)),
        ),
        page: 1,
      }),
    refetch: query.refetch,
    error: query.error ?? deletion.error,
  };
}
