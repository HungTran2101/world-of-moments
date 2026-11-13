import type { ApiRequestOptions } from "@/services/shared/api";
import { cmsRequest } from "@/services/shared/cms-api";
import type { PaginatedResponse } from "@/services/shared/pagination";
import type { CmsSuccessResponse, CrudListParams } from "@/services/shared/types";
import type {
  AccountCreateValues,
  AccountUpdateValues,
  ResetPasswordValues,
} from "@/services/schemas";
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

export function getCmsAccount(id: string, options?: ApiRequestOptions) {
  return cmsRequest<CmsAccountRecord>(`/accounts/${encodeURIComponent(id)}`, options);
}

export function createCmsAccount(body: AccountCreateValues, options?: ApiRequestOptions) {
  return cmsRequest<CmsAccountRecord>("/accounts", {
    ...options,
    method: "POST",
    body,
  });
}

export function updateCmsAccount(
  id: string,
  body: AccountUpdateValues,
  options?: ApiRequestOptions,
) {
  return cmsRequest<CmsAccountRecord>(`/accounts/${encodeURIComponent(id)}`, {
    ...options,
    method: "PATCH",
    body,
  });
}

export function resetCmsAccountPassword(
  id: string,
  body: ResetPasswordValues,
  options?: ApiRequestOptions,
) {
  return cmsRequest<CmsSuccessResponse>(`/accounts/${encodeURIComponent(id)}/reset-password`, {
    ...options,
    method: "POST",
    body,
  });
}
