"use client";

import QueryProvider from "@/components/shared/QueryProvider";
import type { CmsUser } from "@/services/shared/types";
import { useCmsStore } from "@/store/cmsStore";
import { useQueryClient } from "@tanstack/react-query";
import {
  NextIntlClientProvider,
  type AbstractIntlMessages
} from "next-intl";
import { useEffect, useState, type ReactNode } from "react";
import { LoadingDots } from "../LoadingDots";

function SessionEvents() {
  const client = useQueryClient();
  useEffect(() => {
    const clear = () => client.clear();
    window.addEventListener("cms-session-ended", clear);
    const channel = new BroadcastChannel("wom-cms-session");
    channel.onmessage = (event) => {
      if (event.data === "logout") {
        useCmsStore.getState().clear();
        clear();
        if (window.location.pathname !== "/cms/login") {
          // Tải lại toàn trang để bỏ trạng thái phiên đã đăng xuất ở tab khác.
          window.location.assign(new URL("/cms/login", window.location.origin).href);
        }
      }
    };
    return () => {
      window.removeEventListener("cms-session-ended", clear);
      channel.close();
    };
  }, [client]);
  return null;
}

export function CmsProviders({
  locale,
  messages,
  children,
}: {
  locale: string;
  messages: AbstractIntlMessages;
  children: ReactNode;
}) {
  return (
    <NextIntlClientProvider locale={locale} messages={messages}>
      <QueryProvider>
        <SessionEvents />
        {children}
      </QueryProvider>
    </NextIntlClientProvider>
  );
}

export function CmsSession({
  user,
  children,
}: {
  user: CmsUser;
  children: ReactNode;
}) {
  const [ready, setReady] = useState(false);
  useEffect(() => {
    useCmsStore.getState().setUser(user);
    setReady(true);
  }, [user]);
  if (!ready)
    return (
      <div className="Cms-sessionLoading" role="status">
        <LoadingDots />
      </div>
    );
  return children;
}
