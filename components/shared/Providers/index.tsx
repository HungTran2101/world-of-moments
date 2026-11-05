"use client";

import { ROUTE_PATHS } from "@/services/routes";
import QueryProvider from "@/components/shared/QueryProvider";
import type { CmsUser } from "@/services/shared/types";
import { CmsStoreContext, createCmsStore, useCmsStoreApi } from "@/store/cmsStore";
import { useQueryClient } from "@tanstack/react-query";
import {
  NextIntlClientProvider,
  type AbstractIntlMessages
} from "next-intl";
import { useEffect, useState, type ReactNode } from "react";

function SessionEvents() {
  const client = useQueryClient();
  const store = useCmsStoreApi();
  useEffect(() => {
    const clear = () => {
      store.getState().clear();
      client.clear();
    };
    window.addEventListener("cms-session-ended", clear);
    const channel = new BroadcastChannel("wom-cms-session");
    channel.onmessage = (event) => {
      if (event.data === "logout") {
        clear();
        if (window.location.pathname !== ROUTE_PATHS.LOGIN) {
          // Tải lại toàn trang để bỏ trạng thái phiên đã đăng xuất ở tab khác.
          window.location.assign(new URL(ROUTE_PATHS.LOGIN, window.location.origin).href);
        }
      }
    };
    return () => {
      window.removeEventListener("cms-session-ended", clear);
      channel.close();
    };
  }, [client, store]);
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
  const [store] = useState(() => createCmsStore(user));

  return (
    <CmsStoreContext.Provider value={store}>
      <SessionEvents />
      {children}
    </CmsStoreContext.Provider>
  );
}
