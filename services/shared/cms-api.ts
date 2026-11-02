"use client";

import { apiRequest } from "@/services/shared/api";
import { ApiError } from "@/services/shared/errors";
import { useCmsStore } from "@/store/cmsStore";

export function expireCmsSession() {
  useCmsStore.getState().clear();
  window.dispatchEvent(new Event("cms-session-ended"));
  if (window.location.pathname !== "/cms/login") {
    // eslint-disable-next-line @next/next/no-location-assign-relative-destination -- Tải lại toàn trang để bỏ bộ nhớ đệm của phiên đã hết hạn.
    window.location.assign("/cms/login");
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

