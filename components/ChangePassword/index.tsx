"use client";

import "./index.scss";

import { useTranslations } from "next-intl";
import { useForm } from "react-hook-form";
import { yupResolver } from "@hookform/resolvers/yup";
import { useState } from "react";
import { changePasswordSchema, type ChangePasswordValues } from "@/services/schemas";
import { changeCmsPassword } from "@/services/cms/auth";
import { Header } from "@/components/shared/Header";
import { Breadcrumbs } from "@/components/shared/Breadcrumbs";
import { applyFormError, ErrorNotice, Field } from "@/components/shared/Forms";

export function ChangePasswordPage() {
  const t = useTranslations();
  const [error, setError] = useState<unknown>(null);
  const [success, setSuccess] = useState(false);
  const {
    register,
    handleSubmit,
    reset,
    setError: setFieldError,
    formState: { errors, isSubmitting },
  } = useForm<ChangePasswordValues>({
    resolver: yupResolver(changePasswordSchema),
    defaultValues: { currentPassword: "", newPassword: "" },
  });
  return (
    <>
      <Header title={t("nav.changePassword")}>
        <button type="submit" form="cms-password-form" disabled={isSubmitting}>
          {t(isSubmitting ? "common.saving" : "common.save")}
        </button>
      </Header>
      <Breadcrumbs
        label={t("common.breadcrumbs")}
        items={[
          { label: t("nav.home"), href: "/cms" },
          { label: t("nav.changePassword") },
        ]}
      />
      <div className="Cms-content">
        <form
          id="cms-password-form"
          className="Cms-form Cms-passwordForm"
          onSubmit={handleSubmit(async (values) => {
            setError(null);
            setSuccess(false);
            try {
              await changeCmsPassword(values);
              reset();
              setSuccess(true);
            } catch (error) {
              setError(error);
              applyFormError(error, setFieldError);
            }
          })}
        >
          {Boolean(error) && <ErrorNotice error={error} />}
          {success && (
            <p className="Cms-notice" role="status">
              {t("account.passwordChanged")}
            </p>
          )}
          <fieldset disabled={isSubmitting}>
            <Field
              id="cms-current-password"
              label={t("account.currentPassword")}
              error={errors.currentPassword?.message}
            >
              <input
                id="cms-current-password"
                type="password"
                autoComplete="current-password"
                aria-invalid={Boolean(errors.currentPassword)}
                aria-describedby={
                  errors.currentPassword
                    ? "cms-current-password-error"
                    : undefined
                }
                {...register("currentPassword")}
              />
            </Field>
            <Field
              id="cms-new-password"
              label={t("account.newPassword")}
              error={errors.newPassword?.message}
            >
              <input
                id="cms-new-password"
                type="password"
                autoComplete="new-password"
                aria-invalid={Boolean(errors.newPassword)}
                aria-describedby={
                  errors.newPassword ? "cms-new-password-error" : undefined
                }
                {...register("newPassword")}
              />
            </Field>
          </fieldset>
        </form>
      </div>
    </>
  );
}
