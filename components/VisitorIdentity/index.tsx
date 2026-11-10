"use client";

import { useEffect } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { submissionHistoryKey } from "@/services/constant";
import { ensureVisitorIdentity, getVisitorCacheKey, subscribeVisitor, VISITOR_CHANNEL_NAME } from "@/lib/visitorIdentity";

export function VisitorIdentity() {
  const client = useQueryClient();
  useEffect(() => {
    // Không nhập UUID cũ: người dùng bắt đầu với danh tính server mới theo chính sách đã chọn.
    try {
      localStorage.removeItem("pm_author_uuid");
    } catch {/* Trình duyệt có thể chặn storage. */ }
    const refresh = () => {
      if (document.visibilityState === "visible") void ensureVisitorIdentity(true).catch(() => { });
    };
    let previousKey = getVisitorCacheKey();
    const unsubscribe = subscribeVisitor(() => {
      const next = getVisitorCacheKey();
      if (next === previousKey) return;
      previousKey = next;
      void client.cancelQueries({
        queryKey: submissionHistoryKey
      });
      client.removeQueries({
        queryKey: submissionHistoryKey,
        predicate: query => query.queryKey[submissionHistoryKey.length] !== next
      });
    });
    const channel = typeof BroadcastChannel !== "undefined" ? new BroadcastChannel(VISITOR_CHANNEL_NAME) : null;
    if (channel) channel.onmessage = event => {
      if (event.data === "changed") refresh();
    };
    window.addEventListener("focus", refresh);
    document.addEventListener("visibilitychange", refresh);
    refresh();
    return () => {
      unsubscribe();
      channel?.close();
      window.removeEventListener("focus", refresh);
      document.removeEventListener("visibilitychange", refresh);
    };
  }, [client]);
  return null;
}
