import type { ApiRequestOptions } from "@/services/shared/api";
import { cmsRequest } from "@/services/shared/cms-api";
import type { PaginatedResponse } from "@/services/shared/pagination";
import type { CrudListParams } from "@/services/shared/types";
import type { RoleValues } from "@/services/schemas";
import { listQuery } from "@/services/query-state";
import type { CmsRoleOption, CmsRoleRecord } from "./types";

export function getCmsRoles(params: CrudListParams, options?: ApiRequestOptions) {
  return cmsRequest<PaginatedResponse<CmsRoleRecord>>(
    `/roles?${listQuery(params)}`,
    options,
  );
}

export function deleteCmsRoles(ids: string[], options?: ApiRequestOptions) {
  return cmsRequest<void>("/roles/bulk-delete", {
    ...options,
    method: "POST",
    body: { ids },
  });
}

export function getCmsRole(id: string, options?: ApiRequestOptions) {
  return cmsRequest<CmsRoleRecord>(`/roles/${encodeURIComponent(id)}`, options);
}

export function createCmsRole(body: RoleValues, options?: ApiRequestOptions) {
  return cmsRequest<CmsRoleRecord>("/roles", {
    ...options,
    method: "POST",
    body,
  });
}

export function updateCmsRole(id: string, body: RoleValues, options?: ApiRequestOptions) {
  return cmsRequest<CmsRoleRecord>(`/roles/${encodeURIComponent(id)}`, {
    ...options,
    method: "PATCH",
    body,
  });
}

export function getCmsRoleOptions(options?: ApiRequestOptions) {
  return cmsRequest<CmsRoleOption[]>("/nopermission/options/roles", options);
}
