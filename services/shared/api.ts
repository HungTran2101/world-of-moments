import { APP_ERROR_EVENT, RUNTIME_ERROR_STATUS } from "@/services/constant";
import { ApiError, toAppError } from "@/services/shared/errors";

type RequestOptions = Omit<RequestInit, "body"> & {
  body?: BodyInit | object;
  reportGlobalError?: boolean;
};

export type ApiRequestOptions = Pick<RequestOptions, "reportGlobalError" | "signal">;

async function parseResponse(response: Response) {
  const contentType = response.headers.get("content-type") ?? "";

  if (contentType.includes("application/json")) {
    return response.json();
  }

  const text = await response.text();
  return text || null;
}

export async function apiRequest<T>(input: RequestInfo | URL, init: RequestOptions = {}): Promise<T> {
  const { body, headers, reportGlobalError = false, ...rest } = init;
  const isJsonBody =
    body !== undefined &&
    body !== null &&
    !(body instanceof FormData) &&
    !(body instanceof URLSearchParams) &&
    !(body instanceof Blob) &&
    !(body instanceof ArrayBuffer);

  const response = await fetch(input, {
    ...rest,
    headers: {
      ...(isJsonBody ? { "Content-Type": "application/json" } : {}),
      ...headers,
    },
    body: isJsonBody ? JSON.stringify(body) : body,
  }).catch((error: unknown) => {
    // Hủy do tháo component không phải lỗi mạng cần thông báo cho người dùng.
    if (rest.signal?.aborted) throw error;
    throw new ApiError("Network request failed", RUNTIME_ERROR_STATUS.NETWORK);
  });

  const data = await parseResponse(response);

  if (!response.ok) {
    const message =
      typeof data === "string"
        ? data
        : (data as { error?: string })?.error || `Request failed with status ${response.status}`;

    const error = new ApiError(message, response.status, data);

    // Neu loi da duoc xu ly cuc bo, co the tat global modal bang `reportGlobalError: false`.
    if (reportGlobalError && typeof window !== "undefined") {
      window.dispatchEvent(
        new CustomEvent(APP_ERROR_EVENT, {
          detail: toAppError(error),
        })
      );
    }

    throw error;
  }

  return data as T;
}
