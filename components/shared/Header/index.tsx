"use client";

import { ChevronLeft } from "lucide-react";
import { useTranslations } from "next-intl";
import type { ReactNode } from "react";
import { Button } from "@/components/ui/button";

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
    <header
      className="cms-header"
      style={style}
    >
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
  );
}
