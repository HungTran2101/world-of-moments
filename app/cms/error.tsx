"use client";

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
      <button type="button" onClick={reset}>
        {t("common.retry")}
      </button>
    </div>
  );
}
