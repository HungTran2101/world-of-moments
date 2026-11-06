"use client";

import { useMutation } from "@tanstack/react-query";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { useLocale, useTranslations } from "next-intl";
import { Select } from "@/components/ui/select";
import { Breadcrumbs } from "@/components/shared/Breadcrumbs";
import { CmsPageContent } from "@/components/shared/CmsPageContent";
import { ErrorNotice, Field } from "@/components/shared/Forms";
import { Header } from "@/components/shared/Header";
import { locales } from "@/i18n/config";
import { setLocale } from "@/services/locale";

export function GeneralPage() {
  const t = useTranslations();
  const locale = useLocale();
  const router = useRouter();
  const [error, setError] = useState<unknown>(null);
  const language = useMutation({
    mutationFn: (next: (typeof locales)[number]) => setLocale(next),
    onMutate: () => setError(null),
    onSuccess: () => router.refresh(),
    onError: setError,
  });
  const busy = language.isPending;

  return (
    <>
      <Header title={t("nav.general")} />
      <CmsPageContent>
        <Breadcrumbs
          label={t("common.breadcrumbs")}
          items={[{ label: t("nav.general") }]}
        />
        <section className="cms-form" aria-label={t("nav.general")} aria-busy={busy}>
          {Boolean(error) && <ErrorNotice error={error} />}
          <Field id="cms-locale" label={t("common.language")}>
            <Select
              allowClear={false}
              popupClassName="cms-popup"
              className="w-full"
              id="cms-locale"
              value={locale}
              disabled={busy}
              onValueChange={(value) => {
                const next = locales.find((item) => item === value);
                if (!next || next === locale || busy) return;
                language.mutate(next);
              }}
              options={[
                { value: "vi", label: "Tiếng Việt" },
                { value: "en", label: "English" },
              ]}
            />
          </Field>
        </section>
      </CmsPageContent>
    </>
  );
}
