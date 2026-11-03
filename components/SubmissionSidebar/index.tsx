'use client'

import { useViewport } from "@/hooks/useViewport"
import { useSystemStore } from "@/store/systemStore"
import { useSubmissionMapStore } from "@/store/useSubmissionMapStore"
import { motion } from "framer-motion"
import { ChevronRight } from "lucide-react"
import { useTranslations } from "next-intl"
import { CSSProperties, useMemo, useRef, useState } from "react"
import SubmissionForm from "../SubmissionForm"
import ThoughtGuidelines from "../ThoughtGuidelines"
import { RefractiveGlass } from "../ui/refractive-glass"

const SubmissionSidebar = () => {
  const t = useTranslations("guidance");
  const sw = useSystemStore((state) => state.sidebarWidth)
  const mapReady = useSystemStore((state) => state.mapReady);
  const sidebarOpen = useSystemStore((state) => state.sidebarOpen);
  const setSidebarOpen = useSystemStore((state) => state.setSidebarOpen);
  const isToggleAnimatingRef = useRef(false);
  const descriptionRef = useRef<HTMLTextAreaElement>(null);

  const [closing, setClosing] = useState(sidebarOpen);

  const viewport = useViewport();
  const vh = viewport?.height;
  const vw = viewport?.width;

  const path = useMemo(() => {
    if (!vh || !vw) return undefined;
    const w = Math.min(vw, sw)
    const margin = 8;
    const buttonLeft = 20;
    const openInset = 30;
    const panelWidth = Math.min(vw, sw + margin);
    const panelHeight = vh - margin * 2;
    // Trừ gốc left/top của nút để tâm khi mở khớp điểm reveal ở góc phải dưới panel.
    const endX = panelWidth - margin - buttonLeft - openInset;
    const endY = panelHeight / 2 - openInset;
    return `path('M 20 0 C ${w / 2.5} -300 ${w - 25} ${vh / 4} ${endX} ${endY}')`
  }, [sw, vh, vw])

  const asideAnim = sidebarOpen
    ? { width: "100%" }
    : { width: "0px" }

  const panelAnim = sidebarOpen
    ? {
      clipPath: "circle(150% at calc(100% - 20px) calc(100% - 20px))",
      opacity: 1
    }
    : {
      clipPath: "circle(1px at calc(100% - 20px) calc(100% - 20px))",
      opacity: 0.5
    }

  const buttonAnim = sidebarOpen
    ? { rotate: 85, offsetDistance: "100%" }
    : { rotate: 67, offsetDistance: "0%" }

  const handleSidebarToggle = () => {
    if (isToggleAnimatingRef.current) return;

    isToggleAnimatingRef.current = true;
    setSidebarOpen(!sidebarOpen);
    setClosing(false);
  }

  const handleAsideAnimationComplete = () => {
    if (isToggleAnimatingRef.current) isToggleAnimatingRef.current = false;
    if (!sidebarOpen) setClosing(true);
  }

  const handlePanelAnimationComplete = () => {
    if (!sidebarOpen || !mapReady || useSubmissionMapStore.getState().isSubmitting) return;

    // Chỉ focus khi panel đã mở hết để không đưa bàn phím vào ô nhập còn bị che.
    descriptionRef.current?.focus({ preventScroll: true });
  }

  return (
    <motion.aside
      className="sidebar"
      style={{
        padding: closing && !sidebarOpen ? '0' : undefined
      }}
      initial={{ width: "0px", opacity: 0 }}
      animate={mapReady ? { ...asideAnim, opacity: 1 } : {
        width: "0px",
        opacity: 0
      }}
      transition={{
        duration: 0,
        delay: sidebarOpen ? 0 : 0.6
      }}
    >
      <RefractiveGlass
        blur={3}
        bezelWidth={50}
      >
        <motion.div
          className="sidebar-content"
          initial={{
            clipPath: "circle(1px at calc(100% - 20px) calc(100% - 20px))",
            opacity: 0.5
          }}
          animate={panelAnim}
          transition={{
            duration: 0.6,
            delay: sidebarOpen ? 0.7 : 0
          }}
          onAnimationComplete={handlePanelAnimationComplete}
        >
          <div className="sidebar-scroll">
            <SubmissionForm inputRef={descriptionRef} />
            <section className="sidebar-guidance" aria-labelledby="guidance-title">
              <h2 id="guidance-title">{t("title")}</h2>
              <p>{t("about")}</p>
              <h3>{t("writingTitle")}</h3>
              <div className="sidebar-guidance-writing">
                <p>{t("writing")}</p>
              </div>
              <blockquote>{t("example")}</blockquote>
              <ThoughtGuidelines />
            </section>
          </div>
        </motion.div>
      </RefractiveGlass>

      <motion.span
        className="sidebar-button"
        onClick={handleSidebarToggle}
        animate={buttonAnim}
        transition={{
          duration: 0.7,
          delay: sidebarOpen ? 0 : 0.5,
          ease: sidebarOpen
            ? [0.1, 0.27, 1, -0.14]
            : [0.14, 0.95, 1, 0.84]
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
      </motion.span>
    </motion.aside>
  )
}

export default SubmissionSidebar
