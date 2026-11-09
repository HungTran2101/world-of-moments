"use client";

import { Field, FieldLabel, FieldError } from "@/components/ui/field";

import { constants } from "@/app/api/constant";
import { Breadcrumbs } from "@/components/shared/Breadcrumbs";
import { CmsPageContent } from "@/components/shared/CmsPageContent";
import { ErrorNotice, applyFormError, useCmsText } from "@/components/shared/Forms";
import { Header } from "@/components/shared/Header";
import { LoadingDots } from "@/components/shared/LoadingDots";
import { RecordAudit } from "@/components/shared/RecordAudit";
import { usePublishConfirmation } from "@/components/Submissions/usePublishConfirmation";
import { useModal } from "@/components/ui/modal";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import {
  createCmsSubmission,
  getCmsSubmission,
  updateCmsSubmission,
} from "@/services/cms/submissions";
import {
  DEFAULT_SUBMISSION_STATUS,
  DEFAULT_SUBMISSION_VALIDITY,
  ROUTE_PATHS,
  SUBMISSION_STATUSES,
  SUBMISSION_VALIDITIES,
} from "@/services/constant";
import { permissions } from "@/services/permission";
import {
  submissionCreateSchema,
  type SubmissionCreateValues,
  type SubmissionUpdateValues,
} from "@/services/schemas";
import type { CmsPageProps } from "@/services/shared/types";
import { yupResolver } from "@hookform/resolvers/yup";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useTranslations } from "next-intl";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { Controller, useForm } from "react-hook-form";

