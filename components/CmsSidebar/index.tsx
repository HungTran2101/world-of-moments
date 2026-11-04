"use client";

import { ROUTE_PATHS } from "@/services/routes";
import { Button } from "@/components/ui/button";

import { Brand } from "@/components/shared/Brand";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useTranslations } from "next-intl";
import { LogOut } from "lucide-react";
import { useState, type ReactNode } from "react";
import { checkPermission } from "@/services/permission";
import { sidebarItems, type SidebarItem } from "@/components/CmsSidebar/sidebar";
import { useCmsStore } from "@/store/cmsStore";
import { logoutCms } from "@/services/cms/auth";
import { expireCmsSession } from "@/services/shared/cms-api";
import { ErrorNotice } from "@/components/shared/Forms";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";

export function CmsSidebar({ children }: { children: ReactNode }) {
  const t = useTranslations();
  const pathname = usePathname();
  const user = useCmsStore((state) => state.user);
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<unknown>(null);
  const renderItem = (item: SidebarItem): ReactNode => {
    if (item.showRole && !checkPermission(user?.scopes ?? [], item.showRole))
      return null;
    if (item.items) {
      const children = item.items.map(renderItem).filter(Boolean);
      return children.length ? (
        <details key={item.key} open>
          <summary>{t(item.name)}</summary>
          <ul>{children}</ul>
        </details>
      ) : null;
    }
    const active =
      pathname === item.href || item.childRoutes?.includes(pathname);
    return (
      <li key={item.key}>
        <Link
          href={item.href!}
          aria-current={active ? "page" : undefined}
          onClick={() => setOpen(false)}
        >
          {t(item.name)}
        </Link>
      </li>
    );
  };

  const logout = async () => {
    if (busy) return;
    setBusy(true);
    setError(null);
    try {
      await logoutCms();
      const channel = new BroadcastChannel("wom-cms-session");
      channel.postMessage("logout");
      channel.close();
      expireCmsSession();
    } catch (error) {
      setError(error);
      setBusy(false);
    }
  };

  return (
    <div className="cms-shell">
      <a className="cms-skip" href="#cms-main">
        {t("nav.skip")}
      </a>
      <Button
        variant="outline"
        className="cms-menuToggle"
        type="button"
        aria-expanded={open}
        aria-controls="cms-sidebar"
        onClick={() => setOpen(!open)}
      >
        {t("nav.menu")}
      </Button>
      <aside id="cms-sidebar" className="cms-sidebar" data-open={open}>
        <Link href={ROUTE_PATHS.OVERVIEW} className="cms-sidebarBrand">
          <Brand />
        </Link>
        <nav aria-label={t("nav.navigation")}>
          <ul>{sidebarItems.map(renderItem)}</ul>
        </nav>
        <div className="cms-sidebarFooter">
          <p className="cms-identity" title={user?.name}>{user?.name}</p>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="destructive"
                size="icon"
                type="button"
                aria-label={t("nav.logout")}
                disabled={busy}
                loading={busy}
                onClick={() => void logout()}
              >
                <LogOut aria-hidden="true" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>{t("nav.logout")}</TooltipContent>
          </Tooltip>
        </div>
      </aside>
      <main id="cms-main" className="cms-main" tabIndex={-1}>
        {Boolean(error) && <ErrorNotice error={error} />}
        {children}
      </main>
    </div>
  );
}
