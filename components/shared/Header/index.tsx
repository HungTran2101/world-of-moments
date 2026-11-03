"use client";

import { ChevronLeft } from "lucide-react";
import { useTranslations } from "next-intl";
import type { ReactNode } from "react";
import { Button } from "@/components/ui/button";

export function Header({
  title,
  onBack,
  actions,
}: {
  title: string;
  onBack?: () => void;
  actions?: ReactNode;
}) {
  const t = useTranslations();

  return (
    <header className="Cms-header">
      <div className="Cms-headerTitle">
        {onBack && (
          <Button
            className="Cms-headerBack"
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
      <div className="Cms-headerActions">{actions}</div>
    </header>
  );
}
