import {
  SUBMISSION_STATUSES,
  SUBMISSION_VALIDITIES,
  DEFAULT_SUBMISSION_STATUS,
  DEFAULT_SUBMISSION_VALIDITY,
  DASHBOARD_SUMMARY_PERIODS,
  DASHBOARD_TREND_PERIODS,
  DEFAULT_DASHBOARD_PERIOD,
} from "@/services/constant";
import { permissions } from "@/services/permission";
import * as yup from "yup";
import { constants } from "@/app/api/constant";

const password = () =>
  yup
    .string()
    .min(8, "validation.passwordMin")
    .max(128, "validation.passwordMax")
    .required("validation.required");
const username = () =>
  yup
    .string()
    .trim()
    .lowercase()
    .matches(/^[a-z0-9_.-]{3,40}$/, "validation.username")
    .required("validation.required");
const name = () =>
  yup
    .string()
    .trim()
    .max(100, "validation.maxLength")
    .required("validation.required");
const roleIds = () =>
  yup
    .array()
    .of(yup.string().required())
    .min(1, "validation.rolesRequired")
    .max(100)
    .required();

export const loginSchema = yup.object({
  username: username(),
  password: password(),
});
export const accountCreateSchema = yup.object({
  username: username(),
  name: name(),
  password: password(),
  isActive: yup.boolean().required(),
  roleIds: roleIds(),
});
export const accountUpdateSchema = yup.object({
  username: username(),
  name: name(),
  isActive: yup.boolean().required(),
  roleIds: roleIds(),
});
export const accountEditorSchema = accountUpdateSchema.shape({
  password: yup
    .string()
    .defined()
    .when("$creating", { is: true, then: () => password() }),
});
export const searchSchema = yup.object({
  search: yup.string().trim().defined(),
});
export const roleSchema = yup.object({
  name: name(),
  permissions: yup
    .array()
    .of(yup.string().oneOf(Object.values(permissions)).required())
    .required()
    .max(Object.keys(permissions).length),
});
export const changePasswordSchema = yup.object({
  currentPassword: password(),
  newPassword: password().notOneOf(
    [yup.ref("currentPassword")],
    "validation.differentPassword",
  ),
});
export const resetPasswordSchema = yup.object({ newPassword: password() });
const recordIds = () =>
  yup
    .array()
    .of(yup.string().max(constants.CMS_RECORD_ID_MAX_LENGTH).required())
    .min(1)
    .max(constants.CMS_MAX_BULK_RECORDS)
    .required();
export const deleteSchema = yup.object({ ids: recordIds() }).strict();
export const listSchema = yup.object({
  page: yup.number().integer().min(1).max(1_000_000).default(1),
  pageSize: yup.number().oneOf([10, 20, 50, 100]).default(20),
  search: yup.string().trim().default(""),
});

const dashboardTimeZone = () => yup.string().required().test(
  "time-zone",
  "errors.validation",
  (value) => {
    if (!value || /^[+-]/.test(value)) return false;
    try {
      new Intl.DateTimeFormat("en", { timeZone: value }).format();
      return true;
    } catch {
      return false;
    }
  },
);

export const dashboardSummarySchema = yup.object({
  period: yup.mixed<(typeof DASHBOARD_SUMMARY_PERIODS)[number]>()
    .oneOf(DASHBOARD_SUMMARY_PERIODS).default(DEFAULT_DASHBOARD_PERIOD).defined(),
  timeZone: dashboardTimeZone(),
});

export const dashboardTrendSchema = yup.object({
  period: yup.mixed<(typeof DASHBOARD_TREND_PERIODS)[number]>()
    .oneOf(DASHBOARD_TREND_PERIODS).default(DEFAULT_DASHBOARD_PERIOD).defined(),
  timeZone: dashboardTimeZone(),
});
export type LoginValues = yup.InferType<typeof loginSchema>;
export type AccountCreateValues = yup.InferType<typeof accountCreateSchema>;
export type AccountUpdateValues = yup.InferType<typeof accountUpdateSchema>;
export type AccountEditorValues = yup.InferType<typeof accountEditorSchema>;
export type RoleValues = yup.InferType<typeof roleSchema>;
export type ChangePasswordValues = yup.InferType<typeof changePasswordSchema>;
export type ResetPasswordValues = yup.InferType<typeof resetPasswordSchema>;

const submissionStatus = () =>
  yup.mixed<(typeof SUBMISSION_STATUSES)[number]>().oneOf(SUBMISSION_STATUSES);
const submissionValidity = () =>
  yup
    .mixed<(typeof SUBMISSION_VALIDITIES)[number]>()
    .oneOf(SUBMISSION_VALIDITIES);

export const submissionCreateSchema = yup.object({
  description: yup
    .string()
    .trim()
    .required("validation.required")
    .max(constants.MAX_DESCRIPTION_LENGTH, "validation.descriptionMax"),
  lat: yup
    .number()
    .typeError("validation.coordinates")
    .min(-90, "validation.coordinates")
    .max(90, "validation.coordinates")
    .required("validation.required"),
  lng: yup
    .number()
    .typeError("validation.coordinates")
    .min(-180, "validation.coordinates")
    .max(180, "validation.coordinates")
    .required("validation.required"),
  status: submissionStatus().default(DEFAULT_SUBMISSION_STATUS).defined(),
  validity: submissionValidity().default(DEFAULT_SUBMISSION_VALIDITY).defined(),
  confirmPublish: yup.boolean().default(false).defined(),
});
export const submissionUpdateSchema = yup
  .object({
    status: submissionStatus().optional(),
    validity: submissionValidity().optional(),
    confirmPublish: yup.boolean().optional(),
  })
  .noUnknown()
  .strict()
  .test("change", "errors.validation", (value) =>
    Boolean(value.status || value.validity),
  );
export const submissionBulkSchema = submissionUpdateSchema
  .shape({ ids: recordIds() })
  .test(
    "one-field",
    "errors.validation",
    (value) => Boolean(value.status) !== Boolean(value.validity),
  );
export const submissionListSchema = listSchema.shape({
  status: submissionStatus()
    .optional()
    .transform((value, original) => (original === "" ? undefined : value)),
  validity: submissionValidity()
    .optional()
    .transform((value, original) => (original === "" ? undefined : value)),
});
export type SubmissionCreateValues = yup.InferType<
  typeof submissionCreateSchema
>;
export type SubmissionUpdateValues = yup.InferType<
  typeof submissionUpdateSchema
>;
