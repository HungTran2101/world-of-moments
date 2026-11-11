import Link from "next/link";
import { getTranslations } from "next-intl/server";
export default async function PrivacyPage() {
  const t = await getTranslations("clientAuth");
  return (
    <main className="clientPrivacy">
      <h1>{t("privacyTitle")}</h1>
      <p>{t("privacyBody")}</p>
      <a href="https://www.cloudflare.com/turnstile-privacy-policy/">{t("privacyCloudflare")}</a>
      <Link href="/">{t("backToMap")}</Link>
    </main>
  );
}
