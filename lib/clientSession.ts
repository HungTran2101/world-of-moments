"use client";
import { CLIENT_SESSION_EVENT } from "@/app/api/client/constant";
let cacheKey = "guest";
export const getClientCacheKey = () => cacheKey;
export function publishClientIdentity(id: string | null) {
  const next = id ?? "guest";
  if (cacheKey === next) return;
  cacheKey = next;
  window.dispatchEvent(new Event(CLIENT_SESSION_EVENT));
}
