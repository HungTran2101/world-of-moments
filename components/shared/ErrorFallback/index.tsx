"use client";

import { Button } from "@/components/ui/button";

import enMessages from "@/messages/en.json";
import viMessages from "@/messages/vi.json";
import { Mail, RotateCcw, TriangleAlert } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { GlassButton } from "@/components/ui/glass-button";
import { RefractiveGlass } from "@/components/ui/refractive-glass";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components//ui/tooltip";
import { Locale } from "@/i18n/config";
import MapLoading from "@/components/MapView/MapLoading";

interface ErrorFallbackProps {
  error: Error & { digest?: string };
  onRetry: () => void;
}

const REPORT_EMAIL = process.env.NEXT_PUBLIC_ERROR_REPORT_EMAIL ?? "";

function detectLocale(): Locale {
  if (typeof document !== "undefined" && document.documentElement.lang.startsWith("en")) {
    return "en";
  }

  // if (typeof navigator !== "undefined" && navigator.language.toLowerCase().startsWith("en")) {
  //   return "en";
  // }

  return "vi";
}

function buildReportBody(error: Error & { digest?: string }) {
  const lines = [
    "World of Moments error report",
    "",
    `Time: ${new Date().toISOString()}`,
    `Message: ${error.message}`,
    `Name: ${error.name}`,
    `Digest: ${error.digest ?? "n/a"}`,
    `URL: ${typeof window !== "undefined" ? window.location.href : "n/a"}`,
    `User agent: ${typeof navigator !== "undefined" ? navigator.userAgent : "n/a"}`,
    "",
    "Stack:",
    error.stack ?? "n/a",
    "--- End of report ---",
  ];

  return lines.join("\n");
}

export default function ErrorFallback({ error, onRetry }: ErrorFallbackProps) {
  const [locale, setLocale] = useState<Locale>(() => detectLocale());
  const [reportClicked, setReportClicked] = useState(false);

  useEffect(() => {
    setLocale(detectLocale());
  }, []);

  const copy = useMemo(() => {
    const messages = locale === "en" ? enMessages : viMessages;
    return messages.errorBoundary;
  }, [locale]);

  const canReport = REPORT_EMAIL.length > 0;

  const handleReport = () => {
    if (!canReport || typeof window === "undefined") return;

    const subject = encodeURIComponent(copy.reportSubject);
    const body = encodeURIComponent(buildReportBody(error));
    window.location.href = `mailto:${REPORT_EMAIL}?subject=${subject}&body=${body}`;
    setReportClicked(true);
  };

  return (
    <TooltipProvider>
      <MapLoading>
        <section
          style={{
            minHeight: "100vh",
            display: "grid",
            placeItems: "center",
            padding: "16px",
          }}
        >
          <RefractiveGlass>
            <div
              style={{
                width: "min(100%, 460px)",
                borderRadius: "28px",
                padding: "24px",
                textAlign: "center",
              }}
            >
              <div
                style={{
                  width: "72px",
                  height: "72px",
                  borderRadius: "999px",
                  margin: "0 auto 20px",
                  display: "grid",
                  placeItems: "center",
                  background: "linear-gradient(135deg, var(--primary-color), var(--secondary-color))",
                  color: "#fff",
                  boxShadow: "0 12px 30px rgba(var(--primary-color-var), 0.35)",
                }}
              >
                <TriangleAlert size={34} strokeWidth={2.2} />
              </div>

              <h1
                style={{
                  margin: 0,
                  fontSize: "clamp(0.6rem, 2vw, 1.6rem)",
                  lineHeight: 1.3,
                  color: "#24324a",
                }}
              >
                {copy.title}
              </h1>

              <p
                style={{
                  margin: "14px auto 0",
                  maxWidth: "42ch",
                  fontSize: "1rem",
                  lineHeight: 1.75,
                  color: "#51607f",
                }}
              >
                {copy.description}
              </p>

              <div
                style={{
                  display: "flex",
                  flexWrap: "wrap",
                  justifyContent: "center",
                  gap: "12px",
                  marginTop: "28px",
                }}
              >
                <GlassButton onClick={onRetry} className="px-8 py-5 rounded-full min-w-[170px]" >
                  <RotateCcw size={18} />
                  {copy.retry}
                </GlassButton>

                <Tooltip>
                  <TooltipTrigger asChild>
                    <GlassButton
                      onClick={handleReport}
                      disabled={!canReport}
                      title={!canReport ? copy.reportUnavailable : undefined}
                      className="px-8 py-5 rounded-full min-w-[170px]"
                      primaryColor="blue"
                    >
                      <Mail size={18} />
                      {copy.report}
                    </GlassButton>
                  </TooltipTrigger>
                  <TooltipContent className="text-center">
                    {copy.reportTooltip}
                  </TooltipContent>
                </Tooltip>
              </div>

              {!canReport ? (
                <p
                  style={{
                    marginTop: "14px",
                    fontSize: "0.92rem",
                    color: "#6d7894",
                  }}
                >
                  {copy.reportUnavailable}
                </p>
              ) : null}
              {reportClicked ? (
                <p
                  style={{
                    marginTop: "14px",
                    fontSize: "0.92rem",
                    color: "#00a011",
                  }}
                >
                  {copy.reportThanks}
                </p>
              ) : null}
            </div>
          </RefractiveGlass>
        </section>
      </MapLoading>
    </TooltipProvider>
  );
}

