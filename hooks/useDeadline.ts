"use client";

import { useEffect, useState } from "react";
import { constants } from "@/app/api/constant";

const { MILLISECONDS_PER_SECOND } = constants;

export function useCountdown(deadline: number, active: boolean, showSeconds = true) {
  const [remaining, setRemaining] = useState(() => Math.max(0, deadline - Date.now()));

  useEffect(() => {
    if (!active) return;
    if (!Number.isFinite(deadline) || deadline <= Date.now()) {
      setRemaining(0);
      return;
    }

    let timer: number | undefined;
    function sync() {
      window.clearTimeout(timer);
      if (document.visibilityState !== "visible") return;

      // Tính từ hạn gốc để tab nền không làm bộ đếm bị chậm sau khi quay lại.
      const next = Math.max(0, deadline - Date.now());
      setRemaining(next);
      if (next > 0) {
        const delay = showSeconds ? Math.min(next, MILLISECONDS_PER_SECOND) : next;
        timer = window.setTimeout(sync, delay);
      } else {
        document.removeEventListener("visibilitychange", sync);
      }
    }

    document.addEventListener("visibilitychange", sync);
    sync();
    return () => {
      window.clearTimeout(timer);
      document.removeEventListener("visibilitychange", sync);
    };
  }, [active, deadline, showSeconds]);

  return remaining;
}
