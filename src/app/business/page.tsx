import type { Metadata } from "next";
import { getLocale, getTranslations } from "next-intl/server";
import { InfoPageShell } from "@/components/landing/InfoPageShell";
import { pageMetadata } from "@/lib/seo";
import type { Locale } from "@/i18n/locales";
import { WaitlistForm } from "./WaitlistForm";

export async function generateMetadata(): Promise<Metadata> {
  const [t, locale] = await Promise.all([getTranslations("meta.business"), getLocale()]);
  return pageMetadata({ path: "/business", locale: locale as Locale, title: t("title"), description: t("description"), keywords: t("keywords").split(",").map((k) => k.trim()) });
}

export default async function BusinessPage() {
  const t = await getTranslations("businessPage");
  return (
    <InfoPageShell eyebrow={t("eyebrow")} title={t("title")}>
      <p>{t("p1")}</p>
      <p>{t("p2")}</p>
      <p className="text-sm text-text-muted/80">{t("early")}</p>
      <WaitlistForm />
    </InfoPageShell>
  );
}
