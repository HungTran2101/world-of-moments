"use client";
import { useCallback, useEffect, useRef, useState, type RefObject } from "react";
import { useMutation } from "@tanstack/react-query";
import { useLocale, useTranslations } from "next-intl";
import { useForm } from "react-hook-form";
import { yupResolver } from "@hookform/resolvers/yup";
import * as yup from "yup";
import { MailCheck, Pause, ShieldAlert, LogOut, Eye, EyeOff } from "lucide-react";
import { useClientSession } from "@/components/ClientSession";
import { Turnstile } from "@/components/Turnstile";
import SubmissionForm from "@/components/SubmissionForm";
import ThoughtGuidelines from "@/components/ThoughtGuidelines";
import { GlassButton } from "@/components/ui/glass-button";
import { LoadingDots } from "@/components/shared/LoadingDots";
import { loginClient, registerClient, resendClientVerification } from "@/services/client-auth";
import { CLIENT_LIMITS } from "@/app/api/client/constant";
import type { ClientCredentials } from "@/services/client-auth/types";
import { useSystemStore } from "@/store/systemStore";
import { ApiError } from "@/services/shared/errors";

const credentialsSchema = yup.object({
  email: yup.string().trim().email("validationEmail").required("validationRequired"),
  password: yup
    .string()
    .min(CLIENT_LIMITS.MIN_PASSWORD_LENGTH, "validationPassword")
    .max(CLIENT_LIMITS.MAX_PASSWORD_LENGTH, "validationPassword")
    .required("validationRequired"),
});
type Credentials = yup.InferType<typeof credentialsSchema>;
const errorCode = (error: unknown) =>
  error instanceof ApiError &&
  typeof error.data === "object" &&
  error.data &&
  "code" in error.data &&
  typeof error.data.code === "string"
    ? error.data.code
    : "unavailable";

