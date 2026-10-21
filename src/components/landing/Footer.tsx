import Image from "next/image";
import { getLocale, getTranslations } from "next-intl/server";
import type { Locale } from "@/i18n/locales";
import { LLink } from "@/components/i18n/LLink";
import { LanguageSwitcher } from "./LanguageSwitcher";
import { CurrencySwitcher } from "./CurrencySwitcher";
import { detectMarket } from "@/lib/geoDetect";
import { LegalDisclaimer } from "@/components/ui/LegalDisclaimer";
import { getCitySlugs, getCountryCities } from "@/lib/liveCities";

const FEATURED_TRADES = [
  { trade: "PLUMBER", slug: "plumber" },
  { trade: "ELECTRICIAN", slug: "electrician" },
  { trade: "AC_TECHNICIAN", slug: "ac-technician" },
  { trade: "CARPENTER", slug: "carpenter" },
];

const colTitle = "mb-4 font-mono text-[11.5px] uppercase tracking-[0.16em] text-text-muted";
const list = "flex flex-col gap-2.5 text-sm text-text-muted [&_a:hover]:text-accent [&_a]:transition-colors";

export async function Footer() {
  const [locale, market, t, ts, tc] = await Promise.all([
    getLocale() as Promise<Locale>,
    detectMarket(),
    getTranslations("footer"),
    getTranslations("services.trades"),
    getTranslations("cities"),
  ]);

  // The visitor's own cities first (Jeddah and Madinah for Saudi Arabia), spread over the four popular trades.
  const own = await getCountryCities(market.country);
  const citySlugs = own.length ? own.map((c) => ({ name: c, slug: c.toLowerCase().replace(/\s+/g, "-") })) : await getCitySlugs(market.country);
  const FEATURED_LINKS = FEATURED_TRADES.map((f, i) => ({ ...f, city: citySlugs.length ? citySlugs[i % citySlugs.length].name : "Karachi", citySlug: citySlugs.length ? citySlugs[i % citySlugs.length].slug : "karachi" }));

  return (
    <footer className="relative mt-16 border-t border-white/[0.07] bg-gradient-to-b from-transparent to-black/30 py-14 md:py-16">
      <div className="container-x">
        <div className="mb-12 grid grid-cols-2 gap-8 md:grid-cols-5">
          <div className="col-span-2 md:col-span-1">
            <LLink href="/" className="mb-3 flex items-center gap-2.5 text-xl font-bold tracking-[-0.018em]">
              <Image src="/icons/icon-192.png" alt="" width={36} height={36} className="rounded-[10px]" />
              Servigic
            </LLink>
            <p className="max-w-[260px] text-[13px] text-text-muted">{t("tagline")}</p>
          </div>
          <div>
            <h4 className={colTitle}>{t("services")}</h4>
            <ul className={list}>
              {FEATURED_LINKS.map((l) => (
                <li key={l.slug}>
                  <LLink href={`/services/${l.slug}/${l.citySlug}`}>{t("serviceLink", { service: ts(l.trade), city: tc(l.city) })}</LLink>
                </li>
              ))}
              <li>
                <LLink href="/services">{t("allServices")}</LLink>
              </li>
            </ul>
          </div>
          <div>
            <h4 className={colTitle}>{t("company")}</h4>
            <ul className={list}>
              <li>
                <LLink href="/how-it-works">{t("howItWorks")}</LLink>
              </li>
              <li>
                <LLink href="/trust-and-safety">{t("trust")}</LLink>
              </li>
              <li>
                <LLink href="/#faq">{t("faq")}</LLink>
              </li>
              <li>
                <LLink href="/business">{t("business")}</LLink>
              </li>
            </ul>
          </div>
          <div>
            <h4 className={colTitle}>{t("forPros")}</h4>
            <ul className={list}>
              <li>
                <LLink href="/pro">{t("becomePro")}</LLink>
              </li>
              <li>
                <LLink href="/pro#earnings">{t("earnings")}</LLink>
              </li>
            </ul>
          </div>
          <div>
            <h4 className={colTitle}>{t("legal")}</h4>
            <ul className={list}>
              <li>
                <LLink href="/legal/terms">{t("terms")}</LLink>
              </li>
              <li>
                <LLink href="/legal/privacy">{t("privacy")}</LLink>
              </li>
            </ul>
          </div>
        </div>
        {market.legalDisclaimer && (
          <div className="border-t border-white/[0.07] pt-6">
            <LegalDisclaimer text={market.legalDisclaimer} className="max-w-3xl" />
          </div>
        )}
        <div className="flex flex-wrap items-center justify-between gap-4 border-t border-white/[0.07] pt-6 text-[13px] text-text-muted">
          <span>{t("rights", { year: new Date().getFullYear() })}</span>
          <div className="flex items-center gap-3">
            <CurrencySwitcher current={market.country} />
            <LanguageSwitcher current={locale} dropUp />
          </div>
        </div>
      </div>
    </footer>
  );
}
