"use client";
import { useEffect, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useTranslations } from "next-intl";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Controller, useForm } from "react-hook-form";
import { yupResolver } from "@hookform/resolvers/yup";
import { ROUTE_PATHS } from "@/services/constant";
import { CLIENT_STATUSES } from "@/app/api/client/constant";
import type { ClientStatus } from "@/services/client-auth/types";
import { permissions } from "@/services/permission";
import type { CmsPageProps } from "@/services/shared/types";
import { clientUserEditorSchema, type ClientUserEditorValues } from "@/services/schemas";
import {
  createCmsClientUser,
  getCmsClientUser,
  changeCmsClientUserStatus,
  revokeCmsClientUserBan,
} from "@/services/cms/client-users";
import { Header } from "@/components/shared/Header";
import { CmsPageContent } from "@/components/shared/CmsPageContent";
import { Breadcrumbs } from "@/components/shared/Breadcrumbs";
import { RecordAudit } from "@/components/shared/RecordAudit";
import { ErrorNotice, applyFormError, useCmsText } from "@/components/shared/Forms";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { PasswordInput } from "@/components/ui/password-input";
import { Select } from "@/components/ui/select";
import { Field, FieldLabel, FieldError } from "@/components/ui/field";
import { useModal } from "@/components/ui/modal";
import { LoadingDots } from "@/components/shared/LoadingDots";
import { formatDateTime } from "@/lib/utils";

