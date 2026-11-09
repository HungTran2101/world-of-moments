"use client";

import { Field, FieldLabel, FieldError } from "@/components/ui/field";

import { ROUTE_PATHS } from "@/services/constant";
import { permissionModules } from "@/services/permission";

import { RecordAudit } from "@/components/shared/RecordAudit";
import { LoadingDots } from "@/components/shared/LoadingDots";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useRouter, useSearchParams } from "next/navigation";
import { useTranslations } from "next-intl";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Controller, useForm } from "react-hook-form";
import { yupResolver } from "@hookform/resolvers/yup";
import { useEffect, useRef, useState } from "react";
import { roleSchema, type RoleValues } from "@/services/schemas";
import { createCmsRole, getCmsRole, updateCmsRole } from "@/services/cms/roles";
import type { CmsPageProps } from "@/services/shared/types";
import { Header } from "@/components/shared/Header";
import { CmsPageContent } from "@/components/shared/CmsPageContent";
import { Breadcrumbs } from "@/components/shared/Breadcrumbs";
import {
  applyFormError,
  ErrorNotice,
  getCmsFieldErrors,
  useCmsText,
} from "@/components/shared/Forms";

import {
  DEFAULT_PERMISSION_COLUMNS,
  PermissionModuleRow,
} from "./PermissionModuleRow";

const FIRST_PERMISSION_MODULE_KEY = permissionModules.find(
  (module) => Object.values(module.defaults).some(Boolean) || module.custom.length > 0,
)?.key;

function RoleEditor({ permission, id }: CmsPageProps & { id: string | null }) {
  const t = useTranslations();
  const text = useCmsText();
  const router = useRouter();
  const params = useSearchParams();
  const client = useQueryClient();
  const hydrated = useRef(false);
  const [error, setError] = useState<unknown>(null);
  const query = useQuery({
    queryKey: ["cms", "role", id],
    queryFn: ({ signal }) => getCmsRole(id!, { signal }),
    enabled: Boolean(id),
  });
  const isSystem = Boolean(query.data?.isSystem);
  const canSave = !isSystem && (id ? permission.update : permission.create);
  const {
    register,
    getValues,
    control,
    reset,
    handleSubmit,
    setError: setFieldError,
    formState: { errors, isSubmitting: formSubmitting },
  } = useForm<RoleValues>({
    resolver: yupResolver(roleSchema),
    defaultValues: { name: "", permissions: [] },
  });
  useEffect(() => {
    if (query.data && !hydrated.current) {
      reset({
        name: query.data.name,
        permissions: query.data.isSystem
          ? []
          : (query.data.permissions as RoleValues["permissions"]),
      });
      hydrated.current = true;
    }
  }, [query.data, reset]);
  const listParams = new URLSearchParams(params);
  listParams.delete("id");
  const backHref = `${ROUTE_PATHS.ROLES}${listParams.size ? `?${listParams}` : ""}`;
  const title = t(id ? "role.editTitle" : "role.createTitle");
  const save = useMutation({
    mutationFn: (values: RoleValues) =>
      id ? updateCmsRole(id, values) : createCmsRole(values),
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
  const permissionErrors = getCmsFieldErrors(errors.permissions, text);

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
            form="cms-role-form"
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
          items={[{ label: t("nav.roles"), href: backHref }, { label: title }]}
        />
        {(error || query.error) && (
          <ErrorNotice
            error={error || query.error}
            retryLoading={query.isFetching}
            onRetry={() => void query.refetch()}
          />
        )}
        {isSystem && <p className="cms-notice">{t("role.protected")}</p>}
        {id && query.isPending ? (
          <p role="status" aria-label={t("common.loading")}>
            <LoadingDots />
          </p>
        ) : (
          (!id || query.data) && (
            <form
              id="cms-role-form"
              className="cms-form"
              onSubmit={handleSubmit((values) => {
                if (canSave && !save.isPending) save.mutate(values);
              })}
            >
              <fieldset disabled={!canSave || isSubmitting}>
                <Field className="cms-field" data-invalid={Boolean(errors.name?.message)}>
                  <FieldLabel htmlFor="cms-role-name" required>{t("role.name")}</FieldLabel>
                  <Input
                    id="cms-role-name"
                    aria-required="true"
                    autoComplete="off"
                    aria-invalid={Boolean(errors.name)}
                    aria-describedby={
                      errors.name?.message ? "cms-role-name-error" : undefined
                    }
                    {...register("name")}
                  />
                  <FieldError id="cms-role-name-error">
                    {errors.name?.message && text(errors.name.message)}
                  </FieldError>
                </Field>
                <Field data-invalid={Boolean(errors.permissions)} aria-labelledby="cms-permissions-label">
                  <h2 id="cms-permissions-label">{t("role.permissions")}</h2>
                  <Controller
                    name="permissions"
                    control={control}
                    render={({ field }) => (
                      <div
                        className="cms-tableScroll"
                        role="group"
                        aria-labelledby="cms-permissions-label"
                      >
                        <table className="cms-permissions">
                          <thead>
                            <tr>
                              {[
                                "module",
                                ...DEFAULT_PERMISSION_COLUMNS,
                                "extra",
                              ].map((key) => (
                                <th scope="col" key={key}>
                                  {t(`role.${key}`)}
                                </th>
                              ))}
                            </tr>
                          </thead>
                          <tbody>
                            {permissionModules.map((module) => (
                              <PermissionModuleRow
                                key={module.key}
                                module={module}
                                control={control}
                                getValues={getValues}
                                onChange={field.onChange}
                                onBlur={field.onBlur}
                                inputRef={module.key === FIRST_PERMISSION_MODULE_KEY ? field.ref : undefined}
                                invalid={Boolean(errors.permissions)}
                                errorId={permissionErrors.length > 0 ? "cms-permissions-error" : undefined}
                                disabled={!canSave || isSubmitting}
                                isSystem={isSystem}
                              />
                            ))}
                          </tbody>
                        </table>
                      </div>
                    )}
                  />
                  <FieldError id="cms-permissions-error" errors={permissionErrors} />
                </Field>
              </fieldset>
              {query.data && <RecordAudit record={query.data} />}
            </form>
          )
        )}
      </CmsPageContent>
    </>
  );
}

export function RoleDetailPage(props: CmsPageProps) {
  const id = useSearchParams().get("id");
  return <RoleEditor key={id ?? "new"} {...props} id={id} />;
}
