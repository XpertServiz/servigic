import type { Metadata } from "next";
import { getLocale, getTranslations } from "next-intl/server";
import { InfoPageShell, InfoBlock } from "@/components/landing/InfoPageShell";
import { Reveal } from "@/components/ui/Reveal";
import { JsonLd } from "@/components/seo/JsonLd";
import { breadcrumbJsonLd, pageMetadata, SITE_NAME } from "@/lib/seo";
import type { Locale } from "@/i18n/locales";

export async function generateMetadata(): Promise<Metadata> {
  const [t, locale] = await Promise.all([getTranslations("meta.how"), getLocale()]);
  return pageMetadata({ path: "/how-it-works", locale: locale as Locale, title: t("title"), description: t("description"), keywords: t("keywords").split(",").map((k) => k.trim()) });
}

export default async function HowItWorksPage() {
  const [t, locale] = await Promise.all([getTranslations("howPage"), getLocale()]);
  const steps = t.raw("steps") as { title: string; desc: string }[];

  const howTo = {
    "@context": "https://schema.org",
    "@type": "HowTo",
    name: t("title"),
    step: steps.map((s, i) => ({ "@type": "HowToStep", position: i + 1, name: s.title, text: s.desc })),
  };

  return (
    <InfoPageShell eyebrow={t("eyebrow")} title={t("title")}>
      <JsonLd data={[howTo, breadcrumbJsonLd([{ name: SITE_NAME, path: "/" }, { name: t("eyebrow"), path: "/how-it-works" }], locale as Locale)]} />
      {steps.map((s, i) => (
        <Reveal key={s.title} delay={i * 50}>
          <InfoBlock title={s.title}>{s.desc}</InfoBlock>
        </Reveal>
      ))}
    </InfoPageShell>
  );
}
