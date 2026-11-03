"use client";

import { Button } from "@/components/ui/button";

import "./index.scss";

import { Select } from "@/components/ui/select";

import Image from "next/image";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useLocale, useTranslations } from "next-intl";
import { useState, type ReactNode } from "react";
import { setLocale } from "@/services/locale";
import { locales } from "@/i18n/config";
import { checkPermission } from "@/services/permission";
import { sidebarItems, type SidebarItem } from "@/components/shared/Sidebar/sidebar";
import { useCmsStore } from "@/store/cmsStore";
import { logoutCms } from "@/services/cms/auth";
import { expireCmsSession } from "@/services/shared/cms-api";
import { ErrorNotice } from "@/components/shared/Forms";

export function CmsShell({ children }: { children: ReactNode }) {
  const t = useTranslations();
  const locale = useLocale();
  const router = useRouter();
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
    setBusy(true);
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
    <div className="Cms-shell">
      <a className="Cms-skip" href="#cms-main">
        {t("nav.skip")}
      </a>
      <Button
        variant="outline"
        className="Cms-menuToggle"
        type="button"
        aria-expanded={open}
        aria-controls="cms-sidebar"
        onClick={() => setOpen(!open)}
      >
        {t("nav.menu")}
      </Button>
      <aside id="cms-sidebar" className="Cms-sidebar" data-open={open}>
        <Link href="/cms" className="Cms-brand">
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
        <div className="Cms-sidebarFooter">
          <p className="Cms-identity">
            {user?.name}
            <small>@{user?.username}</small>
          </p>
          <label htmlFor="cms-locale">{t("common.language")}</label>
          <Select
            popupClassName="Cms-popup"
            className="w-full"
            id="cms-locale"
            value={locale}
            disabled={busy}
            onValueChange={(value) => {
              const next = locales.find((item) => item === value);
              if (!next) return;
              setBusy(true);
              void setLocale(next)
                .then(() => router.refresh())
                .catch(setError)
                .finally(() => setBusy(false));
            }}
            options={[
              { value: "vi", label: "Tiếng Việt" },
              { value: "en", label: "English" },
            ]}
          />
          <Link
            href="/cms/change-password"
            aria-current={
              pathname === "/cms/change-password" ? "page" : undefined
            }
          >
            {t("nav.changePassword")}
          </Link>
          <Button variant="secondary" className="h-10" type="button" disabled={busy} onClick={() => void logout()}>
            {t("nav.logout")}
          </Button>
        </div>
      </aside>
      <main id="cms-main" className="Cms-main" tabIndex={-1}>
        {Boolean(error) && <ErrorNotice error={error} />}
        {children}
      </main>
    </div>
  );
}
