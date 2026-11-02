import type { ApiRequestOptions } from "@/services/shared/api";
import { cmsRequest } from "@/services/shared/cms-api";
import type { PaginatedResponse } from "@/services/shared/pagination";
import type { CrudListParams } from "@/services/shared/types";
import { listQuery } from "@/services/query-state";
import type { CmsRoleRecord } from "./types";

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
