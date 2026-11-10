"use client";

import { initializeVisitorIdentity } from "@/services/visitor";

export const VISITOR_IDENTITY_CHANGED_EVENT = "wom-visitor-identity-changed";
export const VISITOR_CHANNEL_NAME = "wom-visitor-identity";
const BOOTSTRAP_LOCK_NAME = "wom-visitor-bootstrap";
export const INITIAL_VISITOR_STATE = {
  cacheKey: null as string | null,
  error: null as unknown,
  loading: true
};
let state = INITIAL_VISITOR_STATE;
let pending: Promise<string> | null = null;
const listeners = new Set<() => void>();
export function getVisitorState() {
  return state;
}

export function getVisitorCacheKey() {
  return state.cacheKey;
}

export function subscribeVisitor(listener: () => void) {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

function publish(next: typeof state) {
  const changed = state.cacheKey !== next.cacheKey;
  state = next;
  listeners.forEach(listener => listener());
  if (changed) window.dispatchEvent(new Event(VISITOR_IDENTITY_CHANGED_EVENT));
}

export function invalidateVisitorIdentity(error: unknown) {
  publish({
    cacheKey: null,
    loading: false,
    error
  });
}

export async function ensureVisitorIdentity(force = false, signal?: AbortSignal): Promise<string> {
  signal?.throwIfAborted();
  if (!force && state.cacheKey) return state.cacheKey;
  if (!pending) {
    const initialize = async () => {
      const previous = state.cacheKey;
      const {
        cacheKey
      } = await initializeVisitorIdentity();
      if (typeof cacheKey !== "string" || !cacheKey) throw new Error("Invalid visitor identity response");
      publish({
        cacheKey,
        error: null,
        loading: false
      });
      // Chỉ thông báo thay đổi, không đưa cookie hoặc khóa cache lên kênh liên tab.
      if (previous && previous !== cacheKey && typeof BroadcastChannel !== "undefined") {
        const channel = new BroadcastChannel(VISITOR_CHANNEL_NAME);
        channel.postMessage("changed");
        channel.close();
      }
      return cacheKey;
    };
    // Web Locks tránh hai tab mới cùng ghi hai cookie khác nhau vào cùng trình duyệt.
    pending = (async () => navigator.locks ? await navigator.locks.request(BOOTSTRAP_LOCK_NAME, initialize) : await initialize())().catch((error: unknown) => {
      invalidateVisitorIdentity(error);
      throw error;
    }).finally(() => {
      pending = null;
    });
  }
  const key = await pending;
  signal?.throwIfAborted();
  return key;
}
