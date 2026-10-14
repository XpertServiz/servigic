import type { Metadata } from "next";
import { getLocale, getTranslations } from "next-intl/server";
import { prisma } from "@/lib/prisma";
import { Navbar } from "@/components/landing/Navbar";
import { Footer } from "@/components/landing/Footer";
import { Eyebrow } from "@/components/landing/Eyebrow";
import { LLink } from "@/components/i18n/LLink";
import { Reveal } from "@/components/ui/Reveal";
import { Button } from "@/components/ui/Button";
import { AutoVideo } from "@/components/media/AutoVideo";
import { JsonLd } from "@/components/seo/JsonLd";
import { getDemoVideos } from "@/lib/siteVideos";
import { CITY_SLUGS, SERVICE_CATALOG, TRADE_ICONS } from "@/lib/catalog";
import { breadcrumbJsonLd, pageMetadata, absoluteUrl, SITE_NAME } from "@/lib/seo";
import { localizePath, type Locale } from "@/i18n/locales";
import { fmtPKR } from "@/lib/format";

export const dynamic = "force-dynamic";

export async function generateMetadata(): Promise<Metadata> {
  const [t, locale] = await Promise.all([getTranslations("meta.services"), getLocale()]);
  return pageMetadata({ path: "/services", locale: locale as Locale, title: t("title"), description: t("description"), keywords: t("keywords").split(",").map((k) => k.trim()) });
}

async function getCategories() {
  try {
    const rows = await prisma.serviceCategory.findMany({ orderBy: { name: "asc" }, select: { trade: true, name: true, slug: true, minPricePKR: true } });
    if (rows.length > 0) return rows.map((r) => ({ trade: r.trade as string, name: r.name, slug: r.slug, minPricePKR: r.minPricePKR }));
  } catch {
    // static catalog below
  }
  return SERVICE_CATALOG.map((c) => ({ trade: c.trade as string, name: c.trade, slug: c.slug, minPricePKR: c.minPricePKR as number | null }));
}

export default async function ServicesIndexPage() {
  const [t, ts, tc, tn, locale, videos, categories] = await Promise.all([
    getTranslations("servicesPage"),
    getTranslations("services.trades"),
    getTranslations("cities"),
    getTranslations("nav"),
    getLocale(),
    getDemoVideos(),
    getCategories(),
  ]);
  const why = t.raw("whyItems") as string[];
  const name = (c: { trade: string; name: string }) => (ts.has(c.trade) ? ts(c.trade) : c.name);

  const itemList = {
    "@context": "https://schema.org",
    "@type": "ItemList",
    itemListElement: categories.map((c, i) => ({ "@type": "ListItem", position: i + 1, name: name(c), url: absoluteUrl(localizePath(`/services/${c.slug}/karachi`, locale)) })),
  };

  return (
    <>
      <JsonLd data={[itemList, breadcrumbJsonLd([{ name: SITE_NAME, path: "/" }, { name: tn("services"), path: "/services" }], locale as Locale)]} />
      <Navbar />
      <main id="main" className="flex-1">
        <section className="relative isolate overflow-hidden py-14 md:py-20">
          <div className="sv-grid-bg absolute inset-0 -z-10" aria-hidden />
          <div className="absolute -top-32 start-[-10%] -z-10 h-[520px] w-[520px] rounded-full bg-[radial-gradient(closest-side,rgba(255,176,32,0.16),transparent)]" aria-hidden />
          <div className="container-x max-w-[960px] text-center">
            <Eyebrow>{t("eyebrow")}</Eyebrow>
            <h1 className="mx-auto max-w-3xl text-[clamp(32px,5.8vw,60px)] font-extrabold leading-[1.06] tracking-tight">{t("title")}</h1>
            <p className="mx-auto mt-5 max-w-2xl text-base text-text-muted md:text-lg">{t("sub")}</p>
          </div>
        </section>

        {/* Autoplay demo: set the YouTube link in Admin → Settings (customer demo video) */}
        <section className="container-x max-w-[960px] pb-6" aria-label={t("videoTitle")}>
          <Reveal>
            <h2 className="mb-5 text-center text-xl font-bold md:text-2xl">{t("videoTitle")}</h2>
            <AutoVideo videoId={videos.customer} title={t("videoTitle")} />
          </Reveal>
        </section>

        <section className="container-x py-12 md:py-16">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {categories.map((c, i) => (
              <Reveal key={c.trade} delay={(i % 3) * 70}>
                <div className="sv-card flex h-full flex-col p-6">
                  <div className="mb-4 flex items-center gap-3">
                    <span className="flex h-12 w-12 items-center justify-center rounded-xl bg-accent/10 text-2xl">{TRADE_ICONS[c.trade] ?? "🛠️"}</span>
                    <div>
                      <h2 className="text-lg font-bold">{name(c)}</h2>
                      {c.minPricePKR ? <p className="text-xs text-text-muted">{t("startingFrom", { price: fmtPKR(c.minPricePKR, locale) })}</p> : null}
                    </div>
                  </div>
                  <p className="mb-2 font-mono text-[11px] uppercase tracking-[0.14em] text-text-muted">{t("cities")}</p>
                  <div className="mt-auto flex flex-wrap gap-2">
                    {CITY_SLUGS.map((city) => (
                      <LLink
                        key={city.slug}
                        href={`/services/${c.slug}/${city.slug}`}
                        aria-label={t("view", { service: `${name(c)} — ${tc(city.name)}` })}
                        className="rounded-full border border-border-subtle px-3.5 py-1.5 text-[13px] text-text-muted transition-colors hover:border-accent hover:text-accent"
                      >
                        {tc(city.name)}
                      </LLink>
                    ))}
                  </div>
                </div>
              </Reveal>
            ))}
          </div>
        </section>

        <section className="container-x max-w-[860px] pb-16 md:pb-24">
          <Reveal>
            <div className="sv-card p-7 md:p-9">
              <h2 className="mb-5 text-2xl font-bold">{t("why")}</h2>
              <ul className="mb-7 grid gap-3 sm:grid-cols-2">
                {why.map((w) => (
                  <li key={w} className="flex items-start gap-2.5 text-[15px] text-text-muted">
                    <b className="flex-none text-secondary">✓</b>
                    {w}
                  </li>
                ))}
              </ul>
              <Button href="/signup?role=customer">
                {tn("postJob")} <span aria-hidden className="rtl:rotate-180">→</span>
              </Button>
            </div>
          </Reveal>
        </section>
      </main>
      <Footer />
    </>
  );
}
