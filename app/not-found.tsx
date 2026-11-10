"use client";

import MapLoading from "@/components/shared/MapLoading";
import { GlassButton } from "@/components/ui/glass-button";
import { RefractiveGlass } from "@/components/ui/refractive-glass";
import { ArrowLeft } from "lucide-react";
import { useTranslations } from "next-intl";
import Link from "next/link";

export default function NotFoundPage() {
  const t = useTranslations("notFound");
  const brand = useTranslations("meta");

  return (
    <MapLoading>
      <main className="notFound" aria-labelledby="not-found-title">
        <RefractiveGlass>
          <section className="notFound-card">
            <p className="notFound-brand">{brand("title")}</p>
            <p className="notFound-code" aria-hidden="true">404</p>
            <h1 id="not-found-title">{t("title")}</h1>
            <p className="notFound-description">{t("description")}</p>
            <GlassButton asChild primaryColor="darkBlue" className="notFound-action">
              <Link href="/">
                <ArrowLeft aria-hidden="true" />
                {t("backToMap")}
              </Link>
            </GlassButton>
          </section>
        </RefractiveGlass>
      </main>
    </MapLoading>
  );
}
