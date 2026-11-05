"use client";

import { ROUTE_PATHS } from "@/services/routes";
import { apiRequest } from "@/services/shared/api";
import { ApiError } from "@/services/shared/errors";

export function expireCmsSession() {
  // Provider hiện tại tự xóa store và query cache khi nhận sự kiện kết thúc phiên.
  window.dispatchEvent(new Event("cms-session-ended"));
  if (window.location.pathname !== ROUTE_PATHS.LOGIN) {
    // Tải lại toàn trang để bỏ bộ nhớ đệm của phiên đã hết hạn.
    window.location.assign(new URL(ROUTE_PATHS.LOGIN, window.location.origin).href);
  }
}

export async function cmsRequest<T>(
  path: string,
  init: Parameters<typeof apiRequest>[1] = {},
): Promise<T> {
  try {
    return await apiRequest<T>(`/api/cms${path}`, {
      ...init,
      credentials: "same-origin",
      cache: "no-store",
    });
  } catch (error) {
    // Phiên DB hết hạn hoặc bị thu hồi thì xóa dữ liệu CMS và quay về đăng nhập.
    if (error instanceof ApiError && error.status === 401 && !init.signal?.aborted)
      expireCmsSession();
    throw error;
  }
}

