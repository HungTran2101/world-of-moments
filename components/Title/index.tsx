"use client";

import { useViewport } from "@/hooks/useViewport";
import { useSystemStore } from "@/store/systemStore";
import { motion } from "framer-motion";
import { useTranslations } from "next-intl";
import { RefractiveGlass } from "@/components/ui/refractive-glass";

const TITLE_HIDE_MAX_WIDTH_PX = 980;
const visible = { opacity: 1 };
const hidden = { opacity: 0 };

const Title = () => {
  const t = useTranslations("meta");
  const viewportWidth = useViewport()?.width;
  const hideForPanels = viewportWidth !== undefined && viewportWidth <= TITLE_HIDE_MAX_WIDTH_PX;
  const showTitle = useSystemStore((state) =>
    state.mapReady && !(hideForPanels && (state.sidebarOpen || state.historyOpen)),
  );

  return (
    <motion.header
      initial={hidden}
      animate={showTitle ? visible : hidden}
      transition={{ duration: 0.5 }}
      aria-hidden={!showTitle}
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
