"use client";

import { useSystemStore } from "@/store/systemStore";
import { useSubmissionMapStore } from "@/store/useSubmissionMapStore";
import { motion } from "framer-motion";
import { ChevronRight } from "lucide-react";
import { CSSProperties, useEffect, useRef, useState } from "react";
import { usePinStore } from "@/store/usePinStore";
import { useTranslations } from "next-intl";
import { ClientSidebarContent } from "@/components/ClientSidebarContent";
import { RefractiveGlass } from "../ui/refractive-glass";

const SubmissionSidebar = () => {
  const authText = useTranslations("clientAuth");
  const hasPlacedPinRef = useRef(false);
  const mapReady = useSystemStore((state) => state.mapReady);
  const sidebarOpen = useSystemStore((state) => state.sidebarOpen);
  const setSidebarOpen = useSystemStore((state) => state.setSidebarOpen);
  const isToggleAnimatingRef = useRef(false);
  const descriptionRef = useRef<HTMLTextAreaElement>(null);
  const frameRef = useRef<HTMLDivElement>(null);

  const [closing, setClosing] = useState(sidebarOpen);
  const [path, setPath] = useState<string>();

  useEffect(
    () =>
      usePinStore.subscribe((state) => {
        if (!state.isPlaced || useSubmissionMapStore.getState().isSubmitting) return;
        const firstPlacement = !hasPlacedPinRef.current;
        hasPlacedPinRef.current = true;
        if (!useSystemStore.getState().sidebarOpen) {
          if (firstPlacement) setSidebarOpen(true);
          return;
        }
        const input = descriptionRef.current ?? document.getElementById("client-email");
        input?.focus({ preventScroll: true });
      }),
    [setSidebarOpen],
  );

  useEffect(() => {
    const frame = frameRef.current;
    if (!frame) return;

    // Khung giữ nguyên kích thước khi đóng để đường đi của nút không đổi giữa hiệu ứng.
    const observer = new ResizeObserver(([entry]) => {
      const { width, height } = entry.contentRect;
      const margin = parseFloat(getComputedStyle(frame).top);
      const openInset = 30;
      const widthInsideMargin = width - margin;
      const endX = widthInsideMargin - margin - openInset;
      const endY = height / 2 - openInset;
      setPath(`path('M 20 0 C ${widthInsideMargin / 2.5} -300 ${widthInsideMargin - 25} ${(height + 2 * margin) / 4} ${endX} ${endY}')`);
    });
    observer.observe(frame);
    return () => observer.disconnect();
  }, []);

  const asideAnim = sidebarOpen ? { width: "100%" } : { width: "0px" };

  const panelAnim = sidebarOpen
    ? {
        clipPath: "circle(150% at calc(100% - 20px) calc(100% - 20px))",
        opacity: 1,
      }
    : {
        clipPath: "circle(1px at calc(100% - 20px) calc(100% - 20px))",
        opacity: 0.5,
      };

  const buttonAnim = sidebarOpen
    ? { rotate: 85, offsetDistance: "100%" }
    : { rotate: 67, offsetDistance: "0%" };

  const handleSidebarToggle = () => {
    if (isToggleAnimatingRef.current) return;

    isToggleAnimatingRef.current = true;
    setSidebarOpen(!sidebarOpen);
    setClosing(false);
  };

  const handleAsideAnimationComplete = () => {
    if (isToggleAnimatingRef.current) isToggleAnimatingRef.current = false;
    if (!sidebarOpen) setClosing(true);
  };

  const handlePanelAnimationComplete = () => {
    if (!sidebarOpen || !mapReady || useSubmissionMapStore.getState().isSubmitting) return;

    // Chỉ focus khi panel đã mở hết để không đưa bàn phím vào ô nhập còn bị che.
    const input = descriptionRef.current ?? document.getElementById("client-email");
    input?.focus({ preventScroll: true });
  };

  return (
    <div ref={frameRef} className="sidebar-frame">
      <motion.aside
        className="sidebar"
        style={{
          padding: closing && !sidebarOpen ? "0" : undefined,
        }}
        initial={{ width: "0px", opacity: 0 }}
        animate={
          mapReady
            ? { ...asideAnim, opacity: 1 }
            : {
                width: "0px",
                opacity: 0,
              }
        }
        transition={{
          duration: 0,
          delay: sidebarOpen ? 0 : 0.6,
        }}
      >
        <RefractiveGlass
          blur={3}
          bezelWidth={50}
        >
          <motion.div
            id="submission-sidebar-content"
            className="sidebar-content"
            inert={!sidebarOpen}
            initial={{
              clipPath: "circle(1px at calc(100% - 20px) calc(100% - 20px))",
              opacity: 0.5,
            }}
            animate={panelAnim}
            transition={{
              duration: 0.6,
              delay: sidebarOpen ? 0.7 : 0,
            }}
            onAnimationComplete={handlePanelAnimationComplete}
          >
            <div className="sidebar-scroll">
              <ClientSidebarContent inputRef={descriptionRef} />
            </div>
          </motion.div>
        </RefractiveGlass>

        <motion.button
          id="submission-sidebar-toggle"
          type="button"
          aria-expanded={sidebarOpen}
          aria-controls="submission-sidebar-content"
          aria-label={authText(sidebarOpen ? "closeSidebar" : "openSidebar")}
          className="sidebar-button"
          onClick={handleSidebarToggle}
          animate={buttonAnim}
          transition={{
            duration: 0.7,
            delay: sidebarOpen ? 0 : 0.5,
            ease: sidebarOpen ? [0.1, 0.27, 1, -0.14] : [0.14, 0.95, 1, 0.84],
          }}
          style={{ offsetPath: path }}
          onAnimationComplete={handleAsideAnimationComplete}
        >
          <RefractiveGlass
            bezelWidth={20}
            glassThickness={50}
            style={{ "--glass-color": "118, 95, 248" } as CSSProperties}
          >
            <motion.div
              className="sidebar-button-glass"
              animate={{ scale: sidebarOpen ? 0.8 : 1 }}
              transition={{ delay: sidebarOpen ? 0.7 : 0.4 }}
            />
          </RefractiveGlass>

          <ChevronRight
            className="icon"
            color="var(--color-sidebar-icon)"
            style={{ transition: "stroke 1.5s ease" }}
          />
        </motion.button>
      </motion.aside>
    </div>
  );
};

export default SubmissionSidebar;
