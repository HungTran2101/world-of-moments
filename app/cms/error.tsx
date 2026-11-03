"use client";

import { Button } from "@/components/ui/button";

import { useTranslations } from "next-intl";

export default function CmsError({
  reset,
}: {
  error: Error;
  reset: () => void;
}) {
  const t = useTranslations();
  return (
    <div className="Cms-sessionLoading" role="alert">
      <p>{t("errors.server")}</p>
      <Button variant="outline" className="h-10" type="button" onClick={reset}>
        {t("common.retry")}
      </Button>
    </div>
  );
}
