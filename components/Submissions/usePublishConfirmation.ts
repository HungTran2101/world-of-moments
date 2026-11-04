"use client";

import { useTranslations } from "next-intl";
import { ApiError } from "@/services/shared/errors";

export function usePublishConfirmation() {
  const t = useTranslations();
  return async (
    submit: (confirmed: boolean) => Promise<unknown>,
  ): Promise<boolean> => {
    try {
      await submit(false);
      return true;
    } catch (error) {
      if (
        !(error instanceof ApiError) ||
        error.status !== 409 ||
        error.message !== "errors.confirmPublish"
      )
        throw error;
      const body = error.data as { details?: { nonValidCount?: number } };
      if (
        !window.confirm(
          t("submission.confirmPublish", {
            count: body.details?.nonValidCount ?? 1,
          }),
        )
      )
        return false;
      await submit(true);
      return true;
    }
  };
}
