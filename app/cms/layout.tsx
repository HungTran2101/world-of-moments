import { getLocale } from "next-intl/server";
import type { Metadata } from "next";
import { CmsProviders } from "@/components/shared/Providers";
import "@/styles/cms-import.scss";

export const dynamic = "force-dynamic";
export const metadata: Metadata = {
  title: "CMS · World of Moments",
  robots: { index: false, follow: false },
};

export default async function CmsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const locale = await getLocale();
  const messages = (await import(`@/messages/cms-${locale}.json`)).default;
  return (
    <div className="cms">
      <CmsProviders locale={locale} messages={messages}>
        {children}
      </CmsProviders>
    </div>
  );
}
