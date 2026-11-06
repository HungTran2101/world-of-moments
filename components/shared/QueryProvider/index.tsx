"use client";

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useState, type ReactNode } from "react";
import { MUTATION_CACHE_GC_TIME_MS } from "@/services/constant";

export default function QueryProvider({ children }: { children: ReactNode }) {
  const [client] = useState(() => new QueryClient({
    defaultOptions: {
      queries: { staleTime: 30_000, refetchOnWindowFocus: false, retry: false },
      // Không giữ dữ liệu nhạy cảm khi form đã tháo hoặc tự gửi lại thao tác sau khi có mạng.
      mutations: { gcTime: MUTATION_CACHE_GC_TIME_MS, networkMode: "always", retry: false },
    },
  }));

  return <QueryClientProvider client={client}>{children}</QueryClientProvider>;
}
