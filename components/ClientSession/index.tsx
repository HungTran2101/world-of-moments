"use client";
import { createContext, useCallback, useContext, useEffect, useMemo, type ReactNode } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { getClientSession, logoutClient } from "@/services/client-auth";
import { CLIENT_SESSION_CHANNEL, CLIENT_SESSION_KEY } from "@/app/api/client/constant";
import { submissionHistoryKey } from "@/services/constant";
import { getClientCacheKey, publishClientIdentity } from "@/lib/clientSession";
import type { ClientIdentity } from "@/services/client-auth/types";

interface ClientSessionValue {
  user: ClientIdentity | null;
  loading: boolean;
  error: unknown;
  refresh: () => Promise<void>;
  changed: () => Promise<void>;
  logout: () => Promise<void>;
}
const ClientSessionContext = createContext<ClientSessionValue | null>(null);
export function ClientSession({ children }: { children: ReactNode }) {
  const client = useQueryClient();
  const query = useQuery({
    queryKey: CLIENT_SESSION_KEY,
    queryFn: ({ signal }) => getClientSession({ signal }),
    retry: false,
  });
  const user = query.data?.user ?? null;
  const refresh = useCallback(async () => {
    await client.invalidateQueries({ queryKey: CLIENT_SESSION_KEY });
  }, [client]);
  const changed = useCallback(async () => {
    if (typeof BroadcastChannel !== "undefined") {
      const channel = new BroadcastChannel(CLIENT_SESSION_CHANNEL);
      channel.postMessage("changed");
      channel.close();
    }
    await refresh();
  }, [refresh]);
  const logout = useCallback(async () => {
    await logoutClient();
    // Xóa dữ liệu riêng trước khi refetch để không lóe lịch sử của phiên vừa thoát.
    await client.cancelQueries({ queryKey: submissionHistoryKey });
    client.removeQueries({ queryKey: submissionHistoryKey });
    client.setQueryData(CLIENT_SESSION_KEY, { user: null });
    publishClientIdentity(null);
    await changed();
  }, [client, changed]);
  useEffect(() => {
    if (query.isPending) return;
    const next = user?.id ?? "guest";
    if (getClientCacheKey() === next) return;
    // Chỉ xóa truy vấn của tài khoản cũ; giữ yêu cầu vừa bắt đầu cho tài khoản mới.
    const previousIdentity = {
      queryKey: submissionHistoryKey,
      predicate: (query: { queryKey: readonly unknown[] }) =>
        query.queryKey[submissionHistoryKey.length] !== next,
    };
    void client.cancelQueries(previousIdentity);
    client.removeQueries(previousIdentity);
    publishClientIdentity(user?.id ?? null);
  }, [user?.id, query.isPending, client]);
  useEffect(() => {
    const channel =
      typeof BroadcastChannel !== "undefined" ? new BroadcastChannel(CLIENT_SESSION_CHANNEL) : null;
    if (channel)
      channel.onmessage = (event) => {
        if (event.data !== "changed") return;
        void client.cancelQueries({ queryKey: submissionHistoryKey });
        client.removeQueries({ queryKey: submissionHistoryKey });
        client.setQueryData(CLIENT_SESSION_KEY, { user: null });
        publishClientIdentity(null);
        void refresh();
      };
    return () => channel?.close();
  }, [client, refresh]);
  useEffect(() => {
    const deadline = user?.status === "suspended" ? user.suspendedUntil : user?.availableAt;
    if (!deadline) return;
    const timer = window.setTimeout(
      () => void refresh(),
      Math.max(0, new Date(deadline).getTime() - Date.now()),
    );
    return () => window.clearTimeout(timer);
  }, [user?.status, user?.suspendedUntil, user?.availableAt, refresh]);
  const value = useMemo(
    () => ({ user, loading: query.isPending, error: query.error, refresh, changed, logout }),
    [user, query.isPending, query.error, refresh, changed, logout],
  );
  return <ClientSessionContext.Provider value={value}>{children}</ClientSessionContext.Provider>;
}
export function useClientSession() {
  const value = useContext(ClientSessionContext);
  if (!value) throw new Error("ClientSession is required");
  return value;
}
