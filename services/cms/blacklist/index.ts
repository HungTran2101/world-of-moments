import type { ApiRequestOptions } from "@/services/shared/api";
import { cmsRequest } from "@/services/shared/cms-api";
import type { PaginatedResponse } from "@/services/shared/pagination";
import type { CrudListParams, CmsSuccessResponse } from "@/services/shared/types";
import { listQuery } from "@/services/query-state";
import type { CmsBlacklistEvent, CmsBlacklistRecord, CmsBlacklistSummary } from "./types";

export function getCmsBlacklist(params: CrudListParams, options?: ApiRequestOptions) {
  return cmsRequest<PaginatedResponse<CmsBlacklistRecord>>(`/blacklist?${listQuery(params)}`, options);
}

export function getCmsBlacklistHistory(id: string, page: number, pageSize: number, options?: ApiRequestOptions) {
  const query = new URLSearchParams({
    page: String(page),
    pageSize: String(pageSize)
  });
  return cmsRequest<PaginatedResponse<CmsBlacklistEvent>>(`/blacklist/${encodeURIComponent(id)}/history?${query}`, options);
}

export function revokeCmsBlacklist(id: string, eventId: string, options?: ApiRequestOptions) {
  return cmsRequest<CmsSuccessResponse>(`/blacklist/${encodeURIComponent(id)}/revoke`, {
    ...options,
    method: "POST",
    body: {
      eventId
    }
  });
}

export function getCmsBlacklistSummary(options?: ApiRequestOptions) {
  return cmsRequest<CmsBlacklistSummary>("/blacklist/summary", options);
}
