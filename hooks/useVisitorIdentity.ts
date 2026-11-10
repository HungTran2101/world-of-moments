"use client";

import { useSyncExternalStore } from "react";
import { subscribeVisitor, getVisitorState, INITIAL_VISITOR_STATE } from "@/lib/visitorIdentity";

export function useVisitorIdentity() {
  return useSyncExternalStore(subscribeVisitor, getVisitorState, () => INITIAL_VISITOR_STATE);
}

export function useVisitorCacheKey() {
  return useVisitorIdentity().cacheKey;
}
