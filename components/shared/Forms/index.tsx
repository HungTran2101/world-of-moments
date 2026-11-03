"use client";

import { Button } from "@/components/ui/button";

import { useTranslations } from "next-intl";
import { ApiError } from "@/services/shared/errors";
import type { FieldValues, Path, UseFormSetError } from "react-hook-form";
import type { CmsErrorBody } from "@/services/shared/types";
import type { ReactNode } from "react";

export function useCmsText() {
  const t = useTranslations();
  return (message: string) =>
    t.has(message) ? t(message) : t("errors.validation");
}

export function applyFormError<T extends FieldValues>(
  error: unknown,
  setError: UseFormSetError<T>,
) {
  if (!(error instanceof ApiError)) return;
  const body = error.data as CmsErrorBody | undefined;
  for (const [field, messages] of Object.entries(body?.fieldErrors ?? {})) {
    setError(field as Path<T>, { type: "server", message: messages[0] });
  }
}

export function ErrorNotice({
  error,
  onRetry,
}: {
  error: unknown;
  onRetry?: () => void;
}) {
  const t = useTranslations();
  const message = error instanceof Error ? error.message : "errors.server";
  return (
    <div className="cms-notice cms-notice-error" role="alert">
      <span>{t.has(message) ? t(message) : t("errors.server")}</span>
      {onRetry && (
        <Button variant="outline" className="h-10" type="button" onClick={onRetry}>
          {t("common.retry")}
        </Button>
      )}
    </div>
  );
}

export function Field({
  id,
  label,
  error,
  children,
}: {
  id: string;
  label: string;
  error?: string;
  children: ReactNode;
}) {
  const text = useCmsText();
  return (
    <div className="cms-field">
      <label htmlFor={id}>{label}</label>
      {children}
      {error && (
        <span id={`${id}-error`} className="cms-fieldError" role="alert">
          {text(error)}
        </span>
      )}
    </div>
  );
}
