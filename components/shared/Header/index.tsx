"use client";

import { useTranslations } from "next-intl";
import { memo, type CSSProperties, type ReactNode } from "react";
import { SidebarTrigger, useSidebar } from "@/components/ui/sidebar";
import { Button } from "@/components/ui/button";
import { ChevronLeft } from "lucide-react";

const HeaderMenuToggle = memo(function HeaderMenuToggle() {
  const t = useTranslations();
  const { openMobile, isMobile } = useSidebar();
  if (!isMobile) return null;
  const label = t(openMobile ? "nav.closeMenu" : "nav.menu");
  return (
    <SidebarTrigger className="cms-headerToggle" aria-label={label} title={label} />
  );
});

const HeaderTitle = memo(function HeaderTitle({ title, onBack }: {
  title: string;
  onBack?: () => void;
}) {
  const t = useTranslations();
  return (
    <div className="cms-headerTitle">
      <HeaderMenuToggle />
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
      <header className="cms-header" style={style}>
        <HeaderTitle title={title} onBack={onBack} />
        <div className="cms-headerActions">{actions}</div>
      </header>
    </div>
  );
});
