import type { Metadata } from "next";
import { getLocale, getTranslations } from "next-intl/server";
import { InfoPageShell, InfoBlock } from "@/components/landing/InfoPageShell";
import { pageMetadata } from "@/lib/seo";
import type { Locale } from "@/i18n/locales";
import { LLink } from "@/components/i18n/LLink";

export async function generateMetadata(): Promise<Metadata> {
  const [t, locale] = await Promise.all([getTranslations("meta.terms"), getLocale()]);
  return pageMetadata({ path: "/legal/terms", locale: locale as Locale, title: t("title"), description: t("description") });
}

export default async function TermsPage() {
  const t = await getTranslations("legal");
  const sections = t.raw("terms") as { title: string; desc: string }[];
  return (
    <InfoPageShell eyebrow={t("label")} title={t("termsTitle")}>
      <p className="rounded-2xl border border-accent/30 bg-accent/10 p-4 text-sm text-accent">{t("draft")}</p>
      <div className="flex flex-wrap gap-3">
        <LLink href="/legal/agreement?role=CUSTOMER" className="rounded-full border border-accent/50 px-4 py-2 text-sm font-semibold text-accent">
          {t("customerTermsLink")}
        </LLink>
        <LLink href="/legal/agreement?role=PROVIDER" className="rounded-full border border-accent/50 px-4 py-2 text-sm font-semibold text-accent">
          {t("proAgreementLink")}
        </LLink>
      </div>
      {sections.map((s) => (
        <InfoBlock key={s.title} title={s.title}>
          {s.desc}
        </InfoBlock>
      ))}
    </InfoPageShell>
  );
}
