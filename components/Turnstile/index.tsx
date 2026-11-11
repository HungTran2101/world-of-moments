"use client";
import Script from "next/script";
import { useEffect, useRef, useState } from "react";
import { CLIENT_LIMITS } from "@/app/api/client/constant";

interface TurnstileApi {
  render: (
    element: HTMLElement,
    options: {
      sitekey: string;
      action: string;
      retry: "never";
      callback: (token: string) => void;
      "error-callback": () => void;
      "expired-callback": () => void;
    },
  ) => string;
  remove: (id: string) => void;
}
declare global {
  interface Window {
    turnstile?: TurnstileApi;
  }
}
export function Turnstile({
  action,
  attempt,
  onToken,
  onError,
}: {
  action: "login" | "register";
  attempt: number;
  onToken: (token: string) => void;
  onError: () => void;
}) {
  const container = useRef<HTMLDivElement>(null);
  const [ready, setReady] = useState(false);
  useEffect(() => {
    const key = process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY;
    if (!key) {
      onError();
      return;
    }
    const timeout = window.setTimeout(onError, CLIENT_LIMITS.CAPTCHA_TIMEOUT_MS);
    if (!ready || !container.current || !window.turnstile)
      return () => window.clearTimeout(timeout);
    const api = window.turnstile;
    let widget: string;
    try {
      widget = api.render(container.current, {
        sitekey: key,
        action,
        retry: "never",
        callback: (token) => {
          window.clearTimeout(timeout);
          onToken(token);
        },
        "error-callback": onError,
        "expired-callback": onError,
      });
    } catch {
      window.clearTimeout(timeout);
      onError();
      return;
    }
    return () => {
      window.clearTimeout(timeout);
      api.remove(widget);
    };
  }, [ready, action, attempt, onToken, onError]);

  return (
    <>
      <Script
        id="client-turnstile"
        src="https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit"
        strategy="afterInteractive"
        onReady={() => setReady(true)}
        onError={onError}
      />
      <div ref={container} />
    </>
  );
}
