import { apiRequest, type RequestOptions } from "./api";
import { ApiError } from "./errors";
import { SUBMISSION_ERROR_CODES } from "@/services/constant";
import { ensureVisitorIdentity, invalidateVisitorIdentity } from "@/lib/visitorIdentity";

function isIdentityRequired(error: unknown): error is ApiError {
  return error instanceof ApiError
    && error.status === 401
    && typeof error.data === "object"
    && error.data !== null
    && "code" in error.data
    && error.data.code === SUBMISSION_ERROR_CODES.IDENTITY_REQUIRED;
}

export async function visitorRequest<T>(url: string, options: RequestOptions = {}) {
  await ensureVisitorIdentity(false, options.signal ?? undefined);
  const request = () => apiRequest<T>(url, {
    ...options,
    credentials: "same-origin",
    cache: "no-store"
  });

  try {
    return await request();
  } catch (error) {
    if (!isIdentityRequired(error)) throw error;

    // Chỉ thử lại khi server xác nhận chưa ghi dữ liệu vì thiếu danh tính hợp lệ.
    await ensureVisitorIdentity(true, options.signal ?? undefined);
    try {
      return await request();
    } catch (retryError) {
      // Cookie vẫn bị từ chối thì dừng; không lặp lại mutation hoặc tạo vòng refresh.
      if (isIdentityRequired(retryError)) invalidateVisitorIdentity(retryError);
      throw retryError;
    }
  }
}
