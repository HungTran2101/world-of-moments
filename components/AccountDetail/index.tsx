"use client";

import { ROUTE_PATHS } from "@/services/routes";
import { LoadingDots } from "@/components/shared/LoadingDots";
import { Button } from "@/components/ui/button";

import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Select } from "@/components/ui/select";

import { useRouter, useSearchParams } from "next/navigation";
import { useTranslations } from "next-intl";
import { useQuery, useQueryClient } from "@tanstack/react-query";
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
import { permissions } from "@/services/permission";
import { Header } from "@/components/shared/Header";
import { CmsPageContent } from "@/components/shared/CmsPageContent";
import { Breadcrumbs } from "@/components/shared/Breadcrumbs";
import { applyFormError, ErrorNotice, Field } from "@/components/shared/Forms";

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
  const [error, setError] = useState<unknown>(null);
  const {
    register,
    handleSubmit,
    setError: setFieldError,
    formState: { errors, isSubmitting },
  } = useForm<ResetPasswordValues>({
    resolver: yupResolver(resetPasswordSchema),
    defaultValues: { newPassword: "" },
  });
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
            onSubmit={handleSubmit(async (values) => {
              setError(null);
              try {
                await resetCmsAccountPassword(id, values);
                onOpenChange(false);
              } catch (error) {
                setError(error);
                applyFormError(error, setFieldError);
              }
            })}
          >
            {Boolean(error) && <ErrorNotice error={error} />}
            <Field
              id="cms-reset-password"
              label={t("account.newPassword")}
              error={errors.newPassword?.message}
            >
              <Input
                id="cms-reset-password"
                type="password"
                autoComplete="new-password"
                aria-invalid={Boolean(errors.newPassword)}
                aria-describedby={
                  errors.newPassword ? "cms-reset-password-error" : undefined
                }
                {...register("newPassword")}
              />
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
    formState: { errors, isSubmitting },
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
            { label: t("nav.home"), href: ROUTE_PATHS.OVERVIEW },
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
              onSubmit={handleSubmit(async (values) => {
                if (!canSave) return;
                setError(null);
                try {
                  const { password, ...data } = values;
                  if (id) await updateCmsAccount(id, data);
                  else await createCmsAccount({ ...data, password });
                  await client.invalidateQueries({ queryKey: ["cms"] });
                  router.push(backHref);
                } catch (error) {
                  setError(error);
                  applyFormError(error, setFieldError);
                }
              })}
            >
              <fieldset disabled={!canSave || isSubmitting}>
                <Field
                  id="cms-username"
                  label={t("account.username")}
                  error={errors.username?.message}
                >
                  <Input
                    id="cms-username"
                    autoComplete="off"
                    aria-invalid={Boolean(errors.username)}
                    aria-describedby={
                      errors.username ? "cms-username-error" : undefined
                    }
                    {...register("username")}
                  />
                </Field>
                <Field
                  id="cms-name"
                  label={t("account.name")}
                  error={errors.name?.message}
                >
                  <Input
                    id="cms-name"
                    autoComplete="off"
                    aria-invalid={Boolean(errors.name)}
                    aria-describedby={
                      errors.name ? "cms-name-error" : undefined
                    }
                    {...register("name")}
                  />
                </Field>
                {!id && (
                  <Field
                    id="cms-password"
                    label={t("account.password")}
                    error={errors.password?.message}
                  >
                    <Input
                      id="cms-password"
                      type="password"
                      autoComplete="new-password"
                      aria-invalid={Boolean(errors.password)}
                      aria-describedby={
                        errors.password ? "cms-password-error" : undefined
                      }
                      {...register("password")}
                    />
                  </Field>
                )}
                <Field
                  id="cms-roles"
                  label={t("account.roles")}
                  error={errors.roleIds?.message}
                >
                  <Controller
                    name="roleIds"
                    control={control}
                    render={({ field }) => (
                      <div className="relative">
                        <Select
                          popupClassName="cms-popup"
                          multiple={{ allowClear: true }}
                          labels={{
                            empty: t("common.noOptions"),
                            toggle: t("common.toggleOptions"),
                            clear: t("common.clearSelection"),
                            remove: (label) => t("common.removeSelection", { label }),
                          }}
                          id="cms-roles"
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
                            errors.roleIds ? "cms-roles-error" : undefined
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
                </Field>
                {options.data?.length === 0 && (
                  <p className="cms-muted">{t("account.noRoles")}</p>
                )}
                <label className="cms-checkboxLabel">
                  <Controller
                    name="isActive"
                    control={control}
                    render={({ field }) => (
                      <Checkbox
                        ref={field.ref}
                        onBlur={field.onBlur}
                        checked={field.value}
                        onCheckedChange={(checked) => field.onChange(checked === true)}
                        disabled={!canSave || isSubmitting}
                      />
                    )}
                  />
                  {t("account.active")}
                </label>
              </fieldset>
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