function ClientUserEditor({ permission, id }: CmsPageProps & { id: string | null }) {
  const t = useTranslations();
  const text = useCmsText();
  const router = useRouter();
  const params = useSearchParams();
  const client = useQueryClient();
  const [modal, contextHolder] = useModal();
  const hydrated = useRef(false);
  const [formReady, setFormReady] = useState(!id);
  const [error, setError] = useState<unknown>(null);
  const [emailError, setEmailError] = useState(false);
  const query = useQuery({
    queryKey: ["cms", "client-user", id],
    queryFn: ({ signal }) => getCmsClientUser(id!, { signal }),
    enabled: Boolean(id),
  });
  const record = query.data;
  const canChangeStatus = permission.custom.includes(permissions.CLIENT_USER_CHANGE_STATUS);
  const canSave = id ? canChangeStatus && record?.status !== "banned" : permission.create;
  const {
    register,
    control,
    handleSubmit,
    reset,
    setError: setFieldError,
    formState: { errors },
  } = useForm<ClientUserEditorValues>({
    resolver: yupResolver(clientUserEditorSchema),
    context: { creating: !id },
    defaultValues: { email: "", password: "", status: "unverified" },
  });
  useEffect(() => {
    if (record && !hydrated.current) {
      reset({ email: record.email, password: "", status: record.status });
      hydrated.current = true;
      setFormReady(true);
    }
  }, [record, reset]);
  useEffect(() => () => modal.destroyAll(), [modal]);
  const listParams = new URLSearchParams(params);
  listParams.delete("id");
  const backHref = `${ROUTE_PATHS.CLIENT_USERS}${listParams.size ? `?${listParams}` : ""}`;
  const save = useMutation({
    mutationFn: async (values: ClientUserEditorValues) => {
      if (id) {
        if (values.status === "suspended" || values.status === "banned") {
          const confirmed = await modal.confirm({
            title: t("clientUser.changeStatus"),
            content: t("clientUser.confirmStatus"),
            okText: t("common.save"),
            cancelText: t("common.cancel"),
          });
          if (!confirmed) return null;
        }
        await changeCmsClientUserStatus(id, values.status);
        return { id };
      }
      return createCmsClientUser({ ...values, email: values.email.trim().toLowerCase() });
    },
    onMutate: () => setError(null),
    onSuccess: async (result) => {
      if (!result) return;
      hydrated.current = false;
      await client.invalidateQueries({ queryKey: ["cms", "client-users"] });
      await client.invalidateQueries({ queryKey: ["cms", "client-user"] });
      if ("emailError" in result && result.emailError) {
        setEmailError(true);
        router.replace(
          `${ROUTE_PATHS.CLIENT_USER_DETAIL}?id=${encodeURIComponent(result.id)}&emailError=1`,
        );
      } else if (!id)
        router.replace(`${ROUTE_PATHS.CLIENT_USER_DETAIL}?id=${encodeURIComponent(result.id)}`);
    },
    onError: (error) => {
      setError(error);
      applyFormError(error, setFieldError);
    },
  });
  const revoke = useMutation({
    mutationFn: async () => {
      const confirmed = await modal.confirm({
        title: t("clientUser.revokeBan"),
        content: t("clientUser.confirmRevoke"),
        okText: t("clientUser.revokeBan"),
        cancelText: t("common.cancel"),
      });
      if (confirmed) await revokeCmsClientUserBan(id!);
    },
    onSuccess: async () => {
      hydrated.current = false;
      await client.invalidateQueries({ queryKey: ["cms", "client-user"] });
      await client.invalidateQueries({ queryKey: ["cms", "client-users"] });
    },
    onError: setError,
  });
  const busy = save.isPending || revoke.isPending;
  const fields = record
    ? ([
        ["id", record.id],
        ["email", record.email],
        ["emailVerified", t(record.emailVerified ? "clientUser.yes" : "clientUser.no")],
        ["suspendedUntil", record.suspendedUntil ? formatDateTime(record.suspendedUntil) : "—"],
        ["suspensionCount", record.suspensionCount],
        ["verificationSendCount", record.verificationSendCount],
        [
          "verificationLastSentAt",
          record.verificationLastSentAt ? formatDateTime(record.verificationLastSentAt) : "—",
        ],
        [
          "verificationDeadline",
          record.emailVerified ? "—" : formatDateTime(record.verificationDeadline),
        ],
        ["dailySubmissions", record.dailySubmissions],
        ["lastSubmittedAt", record.lastSubmittedAt ? formatDateTime(record.lastSubmittedAt) : "—"],
        ["recentRejectedAttempts", record.recentRejectedAttempts],
      ] as const)
    : [];
  return (
    <>
      <Header
        title={t(id ? "clientUser.detailTitle" : "clientUser.createTitle")}
        onBack={() => router.push(backHref)}
        actions={
          <>
            {record?.status === "banned" &&
              permission.custom.includes(permissions.CLIENT_USER_REVOKE_BAN) && (
                <Button
                  type="button"
                  variant="outline"
                  loading={revoke.isPending}
                  disabled={busy}
                  onClick={() => revoke.mutate()}
                >
                  {t("clientUser.revokeBan")}
                </Button>
              )}
            {canSave && (
              <Button
                form="cms-client-user-form"
                type="submit"
                variant="primary"
                loading={save.isPending}
                disabled={busy || Boolean(id && !record)}
              >
                {t("common.save")}
              </Button>
            )}
          </>
        }
      />
      <CmsPageContent>
        <Breadcrumbs
          label={t("common.breadcrumbs")}
          items={[
            { label: t("nav.clientUsers"), href: backHref },
            { label: t(id ? "clientUser.detailTitle" : "clientUser.createTitle") },
          ]}
        />
        {Boolean(error || query.error) && <ErrorNotice error={error || query.error} />}
        {(emailError || params.get("emailError")) && (
          <p className="cms-notice">{t("clientUser.emailError")}</p>
        )}
        {id && (query.isPending || Boolean(record && !formReady)) ? (
          <LoadingDots />
        ) : (
          (!id || record) && (
            <form
              id="cms-client-user-form"
              className="cms-form"
              onSubmit={handleSubmit((values) => {
                if (canSave && !busy) {
                  save.mutate(values);
                }
              })}
            >
              {!id && (
                <>
                  <Field className="cms-field">
                    <FieldLabel
                      htmlFor="cms-client-email"
                      required
                    >
                      {t("clientUser.email")}
                    </FieldLabel>
                    <Input
                      id="cms-client-email"
                      type="email"
                      autoComplete="email"
                      disabled={busy}
                      aria-invalid={Boolean(errors.email)}
                      aria-describedby={errors.email ? "cms-client-email-error" : undefined}
                      {...register("email")}
                    />
                    <FieldError id="cms-client-email-error">
                      {errors.email?.message && text(errors.email.message)}
                    </FieldError>
                  </Field>
                  <Field className="cms-field">
                    <FieldLabel
                      htmlFor="cms-client-password"
                      required
                    >
                      {t("clientUser.password")}
                    </FieldLabel>
                    <PasswordInput
                      id="cms-client-password"
                      autoComplete="new-password"
                      disabled={busy}
                      visibilityLabels={{
                        show: t("common.showPassword"),
                        hide: t("common.hidePassword"),
                      }}
                      aria-invalid={Boolean(errors.password)}
                      aria-describedby={errors.password ? "cms-client-password-error" : undefined}
                      {...register("password")}
                    />
                    <FieldError id="cms-client-password-error">
                      {errors.password?.message && text(errors.password.message)}
                    </FieldError>
                  </Field>
                </>
              )}
              <Field className="cms-field">
                <FieldLabel
                  htmlFor="cms-client-status"
                  required
                >
                  {t("clientUser.status")}
                </FieldLabel>
                <Controller
                  name="status"
                  control={control}
                  render={({ field }) => (
                    <Select
                      id="cms-client-status"
                      popupClassName="cms-popup"
                      allowClear={false}
                      value={field.value}
                      onValueChange={(value) => field.onChange(value as ClientStatus)}
                      disabled={busy || !canSave}
                      options={CLIENT_STATUSES.filter(
                        (status) => !record?.emailVerified || status !== "unverified",
                      ).map((value) => ({
                        value,
                        label: t(`clientUser.statuses.${value}`),
                        disabled: !id && value !== "unverified" && !canChangeStatus,
                      }))}
                      aria-invalid={Boolean(errors.status)}
                      aria-describedby={errors.status ? "cms-client-status-error" : undefined}
                    />
                  )}
                />
                <FieldError id="cms-client-status-error">
                  {errors.status?.message && text(errors.status.message)}
                </FieldError>
              </Field>
              {record && (
                <>
                  <dl className="clientUserDetail-info">
                    {fields.map(([key, value]) => (
                      <div key={key}>
                        <dt>{t(`clientUser.${key}`)}</dt>
                        <dd>{value}</dd>
                      </div>
                    ))}
                  </dl>
                  <RecordAudit
                    record={{
                      ...record,
                      updatedBy: record.updatedByName
                        ? `${record.updatedByName} (${record.updatedBy})`
                        : (record.updatedBy ?? t("clientUser.system")),
                    }}
                  />
                </>
              )}
            </form>
          )
        )}
      </CmsPageContent>
      {contextHolder}
    </>
  );
}
export function ClientUserDetailPage(props: CmsPageProps) {
  const id = useSearchParams().get("id");
  return (
    <ClientUserEditor
      key={id ?? "new"}
      {...props}
      id={id}
    />
  );
}
