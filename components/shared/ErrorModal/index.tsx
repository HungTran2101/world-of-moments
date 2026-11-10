"use client";

import { GlassButton } from "@/components/ui/glass-button";
import { cn } from "@/lib/utils";
import { getErrorMessageKey, type AppError } from "@/services/shared/errors";
import { Check, ClockFading, Copy, TriangleAlert } from "lucide-react";
import { useTranslations } from "next-intl";
import { Dialog } from "@/components/ui/dialog";
import { useState } from "react";
import { getSubmissionBlockSupport, buildBlockAppealMailto } from "@/lib/submissionBlockSupport";
import type { SubmissionBlockSupport } from "@/services/submissions/types";
import { RefractiveGlass } from "@/components/ui/refractive-glass";
import { SUBMISSION_ERROR_CODES } from "@/services/constant";

interface ErrorModalProps {
  open: boolean;
  error: AppError | null;
  onOpenChange: (open: boolean) => void;
}

function BlockedSubmissionSupport({
  browserId,
  contactMail,
  code
}: SubmissionBlockSupport & { code: string }) {
  const t = useTranslations("errors");
  const [copyState, setCopyState] = useState<"idle" | "copying" | "copied" | "failed">("idle");
  const displayedBrowserId = browserId ?? t("browserIdUnavailable");
  const contactHref = contactMail
    ? buildBlockAppealMailto(
      contactMail,
      t("blockAppealSubject"),
      t("blockAppealBody", {
        browserId: displayedBrowserId,
        code
      })
    )
    : null;

  async function copyBrowserId() {
    if (!browserId || copyState === "copying") return;
    setCopyState("copying");
    try {
      await navigator.clipboard.writeText(browserId);
      setCopyState("copied");
    } catch {
      // Không mở modal lỗi mới; giữ mã có thể chọn để người dùng tự sao chép.
      setCopyState("failed");
    }
  }

  return (
    <div className="errorModal-support">
      {contactMail && contactHref && (
        <p className="errorModal-contactNote">
          {t.rich("blockedContactNote", {
            address: contactMail,
            email: chunks => (
              <a href={contactHref}>
                {chunks}
              </a>
            )
          })}
        </p>
      )}
      <div className="errorModal-browserId">
        <span className="errorModal-browserIdLabel">
          {t("browserIdLabel")}
        </span>
        <div className="errorModal-browserIdValue">
          <code>{displayedBrowserId}</code>
          <GlassButton
            type="button"
            size="icon-sm"
            primaryColor="darkBlue"
            aria-label={t("copyBrowserId")}
            title={t("copyBrowserId")}
            disabled={!browserId || copyState === "copying"}
            onClick={() => void copyBrowserId()}
          >
            {copyState === "copied" ? (
              <Check aria-hidden="true" />
            ) : (
              <Copy aria-hidden="true" />
            )}
          </GlassButton>
        </div>
      </div>
    </div>
  );
}

export default function ErrorModal({
  open,
  error,
  onOpenChange
}: ErrorModalProps) {
  const t = useTranslations("errors");
  const [lastError, setLastError] = useState(error);

  // Provider xóa lỗi ngay khi đóng; giữ nội dung cũ đến hết hiệu ứng thoát để không nháy chữ.
  if (open && lastError !== error) setLastError(error);
  const visibleError = open ? error : lastError;
  const isBlacklisted = visibleError?.messageKey === "browserBlocked";
  const isNetworkBanned = visibleError?.messageKey === "networkBanned";
  const isRateLimitError = visibleError?.status === 429;
  const blockSupport = getSubmissionBlockSupport(visibleError?.details);
  return (
    <Dialog.Root
      open={open}
      onOpenChange={onOpenChange}
    >
      <Dialog.Portal>
        <Dialog.Overlay className="errorModal-overlay" />
        <RefractiveGlass brightness={1.1}>
          <Dialog.Content className="errorModal-content">
            {isRateLimitError ? (
              <ClockFading
                className={cn("errorModal-icon", "errorModal-icon--rateLimited")}
                size={32}
                aria-hidden="true"
              />
            ) : (
              <TriangleAlert
                className="errorModal-icon"
                size={32}
                aria-hidden="true"
              />
            )}
            <Dialog.Title className="errorModal-title">
              {isBlacklisted
                ? t("browserBlockedTitle")
                : isNetworkBanned
                  ? t("networkBannedTitle")
                  : isRateLimitError
                    ? t("rateLimitedTitle")
                    : t("title")}
            </Dialog.Title>
            <Dialog.Description className="errorModal-description">
              {t(visibleError ? getErrorMessageKey(visibleError) : "unexpected")}
            </Dialog.Description>
            {(isBlacklisted || isNetworkBanned) && (
              <BlockedSubmissionSupport
                key={visibleError?.timestamp}
                browserId={blockSupport.browserId}
                contactMail={blockSupport.contactMail}
                code={isNetworkBanned
                  ? SUBMISSION_ERROR_CODES.NETWORK_BANNED
                  : SUBMISSION_ERROR_CODES.BROWSER_BLOCKED}
              />
            )}
            <Dialog.Close asChild>
              <GlassButton
                primaryColor="blue"
                type="button"
              >
                {t("dismiss")}
              </GlassButton>
            </Dialog.Close>
          </Dialog.Content>
        </RefractiveGlass>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
