"use client";

import { useViewport } from "@/hooks/useViewport";
import { useSystemStore } from "@/store/systemStore";
import { motion } from "framer-motion";
import { useTranslations } from "next-intl";
import { useMemo } from "react";
import { RefractiveGlass } from "@/components/ui/refractive-glass";

const TITLE_HIDE_BELOW_WIDTH_PX = 1300;

const Title = () => {
  const t = useTranslations("meta");

  const viewport = useViewport();
  const vw = viewport?.width;

  const mapReady = useSystemStore((state) => state.mapReady);
  const sidebarOpen = useSystemStore((state) => state.sidebarOpen);

  const titleAnimate = useMemo(() => {
    if (!mapReady) return { opacity: 0 };
    if (vw && vw <= TITLE_HIDE_BELOW_WIDTH_PX && sidebarOpen) return { opacity: 0 };
    return { opacity: 1 };
  }, [sidebarOpen, mapReady, vw]);

  return (
    <motion.header
      initial={{ opacity: 0 }}
      animate={titleAnimate}
      transition={{ duration: 0.5 }}
      aria-hidden={titleAnimate.opacity === 0}
      className="title pointer-events-none fixed z-10 left-1/2 -translate-x-1/2 top-2"
    >
      <RefractiveGlass>
        <div className="title-panel w-fit rounded-[30px] flex flex-col justify-center items-center">
          <div className="title-text gradient-text font-lemonada text-nowrap font-semibold uppercase">
            {t("title")}
          </div>
        </div>
      </RefractiveGlass>
    </motion.header>
  );
};

export default Title;
