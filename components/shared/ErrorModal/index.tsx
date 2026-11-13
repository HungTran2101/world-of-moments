"use client";

import { GlassButton } from "@/components/ui/glass-button";
import { cn } from "@/lib/utils";
import { getErrorMessageKey, type AppError } from "@/services/shared/errors";
import { ClockFading, TriangleAlert } from "lucide-react";
import { useTranslations } from "next-intl";
import { Dialog } from "@/components/ui/dialog";
import { useState } from "react";
import { RefractiveGlass } from "@/components/ui/refractive-glass";

interface ErrorModalProps {
  open: boolean;
  error: AppError | null;
  onOpenChange: (open: boolean) => void;
}

export default function ErrorModal({ open, error, onOpenChange }: ErrorModalProps) {
  const t = useTranslations("errors");
  const [lastError, setLastError] = useState(error);

  // Provider xóa lỗi ngay khi đóng; giữ nội dung cũ đến hết hiệu ứng thoát để không nháy chữ.
  if (open && lastError !== error) setLastError(error);
  const visibleError = open ? error : lastError;
  const isRateLimitError = visibleError?.status === 429;
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
              {t(isRateLimitError ? "rateLimitedTitle" : "title")}
            </Dialog.Title>
            <Dialog.Description className="errorModal-description">
              {t(visibleError ? getErrorMessageKey(visibleError) : "unexpected")}
            </Dialog.Description>
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
