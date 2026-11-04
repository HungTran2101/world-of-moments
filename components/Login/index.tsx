"use client";

import { ROUTE_PATHS } from "@/services/routes";
import { Select } from "@/components/ui/select";

import { Input } from "@/components/ui/input";

import { Brand } from "@/components/shared/Brand";
import { useRouter } from "next/navigation";
import { useLocale, useTranslations } from "next-intl";
import { useForm } from "react-hook-form";
import { yupResolver } from "@hookform/resolvers/yup";
import { useEffect, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { loginCms } from "@/services/cms/auth";
import { setLocale } from "@/services/locale";
import { locales } from "@/i18n/config";
import { loginSchema, type LoginValues } from "@/services/schemas";
import { useCmsStore } from "@/store/cmsStore";
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
    useCmsStore.getState().clear();
    queryClient.clear();
  }, [queryClient]);
  const [error, setError] = useState<unknown>(null);
  const {
    register,
    handleSubmit,
    setError: setFieldError,
    formState: { errors, isSubmitting },
  } = useForm<LoginValues>({
    resolver: yupResolver(loginSchema),
    defaultValues: { username: "", password: "" },
  });
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
          onSubmit={handleSubmit(async (values) => {
            setError(null);
            try {
              const { user } = await loginCms(values);
              useCmsStore.getState().setUser(user);
              router.replace(ROUTE_PATHS.OVERVIEW);
              router.refresh();
            } catch (error) {
              setError(error);
              applyFormError(error, setFieldError);
            }
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
              <Input
                id="cms-login-password"
                type="password"
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
          popupClassName="cms-popup"
          className="w-full"
          id="cms-login-locale"
          disabled={isSubmitting}
          value={locale}
          onValueChange={(value) => {
            const next = locales.find((item) => item === value);
            if (next)
              void setLocale(next)
                .then(() => router.refresh())
                .catch(setError);
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
