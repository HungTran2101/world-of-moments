"use client";

import { ROUTE_PATHS } from "@/services/routes";
import { Button } from "@/components/ui/button";

import { Select } from "@/components/ui/select";

import Image from "next/image";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useLocale, useTranslations } from "next-intl";
import { useState, type ReactNode } from "react";
import { setLocale } from "@/services/locale";
import { locales } from "@/i18n/config";
import { checkPermission } from "@/services/permission";
import { sidebarItems, type SidebarItem } from "@/components/CmsSidebar/sidebar";
import { useCmsStore } from "@/store/cmsStore";
import { logoutCms } from "@/services/cms/auth";
import { expireCmsSession } from "@/services/shared/cms-api";
import { ErrorNotice } from "@/components/shared/Forms";

export function CmsSidebar({ children }: { children: ReactNode }) {
  const t = useTranslations();
  const locale = useLocale();
  const router = useRouter();
  const pathname = usePathname();
  const user = useCmsStore((state) => state.user);
  const [open, setOpen] = useState(false);
  const [pendingAction, setPendingAction] = useState<"locale" | "logout" | null>(null);
  const busy = pendingAction !== null;
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
    setPendingAction("logout");
    try {
      await logoutCms();
      const channel = new BroadcastChannel("wom-cms-session");
      channel.postMessage("logout");
      channel.close();
      expireCmsSession();
    } catch (error) {
      setError(error);
      setPendingAction(null);
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
        <Link href={ROUTE_PATHS.OVERVIEW} className="cms-brand">
          <Image
            src="/favicon/android-chrome-192x192.png"
            width={34}
            height={34}
            alt=""
          />
          <span>
            World of Moments<small>CMS</small>
          </span>
        </Link>
        <nav aria-label={t("nav.navigation")}>
          <ul>{sidebarItems.map(renderItem)}</ul>
        </nav>
        <div className="cms-sidebarFooter">
          <p className="cms-identity">
            {user?.name}
            <small>@{user?.username}</small>
          </p>
          <label htmlFor="cms-locale">{t("common.language")}</label>
          <Select
            popupClassName="cms-popup"
            className="w-full"
            id="cms-locale"
            value={locale}
            disabled={busy}
            onValueChange={(value) => {
              const next = locales.find((item) => item === value);
              if (!next || busy) return;
              setPendingAction("locale");
              void setLocale(next)
                .then(() => router.refresh())
                .catch(setError)
                .finally(() => setPendingAction(null));
            }}
            options={[
              { value: "vi", label: "Tiếng Việt" },
              { value: "en", label: "English" },
            ]}
          />
          <Link
            href={ROUTE_PATHS.CHANGE_PASSWORD}
            aria-current={
              pathname === ROUTE_PATHS.CHANGE_PASSWORD ? "page" : undefined
            }
          >
            {t("nav.changePassword")}
          </Link>
          <Button
            variant="secondary"
            className="h-10"
            type="button"
            disabled={busy}
            loading={pendingAction === "logout"}
            onClick={() => void logout()}
          >
            {t("nav.logout")}
          </Button>
        </div>
      </aside>
      <main id="cms-main" className="cms-main" tabIndex={-1}>
        {Boolean(error) && <ErrorNotice error={error} />}
        {children}
      </main>
    </div>
  );
}
