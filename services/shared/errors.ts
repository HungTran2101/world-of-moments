import { RUNTIME_ERROR_STATUS } from "@/services/constant";

export type ApiErrorStatus = number;

export type RuntimeErrorStatus = (typeof RUNTIME_ERROR_STATUS)[keyof typeof RUNTIME_ERROR_STATUS];

export type AppErrorStatus = ApiErrorStatus | RuntimeErrorStatus;

export type AppErrorSource = "api" | "runtime" | "unknown";

export type ErrorMessageKey =
  | "invalidSubmission"
  | "rateLimited"
  | "submissionFailed"
  | "refreshFailed"
  | "network"
  | "storage"
  | "mapUnavailable"
  | "unexpected"
  | "windowError"
  | "unhandledPromise";

export interface AppError {
  name: string;
  message: string;
  status: AppErrorStatus;
  source: AppErrorSource;
  messageKey?: ErrorMessageKey;
  details?: unknown;
  stack?: string;
  cause?: unknown;
  timestamp: number;
}

// Giữ thông điệp thân thiện tách khỏi lỗi kỹ thuật để có thể sửa riêng trong hai locale.
export function getErrorMessageKey(error: AppError): ErrorMessageKey {
  if (error.messageKey) return error.messageKey;
  if (error.status === RUNTIME_ERROR_STATUS.NETWORK) return "network";
  if (error.status === RUNTIME_ERROR_STATUS.WINDOW) return "windowError";
  if (error.status === RUNTIME_ERROR_STATUS.UNHANDLED_PROMISE) return "unhandledPromise";
  return "unexpected";
}

export class ApiError extends Error {
  status: ApiErrorStatus;
  data: unknown;
  constructor(message: string, status: ApiErrorStatus, data?: unknown) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.data = data;
  }
}

function getErrorMessage(error: unknown) {
  if (error instanceof Error && error.message) {
    return error.message;
  }
  if (typeof error === "string" && error.trim()) {
    return error;
  }
  return "Something went wrong";
}

// Chuan hoa moi loai loi ve cung mot shape de provider/modal xu ly tap trung.
export function toAppError(
  error: unknown,
  overrides: Partial<Omit<AppError, "timestamp">> = {},
): AppError {
  if (error instanceof ApiError) {
    return {
      name: error.name,
      message: error.message,
      status: error.status,
      source: "api",
      details: error.data,
      stack: error.stack,
      cause: error.cause,
      timestamp: Date.now(),
      ...overrides,
    };
  }
  if (error instanceof Error) {
    return {
      name: error.name || "RuntimeError",
      message: getErrorMessage(error),
      status: RUNTIME_ERROR_STATUS.UNKNOWN,
      source: "runtime",
      stack: error.stack,
      cause: error.cause,
      timestamp: Date.now(),
      ...overrides,
    };
  }
  return {
    name: "UnknownError",
    message: getErrorMessage(error),
    status: RUNTIME_ERROR_STATUS.UNKNOWN,
    source: "unknown",
    details: error,
    timestamp: Date.now(),
    ...overrides,
  };
}
