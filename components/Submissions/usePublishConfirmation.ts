"use client";

import { useTranslations } from "next-intl";
import { ApiError } from "@/services/shared/errors";
import type {
  SubmissionCreateValues,
  SubmissionUpdateValues,
} from "@/services/schemas";
import type { ModalApi } from "@/components/ui/modal";

const HTTP_CONFLICT_STATUS = 409;
const DEFAULT_NON_VALID_PUBLICATION_COUNT = 1;

export function usePublishConfirmation(modal: Pick<ModalApi, "confirm">) {
  const t = useTranslations();
  const confirm = (count: number) =>
    modal.confirm({
      title: t("submission.actions.published"),
      content: t("submission.confirmPublish", { count }),
      okText: t("submission.actions.published"),
      cancelText: t("common.cancel"),
    });
  return async (
    submit: (confirmed: boolean) => Promise<unknown>,
    rows: Pick<SubmissionCreateValues, "status" | "validity">[],
    change: SubmissionUpdateValues = {},
  ): Promise<boolean> => {
    // Xét trạng thái sau thay đổi để xác nhận trước khi gửi, kể cả thao tác hàng loạt.
    const nonValidCount = rows.filter(
      (row) =>
        (change.status ?? row.status) === "published" &&
        (change.validity ?? row.validity) !== "valid",
    ).length;
    const confirmed = nonValidCount > 0 ? await confirm(nonValidCount) : false;
    if (nonValidCount > 0 && !confirmed) return false;
    try {
      await submit(confirmed);
      return true;
    } catch (error) {
      if (
        confirmed ||
        !(error instanceof ApiError) ||
        error.status !== HTTP_CONFLICT_STATUS ||
        error.message !== "errors.confirmPublish"
      )
        throw error;
      // Giữ cảnh báo từ server nếu dữ liệu đã đổi sau lần tải của UI.
      const body = error.data as
        | { details?: { nonValidCount?: number } }
        | undefined;
      if (
        !await confirm(
          body?.details?.nonValidCount ?? DEFAULT_NON_VALID_PUBLICATION_COUNT,
        )
      ) return false;
      await submit(true);
      return true;
    }
  };
}
