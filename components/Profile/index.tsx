"use client";

import Link from "next/link";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { Breadcrumbs } from "@/components/shared/Breadcrumbs";
import { CmsPageContent } from "@/components/shared/CmsPageContent";
import { Header } from "@/components/shared/Header";
import { ROUTE_PATHS } from "@/services/routes";
import { useCmsStore } from "@/store/cmsStore";

export function ProfilePage() {
  const t = useTranslations();
  const user = useCmsStore((state) => state.user);

  return (
    <>
      <Header
        title={t("nav.profile")}
        actions={
          <Button variant="secondary" className="h-10" asChild>
            <Link href={ROUTE_PATHS.CHANGE_PASSWORD}>
              {t("nav.changePassword")}
            </Link>
          </Button>
        }
      />
      <CmsPageContent>
        <Breadcrumbs
          label={t("common.breadcrumbs")}
          items={[{ label: t("nav.profile") }]}
        />
        <section className="cms-profile" aria-label={t("nav.profile")}>
          <dl>
            <div>
              <dt>{t("account.username")}</dt>
              <dd>{user?.username}</dd>
            </div>
            <div>
              <dt>{t("account.name")}</dt>
              <dd>{user?.name}</dd>
            </div>
          </dl>
        </section>
      </CmsPageContent>
    </>
  );
}