function ClientLogin({ onEmailError }: { onEmailError: () => void }) {
  const t = useTranslations("clientAuth");
  const locale = useLocale() === "vi" ? "vi" : "en";
  const { changed } = useClientSession();
  const [creating, setCreating] = useState(false);
  const [visiblePassword, setVisiblePassword] = useState(false);
  const [failure, setFailure] = useState<string | null>(null);
  const [captchaNeeded, setCaptchaNeeded] = useState(false);
  const [captchaAttempt, setCaptchaAttempt] = useState(0);
  const pending = useRef<ClientCredentials | null>(null);
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<Credentials>({
    resolver: yupResolver(credentialsSchema),
    defaultValues: { email: "", password: "" },
  });
  const mutation = useMutation({
    mutationFn: (values: ClientCredentials) =>
      creating ? registerClient(values) : loginClient(values),
    onSuccess: async (result) => {
      if ("emailError" in result && result.emailError) onEmailError();
      pending.current = null;
      await changed();
    },
    onError: (error, values) => {
      const code = errorCode(error);
      if (code === "captchaRequired" && !values.captchaToken) {
        setFailure(null);
        setCaptchaAttempt((value) => value + 1);
        setCaptchaNeeded(true);
      } else setFailure(code === "captchaRequired" ? "captchaUnavailable" : code);
    },
  });
  const { mutate } = mutation;
  const onToken = useCallback(
    (token: string) => {
      setCaptchaNeeded(false);
      if (pending.current) mutate({ ...pending.current, captchaToken: token });
    },
    [mutate],
  );
  const onCaptchaError = useCallback(() => {
    setCaptchaNeeded(false);
    setFailure("captchaUnavailable");
  }, []);
  const busy = mutation.isPending || captchaNeeded;
  return (
    <section className="clientSidebarContent clientSidebarContent-auth">
      <h1>{t(creating ? "registerTitle" : "loginTitle")}</h1>
      <p>{t(creating ? "registerIntro" : "loginIntro")}</p>
      <form
        onSubmit={(event) => {
          void handleSubmit((values) => {
            if (busy) return;
            setFailure(null);
            pending.current = { ...values, locale };
            mutation.mutate(pending.current);
          })(event);
        }}
        aria-busy={busy}
      >
        <div className="clientSidebarContent-field">
          <label htmlFor="client-email">{t("email")}</label>
          <input
            id="client-email"
            type="email"
            autoComplete="email"
            disabled={busy}
            aria-invalid={Boolean(errors.email)}
            aria-describedby={errors.email ? "client-email-error" : undefined}
            {...register("email")}
          />
          {errors.email?.message && (
            <p
              id="client-email-error"
              role="alert"
            >
              {t(errors.email.message)}
            </p>
          )}
        </div>
        <div className="clientSidebarContent-field">
          <label htmlFor="client-password">{t("password")}</label>
          <div className="clientSidebarContent-password">
            <input
              id="client-password"
              type={visiblePassword ? "text" : "password"}
              autoComplete={creating ? "new-password" : "current-password"}
              disabled={busy}
              aria-invalid={Boolean(errors.password)}
              aria-describedby={errors.password ? "client-password-error" : undefined}
              {...register("password")}
            />
            <button
              type="button"
              aria-label={t(visiblePassword ? "hidePassword" : "showPassword")}
              onClick={() => setVisiblePassword((value) => !value)}
            >
              {visiblePassword ? <EyeOff aria-hidden="true" /> : <Eye aria-hidden="true" />}
            </button>
          </div>
          {errors.password?.message && (
            <p
              id="client-password-error"
              role="alert"
            >
              {t(errors.password.message)}
            </p>
          )}
        </div>
        {failure && (
          <p role="alert">
            {t.has(`errors.${failure}`) ? t(`errors.${failure}`) : t("errors.unavailable")}
          </p>
        )}
        <GlassButton
          type="submit"
          disabled={busy}
          className="w-full"
        >
          {busy ? <LoadingDots /> : t(creating ? "register" : "login")}
        </GlassButton>
        {captchaNeeded && (
          <Turnstile
            action={creating ? "register" : "login"}
            attempt={captchaAttempt}
            onToken={onToken}
            onError={onCaptchaError}
          />
        )}
      </form>
      <button
        type="button"
        className="clientSidebarContent-link"
        disabled={busy}
        onClick={() => {
          setCreating((value) => !value);
          setFailure(null);
          pending.current = null;
        }}
      >
        {t(creating ? "toLogin" : "toRegister")}
      </button>
      <small>{t.rich("privacy", { policy: (chunks) => <a href="/privacy">{chunks}</a> })}</small>
    </section>
  );
}

