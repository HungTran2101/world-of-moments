"use client";

import { Field, FieldLabel, FieldError } from "@/components/ui/field";

import { ROUTE_PATHS } from "@/services/constant";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
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
import { applyFormError, ErrorNotice, useCmsText } from "@/components/shared/Forms";

export function ChangePasswordPage() {
  const t = useTranslations();
  const text = useCmsText();
  const client = useQueryClient();
  const router = useRouter();
  const [error, setError] = useState<unknown>(null);
  const [success, setSuccess] = useState(false);
  const {
    register,
    handleSubmit,
    reset,
    setError: setFieldError,
    formState: { errors, isSubmitting: formSubmitting },
  } = useForm<ChangePasswordValues>({
    resolver: yupResolver(changePasswordSchema),
    defaultValues: { currentPassword: "", newPassword: "" },
  });
  const save = useMutation({
    mutationFn: (values: ChangePasswordValues) => changeCmsPassword(values),
    onMutate: () => {
      setError(null);
      setSuccess(false);
    },
    onSuccess: async () => {
      await client.invalidateQueries({ queryKey: ["cms"] });
      reset();
      setSuccess(true);
    },
    onError: (error) => {
      setError(error);
      applyFormError(error, setFieldError);
    },
  });
  const isSubmitting = formSubmitting || save.isPending;

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
          onSubmit={handleSubmit((values) => {
            if (!save.isPending) save.mutate(values);
          })}
        >
          {Boolean(error) && <ErrorNotice error={error} />}
          {success && (
            <p className="cms-notice" role="status">
              {t("account.passwordChanged")}
            </p>
          )}
          <fieldset disabled={isSubmitting}>
            <Field className="cms-field" data-invalid={Boolean(errors.currentPassword?.message)}>
              <FieldLabel htmlFor="cms-current-password" required>{t("account.currentPassword")}</FieldLabel>
              <PasswordInput
                id="cms-current-password"
                aria-required="true"
                visibilityLabels={{ show: t("common.showPassword"), hide: t("common.hidePassword") }}
                autoComplete="current-password"
                aria-invalid={Boolean(errors.currentPassword)}
                aria-describedby={
                  errors.currentPassword?.message
                    ? "cms-current-password-error"
                    : undefined
                }
                {...register("currentPassword")}
              />
              <FieldError id="cms-current-password-error">
                {errors.currentPassword?.message && text(errors.currentPassword.message)}
              </FieldError>
            </Field>
            <Field className="cms-field" data-invalid={Boolean(errors.newPassword?.message)}>
              <FieldLabel htmlFor="cms-new-password" required>{t("account.newPassword")}</FieldLabel>
              <PasswordInput
                id="cms-new-password"
                aria-required="true"
                visibilityLabels={{ show: t("common.showPassword"), hide: t("common.hidePassword") }}
                autoComplete="new-password"
                aria-invalid={Boolean(errors.newPassword)}
                aria-describedby={
                  errors.newPassword?.message ? "cms-new-password-error" : undefined
                }
                {...register("newPassword")}
              />
              <FieldError id="cms-new-password-error">
                {errors.newPassword?.message && text(errors.newPassword.message)}
              </FieldError>
            </Field>
          </fieldset>
        </form>
      </CmsPageContent>
    </>
  );
}