export const GlobalErrorFallback = ({ error, onRetry }: ErrorFallbackProps) => {
  const [locale, setLocale] = useState<Locale>(() => detectLocale());
  const [reportClicked, setReportClicked] = useState(false);

  useEffect(() => {
    setLocale(detectLocale());
  }, []);

  const copy = useMemo(() => {
    const messages = locale === "en" ? enMessages : viMessages;
    return messages.errorBoundary;
  }, [locale]);

  const canReport = REPORT_EMAIL.length > 0;

  const handleReport = () => {
    if (!canReport || typeof window === "undefined") return;

    const subject = encodeURIComponent(copy.reportSubject);
    const body = encodeURIComponent(buildReportBody(error));
    window.location.href = `mailto:${REPORT_EMAIL}?subject=${subject}&body=${body}`;
    setReportClicked(true);
  };

  return (
    <section
      style={{
        minHeight: "100vh",
        display: "grid",
        placeItems: "center",
        background:
          "radial-gradient(circle at top, rgba(224, 181, 255, 0.2), transparent 40%), linear-gradient(180deg, #f8fbff 0%, #eef3ff 100%)",
        boxSizing: "border-box",
        padding: "16px",
      }}
    >
      <div
        style={{
          width: "min(100%, 460px)",
          borderRadius: "28px",
          padding: "24px",
          background: "rgba(255, 255, 255, 0.86)",
          border: "1px solid rgba(107, 114, 128, 0.14)",
          boxShadow: "0 24px 60px rgba(68, 85, 130, 0.18)",
          textAlign: "center",
          boxSizing: "border-box",
        }}
      >
        <div
          style={{
            width: "72px",
            height: "72px",
            borderRadius: "999px",
            margin: "0 auto 20px",
            display: "grid",
            placeItems: "center",
            background: "linear-gradient(135deg, rgba(255, 226, 149, 0.9), rgba(255, 152, 124, 0.95))",
            color: "#4a2b0d",
            boxShadow: "0 12px 30px rgba(255, 165, 92, 0.35)",
          }}
        >
          <TriangleAlert size={34} strokeWidth={2.2} />
        </div>

        <h1
          style={{
            margin: 0,
            fontSize: "clamp(1.2rem, 2.6vw, 1.8rem)",
            lineHeight: 1.3,
            color: "#24324a",
          }}
        >
          {copy.title}
        </h1>

        <p
          style={{
            margin: "14px auto 0",
            maxWidth: "42ch",
            fontSize: "1rem",
            lineHeight: 1.75,
            color: "#51607f",
          }}
        >
          {copy.description}
        </p>

        <div
          style={{
            display: "flex",
            flexWrap: "wrap",
            justifyContent: "center",
            gap: "12px",
            marginTop: "28px",
          }}
        >
          <Button
            className="h-auto"
            type="button"
            onClick={onRetry}
            style={{
              display: "inline-flex",
              alignItems: "center",
              justifyContent: "center",
              gap: "10px",
              minWidth: "180px",
              padding: "14px 20px",
              borderRadius: "999px",
              border: "none",
              background: "linear-gradient(135deg, #6a89ff 0%, #8a7dff 100%)",
              color: "#fff",
              fontWeight: 600,
              cursor: "pointer",
            }}
          >
            <RotateCcw size={18} className="size-4.5" />
            {copy.retry}
          </Button>

          <Button
            className="h-auto"
            type="button"
            onClick={handleReport}
            disabled={!canReport}
            title={!canReport ? copy.reportUnavailable : undefined}
            style={{
              display: "inline-flex",
              alignItems: "center",
              justifyContent: "center",
              gap: "10px",
              minWidth: "180px",
              padding: "14px 20px",
              borderRadius: "999px",
              border: "1px solid rgba(76, 91, 138, 0.18)",
              background: "#fff",
              color: canReport ? "#34405f" : "#9aa4bd",
              fontWeight: 600,
              cursor: canReport ? "pointer" : "not-allowed",
            }}
          >
            <Mail size={18} className="size-4.5" />
            {copy.report}
          </Button>
        </div>

        {!canReport ? (
          <p
            style={{
              marginTop: "14px",
              fontSize: "0.92rem",
              color: "#6d7894",
            }}
          >
            {copy.reportUnavailable}
          </p>
        ) : null}
        {reportClicked ? (
          <p
            style={{
              marginTop: "14px",
              fontSize: "0.92rem",
              color: "#00a011",
            }}
          >
            {copy.reportThanks}
          </p>
        ) : null}
      </div>
    </section>
  );
};
