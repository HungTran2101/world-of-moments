"use client";

import { Field, FieldLabel, FieldError } from "@/components/ui/field";

import { ROUTE_PATHS } from "@/services/constant";
import { permissions } from "@/services/permission";
import { RecordAudit } from "@/components/shared/RecordAudit";
import { LoadingDots } from "@/components/shared/LoadingDots";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { PasswordInput } from "@/components/ui/password-input";
import { Checkbox } from "@/components/ui/checkbox";
import { Select } from "@/components/ui/select";
import { useRouter, useSearchParams } from "next/navigation";
import { useTranslations } from "next-intl";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Controller, useForm } from "react-hook-form";
import { yupResolver } from "@hookform/resolvers/yup";
import { useEffect, useRef, useState } from "react";
import { Dialog } from "@/components/ui/dialog";
import {
  accountEditorSchema,
  resetPasswordSchema,
  type AccountEditorValues,
  type ResetPasswordValues,
} from "@/services/schemas";
import {
  createCmsAccount,
  getCmsAccount,
  resetCmsAccountPassword,
  updateCmsAccount,
} from "@/services/cms/accounts";
import { getCmsRoleOptions } from "@/services/cms/roles";
import type { CmsPageProps } from "@/services/shared/types";
import { Header } from "@/components/shared/Header";
import { CmsPageContent } from "@/components/shared/CmsPageContent";
import { Breadcrumbs } from "@/components/shared/Breadcrumbs";
import { applyFormError, ErrorNotice, getCmsFieldErrors, useCmsText } from "@/components/shared/Forms";

