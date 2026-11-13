"use client";

import thoughtBubbleImg from "@/public/assets/thought-note.webp";
import { RefractiveGlass } from "@/components/ui/refractive-glass";
import type { ScreenPoint } from "@/store/useSubmissionMapStore";
import { AnimatePresence, motion } from "framer-motion";
import { useTranslations } from "next-intl";
import Image from "next/image";
import { useEffect, useRef } from "react";
import { createPortal } from "react-dom";

interface SubmissionAnimationProps {
  origin: ScreenPoint;
  getDestination: () => ScreenPoint;
  subscribeToResize: (listener: () => void) => () => void;
  onArrival: () => void;
  waiting: boolean;
}

const BUBBLE_WIDTH = 35;
const BUBBLE_HEIGHT = BUBBLE_WIDTH * thoughtBubbleImg.height / thoughtBubbleImg.width;
const START_SCALE = 20 / BUBBLE_WIDTH;
const PEAK_SCALE = 2;
const PEAK_PROGRESS = 0.2;

const ANIMATE_DURATION = 1500

export default function SubmissionAnimation({ origin, getDestination, subscribeToResize, onArrival, waiting }: SubmissionAnimationProps) {
  const t = useTranslations("submission");
  const bubbleRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const bubble = bubbleRef.current;
    if (!bubble) return;
    const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const duration = reducedMotion ? 100 : ANIMATE_DURATION;
    const startedAt = performance.now();
    let frame: number | null = null;
    let progress = 0;
    let t = 0;
    let end = origin;
    let control = origin;

    const draw = () => {
      const x = (1 - t) ** 2 * origin.x + 2 * (1 - t) * t * control.x + t ** 2 * end.x;
      const y = (1 - t) ** 2 * origin.y + 2 * (1 - t) * t * control.y + t ** 2 * end.y;
      // Đạt đỉnh sớm theo thời gian thực, rồi thu nhỏ dần, độc lập với easing của đường bay.
      const phase = progress < PEAK_PROGRESS
        ? progress / PEAK_PROGRESS
        : (progress - PEAK_PROGRESS) / (1 - PEAK_PROGRESS);
      const easedPhase = (1 - Math.cos(Math.PI * phase)) / 2;
      const scale = reducedMotion
        ? START_SCALE + progress * (1 - START_SCALE)
        : progress < PEAK_PROGRESS
          ? START_SCALE + easedPhase * (PEAK_SCALE - START_SCALE)
          : PEAK_SCALE + easedPhase * (1 - PEAK_SCALE);
      bubble.style.transform = `translate3d(${x - BUBBLE_WIDTH / 2}px, ${y - BUBBLE_HEIGHT / 2}px, 0) scale(${scale})`;
    };
    const updateDestination = () => {
      const destination = getDestination();
      end = { x: destination.x, y: destination.y - BUBBLE_HEIGHT / 2 };
      control = { x: origin.x + (end.x - origin.x) * 0.45, y: Math.min(origin.y, end.y) - 140 };
      draw();
    };

    // Bản đồ đang khóa nên chỉ cần chiếu tọa độ lúc bắt đầu và sau khi đổi kích thước.
    updateDestination();
    bubble.style.visibility = "visible";
    const unsubscribe = subscribeToResize(updateDestination);
    const animate = (now: number) => {
      progress = Math.min((now - startedAt) / duration, 1);
      t = 1 - Math.pow(1 - progress, 3);
      draw();
      if (progress === 1) {
        // Khi đã đến ghim, CSS giữ hiệu ứng chờ; không chạy vòng RAF trong lúc đợi API.
        frame = null;
        onArrival();
      } else {
        frame = requestAnimationFrame(animate);
      }
    };
    frame = requestAnimationFrame(animate);
    return () => {
      if (frame !== null) cancelAnimationFrame(frame);
      unsubscribe();
    };
  }, [origin, getDestination, subscribeToResize, onArrival]);

  return createPortal(
    <>
      <div ref={bubbleRef} className="submissionFlight" aria-hidden="true">
        <Image
          src={thoughtBubbleImg}
          alt=""
          loading="eager"
          width={BUBBLE_WIDTH}
          height={BUBBLE_HEIGHT}
          className={waiting ? "submissionFlight-bubble is-waiting" : "submissionFlight-bubble"}
        />
      </div>
      <AnimatePresence>
        {waiting && (
          <RefractiveGlass>
            <motion.div
              className="submissionFlight-notification"
              role="status"
              initial={{ y: "calc(100% + 2rem)", opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: "calc(100% + 2rem)", opacity: 0 }}
              transition={{ duration: 0.3 }}
            >
              <span>{t("sendingThought")}</span>
              <span className="submissionFlight-dots" aria-hidden="true">
                <span>.</span>
                <span>.</span>
                <span>.</span>
              </span>
            </motion.div>
          </RefractiveGlass>
        )}
      </AnimatePresence>
    </>,
    document.body,
  );
}
