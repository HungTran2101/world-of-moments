"use client";

import { useCallback, useEffect, useRef, useState, type RefObject } from "react";
import { useMutation } from "@tanstack/react-query";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { useLocale, useTranslations } from "next-intl";
import { useForm } from "react-hook-form";
import { useStore } from "zustand";
import { yupResolver } from "@hookform/resolvers/yup";
import * as yup from "yup";
import { MailCheck, Pause, ShieldAlert, Eye, EyeOff } from "lucide-react";
import { useClientSession } from "@/components/ClientSession";
import { Turnstile } from "@/components/Turnstile";
import SubmissionForm from "@/components/SubmissionForm";
import ThoughtGuidelines from "@/components/ThoughtGuidelines";
import { GlassButton } from "@/components/ui/glass-button";
import { Badge } from "@/components/ui/badge";
import { LoadingDots } from "@/components/shared/LoadingDots";
import {
  loginClient,
  registerClient,
  resendClientVerification,
} from "@/services/client-auth";
import { CLIENT_LIMITS } from "@/app/api/client/constant";
import { constants } from "@/app/api/constant";
import type { ClientCredentials } from "@/services/client-auth/types";
import { useSystemStore } from "@/store/systemStore";
import { ApiError } from "@/services/shared/errors";
import { useCountdown } from "@/hooks/useDeadline";
import { useSubmissionDraft, type SubmissionDraftControls } from "@/hooks/useSubmissionDraft";

const AUTH_SLIDE_DURATION_SECONDS = 0.2;
const { MILLISECONDS_PER_SECOND } = constants;