function ResetPassword({
  id,
  open,
  onOpenChange,
}: {
  id: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const t = useTranslations();
  const text = useCmsText();
  const client = useQueryClient();
  const [error, setError] = useState<unknown>(null);
  const {
    register,
    handleSubmit,
    setError: setFieldError,
    formState: { errors, isSubmitting: formSubmitting },
  } = useForm<ResetPasswordValues>({
    resolver: yupResolver(resetPasswordSchema),
    defaultValues: { newPassword: "" },
  });
  const resetPassword = useMutation({
    mutationFn: (values: ResetPasswordValues) => resetCmsAccountPassword(id, values),
    onMutate: () => setError(null),
    onSuccess: async () => {
      await client.invalidateQueries({ queryKey: ["cms"] });
      onOpenChange(false);
    },
    onError: (error) => {
      setError(error);
      applyFormError(error, setFieldError);
    },
  });
  const isSubmitting = formSubmitting || resetPassword.isPending;

  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay className="cms-dialogOverlay" />
        <Dialog.Content className="cms cms-dialog">
          <Dialog.Title>{t("account.resetPassword")}</Dialog.Title>
          <Dialog.Description>
            {t("account.resetDescription")}
          </Dialog.Description>
          <form
            onSubmit={handleSubmit((values) => {
              if (!resetPassword.isPending) resetPassword.mutate(values);
            })}
          >
            {Boolean(error) && <ErrorNotice error={error} />}
            <Field className="cms-field" data-invalid={Boolean(errors.newPassword?.message)}>
              <FieldLabel htmlFor="cms-reset-password" required>{t("account.newPassword")}</FieldLabel>
              <PasswordInput
                id="cms-reset-password"
                aria-required="true"
                disabled={isSubmitting}
                visibilityLabels={{ show: t("common.showPassword"), hide: t("common.hidePassword") }}
                autoComplete="new-password"
                aria-invalid={Boolean(errors.newPassword)}
                aria-describedby={
                  errors.newPassword?.message ? "cms-reset-password-error" : undefined
                }
                {...register("newPassword")}
              />
              <FieldError id="cms-reset-password-error">
                {errors.newPassword?.message && text(errors.newPassword.message)}
              </FieldError>
            </Field>
            <div className="cms-formActions">
              <Dialog.Close asChild>
                <Button variant="outline" className="h-10" type="button">{t("common.cancel")}</Button>
              </Dialog.Close>
              <Button
                variant="primary"
                className="h-10"
                type="submit"
                aria-label={t(isSubmitting ? "common.saving" : "common.save")}
                loading={isSubmitting}
              >
                {t("common.save")}
              </Button>
            </div>
          </form>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}

function AccountEditor({
  permission,
  id,
}: CmsPageProps & { id: string | null }) {
  const t = useTranslations();
  const text = useCmsText();
  const router = useRouter();
  const params = useSearchParams();
  const client = useQueryClient();
  const [error, setError] = useState<unknown>(null);
  const [resetOpen, setResetOpen] = useState(false);
  const hydrated = useRef(false);
  const query = useQuery({
    queryKey: ["cms", "account", id],
    queryFn: ({ signal }) => getCmsAccount(id!, { signal }),
    enabled: Boolean(id),
  });
  const options = useQuery({
    queryKey: ["cms", "account-role-options"],
    queryFn: ({ signal }) => getCmsRoleOptions({ signal }),
  });
  const canSave = id ? permission.update : permission.create;
  const {
    register,
    control,
    reset,
    handleSubmit,
    setError: setFieldError,
    formState: { errors, isSubmitting: formSubmitting },
  } = useForm<AccountEditorValues>({
    resolver: yupResolver(accountEditorSchema),
    context: { creating: !id },
    defaultValues: {
      username: "",
      name: "",
      password: "",
      isActive: true,
      roleIds: [],
    },
  });
  useEffect(() => {
    if (query.data && !hydrated.current) {
      reset({ ...query.data, password: "" });
      hydrated.current = true;
    }
  }, [query.data, reset]);
  const listParams = new URLSearchParams(params);
  listParams.delete("id");
  const backHref = `${ROUTE_PATHS.ACCOUNTS}${listParams.size ? `?${listParams}` : ""}`;
  const title = t(id ? "account.editTitle" : "account.createTitle");
  const save = useMutation({
    mutationFn: (values: AccountEditorValues) => {
      const { password, ...data } = values;
      return id
        ? updateCmsAccount(id, data)
        : createCmsAccount({ ...data, password });
    },
    onMutate: () => setError(null),
    onSuccess: async () => {
      await client.invalidateQueries({ queryKey: ["cms"] });
      router.push(backHref);
    },
    onError: (error) => {
      setError(error);
      applyFormError(error, setFieldError);
    },
  });
  const isSubmitting = formSubmitting || save.isPending;
  const roleErrors = getCmsFieldErrors(errors.roleIds, text);

  return (
    <>
      <Header
        title={title}
        onBack={() => router.push(backHref)}
        actions={
          <>
            {id &&
              permission.custom.includes(permissions.ACCOUNT_RESET_PASSWORD) && (
                <Button
                  variant="outline"
                  className="h-10"
                  type="button"
                  onClick={() => setResetOpen(true)}
                  disabled={!query.data}
                >
                  {t("account.resetPassword")}
                </Button>
              )}
            <Button
              variant="primary"
              className="h-10"
              type="submit"
              form="cms-account-form"
              aria-label={t(isSubmitting ? "common.saving" : "common.save")}
              loading={isSubmitting}
              disabled={
                !canSave ||
                Boolean(id && !query.data) ||
                options.isPending
              }
            >
              {t("common.save")}
            </Button>
          </>
        }
      />
      <CmsPageContent>
        <Breadcrumbs
          label={t("common.breadcrumbs")}
          items={[
            { label: t("nav.accounts"), href: backHref },
            { label: title },
          ]}
        />
        {(error || query.error || options.error) && (
          <ErrorNotice
            error={error || query.error || options.error}
            retryLoading={query.isFetching || options.isFetching}
            onRetry={() => {
              void query.refetch();
              void options.refetch();
            }}
          />
        )}
        {id && query.isPending ? (
          <p role="status" aria-label={t("common.loading")}>
            <LoadingDots />
          </p>
        ) : (
          (!id || query.data) && (
            <form
              id="cms-account-form"
              className="cms-form"
              onSubmit={handleSubmit((values) => {
                if (canSave && !save.isPending) save.mutate(values);
              })}
            >
              <fieldset disabled={!canSave || isSubmitting}>
                <Field className="cms-field" data-invalid={Boolean(errors.username?.message)}>
                  <FieldLabel htmlFor="cms-username" required>{t("account.username")}</FieldLabel>
                  <Input
                    id="cms-username"
                    aria-required="true"
                    autoComplete="off"
                    aria-invalid={Boolean(errors.username)}
                    aria-describedby={
                      errors.username?.message ? "cms-username-error" : undefined
                    }
                    {...register("username")}
                  />
                  <FieldError id="cms-username-error">
                    {errors.username?.message && text(errors.username.message)}
                  </FieldError>
                </Field>
                <Field className="cms-field" data-invalid={Boolean(errors.name?.message)}>
                  <FieldLabel htmlFor="cms-name" required>{t("account.name")}</FieldLabel>
                  <Input
                    id="cms-name"
                    aria-required="true"
                    autoComplete="off"
                    aria-invalid={Boolean(errors.name)}
                    aria-describedby={
                      errors.name?.message ? "cms-name-error" : undefined
                    }
                    {...register("name")}
                  />
                  <FieldError id="cms-name-error">
                    {errors.name?.message && text(errors.name.message)}
                  </FieldError>
                </Field>
                {!id && (
                  <Field className="cms-field" data-invalid={Boolean(errors.password?.message)}>
                    <FieldLabel htmlFor="cms-password" required>{t("account.password")}</FieldLabel>
                    <PasswordInput
                      id="cms-password"
                      aria-required="true"
                      visibilityLabels={{ show: t("common.showPassword"), hide: t("common.hidePassword") }}
                      autoComplete="new-password"
                      aria-invalid={Boolean(errors.password)}
                      aria-describedby={
                        errors.password?.message ? "cms-password-error" : undefined
                      }
                      {...register("password")}
                    />
                    <FieldError id="cms-password-error">
                      {errors.password?.message && text(errors.password.message)}
                    </FieldError>
                  </Field>
                )}
                <Field className="cms-field" data-invalid={Boolean(errors.roleIds)}>
                  <FieldLabel htmlFor="cms-roles" required>{t("account.roles")}</FieldLabel>
                  <Controller
                    name="roleIds"
                    control={control}
                    render={({ field }) => (
                      <div className="relative">
                        <Select
                          popupClassName="cms-popup"
                          multiple
                          labels={{
                            empty: t("common.noOptions"),
                            toggle: t("common.toggleOptions"),
                            clear: t("common.clearSelection"),
                            remove: (label) => t("common.removeSelection", { label }),
                          }}
                          id="cms-roles"
                          aria-required="true"
                          ref={field.ref}
                          onBlur={field.onBlur}
                          value={options.isPending ? [] : field.value}
                          onValueChange={field.onChange}
                          options={(options.data ?? []).map((role) => ({
                            value: role.id,
                            label: role.name,
                          }))}
                          disabled={
                            !canSave || isSubmitting || options.isPending || Boolean(options.error)
                          }
                          placeholder={options.isPending ? "" : t("common.selectPlaceholder")}
                          aria-busy={options.isPending}
                          aria-invalid={Boolean(errors.roleIds)}
                          aria-describedby={
                            roleErrors.length > 0 ? "cms-roles-error" : undefined
                          }
                        />
                        {options.isPending && (
                          <span
                            className="pointer-events-none absolute inset-y-0 left-3 flex items-center"
                            role="status"
                            aria-label={t("common.loading")}
                          >
                            <LoadingDots />
                          </span>
                        )}
                      </div>
                    )}
                  />
                  <FieldError id="cms-roles-error" errors={roleErrors} />
                </Field>
                {options.data?.length === 0 && (
                  <p className="cms-muted">{t("account.noRoles")}</p>
                )}
                <Field data-invalid={Boolean(errors.isActive)}>
                  <Field orientation="horizontal" className="cms-checkboxLabel">
                    <Controller
                      name="isActive"
                      control={control}
                      render={({ field }) => (
                        <Checkbox
                          id="cms-account-active"
                          name={field.name}
                          ref={field.ref}
                          onBlur={field.onBlur}
                          checked={field.value}
                          onCheckedChange={(checked) => field.onChange(checked === true)}
                          disabled={!canSave || isSubmitting}
                          aria-invalid={Boolean(errors.isActive)}
                          aria-describedby={errors.isActive?.message ? "cms-account-active-error" : undefined}
                        />
                      )}
                    />
                    <FieldLabel htmlFor="cms-account-active">{t("account.active")}</FieldLabel>
                  </Field>
                  <FieldError id="cms-account-active-error">
                    {errors.isActive?.message && text(errors.isActive.message)}
                  </FieldError>
                </Field>
              </fieldset>
              {query.data && <RecordAudit record={query.data} />}
            </form>
          )
        )}
        {id && resetOpen && (
          <ResetPassword id={id} open={resetOpen} onOpenChange={setResetOpen} />
        )}
      </CmsPageContent>
    </>
  );
}

export function AccountDetailPage(props: CmsPageProps) {
  const id = useSearchParams().get("id");
  return <AccountEditor key={id ?? "new"} {...props} id={id} />;
}
