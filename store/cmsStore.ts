"use client";

import { create } from "zustand";
import type { CmsUser } from "@/services/shared/types";

export const useCmsStore = create<{
  user: CmsUser | null;
  setUser: (user: CmsUser) => void;
  clear: () => void;
}>((set) => ({
  user: null,
  setUser: (user) => set({ user }),
  clear: () => set({ user: null }),
}));
