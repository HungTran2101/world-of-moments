import { cmsRequest } from "@/services/shared/cms-api";
import { listQuery } from "@/services/query-state";
import type { ApiRequestOptions } from "@/services/shared/api";
import type { PaginatedResponse } from "@/services/shared/pagination";
import type { CrudListParams, CmsSuccessResponse } from "@/services/shared/types";
import type { ClientUserCreateValues } from "@/services/schemas";
import type { ClientStatus } from "@/services/client-auth/types";
import type { CmsClientUserRecord } from "./types";
export function getCmsClientUsers(params: CrudListParams, options?: ApiRequestOptions) {
  return cmsRequest<PaginatedResponse<CmsClientUserRecord>>(
    `/client-users?${listQuery(params)}`,
    options,
  );
}
export function getCmsClientUser(id: string, options?: ApiRequestOptions) {
  return cmsRequest<CmsClientUserRecord>(`/client-users/${encodeURIComponent(id)}`, options);
}
export function createCmsClientUser(body: ClientUserCreateValues, options?: ApiRequestOptions) {
  return cmsRequest<CmsClientUserRecord & { emailError?: boolean }>("/client-users", {
    ...options,
    method: "POST",
    body,
  });
}
export function changeCmsClientUserStatus(
  id: string,
  status: ClientStatus,
  options?: ApiRequestOptions,
) {
  return cmsRequest<CmsSuccessResponse>(`/client-users/${encodeURIComponent(id)}`, {
    ...options,
    method: "PATCH",
    body: { status },
  });
}
export function revokeCmsClientUserBan(id: string, options?: ApiRequestOptions) {
  return cmsRequest<CmsSuccessResponse>(`/client-users/${encodeURIComponent(id)}/revoke-ban`, {
    ...options,
    method: "POST",
  });
}
export function deleteCmsClientUsers(ids: string[], options?: ApiRequestOptions) {
  return cmsRequest<CmsSuccessResponse>("/client-users/bulk-delete", {
    ...options,
    method: "POST",
    body: { ids },
  });
}
