import type { ApiRequestOptions } from "@/services/shared/api";
import { cmsRequest } from "@/services/shared/cms-api";
import type { PaginatedResponse } from "@/services/shared/pagination";
import type { CrudListParams } from "@/services/shared/types";
import { listQuery } from "@/services/query-state";
import type { CmsAccountRecord } from "./types";

export function getCmsAccounts(params: CrudListParams, options?: ApiRequestOptions) {
  return cmsRequest<PaginatedResponse<CmsAccountRecord>>(
    `/accounts?${listQuery(params)}`,
    options,
  );
}

export function deleteCmsAccounts(ids: string[], options?: ApiRequestOptions) {
  return cmsRequest<void>("/accounts/bulk-delete", {
    ...options,
    method: "POST",
    body: { ids },
  });
}
