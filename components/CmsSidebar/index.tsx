"use client";

import { ROUTE_PATHS } from "@/services/constant";
import { getCmsLandingPath } from "@/services/routes";
import { Button } from "@/components/ui/button";
import { Brand } from "@/components/shared/Brand";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useTranslations } from "next-intl";
import { LogOut, Map } from "lucide-react";
import { useMutation } from "@tanstack/react-query";
import { useState, type ReactNode } from "react";
import { checkPermission } from "@/services/permission";
import { sidebarItems, type SidebarItem } from "@/components/CmsSidebar/sidebar";
import { useCmsStore } from "@/store/cmsStore";
import { logoutCms } from "@/services/cms/auth";
import { expireCmsSession } from "@/services/shared/cms-api";
import { ErrorNotice } from "@/components/shared/Forms";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarProvider,
  SidebarTrigger,
  useSidebar,
} from "@/components/ui/sidebar";

const SIDEBAR_BRAND_IMAGE_SIZE_PX = 32;

function CmsSidebarContent({ children }: { children: ReactNode }) {
  const t = useTranslations();
  const pathname = usePathname();
  const user = useCmsStore((state) => state.user);
  const landingPath = getCmsLandingPath(user?.scopes ?? []);
  const { setOpenMobile, open, isMobile } = useSidebar();
  const [error, setError] = useState<unknown>(null);
  const closeMobile = () => setOpenMobile(false);

  const renderItem = (item: SidebarItem, nested = false): ReactNode => {
    if (item.showRole && !checkPermission(user?.scopes ?? [], item.showRole))
      return null;
    if (item.items) {
      const children = item.items.map((child) => renderItem(child, true)).filter(Boolean);
      return children.length ? (
        <SidebarGroup key={item.key}>
          <SidebarGroupLabel>{t(item.name)}</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>{children}</SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      ) : null;
    }
    if (!item.href) return null;
    const active = pathname === item.href || item.childRoutes?.includes(pathname);
    const Icon = item.icon;
    const link = (
      <SidebarMenuItem key={item.key}>
        <SidebarMenuButton asChild isActive={active} tooltip={t(item.name)}>
          <Link
            href={item.href}
            target={item.target}
            rel={item.target === "_blank" ? "noopener noreferrer" : undefined}
            aria-label={t(item.name)}
            aria-current={active ? "page" : undefined}
            onClick={closeMobile}
          >
            {Icon && <Icon aria-hidden="true" />}
            <span>{t(item.name)}</span>
          </Link>
        </SidebarMenuButton>
      </SidebarMenuItem>
    );
    return nested ? link : (
      <SidebarGroup key={item.key}><SidebarMenu>{link}</SidebarMenu></SidebarGroup>
    );
  };

  const logout = useMutation({
    mutationFn: () => logoutCms(),
    onMutate: () => setError(null),
    onSuccess: () => {
      const channel = new BroadcastChannel("wom-cms-session");
      channel.postMessage("logout");
      channel.close();
      expireCmsSession();
    },
    onError: setError,
  });
  const busy = logout.isPending;

  return (
    <>
      <a className="cms-skip" href="#cms-main">{t("nav.skip")}</a>
      <Sidebar
        variant="floating"
        collapsible="icon"
        className="cms-sidebar cms-popup"
        mobileTitle={t("nav.navigation")}
        closeLabel={t("nav.closeMenu")}
      >
        <SidebarHeader>
          <Link
            href={landingPath ?? ROUTE_PATHS.DASHBOARD}
            className="cms-sidebarBrand"
            aria-label="World of Moments CMS"
            onClick={closeMobile}
          >
            <Brand imageSize={SIDEBAR_BRAND_IMAGE_SIZE_PX} />
          </Link>
        </SidebarHeader>
        <SidebarContent>
          <nav aria-label={t("nav.navigation")}>
            {landingPath ? sidebarItems.map((item) => renderItem(item)) : null}
          </nav>
        </SidebarContent>
        <SidebarFooter>
          <div className="cms-sidebarFooterActions">
            <SidebarMenu>
              <SidebarMenuItem>
                <SidebarMenuButton asChild tooltip={t("nav.map")}>
                  <Link
                    href="/"
                    target="_blank"
                    rel="noopener noreferrer"
                    aria-label={t("nav.map")}
                    onClick={closeMobile}
                  >
                    <Map aria-hidden="true" />
                    <span>{t("nav.map")}</span>
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>
            </SidebarMenu>
            {!isMobile && (
              <Tooltip>
                <TooltipTrigger asChild>
                  <SidebarTrigger
                    className="cms-sidebarToggle"
                    size="icon"
                    aria-label={t(open ? "nav.collapseMenu" : "nav.expandMenu")}
                  />
                </TooltipTrigger>
                <TooltipContent side="right" align="center">
                  {t(open ? "nav.collapseMenu" : "nav.expandMenu")}
                </TooltipContent>
              </Tooltip>
            )}
          </div>
          <div className="cms-sidebarAccount">
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
                  onClick={() => { if (!busy) logout.mutate(); }}
                >
                  <LogOut aria-hidden="true" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>{t("nav.logout")}</TooltipContent>
            </Tooltip>
          </div>
        </SidebarFooter>
      </Sidebar>
      <main id="cms-main" className="cms-main" tabIndex={-1}>
        {Boolean(error) && <ErrorNotice error={error} />}
        {children}
      </main>
    </>
  );
}

export function CmsSidebar({ children }: { children: ReactNode }) {
  return (
    <SidebarProvider className="cms-shell">
      <CmsSidebarContent>{children}</CmsSidebarContent>
    </SidebarProvider>
  );
}
