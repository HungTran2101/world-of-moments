"use client";

import { Locale, locales } from "@/i18n/config";
import { useMutation } from "@tanstack/react-query";
import { useError } from "@/components/shared/ErrorProvider";
import { setLocale } from "@/services/locale";
import { useSystemStore } from "@/store/systemStore";
import { Clock3, History, Languages, Moon, Sun, Sunset } from "lucide-react";
import { useRef, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { useRouter } from "next/navigation";
import { Toolbar as ToolbarPrimitive } from "radix-ui";
import HistoryPanel from "../HistoryPanel";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuTrigger,
} from "../ui/dropdown-menu";
import { RefractiveGlass } from "../ui/refractive-glass";
import { Tooltip, TooltipContent, TooltipTrigger } from "../ui/tooltip";

const TIME_ACTIONS = [
  { value: "auto", icon: Clock3 },
  { value: "daytime", icon: Sun },
  { value: "evening", icon: Sunset },
  { value: "nighttime", icon: Moon },
] as const;

export default function Toolbar() {
  const [historyOpen, setHistoryOpen] = useState(false);
  const historyTriggerRef = useRef<HTMLButtonElement>(null);
  const t = useTranslations("toolbar");
  const nav = useTranslations("nav");
  const locale = useLocale() as Locale;
  const router = useRouter();
  const mapTimeMode = useSystemStore((state) => state.mapTimeMode);
  const mapTimeStage = useSystemStore((state) => state.mapTimeStage);
  const setMapTimeMode = useSystemStore((state) => state.setMapTimeMode);
  const sidebarOpen = useSystemStore((state) => state.sidebarOpen);
  const isSpaceView = useSystemStore((state) => state.isSpaceView);
  const selectedTimeStage = mapTimeMode === "auto" ? mapTimeStage : mapTimeMode;
  const SelectedTimeIcon = TIME_ACTIONS.find((action) => action.value === selectedTimeStage)?.icon ?? Sun;

  const { showError } = useError();
  const language = useMutation({
    mutationFn: (nextLocale: Locale) => setLocale(nextLocale),
    onSuccess: () => router.refresh(),
    onError: (error) => showError(error),
  });

  return (
    <>
      <RefractiveGlass
        glassThickness={50}
        bezelWidth={10}
      >
        <ToolbarPrimitive.Root
          className="toolbar"
          orientation="vertical"
          aria-label={t("label")}
          data-sidebar-open={sidebarOpen}
          loop
        >
          <DropdownMenu>
            <Tooltip>
              <TooltipTrigger asChild>
                {/* ID cố định cho menu duy nhất để giữ liên kết ARIA ổn định khi hydrate. */}
                <DropdownMenuTrigger asChild id="languages-menu-trigger" aria-controls="languages-menu-content">
                  <ToolbarPrimitive.Button className="toolbar-action" aria-label={t("language")} disabled={language.isPending}>
                    <Languages aria-hidden="true" />
                  </ToolbarPrimitive.Button>
                </DropdownMenuTrigger>
              </TooltipTrigger>
              <TooltipContent side="left" sideOffset={10}>{t("language")}</TooltipContent>
            </Tooltip>
            <RefractiveGlass>
              <DropdownMenuContent
                id="languages-menu-content"
                aria-labelledby="languages-menu-trigger"
                className="toolbar-menu"
                side="left"
                align="start"
                sideOffset={10}
              >
                <DropdownMenuRadioGroup
                  value={locale}
                  onValueChange={(value) => {
                    const nextLocale = locales.find((itemLocale) => itemLocale === value);
                    if (nextLocale && nextLocale !== locale && !language.isPending) language.mutate(nextLocale);
                  }}
                >
                  {locales.map((itemLocale) => (
                    <DropdownMenuRadioItem key={itemLocale} value={itemLocale} disabled={language.isPending}>
                      <span aria-hidden="true">{itemLocale === "vi" ? "🇻🇳" : "🇺🇸"}</span>
                      <span>{nav(itemLocale)}</span>
                    </DropdownMenuRadioItem>
                  ))}
                </DropdownMenuRadioGroup>
              </DropdownMenuContent>
            </RefractiveGlass>
          </DropdownMenu>
          {!isSpaceView && (
            <DropdownMenu>
              <Tooltip>
                <TooltipTrigger asChild>
                  <DropdownMenuTrigger asChild id="time-menu-trigger" aria-controls="time-menu-content">
                    <ToolbarPrimitive.Button className="toolbar-action" aria-label={t("time")}>
                      <SelectedTimeIcon aria-hidden="true" />
                    </ToolbarPrimitive.Button>
                  </DropdownMenuTrigger>
                </TooltipTrigger>
                <TooltipContent side="left" sideOffset={10}>{t("time")}: {t(mapTimeMode)}</TooltipContent>
              </Tooltip>
              <RefractiveGlass>
                <DropdownMenuContent
                  id="time-menu-content"
                  aria-labelledby="time-menu-trigger"
                  className="toolbar-menu"
                  side="left"
                  align="start"
                  sideOffset={10}
                >
                  <DropdownMenuRadioGroup
                    value={mapTimeMode}
                    onValueChange={(value) => {
                      const action = TIME_ACTIONS.find((item) => item.value === value);
                      if (action) setMapTimeMode(action.value);
                    }}
                  >
                    {TIME_ACTIONS.map(({ value, icon: Icon }) => (
                      <DropdownMenuRadioItem key={value} value={value}>
                        <Icon aria-hidden="true" />
                        <span>{t(value)}</span>
                      </DropdownMenuRadioItem>
                    ))}
                  </DropdownMenuRadioGroup>
                </DropdownMenuContent>
              </RefractiveGlass>
            </DropdownMenu>
          )}
          <Tooltip>
            <TooltipTrigger asChild>
              <ToolbarPrimitive.Button
                ref={historyTriggerRef}
                id="history-panel-trigger"
                className="toolbar-action"
                aria-label={nav("myHistory")}
                aria-haspopup="dialog"
                aria-expanded={historyOpen}
                aria-controls={historyOpen ? "history-panel" : undefined}
                data-state={historyOpen ? "open" : "closed"}
                onClick={() => setHistoryOpen((value) => !value)}
              >
                <History aria-hidden="true" />
              </ToolbarPrimitive.Button>
            </TooltipTrigger>
            <TooltipContent side="left" sideOffset={10}>{nav("myHistory")}</TooltipContent>
          </Tooltip>
        </ToolbarPrimitive.Root>
      </RefractiveGlass>
      <HistoryPanel
        open={historyOpen}
        onOpenChange={setHistoryOpen}
        onReturnFocus={() => historyTriggerRef.current?.focus({ preventScroll: true })}
      />
    </>
  );
}