export function ClientSidebarContent({
  inputRef,
}: {
  inputRef: RefObject<HTMLTextAreaElement | null>;
}) {
  const t = useTranslations("clientAuth");
  const guidance = useTranslations("guidance");
  const locale = useLocale() === "vi" ? "vi" : "en";
  const { user, loading, error, refresh, logout } = useClientSession();
  const sidebarOpen = useSystemStore((state) => state.sidebarOpen);
  useEffect(() => {
    if (sidebarOpen && user?.status === "verified" && user.availability === "ready")
      inputRef.current?.focus({ preventScroll: true });
  }, [sidebarOpen, user?.status, user?.availability, inputRef]);
  const [description, setDescription] = useState("");
  const [notice, setNotice] = useState<string | null>(null);
  const [resendReady, setResendReady] = useState(false);
  useEffect(() => {
    const readyAt = user?.resendAvailableAt;
    const remaining = readyAt ? new Date(readyAt).getTime() - Date.now() : 0;
    setResendReady(remaining <= 0);
    if (remaining <= 0) return;
    const timer = window.setTimeout(() => setResendReady(true), remaining);
    return () => window.clearTimeout(timer);
  }, [user?.resendAvailableAt]);
  useEffect(() => {
    const verification = new URLSearchParams(window.location.search).get("verification");
    if (verification === "invalid") setNotice("invalidLink");
  }, []);
  const resend = useMutation({
    mutationFn: () => resendClientVerification(locale),
    onSuccess: () => setNotice("emailSent"),
    onError: (error) => setNotice(errorCode(error)),
    onSettled: () => void refresh(),
  });
  const signOut = useMutation({ mutationFn: logout, onError: () => setNotice("unavailable") });
  if (loading) return <LoadingDots />;
  if (error)
    return (
      <section className="clientSidebarContent clientSidebarContent-auth">
        <p role="alert">{t("errors.unavailable")}</p>
        <GlassButton onClick={() => void refresh()}>{t("retry")}</GlassButton>
      </section>
    );
  if (!user) return <ClientLogin onEmailError={() => setNotice("emailFailed")} />;
  const state = user.status === "verified" ? user.availability : user.status;
  const contact = process.env.NEXT_PUBLIC_ERROR_REPORT_EMAIL?.trim();
  const contactHref = contact
    ? `mailto:${encodeURIComponent(contact)}?subject=${encodeURIComponent(t("appealSubject"))}&body=${encodeURIComponent(t("appealBody", { id: user.id, email: user.email }))}`
    : null;
  return (
    <div className="clientSidebarContent">
      <header className="clientSidebarContent-account">
        <span>{user.email}</span>
        <GlassButton
          type="button"
          size="icon-sm"
          primaryColor="darkBlue"
          aria-label={t("logout")}
          disabled={signOut.isPending}
          onClick={() => signOut.mutate()}
        >
          <LogOut aria-hidden="true" />
        </GlassButton>
      </header>
      {notice && (
        <p role="status">
          {t.has(`errors.${notice}`)
            ? t(`errors.${notice}`)
            : t(notice === "emailSent" ? "emailSent" : "errors.unavailable")}
        </p>
      )}
      {state === "ready" ? (
        <>
          <SubmissionForm
            inputRef={inputRef}
            description={description}
            onDescriptionChange={setDescription}
          />
          <section
            className="clientSidebarContent-guidance"
            aria-labelledby="guidance-title"
          >
            <h2 id="guidance-title">{guidance("title")}</h2>
            <p>{guidance("about")}</p>
            <h3>{guidance("writingTitle")}</h3>
            <p>{guidance("writing")}</p>
            <blockquote>{guidance("example")}</blockquote>
            <ThoughtGuidelines />
          </section>
        </>
      ) : (
        <section
          className="clientSidebarContent-auth clientSidebarContent-notice"
          aria-live="polite"
        >
          {state === "unverified" ? (
            <MailCheck aria-hidden="true" />
          ) : state === "banned" ? (
            <ShieldAlert aria-hidden="true" />
          ) : (
            <Pause aria-hidden="true" />
          )}
          <h1>{t(`${state}Title`)}</h1>
          <p>{t(`${state}Body`)}</p>
          {state === "unverified" && (
            <>
              <small>{t("verificationDeadline")}</small>
              <GlassButton
                type="button"
                disabled={!user.canResend || !resendReady || resend.isPending}
                onClick={() => resend.mutate()}
              >
                {resend.isPending ? <LoadingDots /> : t("resend")}
              </GlassButton>
              {!user.canResend && <small>{t("sendLimit")}</small>}
              <button
                type="button"
                className="clientSidebarContent-link"
                onClick={() => window.location.reload()}
              >
                {t("alreadyVerified")}
              </button>
            </>
          )}
          {state === "suspended" && user.suspendedUntil && (
            <p>
              {t("suspensionExpiry", {
                date: new Intl.DateTimeFormat(locale, {
                  dateStyle: "medium",
                  timeStyle: "short",
                }).format(new Date(user.suspendedUntil)),
              })}
            </p>
          )}
          {state === "banned" && contactHref && (
            <GlassButton asChild>
              <a href={contactHref}>{t("contact")}</a>
            </GlassButton>
          )}
        </section>
      )}
    </div>
  );
}
