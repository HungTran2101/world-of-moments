import { apiRequest } from "@/services/shared/api";
import type { ApiRequestOptions } from "@/services/shared/api";
import { cmsRequest } from "@/services/shared/cms-api";
import type { CmsSuccessResponse } from "@/services/shared/types";
import type { ChangePasswordValues, LoginValues } from "@/services/schemas";
import type { CmsLoginResponse } from "./types";

export function loginCms(body: LoginValues, options?: ApiRequestOptions) {
  // Sai thông tin đăng nhập là lỗi của form, không kích hoạt luồng hết phiên CMS.
  return apiRequest<CmsLoginResponse>("/api/cms/auth/login", {
    ...options,
    method: "POST",
    body,
    credentials: "same-origin",
  });
}

export function logoutCms(options?: ApiRequestOptions) {
  return cmsRequest<CmsSuccessResponse>("/auth/logout", {
    ...options,
    method: "POST",
  });
}

export function changeCmsPassword(body: ChangePasswordValues, options?: ApiRequestOptions) {
  return cmsRequest<CmsSuccessResponse>("/auth/change-password", {
    ...options,
    method: "POST",
    body,
  });
}
