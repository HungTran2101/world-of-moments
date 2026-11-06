"use client";

import { ROUTE_PATHS } from "@/services/constant";
import { getCmsLandingPath } from "@/services/routes";
import { Select } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { PasswordInput } from "@/components/ui/password-input";
import { Brand } from "@/components/shared/Brand";
import { useRouter } from "next/navigation";
import { useLocale, useTranslations } from "next-intl";
import { useForm } from "react-hook-form";
import { yupResolver } from "@hookform/resolvers/yup";
import { useEffect, useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { loginCms } from "@/services/cms/auth";
import { setLocale } from "@/services/locale";
import { locales } from "@/i18n/config";
import { loginSchema, type LoginValues } from "@/services/schemas";
import { applyFormError, ErrorNotice, Field } from "@/components/shared/Forms";
import { Button } from "../ui/button";

const LOGIN_BRAND_IMAGE_SIZE_PX = 38;
const LOGIN_BRAND_PADDING_BOTTOM_PX = 32;

export function LoginPage() {
  const t = useTranslations();
  const locale = useLocale();
  const router = useRouter();
  const queryClient = useQueryClient();
  useEffect(() => {
    // Trang đăng nhập chỉ mở khi phiên DB không hợp lệ; bỏ dữ liệu của người dùng cũ.
    queryClient.clear();
  }, [queryClient]);
  const [error, setError] = useState<unknown>(null);
  const {
    register,
    handleSubmit,
    setError: setFieldError,
    formState: { errors, isSubmitting: formSubmitting },
  } = useForm<LoginValues>({
    resolver: yupResolver(loginSchema),
    defaultValues: { username: "", password: "" },
  });
  const login = useMutation({
    mutationFn: (values: LoginValues) => loginCms(values),
    onMutate: () => setError(null),
    onSuccess: ({ user }) => {
      router.replace(getCmsLandingPath(user.scopes) ?? ROUTE_PATHS.DASHBOARD);
      router.refresh();
    },
    onError: (error) => {
      setError(error);
      applyFormError(error, setFieldError);
    },
  });
  const language = useMutation({
    mutationFn: (next: (typeof locales)[number]) => setLocale(next),
    onMutate: () => setError(null),
    onSuccess: () => router.refresh(),
    onError: setError,
  });
  const isSubmitting = formSubmitting || login.isPending;

  return (
    <main className="cms-login">
      <section className="cms-loginCard">
        <Brand
          imageSize={LOGIN_BRAND_IMAGE_SIZE_PX}
          style={{ paddingBottom: LOGIN_BRAND_PADDING_BOTTOM_PX }}
        />
        <h1>{t("login.title")}</h1>
        <p className="cms-muted">{t("login.description")}</p>
        <form
          onSubmit={handleSubmit((values) => {
            if (!login.isPending) login.mutate(values);
          })}
        >
          {Boolean(error) && <ErrorNotice error={error} />}
          <fieldset disabled={isSubmitting}>
            <Field
              id="cms-login-username"
              label={t("account.username")}
              error={errors.username?.message}
            >
              <Input
                id="cms-login-username"
                autoComplete="username"
                autoCapitalize="none"
                spellCheck={false}
                aria-invalid={Boolean(errors.username)}
                aria-describedby={
                  errors.username ? "cms-login-username-error" : undefined
                }
                {...register("username")}
              />
            </Field>
            <Field
              id="cms-login-password"
              label={t("account.password")}
              error={errors.password?.message}
            >
              <PasswordInput
                id="cms-login-password"
                visibilityLabels={{ show: t("common.showPassword"), hide: t("common.hidePassword") }}
                autoComplete="current-password"
                aria-invalid={Boolean(errors.password)}
                aria-describedby={
                  errors.password ? "cms-login-password-error" : undefined
                }
                {...register("password")}
              />
            </Field>
            <Button
              className="cms-loginSubmit" type="submit"
              aria-label={t(isSubmitting ? "login.signingIn" : "login.submit")}
              loading={isSubmitting}
            >
              {t("login.submit")}
            </Button>
          </fieldset>
        </form>
        <label className="visually-hidden" htmlFor="cms-login-locale">
          {t("common.language")}
        </label>
        <Select
          allowClear={false}
          popupClassName="cms-popup"
          className="w-full"
          id="cms-login-locale"
          disabled={isSubmitting || language.isPending}
          value={locale}
          onValueChange={(value) => {
            const next = locales.find((item) => item === value);
            if (next && next !== locale && !language.isPending) language.mutate(next);
          }}
          options={[
            { value: "vi", label: "Tiếng Việt" },
            { value: "en", label: "English" },
          ]}
        />
      </section>
    </main>
  );
}
