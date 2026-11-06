"use client";

import { useTranslations } from "next-intl";
import { ApiError } from "@/services/shared/errors";
import type { ModalApi } from "@/components/ui/modal";

export function usePublishConfirmation(modal: Pick<ModalApi, "confirm">) {
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
      const confirmed = await modal.confirm({
        title: t("submission.actions.published"),
        content: t("submission.confirmPublish", {
          count: body.details?.nonValidCount ?? 1,
        }),
        okText: t("submission.actions.published"),
        cancelText: t("common.cancel"),
      });
      if (!confirmed) return false;
      await submit(true);
      return true;
    }
  };
}
