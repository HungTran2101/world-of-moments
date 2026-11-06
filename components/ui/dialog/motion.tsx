"use client";

import { createContext, useCallback, useContext, useEffect, useRef, type ReactNode } from "react";

export interface DialogAnimationOrigin {
  x: number;
  y: number;
}

const ClickActivationContext = createContext<() => DialogAnimationOrigin | null>(() => null);
const CLICK_EVENT_RELEASE_DELAY_MS = 0;

// Context nội bộ cho useModal giữ điểm mở qua lúc React mount, không thêm prop vào API công khai.
export const DialogOriginSnapshotContext = createContext<DialogAnimationOrigin | null | undefined>(undefined);

export function useDialogActivationOrigin() {
  return useContext(ClickActivationContext);
}

export function DialogMotionProvider({ children }: { children: ReactNode }) {
  const clickEventRef = useRef<MouseEvent | null>(null);

  useEffect(() => {
    let releaseTimer: ReturnType<typeof setTimeout> | undefined;
    const clearClick = () => {
      clearTimeout(releaseTimer);
      clickEventRef.current = null;
    };
    const captureClick = (event: MouseEvent) => {
      // Bắt ở capture để click trên canvas hoặc có stopPropagation vẫn được ghi nhận.
      // Click từ bàn phím không có vị trí chuột nên mở từ giữa màn hình.
      clearClick();
      clickEventRef.current = event.detail > 0 ? event : null;
      // Timer chỉ giải phóng tham chiếu DOM; eventPhase mới quyết định nguồn mở, không phải thời gian.
      releaseTimer = setTimeout(clearClick, CLICK_EVENT_RELEASE_DELAY_MS);
    };

    document.addEventListener("click", captureClick, true);
    document.addEventListener("keydown", clearClick, true);
    return () => {
      document.removeEventListener("click", captureClick, true);
      document.removeEventListener("keydown", clearClick, true);
      clearClick();
    };
  }, []);

  const getClickOrigin = useCallback(() => {
    const event = clickEventRef.current;
    // Sau khi dispatch kết thúc, timer/API không được lấy tọa độ của click trước đó.
    return event && event.eventPhase !== Event.NONE
      ? { x: event.clientX, y: event.clientY }
      : null;
  }, []);

  return <ClickActivationContext.Provider value={getClickOrigin}>{children}</ClickActivationContext.Provider>;
}
