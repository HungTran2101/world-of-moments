"use client";

import { ROUTE_PATHS } from "@/services/constant";
import { permissionModules, type PermissionKey } from "@/services/permission";

import { RecordAudit } from "@/components/shared/RecordAudit";
import { LoadingDots } from "@/components/shared/LoadingDots";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Select } from "@/components/ui/select";
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
  Field,
  useCmsText,
} from "@/components/shared/Forms";

const DEFAULT_PERMISSION_COLUMNS = ["show", "create", "update", "delete"] as const;

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
                <Field
                  id="cms-role-name"
                  label={t("role.name")}
                  error={errors.name?.message}
                >
                  <Input
                    id="cms-role-name"
                    autoComplete="off"
                    aria-invalid={Boolean(errors.name)}
                    aria-describedby={
                      errors.name ? "cms-role-name-error" : undefined
                    }
                    {...register("name")}
                  />
                </Field>
                <h2 id="cms-permissions-label">{t("role.permissions")}</h2>
                {errors.permissions?.message && (
                  <p
                    id="cms-permissions-error"
                    className="cms-fieldError"
                    role="alert"
                  >
                    {text(errors.permissions.message)}
                  </p>
                )}
                <Controller
                  name="permissions"
                  control={control}
                  render={({ field }) => (
                    <div
                      className="cms-tableScroll"
                      role="group"
                      aria-labelledby="cms-permissions-label"
                      aria-describedby={
                        errors.permissions ? "cms-permissions-error" : undefined
                      }
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
                          {permissionModules.map((module) => {
                            const modulePermissions: PermissionKey[] = [
                              ...Object.values(module.defaults),
                              ...module.custom,
                            ].filter(
                              (key): key is PermissionKey => key !== undefined,
                            );
                            const hasPermissions = Boolean(modulePermissions.length);
                            const allChecked =
                              hasPermissions &&
                              (isSystem ||
                                modulePermissions.every((key) =>
                                  field.value.includes(key),
                                ));
                            const someChecked = modulePermissions.some(
                              (key) => field.value.includes(key),
                            );

                            return (
                              <tr key={module.key}>
                                <th scope="row">
                                  <label
                                    className="inline-flex cursor-pointer items-center gap-2 has-disabled:cursor-not-allowed"
                                    htmlFor={`cms-role-module-${module.key}`}
                                  >
                                    <Checkbox
                                      id={`cms-role-module-${module.key}`}
                                      disabled={!hasPermissions || !canSave || isSubmitting}
                                      checked={
                                        allChecked
                                          ? true
                                          : someChecked
                                            ? "indeterminate"
                                            : false
                                      }
                                      onBlur={field.onBlur}
                                      onCheckedChange={(checked) => {
                                        // Chỉ thay quyền của module này, gồm cả quyền bổ sung, và giữ các module khác.
                                        const otherPermissions = field.value.filter(
                                          (value) =>
                                            !modulePermissions.includes(value),
                                        );
                                        field.onChange(
                                          checked === true
                                            ? [
                                                ...otherPermissions,
                                                ...modulePermissions,
                                              ]
                                            : otherPermissions,
                                        );
                                      }}
                                    />
                                    {t(`modules.${module.key}`)}
                                  </label>
                                </th>
                                {DEFAULT_PERMISSION_COLUMNS.map((action) => {
                                  const key = module.defaults[action];
                                  return (
                                    <td key={action}>
                                      {key ? (
                                        <Checkbox
                                          disabled={!canSave || isSubmitting}
                                          checked={
                                            isSystem || field.value.includes(key)
                                          }
                                          aria-label={`${t(`modules.${module.key}`)}: ${t(`role.${action}`)}`}
                                          onCheckedChange={(checked) =>
                                            field.onChange(
                                              checked === true
                                                ? [...field.value, key]
                                                : field.value.filter(
                                                    (value) => value !== key,
                                                  ),
                                            )
                                          }
                                        />
                                      ) : (
                                        <span className="cms-muted">—</span>
                                      )}
                                    </td>
                                  );
                                })}
                                <td>
                                  {module.custom.length > 0 ? (
                                    <Select
                                      popupClassName="cms-popup"
                                      multiple
                                      placeholder={t("common.selectPlaceholder")}
                                      labels={{
                                        empty: t("common.noOptions"),
                                        toggle: t("common.toggleOptions"),
                                        clear: t("common.clearSelection"),
                                        remove: (label) =>
                                          t("common.removeSelection", { label }),
                                      }}
                                      disabled={!canSave || isSubmitting}
                                      aria-label={`${t(`modules.${module.key}`)}: ${t("role.extra")}`}
                                      value={
                                        isSystem
                                          ? [...module.custom]
                                          : field.value.filter((value) =>
                                              (
                                                module.custom as readonly string[]
                                              ).includes(value),
                                            )
                                      }
                                      options={module.custom.map((key) => ({
                                        value: key,
                                        label: t(`permissionNames.${key}`),
                                      }))}
                                      onBlur={field.onBlur}
                                      onValueChange={(selected) => {
                                        // Chỉ thay quyền bổ sung của hàng này, giữ quyền mặc định và các module khác.
                                        field.onChange([
                                          ...field.value.filter(
                                            (value) =>
                                              !(
                                                module.custom as readonly string[]
                                              ).includes(value),
                                          ),
                                          ...selected,
                                        ]);
                                      }}
                                    />
                                  ) : (
                                    <span className="cms-muted">—</span>
                                  )}
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  )}
                />
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
