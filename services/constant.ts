export const SUBMISSION_STATUSES = ["published", "unpublished"] as const;
export const SUBMISSION_VALIDITIES = ["valid", "invalid", "need-inspect"] as const;
export type SubmissionStatus = (typeof SUBMISSION_STATUSES)[number];

export type SubmissionValidity = (typeof SUBMISSION_VALIDITIES)[number];

export const DEFAULT_SUBMISSION_STATUS: SubmissionStatus = "published";
export const DEFAULT_SUBMISSION_VALIDITY: SubmissionValidity = "need-inspect";
export const CLIENT_SUBMISSION_ACTOR = "client";
export const DASHBOARD_SUMMARY_PERIODS = ["7d", "30d", "all"] as const;
export const DASHBOARD_TREND_PERIODS = ["30d", "all"] as const;
export const DEFAULT_DASHBOARD_PERIOD = "30d";
export const DASHBOARD_PERIOD_DAYS = {
  "7d": 7,
  "30d": 30,
} as const;
export const DASHBOARD_DAILY_HISTORY_LIMIT_DAYS = 90;
export const PAGE_SIZES = [10, 20, 50, 100] as const;
export const MUTATION_CACHE_GC_TIME_MS = 0;
export const ROUTE_PATHS = {
  DASHBOARD: "/cms",
  LOGIN: "/cms/login",
  SUBMISSIONS: "/cms/submissions",
  CLIENT_USERS: "/cms/client-users",
  CLIENT_USER_DETAIL: "/cms/client-users/detail",
  SUBMISSION_DETAIL: "/cms/submissions/detail",
  ACCOUNTS: "/cms/accounts",
  ACCOUNT_DETAIL: "/cms/accounts/detail",
  ROLES: "/cms/roles",
  ROLE_DETAIL: "/cms/roles/detail",
  PROFILE: "/cms/profile",
  CHANGE_PASSWORD: "/cms/profile/change-password",
  GENERAL: "/cms/general",
} as const;
export const API_ERROR_STATUS = {
  BAD_REQUEST: 400,
  UNAUTHORIZED: 401,
  FORBIDDEN: 403,
  NOT_FOUND: 404,
  CONFLICT: 409,
  UNPROCESSABLE_ENTITY: 422,
  TOO_MANY_REQUESTS: 429,
  INTERNAL_SERVER_ERROR: 500,
  SERVICE_UNAVAILABLE: 503,
} as const;

// Nhom ma loi cho runtime de UI co the map sang modal phu hop.
export const RUNTIME_ERROR_STATUS = {
  UNKNOWN: 1000,
  RENDER: 1001,
  WINDOW: 1002,
  UNHANDLED_PROMISE: 1003,
  NETWORK: 1100,
} as const;
export const APP_ERROR_EVENT = "app-error";

// Tách cache cũ chưa có trạng thái để lịch sử luôn khóa đúng bài chưa công bố.
export const submissionHistoryKey = ["submission-history", "moderation"] as const;
