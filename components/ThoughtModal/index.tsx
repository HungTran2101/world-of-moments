"use client";

import { useAuthorUUID } from "@/hooks/useAuthorUUID";
import { Dialog } from "@/components/ui/dialog";
import { GlassButton } from "@/components/ui/glass-button";
import thoughtBubbleImg from "@/public/assets/thought-note.webp";
import { ApiError } from "@/services/shared/errors";
import { getSubmissionById } from "@/services/submissions";
import type { Submission } from "@/services/submissions/types";
import { ArrowLeft, Cloud, CloudDrizzle, CloudFog, CloudLightning, CloudRain, CloudSun, Snowflake, Sun } from "lucide-react";
import { useTranslations } from "next-intl";
import Image from "next/image";
import { useEffect, useState } from "react";
import { LoadingDots } from "../shared/LoadingDots";
import TextTyping from "../shared/TextTyping";
import { RefractiveGlass } from "@/components/ui/refractive-glass";

interface ThoughtModalProps {
  open: boolean;
  submissionId: string | null;
  onOpenChange: (open: boolean) => void;
  onReturnFocus: () => void;
}

function WeatherIcon({ code }: { code: number }) {
  const props = { size: 20, strokeWidth: 1.5, "aria-hidden": true } as const;
  if (code === 0) return <Sun {...props} />;
  if (code === 1 || code === 2) return <CloudSun {...props} />;
  if (code === 45 || code === 48) return <CloudFog {...props} />;
  if (code >= 51 && code <= 57) return <CloudDrizzle {...props} />;
  if ((code >= 71 && code <= 77) || code === 85 || code === 86) return <Snowflake {...props} />;
  if (code >= 95) return <CloudLightning {...props} />;
  if (code >= 61 && code <= 82) return <CloudRain {...props} />;
  return <Cloud {...props} />;
}

type DetailState =
  | { id: string; status: "loading" }
  | { id: string; status: "ready"; submission: Submission }
  | { id: string; status: "error"; notFound: boolean };

export default function ThoughtModal({ open, submissionId, onOpenChange, onReturnFocus }: ThoughtModalProps) {
  const authorUuid = useAuthorUUID();
  const t = useTranslations("popup");
  const weather = useTranslations("weather");
  const [detail, setDetail] = useState<DetailState | null>(null);
  const [retry, setRetry] = useState(0);

  useEffect(() => {
    if (!open || !submissionId) return;
    const controller = new AbortController();
    setDetail({ id: submissionId, status: "loading" });
    // Mỗi lần chọn suy nghĩ chỉ tải chi tiết của ID đó; hủy phản hồi khi đóng hoặc chọn ID khác.
    void getSubmissionById(submissionId, { signal: controller.signal })
      .then((submission) => {
        if (controller.signal.aborted) return;
        // Dùng tọa độ bài đã tải để URL luôn mở lại đúng nơi, kể cả khi mở từ marker hoặc bài vừa gửi.
        const url = new URL(window.location.href);
        url.searchParams.set("thought", submission.id);
        url.searchParams.set("lat", String(submission.lat));
        url.searchParams.set("lng", String(submission.lng));
        window.history.replaceState(window.history.state, "", `${url.pathname}${url.search}${url.hash}`);
        setDetail({ id: submissionId, status: "ready", submission });
      })
      .catch((error: unknown) => {
        if (controller.signal.aborted) return;
        setDetail({ id: submissionId, status: "error", notFound: error instanceof ApiError && error.status === 404 });
      });
    return () => controller.abort();
  }, [open, submissionId, retry, authorUuid]);

  const currentDetail = detail?.id === submissionId ? detail : null;
  const submission = currentDetail?.status === "ready" ? currentDetail.submission : null;
  const loading = !currentDetail || currentDetail.status === "loading";

  const weatherKey = submission?.weather_code == null ? "" : String(submission.weather_code);
  // Ưu tiên câu thời tiết theo ngôn ngữ hiện tại; chỉ dùng mô tả từ API khi mã chưa có bản dịch.
  const atmosphere = weatherKey && weather.has(weatherKey)
    ? weather(weatherKey)
    : submission?.weather_summary;

  return (
    <Dialog.Root key={submissionId} modal={false} open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <RefractiveGlass
          blur={2.5}
        >
          <Dialog.Content
            className="thoughtModal-content"
            // style={{
            //   '--blur-size': '10px',
            // } as CSSProperties}
            // Chỉ chặn thao tác tự đóng của dialog, không chặn sự kiện chuột kéo bản đồ.
            onInteractOutside={(event) => event.preventDefault()}
            onEscapeKeyDown={(event) => event.preventDefault()}
            onCloseAutoFocus={(event) => {
              // Ghim WebGL không có Dialog.Trigger; trả focus về canvas để tiếp tục khám phá bản đồ.
              event.preventDefault();
              if (!open) onReturnFocus();
            }}
          >
            <div className="thoughtModal-header">
              <Image className="thoughtModal-bubble" src={thoughtBubbleImg} alt="" sizes="44px" />
              <Dialog.Title className="thoughtModal-title">{t("title")}</Dialog.Title>
            </div>

            <Dialog.Description className="thoughtModal-thought" aria-live="polite" aria-busy={loading}>
              {loading
                ? (
                  <>
                    <span className="visually-hidden">{t("loading")}</span>
                    <LoadingDots color="var(--secondary-color)" />
                  </>
                )
                : currentDetail?.status === "error"
                  ? t(currentDetail.notFound
                    ? "notFound"
                    : "loadError")
                  : (
                    <TextTyping text={submission?.description || ''} />
                  )}
            </Dialog.Description>
            {currentDetail?.status === "error" && !currentDetail.notFound && (
              <GlassButton type="button" onClick={() => setRetry((value) => value + 1)}>
                {t("retry")}
              </GlassButton>
            )}

            <div className="thoughtModal-footer">
              <p className="thoughtModal-weather">
                <WeatherIcon code={Number(weatherKey || -1)} />
                <span>{atmosphere}</span>
              </p>
              <div className="thoughtModal-actions">
                {atmosphere && (
                  <a className="thoughtModal-attribution" href="https://open-meteo.com/" target="_blank" rel="noopener noreferrer">
                    {weather("attribution")}
                  </a>
                )}
                <Dialog.Close asChild>
                  <GlassButton
                    primaryColor="blue"
                    type="button"
                    className="thoughtModal-return"
                  >
                    <ArrowLeft aria-hidden="true" />
                    {t("backToMap")}
                  </GlassButton>
                </Dialog.Close>
              </div>
            </div>
          </Dialog.Content>
        </RefractiveGlass>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
