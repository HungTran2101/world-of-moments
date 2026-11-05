"use client";

import { createContext, useContext } from "react";
import { useStore } from "zustand";
import { createStore } from "zustand/vanilla";
import type { CmsUser } from "@/services/shared/types";

interface CmsState {
  user: CmsUser | null;
  setUser: (user: CmsUser) => void;
  clear: () => void;
}

export function createCmsStore(user: CmsUser) {
  // Mỗi provider giữ một store riêng; không chia sẻ danh tính giữa các request SSR.
  return createStore<CmsState>()((set) => ({
    user,
    setUser: (nextUser) => set((state) =>
      state.user === nextUser ? state : { user: nextUser },
    ),
    clear: () => set({ user: null }),
  }));
}

export const CmsStoreContext = createContext<ReturnType<typeof createCmsStore> | null>(null);

export function useCmsStoreApi() {
  const store = useContext(CmsStoreContext);
  if (!store) throw new Error("CMS store must be used within CmsSession");
  return store;
}

export function useCmsStore<T>(selector: (state: CmsState) => T) {
  return useStore(useCmsStoreApi(), selector);
}
