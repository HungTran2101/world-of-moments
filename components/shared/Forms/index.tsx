"use client";

import { Button } from "@/components/ui/button";

import { useTranslations } from "next-intl";
import { ApiError } from "@/services/shared/errors";
import type { FieldValues, Path, UseFormSetError } from "react-hook-form";
import type { CmsErrorBody } from "@/services/shared/types";

export function useCmsText() {
  const t = useTranslations();
  return (message: string) =>
    t.has(message) ? t(message) : t("errors.validation");
}

export function getCmsFieldErrors(
  error: unknown,
  text: (message: string) => string,
): { message: string }[] {
  if (!error || typeof error !== "object") return [];
  const messages: { message: string }[] = [];
  if ("message" in error && typeof error.message === "string") {
    messages.push({ message: text(error.message) });
  }
  // Lỗi mảng có thể nằm ở root hoặc từng phần tử; không duyệt ref DOM của RHF.
  for (const [key, value] of Object.entries(error)) {
    if (["message", "ref", "type", "types"].includes(key)) continue;
    messages.push(...getCmsFieldErrors(value, text));
  }
  return messages;
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
  retryLoading = false,
}: {
  error: unknown;
  onRetry?: () => void;
  retryLoading?: boolean;
}) {
  const t = useTranslations();
  const message = error instanceof Error ? error.message : "errors.server";
  return (
    <div className="cms-notice cms-notice-error" role="alert">
      <span>{t.has(message) ? t(message) : t("errors.server")}</span>
      {onRetry && (
        <Button
          variant="outline"
          className="h-10"
          type="button"
          onClick={onRetry}
          aria-label={t("common.retry")}
          loading={retryLoading}
        >
          {t("common.retry")}
        </Button>
      )}
    </div>
  );
}
