"use client";

import { ChevronLeft, Menu } from "lucide-react";
import { useTranslations } from "next-intl";
import { memo, type CSSProperties, type ReactNode } from "react";
import { Button } from "@/components/ui/button";
import { Dialog } from "@/components/ui/dialog";

const HeaderMenuToggle = memo(function HeaderMenuToggle() {
  const t = useTranslations();
  return (
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
  );
});

const HeaderTitle = memo(function HeaderTitle({
  title,
  onBack,
}: {
  title: string;
  onBack?: () => void;
}) {
  const t = useTranslations();
  return (
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
  );
});

// Tách phần cố định để actions JSX mới không làm dựng lại menu và tiêu đề.
export const Header = memo(function Header({
  title,
  onBack,
  actions,
  style,
}: {
  title: string;
  onBack?: () => void;
  actions?: ReactNode;
  style?: CSSProperties;
}) {
  return (
    <div className="cms-headerRow">
      <HeaderMenuToggle />
      <header className="cms-header" style={style}>
        <HeaderTitle title={title} onBack={onBack} />
        <div className="cms-headerActions">{actions}</div>
      </header>
    </div>
  );
});
