"use client";

import "./index.scss";

import Link from "next/link";
import { useTranslations } from "next-intl";
import { useCmsStore } from "@/store/cmsStore";
import { checkPermission, permissions } from "@/services/permission";
import { Header } from "@/components/shared/Header";
import { Breadcrumbs } from "@/components/shared/Breadcrumbs";

export function OverviewPage() {
  const t = useTranslations();
  const user = useCmsStore((state) => state.user);
  return (
    <>
      <Header title={t("nav.home")} />
      <Breadcrumbs
        label={t("common.breadcrumbs")}
        items={[{ label: t("nav.home") }]}
      />
      <div className="Cms-content">
        <section className="Cms-welcome">
          <h2>{t("home.welcome", { name: user?.name ?? "" })}</h2>
          <p>{t("home.description")}</p>
          <div className="Cms-homeLinks">
            {checkPermission(user?.scopes ?? [], permissions.ACCOUNT_SHOW) && (
              <Link href="/cms/accounts">{t("nav.accounts")} →</Link>
            )}
            {checkPermission(user?.scopes ?? [], permissions.ROLE_SHOW) && (
              <Link href="/cms/roles">{t("nav.roles")} →</Link>
            )}
            <Link href="/cms/change-password">{t("nav.changePassword")} →</Link>
          </div>
        </section>
      </div>
    </>
  );
}
