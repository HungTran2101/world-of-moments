"use client";

import "./index.scss";

import Image from "next/image";
import { useRouter } from "next/navigation";
import { useLocale, useTranslations } from "next-intl";
import { useForm } from "react-hook-form";
import { yupResolver } from "@hookform/resolvers/yup";
import { useEffect, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/services/shared/api";
import { setLocale } from "@/services/locale";
import { locales } from "@/i18n/config";
import { loginSchema, type LoginValues } from "@/services/schemas";
import { useCmsStore } from "@/store/cmsStore";
import type { CmsUser } from "@/services/shared/types";
import { applyFormError, ErrorNotice, Field } from "@/components/shared/Forms";

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
    <main className="Cms-login">
      <section className="Cms-loginCard">
        <div className="Cms-brand">
          <Image
            src="/favicon/android-chrome-192x192.png"
            width={38}
            height={38}
            alt=""
          />
          <span>
            World of Moments<small>CMS</small>
          </span>
        </div>
        <h1>{t("login.title")}</h1>
        <p className="Cms-muted">{t("login.description")}</p>
        <form
          onSubmit={handleSubmit(async (values) => {
            setError(null);
            try {
              const { user } = await apiRequest<{ user: CmsUser }>(
                "/api/cms/auth/login",
                { method: "POST", body: values, credentials: "same-origin" },
              );
              useCmsStore.getState().setUser(user);
              router.replace("/cms");
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
              <input
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
              <input
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
            <button className="Cms-loginSubmit" type="submit">
              {t(isSubmitting ? "login.signingIn" : "login.submit")}
            </button>
          </fieldset>
        </form>
        <label className="visually-hidden" htmlFor="cms-login-locale">
          {t("common.language")}
        </label>
        <select
          id="cms-login-locale"
          value={locale}
          onChange={(event) => {
            const next = locales.find((item) => item === event.target.value);
            if (next)
              void setLocale(next)
                .then(() => router.refresh())
                .catch(setError);
          }}
        >
          <option value="vi">Tiếng Việt</option>
          <option value="en">English</option>
        </select>
      </section>
    </main>
  );
}
