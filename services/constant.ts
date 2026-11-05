import type { PermissionRules } from "@/services/permission";
import type { ProtectedCmsRoutePath } from "@/services/routes";

export const SUBMISSION_STATUSES = ["published", "unpublished"] as const;
export const SUBMISSION_VALIDITIES = [
  "valid",
  "invalid",
  "need-inspect",
] as const;
export type SubmissionStatus = (typeof SUBMISSION_STATUSES)[number];
export type SubmissionValidity = (typeof SUBMISSION_VALIDITIES)[number];
export const DEFAULT_SUBMISSION_STATUS: SubmissionStatus = "published";
export const DEFAULT_SUBMISSION_VALIDITY: SubmissionValidity = "need-inspect";
export const CLIENT_SUBMISSION_ACTOR = "client";

export const DASHBOARD_SUMMARY_PERIODS = ["7d", "30d", "all"] as const;
export const DASHBOARD_TREND_PERIODS = ["30d", "all"] as const;
export const DEFAULT_DASHBOARD_PERIOD = "30d";
export const DASHBOARD_PERIOD_DAYS = { "7d": 7, "30d": 30 } as const;
export const DASHBOARD_DAILY_HISTORY_LIMIT_DAYS = 90;

export const PAGE_SIZES = [10, 20, 50, 100] as const;

export const permissions = {
  DASHBOARD_SHOW: "dashboard.show",
  SUBMISSION_SHOW: "submission.show",
  SUBMISSION_CREATE: "submission.create",
  SUBMISSION_DELETE: "submission.delete",
  SUBMISSION_UPDATE_STATUS: "submission.updateSubmissionStatus",
  SUBMISSION_UPDATE_VALIDITY: "submission.updateSubmissionValidity",
  ACCOUNT_SHOW: "account.show",
  ACCOUNT_CREATE: "account.create",
  ACCOUNT_UPDATE: "account.update",
  ACCOUNT_DELETE: "account.delete",
  ACCOUNT_RESET_PASSWORD: "account.resetPasswordPermission",
  ROLE_SHOW: "role.show",
  ROLE_CREATE: "role.create",
  ROLE_UPDATE: "role.update",
  ROLE_DELETE: "role.delete",
} as const;

export const permissionModules = [
  {
    key: "dashboard",
    defaults: [permissions.DASHBOARD_SHOW, null, null, null],
    custom: [],
  },
  {
    key: "submission",
    defaults: [
      permissions.SUBMISSION_SHOW,
      permissions.SUBMISSION_CREATE,
      null,
      permissions.SUBMISSION_DELETE,
    ],
    custom: [
      permissions.SUBMISSION_UPDATE_STATUS,
      permissions.SUBMISSION_UPDATE_VALIDITY,
    ],
  },
  {
    key: "account",
    defaults: [
      permissions.ACCOUNT_SHOW,
      permissions.ACCOUNT_CREATE,
      permissions.ACCOUNT_UPDATE,
      permissions.ACCOUNT_DELETE,
    ],
    custom: [permissions.ACCOUNT_RESET_PASSWORD],
  },
  {
    key: "role",
    defaults: [
      permissions.ROLE_SHOW,
      permissions.ROLE_CREATE,
      permissions.ROLE_UPDATE,
      permissions.ROLE_DELETE,
    ],
    custom: [],
  },
] as const;

export const ROUTE_PATHS = {
  DASHBOARD: "/cms",
  LOGIN: "/cms/login",
  SUBMISSIONS: "/cms/submissions",
  SUBMISSION_DETAIL: "/cms/submissions/detail",
  ACCOUNTS: "/cms/accounts",
  ACCOUNT_DETAIL: "/cms/accounts/detail",
  ROLES: "/cms/roles",
  ROLE_DETAIL: "/cms/roles/detail",
  PROFILE: "/cms/profile",
  CHANGE_PASSWORD: "/cms/profile/change-password",
  GENERAL: "/cms/general",
} as const;

const ACCOUNT_PERMISSION_RULES: PermissionRules = {
  show: permissions.ACCOUNT_SHOW,
  create: permissions.ACCOUNT_CREATE,
  update: permissions.ACCOUNT_UPDATE,
  delete: permissions.ACCOUNT_DELETE,
  custom: [permissions.ACCOUNT_RESET_PASSWORD],
};

const ROLE_PERMISSION_RULES: PermissionRules = {
  show: permissions.ROLE_SHOW,
  create: permissions.ROLE_CREATE,
  update: permissions.ROLE_UPDATE,
  delete: permissions.ROLE_DELETE,
};

const SUBMISSION_PERMISSION_RULES: PermissionRules = {
  show: permissions.SUBMISSION_SHOW,
  create: permissions.SUBMISSION_CREATE,
  delete: permissions.SUBMISSION_DELETE,
  custom: [
    permissions.SUBMISSION_UPDATE_STATUS,
    permissions.SUBMISSION_UPDATE_VALIDITY,
  ],
};

export const ROUTES_PERMISSIONS = {
  [ROUTE_PATHS.SUBMISSIONS]: SUBMISSION_PERMISSION_RULES,
  [ROUTE_PATHS.SUBMISSION_DETAIL]: SUBMISSION_PERMISSION_RULES,
  [ROUTE_PATHS.DASHBOARD]: { show: permissions.DASHBOARD_SHOW },
  [ROUTE_PATHS.ACCOUNTS]: ACCOUNT_PERMISSION_RULES,
  [ROUTE_PATHS.ACCOUNT_DETAIL]: ACCOUNT_PERMISSION_RULES,
  [ROUTE_PATHS.ROLES]: ROLE_PERMISSION_RULES,
  [ROUTE_PATHS.ROLE_DETAIL]: ROLE_PERMISSION_RULES,
  [ROUTE_PATHS.CHANGE_PASSWORD]: undefined,
  [ROUTE_PATHS.PROFILE]: undefined,
  [ROUTE_PATHS.GENERAL]: undefined,
} satisfies Record<ProtectedCmsRoutePath, PermissionRules | undefined>;

export const CMS_LANDING_ROUTES = [
  [ROUTE_PATHS.DASHBOARD, permissions.DASHBOARD_SHOW],
  [ROUTE_PATHS.SUBMISSIONS, permissions.SUBMISSION_SHOW],
  [ROUTE_PATHS.ACCOUNTS, permissions.ACCOUNT_SHOW],
  [ROUTE_PATHS.ROLES, permissions.ROLE_SHOW],
] as const;

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