const credentialsSchema = yup.object({
  email: yup
    .string()
    .trim()
    .email("validationEmail")
    .required("validationRequired"),
  password: yup
    .string()
    .min(CLIENT_LIMITS.MIN_PASSWORD_LENGTH, "validationPassword")
    .max(CLIENT_LIMITS.MAX_PASSWORD_LENGTH, "validationPassword")
    .required("validationRequired"),
  confirmPassword: yup
    .string()
    .defined()
    .when("$creating", {
      is: true,
      then: (schema) => schema
        .required("validationRequired")
        .oneOf([yup.ref("password"), ""], "validationPasswordMatch"),
    }),
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

function ClientLogin({ onEmailError }: { onEmailError: (code: string | null) => void }) {
  const t = useTranslations("clientAuth");
  const locale = useLocale() === "vi" ? "vi" : "en";
  const { changed } = useClientSession();
  const reducedMotion = useReducedMotion();
  const [creating, setCreating] = useState(false);
  const [switching, setSwitching] = useState(false);
  const [checking, setChecking] = useState(false);
  const [slideDirection, setSlideDirection] = useState(1);
  const [visiblePassword, setVisiblePassword] = useState(false);
  const [visibleConfirmPassword, setVisibleConfirmPassword] = useState(false);
  const [failure, setFailure] = useState<string | null>(null);
  const [captchaNeeded, setCaptchaNeeded] = useState(false);
  const [captchaAttempt, setCaptchaAttempt] = useState(0);
  const activeCaptchaAttempt = useRef<number | null>(null);
  const pending = useRef<Omit<ClientCredentials, "captchaToken"> | null>(null);
  const inFlight = useRef(false);
  const headingRef = useRef<HTMLHeadingElement>(null);
  const focusAfterSwitch = useRef(false);

  useEffect(() => {
    // Chờ bỏ inert rồi mới chuyển tiêu điểm sang tiêu đề của biểu mẫu mới.
    if (!switching && focusAfterSwitch.current) {
      focusAfterSwitch.current = false;
      headingRef.current?.focus({ preventScroll: true });
    }
  }, [switching]);

  useEffect(() => () => {
    activeCaptchaAttempt.current = null;
  }, []);

  const {
    register,
    handleSubmit,
    resetField,
    formState: { errors },
  } = useForm<Credentials>({
    resolver: yupResolver(credentialsSchema),
    context: { creating },
    defaultValues: {
      email: "",
      password: "",
      confirmPassword: "",
    },
  });
  const mutation = useMutation({
    gcTime: 0,
    mutationFn: (values: ClientCredentials) =>
      creating ? registerClient(values) : loginClient(values),
    onSuccess: async (result) => {
      if ("emailError" in result && result.emailError) {
        onEmailError("emailErrorCode" in result && typeof result.emailErrorCode === "string"
          ? result.emailErrorCode : "emailFailed");
      } else {
        onEmailError(null);
      }
      pending.current = null;
      await changed();
      inFlight.current = false;
    },
    onError: (error) => {
      const code = errorCode(error);
      inFlight.current = false;
      setFailure(code === "captchaRequired" ? "captchaUnavailable" : code);
    },
  });
  const { mutate } = mutation;
  const onToken = useCallback(
    (token: string) => {
      if (activeCaptchaAttempt.current !== captchaAttempt || !pending.current) return;
      // Chỉ nhận một kết quả từ widget đang chạy, kể cả khi callback đến muộn.
      activeCaptchaAttempt.current = null;
      setCaptchaNeeded(false);
      mutate({ ...pending.current, captchaToken: token });
    },
    [captchaAttempt, mutate],
  );
  const onCaptchaError = useCallback(() => {
    if (activeCaptchaAttempt.current !== captchaAttempt) return;
    activeCaptchaAttempt.current = null;
    setCaptchaNeeded(false);
    inFlight.current = false;
    setFailure("captchaUnavailable");
  }, [captchaAttempt]);
  const busy = mutation.isPending || captchaNeeded;

  const startCaptcha = (credentials: Omit<ClientCredentials, "captchaToken">) => {
    inFlight.current = true;
    pending.current = credentials;
    const attempt = captchaAttempt + 1;
    activeCaptchaAttempt.current = attempt;
    setFailure(null);
    setCaptchaAttempt(attempt);
    setCaptchaNeeded(true);
  };

  return (
    <section
      className="clientSidebarContent clientSidebarContent-authViewport"
      inert={switching}
    >
      <AnimatePresence
        initial={false}
        mode="wait"
        custom={slideDirection}
      >
        <motion.div
          key={checking ? "checking" : creating ? "register" : "login"}
          className="clientSidebarContent-auth"
          custom={slideDirection}
          variants={{
            enter: (direction: number) => ({
              x: reducedMotion ? 0 : `${direction * 100}%`,
              opacity: 0,
            }),
            visible: { x: 0, opacity: 1 },
            exit: (direction: number) => ({
              x: reducedMotion ? 0 : `${direction * -100}%`,
              opacity: 0,
            }),
          }}
          initial="enter"
          animate="visible"
          exit="exit"
          transition={{
            duration: reducedMotion ? 0 : AUTH_SLIDE_DURATION_SECONDS,
            ease: "easeInOut",
          }}
          onAnimationComplete={(definition) => {
            if (definition === "visible" && switching) {
              focusAfterSwitch.current = true;
              setSwitching(false);
            }
          }}
        >
          {checking ? (
            <>
              <h1
                ref={headingRef}
                className="gradient-text"
                tabIndex={-1}
              >
                {t("checkingEmailTitle")}
              </h1>
              <div
                role="status"
                aria-live="polite"
                aria-busy={busy}
                className="clientSidebarContent-checking"
              >
                {busy ? (
                  <>
                    <p>{t("checkingEmailBody")}</p>
                    <LoadingDots />
                  </>
                ) : failure ? (
                  <p role="alert">
                    {t.has(`errors.${failure}`)
                      ? t(`errors.${failure}`)
                      : t("errors.unavailable")}
                  </p>
                ) : null}
              </div>
              {!busy && failure && (
                <>
                  {["emailDnsTemporary", "unavailable", "captchaUnavailable"].includes(failure) && (
                    <GlassButton
                      type="button"
                      onClick={() => {
                        if (inFlight.current || !pending.current) return;
                        headingRef.current?.focus({ preventScroll: true });
                        startCaptcha(pending.current);
                      }}
                    >
                      {t("retry")}
                    </GlassButton>
                  )}
                  <button
                    type="button"
                    className="clientSidebarContent-link"
                    onClick={() => {
                      setSlideDirection(-1);
                      setSwitching(true);
                      setChecking(false);
                      setFailure(null);
                      pending.current = null;
                    }}
                  >
                    {t("editEmail")}
                  </button>
                </>
              )}
            </>
          ) : (
            <>
              <h1
                ref={headingRef}
                className="gradient-text"
                tabIndex={-1}
              >
                {t(creating ? "registerTitle" : "loginTitle")}
              </h1>
              <p className="text-sm text-center">{t(creating ? "registerIntro" : "loginIntro")}</p>
              <form
                onSubmit={(event) => {
                  void handleSubmit((values) => {
                    if (busy || inFlight.current) {
                      return;
                    }
                    if (creating) {
                      setSlideDirection(1);
                      setSwitching(true);
                      setChecking(true);
                    }
                    startCaptcha({
                      email: values.email,
                      password: values.password,
                      locale,
                    });
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
                      aria-describedby={
                        errors.password ? "client-password-error" : undefined
                      }
                      {...register("password", {
                        deps: creating ? "confirmPassword" : undefined,
                      })}
                    />
                    <button
                      type="button"
                      aria-label={t(visiblePassword ? "hidePassword" : "showPassword")}
                      onClick={() => setVisiblePassword((value) => !value)}
                    >
                      {visiblePassword ? (
                        <EyeOff aria-hidden="true" />
                      ) : (
                        <Eye aria-hidden="true" />
                      )}
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
                {creating && (
                  <div className="clientSidebarContent-field">
                    <label htmlFor="client-confirm-password">{t("confirmPassword")}</label>
                    <div className="clientSidebarContent-password">
                      <input
                        id="client-confirm-password"
                        type={visibleConfirmPassword ? "text" : "password"}
                        autoComplete="new-password"
                        disabled={busy}
                        aria-required="true"
                        aria-invalid={Boolean(errors.confirmPassword)}
                        aria-describedby={
                          errors.confirmPassword ? "client-confirm-password-error" : undefined
                        }
                        {...register("confirmPassword")}
                      />
                      <button
                        type="button"
                        aria-label={t(visibleConfirmPassword ? "hideConfirmPassword" : "showConfirmPassword")}
                        onClick={() => setVisibleConfirmPassword((value) => !value)}
                      >
                        {visibleConfirmPassword ? (
                          <EyeOff aria-hidden="true" />
                        ) : (
                          <Eye aria-hidden="true" />
                        )}
                      </button>
                    </div>
                    {errors.confirmPassword?.message && (
                      <p
                        id="client-confirm-password-error"
                        role="alert"
                      >
                        {t(errors.confirmPassword.message)}
                      </p>
                    )}
                  </div>
                )}
                {failure && (
                  <p role="alert">
                    {t.has(`errors.${failure}`)
                      ? t(`errors.${failure}`)
                      : t("errors.unavailable")}
                  </p>
                )}
                <GlassButton
                  type="submit"
                  disabled={busy}
                  className="w-full"
                >
                  {busy ? (
                    <LoadingDots />
                  ) : (
                    t(creating ? "register" : "login")
                  )}
                </GlassButton>
              </form>
              <button
                type="button"
                className="clientSidebarContent-link"
                disabled={busy}
                onClick={() => {
                  if (inFlight.current) return;
                  setSwitching(true);
                  setSlideDirection(creating ? -1 : 1);
                  setCreating((value) => !value);
                  resetField("confirmPassword");
                  setVisibleConfirmPassword(false);
                  setFailure(null);
                  pending.current = null;
                }}
              >
                {t(creating ? "toLogin" : "toRegister")}
              </button>
              <small>
                {t.rich("privacy", {
                  policy: (chunks) => (
                    <a href="/privacy">{chunks}</a>
                  ),
                })}
              </small>
            </>
          )}
          {captchaNeeded && (
            <Turnstile
              action={creating ? "register" : "login"}
              attempt={captchaAttempt}
              onToken={onToken}
              onError={onCaptchaError}
            />
          )}
        </motion.div>
      </AnimatePresence>
    </section>
  );
}

function ThoughtCountdown({ deadline, active }: { deadline: number; active: boolean }) {
  const t = useTranslations("clientAuth");
  const remaining = useCountdown(deadline, active);
  const seconds = Math.ceil(remaining / MILLISECONDS_PER_SECOND);
  const minutes = String(Math.floor(seconds / 60)).padStart(2, "0");
  return (
    <div
      aria-live="off"
      className="flex flex-col items-center gap-2 text-center"
    >
      <p>{t("cooldownRemaining")}</p>
      <code className="rounded-lg border border-(--color-border) bg-(--color-input-bg) px-3 py-2 font-mono text-sm tabular-nums">
        {`${minutes}:${String(seconds % 60).padStart(2, "0")}`}
      </code>
    </div>
  );
}

function ResendButton({ deadline, active, sending, showCountdown, onResend }: {
  deadline: number;
  active: boolean;
  sending: boolean;
  showCountdown: boolean;
  onResend: () => void;
}) {
  const t = useTranslations("clientAuth");
  const remaining = useCountdown(deadline, active && !sending, showCountdown);

  const seconds = Math.min(
    CLIENT_LIMITS.RESEND_COOLDOWN_MS / MILLISECONDS_PER_SECOND - 1,
    Math.floor(remaining / MILLISECONDS_PER_SECOND),
  );
  const countingDown = remaining > 0;

  return (
    <GlassButton
      type="button"
      className="tabular-nums"
      aria-label={sending ? t("resendSending") : countingDown ? t("resendWaiting") : undefined}
      aria-busy={sending}
      disabled={countingDown || sending}
      onClick={() => {
        if (active && Date.now() >= deadline) onResend();
      }}
    >
      {sending ? <LoadingDots />
        : countingDown && showCountdown ? <span aria-hidden="true">00:{String(seconds).padStart(2, "0")}</span>
          : t("resend")}
    </GlassButton>
  );
}

function DraftStorageWarning({ draft }: { draft: SubmissionDraftControls }) {
  const t = useTranslations("clientAuth");
  const showWarning = useStore(draft.view, (view) =>
    view.key === draft.key && Boolean(view.text) && view.storageUnavailable,
  );

  return showWarning ? <p role="status">{t("draftStorageUnavailable")}</p> : null;
}

export function ClientSidebarContent({
  inputRef,
}: {
  inputRef: RefObject<HTMLTextAreaElement | null>;
}) {
  const t = useTranslations("clientAuth");
  const guidance = useTranslations("guidance");
  const locale = useLocale() === "vi" ? "vi" : "en";
  const { user, loading, refreshingOnFocus, error, refresh } = useClientSession();
  const reducedMotion = useReducedMotion();
  const viewRef = useRef<HTMLDivElement>(null);
  const sidebarOpen = useSystemStore((state) => state.sidebarOpen);
  const state = user?.status === "verified" ? user.availability : user?.status;
  const draft = useSubmissionDraft(user?.id, sidebarOpen && state === "ready");
  const submissionLimited = state === "cooldown" || state === "daily-limit";
  const limitedDraftNotice = useStore(draft.view, (view) =>
    submissionLimited && view.key === draft.key && view.text
      ? view.storageUnavailable ? "draftStorageUnavailable" : "draftSaved"
      : null,
  );

  useEffect(() => {
    if (
      sidebarOpen &&
      user?.status === "verified" &&
      user.availability === "ready"
    ) {
      inputRef.current?.focus({ preventScroll: true });
    }
  }, [sidebarOpen, user?.status, user?.availability, inputRef]);

  const [registrationNotice, setRegistrationNotice] = useState<string | null>(null);

  const resend = useMutation({
    mutationFn: ({ locale }: { userId: string; locale: "en" | "vi" }) => resendClientVerification(locale),
    onMutate: () => setRegistrationNotice(null),
    onSuccess: () => {
      void refresh();
    },
    onError: refresh,
  });

  if (loading) {
    return <LoadingDots />;
  }

  if (error && !user) {
    return (
      <section className="clientSidebarContent clientSidebarContent-auth">
        <p role="alert">{t("errors.unavailable")}</p>
        <GlassButton onClick={() => void refresh()}>
          {t("retry")}
        </GlassButton>
      </section>
    );
  }

  const resendForCurrentUser = resend.variables?.userId === user?.id;
  const sending = resendForCurrentUser && resend.isPending;
  const resendFailed = resendForCurrentUser && resend.isError;
  const notice = resendFailed ? errorCode(resend.error)
    : resendForCurrentUser && resend.isSuccess ? "emailSent" : registrationNotice;
  const confirmedResendAt = resendForCurrentUser ? resend.data?.resendAvailableAt : undefined;
  const resendDeadline = Math.max(
    user?.resendAvailableAt ? Date.parse(user.resendAvailableAt) : 0,
    confirmedResendAt ? Date.parse(confirmedResendAt) : 0,
  );
  const canResend = user?.canResend && notice !== "resendLimit";
  const verificationView = user?.verificationEmailBlocked ? "email-blocked" : canResend ? "resend" : "resend-limit";
  // Trạng thái tải dùng chung khóa để chỉ chuyển cảnh khi kết quả làm đổi màn hình.
  const view = state === "unverified" ? verificationView : user?.status;
  const showFocusRefresh = sidebarOpen && state === "unverified" && refreshingOnFocus;
  const animateView = sidebarOpen && !reducedMotion;
  const statusNotice = state === "unverified" && notice !== "resendLimit" &&
    !(notice === "emailUndeliverable" && user?.verificationEmailBlocked) &&
    !(notice === "emailSent" && !canResend) ? notice : null;
  const contact = process.env.NEXT_PUBLIC_ERROR_REPORT_EMAIL?.trim();
  const contactHref = contact && user
    ? `mailto:${encodeURIComponent(contact)}?subject=${encodeURIComponent(
      t("appealSubject"),
    )}&body=${encodeURIComponent(
      t("appealBody", {
        id: user.id,
        email: user.email,
      }),
    )}`
    : null;

  return (
    <div className="clientSidebarContent-authViewport">
      <AnimatePresence
        initial={false}
        mode="wait"
      >
        <motion.div
          key={user ? `${user.id}:${view}` : "guest"}
          ref={viewRef}
          className={user ? "clientSidebarContent" : undefined}
          initial="enter"
          animate="visible"
          exit="exit"
          variants={{
            enter: { x: animateView ? "100%" : 0, opacity: 0 },
            visible: { x: 0, opacity: 1 },
            exit: { x: animateView ? "-100%" : 0, opacity: 0 },
          }}
          transition={{ duration: animateView ? AUTH_SLIDE_DURATION_SECONDS : 0 }}
          onAnimationComplete={(phase) => {
            if (phase !== "visible" || !sidebarOpen || showFocusRefresh) return;
            const target = state === "ready" ? inputRef.current : viewRef.current?.querySelector("h1");
            target?.focus({ preventScroll: true });
          }}
        >
          {!user ? (
            <ClientLogin onEmailError={setRegistrationNotice} />
          ) : showFocusRefresh ? (
            <section
              className="clientSidebarContent-auth clientSidebarContent-notice clientSidebarContent-checking"
              role="status"
            >
              <h1>{t("refreshingSessionTitle")}</h1>
              <p>{t("refreshingSessionBody")}</p>
              <LoadingDots />
            </section>
          ) : (
            <>
              {statusNotice === "emailFailed" || statusNotice === "emailQuotaExceeded" ? (
                <Badge
                  color="error"
                  opacity
                  className="mx-auto max-w-full py-2 text-center whitespace-normal"
                  role="alert"
                >
                  {t(`errors.${statusNotice}`)}
                </Badge>
              ) : statusNotice && (
                <p role="status">
                  {t.has(`errors.${statusNotice}`)
                    ? t(`errors.${statusNotice}`)
                    : statusNotice === "emailSent" ? "" : t("errors.unavailable")}
                </p>
              )}
              {state === "ready" ? (
                <>
                  <SubmissionForm
                    inputRef={inputRef}
                    userId={user.id}
                    draft={draft}
                  />
                  <DraftStorageWarning draft={draft} />
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
                >
                  <div className="mx-auto">
                    {state === "unverified" ? (
                      <MailCheck aria-hidden="true" />
                    ) : state === "banned" ? (
                      <ShieldAlert aria-hidden="true" />
                    ) : (
                      <Pause aria-hidden="true" />
                    )}
                  </div>
                  <h1
                    aria-live="polite"
                    tabIndex={-1}
                  >
                    {t(`${state}Title`)}
                  </h1>
                  <p>{t(state === "cooldown" && limitedDraftNotice ? "cooldownDraftBody" : `${state}Body`)}</p>
                  {limitedDraftNotice && <small>{t(limitedDraftNotice)}</small>}
                  {state === "cooldown" && user.availableAt && (
                    <ThoughtCountdown
                      key={user.availableAt}
                      deadline={Date.parse(user.availableAt)}
                      active={sidebarOpen}
                    />
                  )}
                  {(submissionLimited || state === "suspended") && !!error && (
                    <>
                      <p>{t("errors.unavailable")}</p>
                      <GlassButton onClick={() => void refresh()}>{t("retry")}</GlassButton>
                    </>
                  )}
                  {state === "unverified" && (
                    <>
                      <small>{t("verificationDeadline")}</small>
                      {user.verificationEmailBlocked ? (
                        <small>{t("errors.emailUndeliverable")}</small>
                      ) : canResend ? (
                        <ResendButton
                          key={resendDeadline}
                          deadline={resendDeadline}
                          active={sidebarOpen}
                          sending={sending}
                          showCountdown={!resendFailed}
                          onResend={() => resend.mutate({ userId: user.id, locale })}
                        />
                      ) : (
                        <Badge
                          color="orange"
                          opacity
                          className="mx-auto max-w-full py-2 text-center whitespace-normal"
                          role="status"
                        >
                          {t("sendLimit")}
                        </Badge>
                      )}
                      <button
                        type="button"
                        className="clientSidebarContent-link"
                        onClick={() => void refresh()}
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
            </>
          )}
        </motion.div>
      </AnimatePresence>
    </div>
  );
}
