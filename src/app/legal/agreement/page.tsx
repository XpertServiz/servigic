import type { Metadata } from "next";
import { headers } from "next/headers";
import { getTranslations } from "next-intl/server";
import { InfoPageShell } from "@/components/landing/InfoPageShell";
import { AgreementBody } from "@/components/legal/AgreementBody";
import { PrintButton } from "@/components/legal/PrintButton";
import { getAgreement } from "@/lib/legal/agreements";
import { LLink } from "@/components/i18n/LLink";

export const metadata: Metadata = { title: "Servigic agreements", robots: { index: false } };

// The Customer Terms or Pro Agreement of a country, readable and printable (Print / Save as PDF). The visitor's IP country
// unless ?country= is given; ?role=CUSTOMER|PROVIDER.
export default async function AgreementPage({ searchParams }: { searchParams: Promise<{ role?: string; country?: string }> }) {
  const sp = await searchParams;
  const h = await headers();
  const role = sp.role === "PROVIDER" ? "PROVIDER" : "CUSTOMER";
  const country = sp.country || h.get("x-vercel-ip-country") || h.get("cf-ipcountry") || "XX";
  const doc = getAgreement(role, country);
  const t = await getTranslations("legal");
  return (
    <InfoPageShell eyebrow={t("label")} title={doc.title}>
      <div className="flex flex-wrap items-center gap-3 print:hidden">
        <LLink href={`/legal/agreement?role=CUSTOMER&country=${doc.country}`} className={`rounded-full border px-4 py-2 text-sm font-semibold ${role === "CUSTOMER" ? "border-accent bg-accent/10 text-accent" : "border-border-subtle"}`}>
          {t("customerTermsLink")}
        </LLink>
        <LLink href={`/legal/agreement?role=PROVIDER&country=${doc.country}`} className={`rounded-full border px-4 py-2 text-sm font-semibold ${role === "PROVIDER" ? "border-accent bg-accent/10 text-accent" : "border-border-subtle"}`}>
          {t("proAgreementLink")}
        </LLink>
        <PrintButton label={t("download")} />
      </div>
      <AgreementBody doc={doc} />
    </InfoPageShell>
  );
}
