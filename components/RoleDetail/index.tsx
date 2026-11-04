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
import { roleSchema, type RoleValues } from "@/services/schemas";
import { createCmsRole, getCmsRole, updateCmsRole } from "@/services/cms/roles";
import type { CmsPageProps } from "@/services/shared/types";
import { permissionModules } from "@/services/permission";
import { Header } from "@/components/shared/Header";
import { CmsPageContent } from "@/components/shared/CmsPageContent";
import { Breadcrumbs } from "@/components/shared/Breadcrumbs";
import {
  applyFormError,
  ErrorNotice,
  Field,
  useCmsText,
} from "@/components/shared/Forms";

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
    formState: { errors, isSubmitting },
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
          items={[
            { label: t("nav.roles"), href: backHref },
            { label: title },
          ]}
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
              onSubmit={handleSubmit(async (values) => {
                if (!canSave) return;
                setError(null);
                try {
                  if (id) await updateCmsRole(id, values);
                  else await createCmsRole(values);
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
                  <p id="cms-permissions-error" className="cms-fieldError" role="alert">
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
                      aria-describedby={errors.permissions ? "cms-permissions-error" : undefined}
                    >
                      <table className="cms-permissions">
                        <thead>
                          <tr>
                            {[
                              "module",
                              "show",
                              "create",
                              "update",
                              "delete",
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
                            <tr key={module.key}>
                              <th scope="row">{t(`modules.${module.key}`)}</th>
                              {module.defaults.map((key, index) => (
                                <td key={key}>
                                  <Checkbox
                                    disabled={!canSave || isSubmitting}
                                    checked={
                                      isSystem || field.value.includes(key)
                                    }
                                    aria-label={`${t(`modules.${module.key}`)}: ${t(`role.${["show", "create", "update", "delete"][index]}`)}`}
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
                                </td>
                              ))}
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
                                      remove: (label) => t("common.removeSelection", { label }),
                                    }}
                                    disabled={!canSave || isSubmitting}
                                    aria-label={`${t(`modules.${module.key}`)}: ${t("role.extra")}`}
                                    value={
                                      isSystem
                                        ? [...module.custom]
                                        : field.value.filter((value) =>
                                            (module.custom as readonly string[]).includes(value),
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
                                        ...field.value.filter((value) =>
                                          !(module.custom as readonly string[]).includes(value),
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
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                />
              </fieldset>
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
