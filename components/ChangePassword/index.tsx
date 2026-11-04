"use client";

import { useRouter } from "next/navigation";
import { ROUTE_PATHS } from "@/services/routes";
import { Button } from "@/components/ui/button";

import { PasswordInput } from "@/components/ui/password-input";

import { useTranslations } from "next-intl";
import { useForm } from "react-hook-form";
import { yupResolver } from "@hookform/resolvers/yup";
import { useState } from "react";
import { changePasswordSchema, type ChangePasswordValues } from "@/services/schemas";
import { changeCmsPassword } from "@/services/cms/auth";
import { Header } from "@/components/shared/Header";
import { CmsPageContent } from "@/components/shared/CmsPageContent";
import { Breadcrumbs } from "@/components/shared/Breadcrumbs";
import { applyFormError, ErrorNotice, Field } from "@/components/shared/Forms";

export function ChangePasswordPage() {
  const t = useTranslations();
  const router = useRouter();
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
      <Header
        title={t("nav.changePassword")}
        onBack={() => router.push(ROUTE_PATHS.PROFILE)}
        actions={
          <Button
            variant="primary"
            className="h-10"
            type="submit"
            form="cms-password-form"
            aria-label={t(isSubmitting ? "common.saving" : "common.save")}
            loading={isSubmitting}
          >
            {t("common.save")}
          </Button>
        }
      />
      <CmsPageContent>
        <Breadcrumbs
          label={t("common.breadcrumbs")}
          items={[
            { label: t("nav.profile"), href: ROUTE_PATHS.PROFILE },
            { label: t("nav.changePassword") },
          ]}
        />
        <form
          id="cms-password-form"
          className="cms-form"
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
            <p className="cms-notice" role="status">
              {t("account.passwordChanged")}
            </p>
          )}
          <fieldset disabled={isSubmitting}>
            <Field
              id="cms-current-password"
              label={t("account.currentPassword")}
              error={errors.currentPassword?.message}
            >
              <PasswordInput
                id="cms-current-password"
                visibilityLabels={{ show: t("common.showPassword"), hide: t("common.hidePassword") }}
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
              <PasswordInput
                id="cms-new-password"
                visibilityLabels={{ show: t("common.showPassword"), hide: t("common.hidePassword") }}
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
      </CmsPageContent>
    </>
  );
}
