"use client";

import "./index.scss";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useTranslations } from "next-intl";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { yupResolver } from "@hookform/resolvers/yup";
import { useEffect, useRef, useState } from "react";
import { Dialog } from "@/components/ui/dialog";
import {
  accountEditorSchema,
  resetPasswordSchema,
  type AccountEditorValues,
  type ResetPasswordValues,
} from "@/services/schemas";
import { cmsRequest } from "@/services/shared/cms-api";
import type { CmsAccountRecord } from "@/services/cms/accounts/types";
import type { CmsPageProps } from "@/services/shared/types";
import { permissions } from "@/services/permission";
import { Header } from "@/components/shared/Header";
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
        <Dialog.Overlay className="Cms-dialogOverlay" />
        <Dialog.Content className="Cms Cms-dialog">
          <Dialog.Title>{t("account.resetPassword")}</Dialog.Title>
          <Dialog.Description>
            {t("account.resetDescription")}
          </Dialog.Description>
          <form
            onSubmit={handleSubmit(async (values) => {
              setError(null);
              try {
                await cmsRequest(
                  `/accounts/${encodeURIComponent(id)}/reset-password`,
                  { method: "POST", body: values },
                );
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
              <input
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
            <div className="Cms-formActions">
              <Dialog.Close asChild>
                <button type="button">{t("common.cancel")}</button>
              </Dialog.Close>
              <button type="submit" disabled={isSubmitting}>
                {t("common.save")}
              </button>
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
    queryFn: ({ signal }) =>
      cmsRequest<CmsAccountRecord>(`/accounts/${encodeURIComponent(id!)}`, {
        signal,
      }),
    enabled: Boolean(id),
  });
  const options = useQuery({
    queryKey: ["cms", "account-role-options"],
    queryFn: ({ signal }) =>
      cmsRequest<{ id: string; name: string }[]>("/accounts/options", {
        signal,
      }),
  });
  const canSave = id ? permission.update : permission.create;
  const {
    register,
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
  const backHref = `/cms/accounts${listParams.size ? `?${listParams}` : ""}`;
  const title = t(id ? "account.editTitle" : "account.createTitle");

  return (
    <>
      <Header title={title}>
        {id &&
          permission.custom.includes(permissions.ACCOUNT_RESET_PASSWORD) && (
            <button
              type="button"
              onClick={() => setResetOpen(true)}
              disabled={!query.data}
            >
              {t("account.resetPassword")}
            </button>
          )}
        <Link href={backHref}>{t("common.back")}</Link>
        <button
          type="submit"
          form="cms-account-form"
          disabled={
            !canSave ||
            isSubmitting ||
            Boolean(id && !query.data) ||
            options.isPending
          }
        >
          {t(isSubmitting ? "common.saving" : "common.save")}
        </button>
      </Header>
      <Breadcrumbs
        label={t("common.breadcrumbs")}
        items={[
          { label: t("nav.home"), href: "/cms" },
          { label: t("nav.accounts"), href: backHref },
          { label: title },
        ]}
      />
      <div className="Cms-content">
        {(error || query.error || options.error) && (
          <ErrorNotice
            error={error || query.error || options.error}
            onRetry={() => {
              void query.refetch();
              void options.refetch();
            }}
          />
        )}
        {id && query.isPending ? (
          <p role="status">{t("common.loading")}</p>
        ) : (
          (!id || query.data) && (
            <form
              id="cms-account-form"
              className="Cms-form Cms-accountForm"
              onSubmit={handleSubmit(async (values) => {
                if (!canSave) return;
                setError(null);
                try {
                  const { password, ...data } = values;
                  await cmsRequest(
                    id ? `/accounts/${encodeURIComponent(id)}` : "/accounts",
                    {
                      method: id ? "PATCH" : "POST",
                      body: id ? data : { ...data, password },
                    },
                  );
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
                  <input
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
                  <input
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
                    <input
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
                  <select
                    id="cms-roles"
                    multiple
                    size={Math.min(6, Math.max(3, options.data?.length ?? 0))}
                    aria-invalid={Boolean(errors.roleIds)}
                    aria-describedby={
                      errors.roleIds ? "cms-roles-error" : undefined
                    }
                    {...register("roleIds")}
                  >
                    {options.data?.map((role) => (
                      <option key={role.id} value={role.id}>
                        {role.name}
                      </option>
                    ))}
                  </select>
                </Field>
                {options.data?.length === 0 && (
                  <p className="Cms-muted">{t("account.noRoles")}</p>
                )}
                <label className="Cms-checkboxLabel">
                  <input type="checkbox" {...register("isActive")} />
                  {t("account.active")}
                </label>
              </fieldset>
            </form>
          )
        )}
        {id && resetOpen && (
          <ResetPassword id={id} open={resetOpen} onOpenChange={setResetOpen} />
        )}
      </div>
    </>
  );
}

export function AccountDetailPage(props: CmsPageProps) {
  const id = useSearchParams().get("id");
  return <AccountEditor key={id ?? "new"} {...props} id={id} />;
}
