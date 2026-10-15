import type { Metadata } from "next";
import { getLocale, getTranslations } from "next-intl/server";
import { InfoPageShell, InfoBlock } from "@/components/landing/InfoPageShell";
import { Reveal } from "@/components/ui/Reveal";
import { JsonLd } from "@/components/seo/JsonLd";
import { breadcrumbJsonLd, pageMetadata, SITE_NAME } from "@/lib/seo";
import type { Locale } from "@/i18n/locales";

export async function generateMetadata(): Promise<Metadata> {
  const [t, locale] = await Promise.all([getTranslations("meta.trust"), getLocale()]);
  return pageMetadata({ path: "/trust-and-safety", locale: locale as Locale, title: t("title"), description: t("description"), keywords: t("keywords").split(",").map((k) => k.trim()) });
}

export default async function TrustAndSafetyPage() {
  const [t, locale] = await Promise.all([getTranslations("trustPage"), getLocale()]);
  const sections = t.raw("sections") as { title: string; desc: string }[];

  return (
    <InfoPageShell eyebrow={t("eyebrow")} title={t("title")}>
      <JsonLd data={breadcrumbJsonLd([{ name: SITE_NAME, path: "/" }, { name: t("eyebrow"), path: "/trust-and-safety" }], locale as Locale)} />
      {sections.map((s, i) => (
        <Reveal key={s.title} delay={i * 50}>
          <InfoBlock title={s.title}>{s.desc}</InfoBlock>
        </Reveal>
      ))}
    </InfoPageShell>
  );
}