function SubmissionEditor({
  permission,
  id,
}: CmsPageProps & { id: string | null }) {
  const t = useTranslations();
  const text = useCmsText();
  const weather = useTranslations("weather");
  const router = useRouter();
  const params = useSearchParams();
  const client = useQueryClient();
  const [modal, contextHolder] = useModal();
  const confirmPublish = usePublishConfirmation(modal);
  useEffect(() => () => modal.destroyAll(), [modal, params]);
  const hydrated = useRef(false);
  const [error, setError] = useState<unknown>(null);
  const canStatus = permission.custom.includes(
    permissions.SUBMISSION_UPDATE_STATUS,
  );
  const canValidity = permission.custom.includes(
    permissions.SUBMISSION_UPDATE_VALIDITY,
  );
  const canSave = id ? canStatus || canValidity : permission.create;
  const query = useQuery({
    queryKey: ["cms", "submission", id],
    queryFn: ({ signal }) => getCmsSubmission(id!, { signal }),
    enabled: Boolean(id),
  });
  const {
    register,
    control,
    reset,
    handleSubmit,
    setError: setFieldError,
    formState: { errors, isSubmitting: formSubmitting },
  } = useForm<SubmissionCreateValues>({
    resolver: yupResolver(submissionCreateSchema),
    defaultValues: {
      description: "",
      lat: 0,
      lng: 0,
      status: DEFAULT_SUBMISSION_STATUS,
      validity: DEFAULT_SUBMISSION_VALIDITY,
      confirmPublish: false,
    },
  });
  useEffect(() => {
    if (query.data && !hydrated.current) {
      reset({ ...query.data, confirmPublish: false });
      hydrated.current = true;
    }
  }, [query.data, reset]);
  const listParams = new URLSearchParams(params);
  listParams.delete("id");
  const backHref = `${ROUTE_PATHS.SUBMISSIONS}${listParams.size ? `?${listParams}` : ""}`;
  const title = t(id ? "submission.detailTitle" : "submission.createTitle");
  const save = useMutation({
    mutationFn: ({ values, change }: {
      values: SubmissionCreateValues;
      change: SubmissionUpdateValues;
    }) => confirmPublish(
      (confirmed) => id
        ? updateCmsSubmission(id, { ...change, confirmPublish: confirmed })
        : createCmsSubmission({ ...values, confirmPublish: confirmed }),
      [id && query.data ? query.data : values],
      change,
    ),
    onMutate: () => setError(null),
    onSuccess: async (completed) => {
      if (!completed) return;
      await client.invalidateQueries({ queryKey: ["cms"] });
      router.push(backHref);
    },
    onError: (error) => {
      setError(error);
      applyFormError(error, setFieldError);
    },
  });
  const isSubmitting = formSubmitting || save.isPending;
  const weatherCode =
    query.data?.weatherCode == null ? "" : String(query.data.weatherCode);
  const weatherDescription =
    weatherCode && weather.has(weatherCode)
      ? weather(weatherCode)
      : (query.data?.weatherSummary ?? "—");
  return (
    <>
      <Header
        title={title}
        onBack={() => router.push(backHref)}
        actions={
          <Button
            variant="primary"
            className="h-10"
            type="submit"
            form="cms-submission-form"
            aria-label={t(isSubmitting ? "common.saving" : "common.save")}
            loading={isSubmitting}
            disabled={!canSave || Boolean(id && !query.data)}
          >
            {t("common.save")}
          </Button>
        }
      />
      <CmsPageContent>
        <Breadcrumbs
          label={t("common.breadcrumbs")}
          items={[
            { label: t("nav.submissions"), href: backHref },
            { label: title },
          ]}
        />
        {Boolean(error || query.error) && (
          <ErrorNotice
            error={error || query.error}
            onRetry={() => void query.refetch()}
            retryLoading={query.isFetching}
          />
        )}
        {id && query.isPending ? (
          <p role="status" aria-label={t("common.loading")}>
            <LoadingDots />
          </p>
        ) : (
          (!id || query.data) && (
            <form
              id="cms-submission-form"
              className="cms-form"
              onSubmit={handleSubmit((values) => {
                if (!canSave || save.isPending) return;
                const change: SubmissionUpdateValues = {
                  ...(canStatus && values.status !== query.data?.status
                    ? { status: values.status }
                    : {}),
                  ...(canValidity && values.validity !== query.data?.validity
                    ? { validity: values.validity }
                    : {}),
                };
                if (id && !change.status && !change.validity) return;
                save.mutate({ values, change });
              })}
            >
              <fieldset disabled={isSubmitting || !canSave}>
                <Field className="cms-field">
                  <FieldLabel htmlFor="submission-author">{t("submission.authorUuid")}</FieldLabel>
                  <Input
                    id="submission-author"
                    readOnly
                    value={
                      query.data?.authorUuid ?? t("submission.autoGenerated")
                    }
                  />
                </Field>
                <div className="grid grid-cols-2 gap-x-4">
                  {(["lat", "lng"] as const).map((field) => (
                    <Field className="cms-field" key={field} data-invalid={Boolean(errors[field]?.message)}>
                      <FieldLabel htmlFor={`submission-${field}`} required>{t(`submission.${field}`)}</FieldLabel>
                      <Input
                        id={`submission-${field}`}
                        aria-required="true"
                        type="number"
                        step="any"
                        readOnly={Boolean(id)}
                        aria-invalid={Boolean(errors[field])}
                        aria-describedby={
                          errors[field]?.message
                            ? `submission-${field}-error`
                            : undefined
                        }
                        {...register(field, { valueAsNumber: true })}
                      />
                      <FieldError id={`submission-${field}-error`}>
                        {errors[field]?.message && text(errors[field].message)}
                      </FieldError>
                    </Field>
                  ))}
                </div>
                <Field className="cms-field" data-invalid={Boolean(errors.description?.message)}>
                  <FieldLabel htmlFor="submission-description" required>{t("submission.description")}</FieldLabel>
                  <Textarea
                    id="submission-description"
                    aria-required="true"
                    rows={6}
                    maxLength={constants.MAX_DESCRIPTION_LENGTH}
                    readOnly={Boolean(id)}
                    aria-invalid={Boolean(errors.description)}
                    aria-describedby={
                      errors.description?.message
                        ? "submission-description-error"
                        : undefined
                    }
                    {...register("description")}
                  />
                  <FieldError id="submission-description-error">
                    {errors.description?.message && text(errors.description.message)}
                  </FieldError>
                </Field>
                <Field className="cms-field" data-invalid={Boolean(errors.status?.message)}>
                  <FieldLabel htmlFor="submission-status" required>{t("submission.status")}</FieldLabel>
                  <Controller
                    name="status"
                    control={control}
                    render={({ field }) => (
                      <Select
                        allowClear={false}
                        ref={field.ref}
                        onBlur={field.onBlur}
                        value={field.value}
                        onValueChange={(value) => {
                          // Radix có thể phát giá trị rỗng khi đồng bộ form; trạng thái luôn phải có giá trị.
                          if (value) field.onChange(value);
                        }}
                        aria-invalid={Boolean(errors.status)}
                        aria-describedby={
                          errors.status?.message ? "submission-status-error" : undefined
                        }
                        id="submission-status"
                        aria-required="true"
                        popupClassName="cms-popup"
                        disabled={!canStatus || !canSave || isSubmitting}
                        options={SUBMISSION_STATUSES.map((value) => ({
                          value,
                          label: t(`submission.statuses.${value}`),
                        }))}
                      />
                    )}
                  />
                  <FieldError id="submission-status-error">
                    {errors.status?.message && text(errors.status.message)}
                  </FieldError>
                </Field>
                <Field className="cms-field" data-invalid={Boolean(errors.validity?.message)}>
                  <FieldLabel htmlFor="submission-validity" required>{t("submission.validity")}</FieldLabel>
                  <Controller
                    name="validity"
                    control={control}
                    render={({ field }) => (
                      <Select
                        allowClear={false}
                        ref={field.ref}
                        onBlur={field.onBlur}
                        value={field.value}
                        onValueChange={(value) => {
                          // Radix có thể phát giá trị rỗng khi đồng bộ form; trạng thái luôn phải có giá trị.
                          if (value) field.onChange(value);
                        }}
                        aria-invalid={Boolean(errors.validity)}
                        aria-describedby={
                          errors.validity?.message
                            ? "submission-validity-error"
                            : undefined
                        }
                        id="submission-validity"
                        aria-required="true"
                        popupClassName="cms-popup"
                        disabled={!canValidity || !canSave || isSubmitting}
                        options={SUBMISSION_VALIDITIES.map((value) => ({
                          value,
                          label: t(`submission.validities.${value}`),
                        }))}
                      />
                    )}
                  />
                  <FieldError id="submission-validity-error">
                    {errors.validity?.message && text(errors.validity.message)}
                  </FieldError>
                </Field>
              </fieldset>
              {query.data && (
                <div className="rounded-lg border border-border bg-muted/30 p-4 sm:p-5">
                  <dl className="grid gap-x-6 gap-y-4 sm:grid-cols-2">
                    <div>
                      <dt className="text-xs text-muted-foreground">
                        {t("common.createdBy")}
                      </dt>
                      <dd className="mt-1 text-sm wrap-break-word">
                        {query.data.createdBy}
                      </dd>
                    </div>
                    <div>
                      <dt className="text-xs text-muted-foreground">
                        {t("submission.createdFrom")}
                      </dt>
                      <dd className="mt-1 text-sm">
                        {t(`submission.sources.${query.data.createdFrom}`)}
                      </dd>
                    </div>
                    <div>
                      <dt className="text-xs text-muted-foreground">
                        {t("submission.weatherCode")}
                      </dt>
                      <dd className="mt-1 text-sm tabular-nums">
                        {query.data.weatherCode ?? "—"}
                      </dd>
                    </div>
                    <div>
                      <dt className="text-xs text-muted-foreground">
                        {t("submission.weather")}
                      </dt>
                      <dd className="mt-1 text-sm wrap-break-word">
                        {weatherDescription}
                      </dd>
                    </div>
                  </dl>
                  <RecordAudit record={query.data} />
                </div>
              )}
            </form>
          )
        )}
      </CmsPageContent>
      {contextHolder}
    </>
  );
}

export function SubmissionDetailPage(props: CmsPageProps) {
  const id = useSearchParams().get("id");
  return <SubmissionEditor key={id ?? "new"} {...props} id={id} />;
}
