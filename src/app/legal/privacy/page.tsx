import type { Metadata } from "next";
import { getLocale, getTranslations } from "next-intl/server";
import { InfoPageShell, InfoBlock } from "@/components/landing/InfoPageShell";
import { pageMetadata } from "@/lib/seo";
import type { Locale } from "@/i18n/locales";

export async function generateMetadata(): Promise<Metadata> {
  const [t, locale] = await Promise.all([getTranslations("meta.privacy"), getLocale()]);
  return pageMetadata({ path: "/legal/privacy", locale: locale as Locale, title: t("title"), description: t("description") });
}

export default async function PrivacyPage() {
  const t = await getTranslations("legal");
  const sections = t.raw("privacy") as { title: string; desc: string }[];
  const waitlist = t.raw("privacyWaitlist") as { title: string; desc: string };
  const leads = t.raw("privacyLeads") as { title: string; desc: string };
  return (
    <InfoPageShell eyebrow={t("label")} title={t("privacyTitle")}>
      <p className="rounded-2xl border border-accent/30 bg-accent/10 p-4 text-sm text-accent">{t("draft")}</p>
      {sections.map((s) => (
        <InfoBlock key={s.title} title={s.title}>
          {s.desc}
        </InfoBlock>
      ))}
      <InfoBlock title={waitlist.title}>{waitlist.desc}</InfoBlock>
      <InfoBlock title={leads.title}>{leads.desc}</InfoBlock>
    </InfoPageShell>
  );
}
