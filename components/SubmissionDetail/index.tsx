"use client";

import {
  SUBMISSION_STATUSES,
  SUBMISSION_VALIDITIES,
  DEFAULT_SUBMISSION_STATUS,
  DEFAULT_SUBMISSION_VALIDITY,
  permissions,
  ROUTE_PATHS,
} from "@/services/constant";
import { useEffect, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useTranslations } from "next-intl";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Controller, useForm } from "react-hook-form";
import { yupResolver } from "@hookform/resolvers/yup";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Header } from "@/components/shared/Header";
import { CmsPageContent } from "@/components/shared/CmsPageContent";
import { Breadcrumbs } from "@/components/shared/Breadcrumbs";
import { RecordAudit } from "@/components/shared/RecordAudit";
import { LoadingDots } from "@/components/shared/LoadingDots";
import { Field, ErrorNotice, applyFormError } from "@/components/shared/Forms";
import { usePublishConfirmation } from "@/components/Submissions/usePublishConfirmation";
import {
  createCmsSubmission,
  getCmsSubmission,
  updateCmsSubmission,
} from "@/services/cms/submissions";
import {
  submissionCreateSchema,
  type SubmissionCreateValues,
  type SubmissionUpdateValues,
} from "@/services/schemas";
import type { CmsPageProps } from "@/services/shared/types";
import { constants } from "@/app/api/constant";

function SubmissionEditor({
  permission,
  id,
}: CmsPageProps & { id: string | null }) {
  const t = useTranslations();
  const weather = useTranslations("weather");
  const router = useRouter();
  const params = useSearchParams();
  const client = useQueryClient();
  const confirmPublish = usePublishConfirmation();
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
    formState: { errors, isSubmitting },
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
              onSubmit={handleSubmit(async (values) => {
                if (!canSave) return;
                setError(null);
                try {
                  const change: SubmissionUpdateValues = {
                    ...(canStatus && values.status !== query.data?.status
                      ? { status: values.status }
                      : {}),
                    ...(canValidity && values.validity !== query.data?.validity
                      ? { validity: values.validity }
                      : {}),
                  };
                  if (id && !change.status && !change.validity) return;
                  const completed = await confirmPublish((confirmed) =>
                    id
                      ? updateCmsSubmission(id, {
                        ...change,
                        confirmPublish: confirmed,
                      })
                      : createCmsSubmission({
                        ...values,
                        confirmPublish: confirmed,
                      }),
                  );
                  if (!completed) return;
                  await client.invalidateQueries({ queryKey: ["cms"] });
                  router.push(backHref);
                } catch (error) {
                  setError(error);
                  applyFormError(error, setFieldError);
                }
              })}
            >
              <fieldset disabled={isSubmitting || !canSave}>
                <Field
                  id="submission-author"
                  label={t("submission.authorUuid")}
                >
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
                    <Field
                      key={field}
                      id={`submission-${field}`}
                      label={t(`submission.${field}`)}
                      error={errors[field]?.message}
                    >
                      <Input
                        id={`submission-${field}`}
                        type="number"
                        step="any"
                        readOnly={Boolean(id)}
                        aria-invalid={Boolean(errors[field])}
                        aria-describedby={
                          errors[field]
                            ? `submission-${field}-error`
                            : undefined
                        }
                        {...register(field, { valueAsNumber: true })}
                      />
                    </Field>
                  ))}
                </div>
                <Field
                  id="submission-description"
                  label={t("submission.description")}
                  error={errors.description?.message}
                >
                  <Textarea
                    id="submission-description"
                    rows={6}
                    maxLength={constants.MAX_DESCRIPTION_LENGTH}
                    readOnly={Boolean(id)}
                    aria-invalid={Boolean(errors.description)}
                    aria-describedby={
                      errors.description
                        ? "submission-description-error"
                        : undefined
                    }
                    {...register("description")}
                  />
                </Field>
                <Field
                  id="submission-status"
                  label={t("submission.status")}
                  error={errors.status?.message}
                >
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
                          errors.status ? "submission-status-error" : undefined
                        }
                        id="submission-status"
                        popupClassName="cms-popup"
                        disabled={!canStatus || !canSave || isSubmitting}
                        options={SUBMISSION_STATUSES.map((value) => ({
                          value,
                          label: t(`submission.statuses.${value}`),
                        }))}
                      />
                    )}
                  />
                </Field>
                <Field
                  id="submission-validity"
                  label={t("submission.validity")}
                  error={errors.validity?.message}
                >
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
                          errors.validity
                            ? "submission-validity-error"
                            : undefined
                        }
                        id="submission-validity"
                        popupClassName="cms-popup"
                        disabled={!canValidity || !canSave || isSubmitting}
                        options={SUBMISSION_VALIDITIES.map((value) => ({
                          value,
                          label: t(`submission.validities.${value}`),
                        }))}
                      />
                    )}
                  />
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
    </>
  );
}

export function SubmissionDetailPage(props: CmsPageProps) {
  const id = useSearchParams().get("id");
  return <SubmissionEditor key={id ?? "new"} {...props} id={id} />;
}
