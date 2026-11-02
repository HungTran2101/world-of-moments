import { create } from "zustand";
import type { SubmissionPin } from "@/services/submissions/types";

export interface ScreenPoint {
  x: number;
  y: number;
}

export interface SubmissionMap {
  focus: () => void;
  openThought: (submissionId: string) => void;
  goToThought: (submission: SubmissionPin) => Promise<void>;
  zoomToPin: (signal: AbortSignal) => Promise<void>;
  getPinPosition: () => ScreenPoint;
  subscribeToResize: (listener: () => void) => () => void;
  prepareMarkerRefresh: (signal: AbortSignal) => Promise<() => Promise<void>>;
  waitForMarkerAnimations: (signal: AbortSignal) => Promise<void>;
  beginSubmission: () => (saved: boolean) => void;
}

interface SubmissionMapState {
  map: SubmissionMap | null;
  isSubmitting: boolean;
  setMap: (map: SubmissionMap | null) => void;
  setIsSubmitting: (isSubmitting: boolean) => void;
}

// Chỉ chia sẻ thao tác cần cho form/lịch sử; vòng đời MapLibre vẫn do MapView quản lý.
export const useSubmissionMapStore = create<SubmissionMapState>((set) => ({
  map: null,
  isSubmitting: false,
  setMap: (map) => set({ map }),
  setIsSubmitting: (isSubmitting) => set({ isSubmitting }),
}));
