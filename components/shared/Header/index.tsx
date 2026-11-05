"use client";

import { ChevronLeft, Menu } from "lucide-react";
import { useTranslations } from "next-intl";
import type { ReactNode } from "react";
import { Button } from "@/components/ui/button";
import { Dialog } from "@/components/ui/dialog";

export function Header({
  title,
  onBack,
  actions,
  style
}: {
  title: string;
  onBack?: () => void;
  actions?: ReactNode;
  style?: React.CSSProperties;
}) {
  const t = useTranslations();

  return (
    <div className="cms-headerRow">
      <Dialog.Trigger asChild aria-controls="cms-sidebar">
        <Button
          className="cms-menuToggle"
          type="button"
          variant="ghost"
          size="icon"
          aria-label={t("nav.menu")}
        >
          <Menu aria-hidden="true" />
        </Button>
      </Dialog.Trigger>
      <header className="cms-header" style={style}>
        <div className="cms-headerTitle">
          {onBack && (
            <Button
              className="cms-headerBack"
              type="button"
              variant="ghost"
              size="icon"
              onClick={onBack}
              aria-label={t("common.back")}
            >
              <ChevronLeft aria-hidden="true" />
            </Button>
          )}
          <h1>{title}</h1>
        </div>
        <div className="cms-headerActions">{actions}</div>
      </header>
    </div>
  );
}
