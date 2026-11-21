"use client";

import { LoadingDots } from "@/components/shared/LoadingDots";
import { GlassButton } from "@/components/ui/glass-button";
import { RefractiveGlass } from "@/components/ui/refractive-glass";
import { verifyClientEmail } from "@/services/client-auth";
import type { ClientVerificationResponse } from "@/services/client-auth/types";
import { MailCheck, MailX } from "lucide-react";
import { useTranslations } from "next-intl";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";

type VerificationState = ClientVerificationResponse["status"] | "checking" | "unavailable";

export default function VerificationResult() {
  const t = useTranslations("emailVerify");
  const [status, setStatus] = useState<VerificationState>("checking");
  const [attempt, setAttempt] = useState(0);
  const requestRef = useRef<Promise<ClientVerificationResponse> | null>(null);

  useEffect(() => {
    let active = true;
    const url = new URL(window.location.href);
    const tokens = url.searchParams.getAll("token");
    const token = tokens.length === 1 ? tokens[0] : "";

    // Strict Mode chạy lại effect khi mount. Dùng chung yêu cầu vì token chỉ dùng được một lần.
    requestRef.current ??= token ? verifyClientEmail(token) : Promise.resolve({ status: "invalid" });
    void requestRef.current.then(({ status }) => {
      if (!active) return;
      if (url.searchParams.has("token")) {
        url.searchParams.delete("token");
        window.history.replaceState(null, "", url);
      }
      setStatus(status);
    }).catch(() => {
      if (active) setStatus("unavailable");
    });

    return () => { active = false; };
  }, [attempt]);

  function retry() {
    requestRef.current = null;
    setStatus("checking");
    setAttempt((previous) => previous + 1);
  }

  // Tạo thẻ nhận ref của Radix Slot trong Client Component để SSR và hydrate dựng cùng phần tử.
  return (
    <RefractiveGlass>
      <section className="emailVerify-card">
        <div className="emailVerify-result" aria-live="polite">
          {status === "success" && <MailCheck className="emailVerify-icon" aria-hidden="true" />}
          {status === "invalid" && <MailX className="emailVerify-icon" aria-hidden="true" />}
          <h1 id="email-verify-title">{t(`${status}.title`)}</h1>
          {status === "checking" ? <LoadingDots /> : <p>{t(`${status}.body`)}</p>}
          {status === "success" && <p className="emailVerify-close">{t("success.close")}</p>}
        </div>
        {status === "invalid" && (
          <GlassButton asChild primaryColor="darkBlue">
            <Link href="/">{t("backToMap")}</Link>
          </GlassButton>
        )}
        {status === "unavailable" && (
          <GlassButton type="button" primaryColor="darkBlue" onClick={retry}>
            {t("retry")}
          </GlassButton>
        )}
      </section>
    </RefractiveGlass>
  );
}
