import * as yup from "yup";
import { permissions } from "@/services/permission";

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
  search: yup.string().trim().max(200).defined(),
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
export const deleteSchema = yup
  .object({
    ids: yup
      .array()
      .of(yup.string().max(100).required())
      .min(1)
      .max(100)
      .required(),
  })
  .strict();
export const listSchema = yup.object({
  page: yup.number().integer().min(1).max(1_000_000).default(1),
  pageSize: yup.number().oneOf([10, 20, 50, 100]).default(20),
  search: yup.string().trim().max(200).default(""),
});
export type LoginValues = yup.InferType<typeof loginSchema>;
export type AccountCreateValues = yup.InferType<typeof accountCreateSchema>;
export type AccountUpdateValues = yup.InferType<typeof accountUpdateSchema>;
export type AccountEditorValues = yup.InferType<typeof accountEditorSchema>;
export type RoleValues = yup.InferType<typeof roleSchema>;
export type ChangePasswordValues = yup.InferType<typeof changePasswordSchema>;
export type ResetPasswordValues = yup.InferType<typeof resetPasswordSchema>;
