import type { ApiRequestOptions } from "@/services/shared/api";
import { cmsRequest } from "@/services/shared/cms-api";
import type { PaginatedResponse } from "@/services/shared/pagination";
import type {
  CrudListParams,
  CmsSuccessResponse,
} from "@/services/shared/types";
import type {
  SubmissionCreateValues,
  SubmissionUpdateValues,
} from "@/services/schemas";
import { listQuery } from "@/services/query-state";
import type { CmsSubmissionRecord } from "./types";

export function getCmsSubmissions(
  params: CrudListParams,
  options?: ApiRequestOptions,
) {
  return cmsRequest<PaginatedResponse<CmsSubmissionRecord>>(
    `/submissions?${listQuery(params)}`,
    options,
  );
}
export function getCmsSubmission(id: string, options?: ApiRequestOptions) {
  return cmsRequest<CmsSubmissionRecord>(
    `/submissions/${encodeURIComponent(id)}`,
    options,
  );
}
export function createCmsSubmission(
  body: SubmissionCreateValues,
  options?: ApiRequestOptions,
) {
  return cmsRequest<CmsSubmissionRecord>("/submissions", {
    ...options,
    method: "POST",
    body,
  });
}
export function updateCmsSubmission(
  id: string,
  body: SubmissionUpdateValues,
  options?: ApiRequestOptions,
) {
  return cmsRequest<CmsSubmissionRecord>(
    `/submissions/${encodeURIComponent(id)}`,
    { ...options, method: "PATCH", body },
  );
}
export function bulkModerateCmsSubmissions(
  ids: string[],
  body: SubmissionUpdateValues,
  options?: ApiRequestOptions,
) {
  return cmsRequest<CmsSuccessResponse>("/submissions/bulk-moderate", {
    ...options,
    method: "POST",
    body: { ids, ...body },
  });
}
export function deleteCmsSubmissions(
  ids: string[],
  options?: ApiRequestOptions,
) {
  return cmsRequest<CmsSuccessResponse>("/submissions/bulk-delete", {
    ...options,
    method: "POST",
    body: { ids },
  });
}
