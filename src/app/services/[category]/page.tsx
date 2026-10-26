import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getLocale, getTranslations } from "next-intl/server";
import { prisma } from "@/lib/prisma";
import { Navbar } from "@/components/landing/Navbar";
import { Footer } from "@/components/landing/Footer";
import { Eyebrow } from "@/components/landing/Eyebrow";
import { LLink } from "@/components/i18n/LLink";
import { Reveal } from "@/components/ui/Reveal";
import { Button } from "@/components/ui/Button";
import { JsonLd } from "@/components/seo/JsonLd";
import { TRADE_ICONS } from "@/lib/catalog";
import { getCitySlugs } from "@/lib/liveCities";
import { absoluteUrl, breadcrumbJsonLd, pageMetadata, SITE_NAME } from "@/lib/seo";
import { localizePath, type Locale } from "@/i18n/locales";

export const dynamic = "force-dynamic";

// /services/plumber: the service on its own, with every city it is offered in. Google and visitors reach this URL through
// breadcrumbs and by trimming the address; it used to be a 404. Also the page that can rank for "plumber services" in general.
async function getCategory(slug: string) {
  return prisma.serviceCategory.findUnique({ where: { slug }, select: { trade: true, name: true, slug: true } }).catch(() => null);
}

export async function generateMetadata({ params }: { params: Promise<{ category: string }> }): Promise<Metadata> {
  const { category } = await params;
  const [c, t, ts, tc, locale, cities] = await Promise.all([getCategory(category), getTranslations("categoryPage"), getTranslations("services.trades"), getTranslations("cities"), getLocale(), getCitySlugs()]);
  if (!c) return { robots: { index: false, follow: false } };
  const service = ts.has(c.trade) ? ts(c.trade) : c.name;
  const names = cities.slice(0, 6).map((x) => (tc.has(x.name) ? tc(x.name) : x.name)).join(", ");
  return pageMetadata({
    path: `/services/${category}`,
    locale: locale as Locale,
    title: t("metaTitle", { service }),
    description: t("metaDescription", { service, cities: names }),
    keywords: [`${service}`, `${service} near me`, `hire ${service}`, `${service} services`, "Servigic", ...cities.slice(0, 6).map((x) => `${service} ${x.name}`)],
  });
}

export default async function ServiceCategoryPage({ params }: { params: Promise<{ category: string }> }) {
  const { category } = await params;
  const [c, t, ts, tc, tn, locale, cities] = await Promise.all([getCategory(category), getTranslations("categoryPage"), getTranslations("services.trades"), getTranslations("cities"), getTranslations("nav"), getLocale(), getCitySlugs()]);
  if (!c) notFound();
  const service = ts.has(c.trade) ? ts(c.trade) : c.name;

  const list = {
    "@context": "https://schema.org",
    "@type": "ItemList",
    name: t("h1", { service }),
    itemListElement: cities.map((city, i) => ({ "@type": "ListItem", position: i + 1, name: `${service} - ${tc.has(city.name) ? tc(city.name) : city.name}`, url: absoluteUrl(localizePath(`/services/${c.slug}/${city.slug}`, locale)) })),
  };

  return (
    <>
      <JsonLd
        data={[
          list,
          breadcrumbJsonLd(
            [
              { name: SITE_NAME, path: "/" },
              { name: tn("services"), path: "/services" },
              { name: service, path: `/services/${c.slug}` },
            ],
            locale as Locale,
          ),
        ]}
      />
      <Navbar />
      <main id="main" className="flex-1">
        <section className="relative isolate overflow-hidden py-14 md:py-20">
          <div className="sv-grid-bg absolute inset-0 -z-10" aria-hidden />
          <div className="container-x max-w-[900px] text-center">
            <Eyebrow>
              {TRADE_ICONS[c.trade] ?? "🛠️"} {service}
            </Eyebrow>
            <h1 className="mx-auto max-w-3xl text-[clamp(30px,5.4vw,56px)] font-extrabold leading-[1.08] tracking-[-0.018em]">{t("h1", { service })}</h1>
            <p className="mx-auto mt-5 max-w-2xl text-base text-text-muted md:text-lg">{t("sub", { service })}</p>
          </div>
        </section>

        <section className="container-x max-w-[960px] pb-16 md:pb-24">
          <h2 className="mb-5 text-center text-xl font-bold md:text-2xl">{t("pickCity")}</h2>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4">
            {cities.map((city, i) => (
              <Reveal key={city.slug} delay={(i % 4) * 60}>
                <LLink href={`/services/${c.slug}/${city.slug}`} className="sv-card block p-4 text-center font-semibold transition-colors hover:border-accent hover:text-accent">
                  {service}
                  <span className="mt-1 block text-sm font-normal text-text-muted">{tc.has(city.name) ? tc(city.name) : city.name}</span>
                </LLink>
              </Reveal>
            ))}
          </div>
          <div className="mt-10 text-center">
            <Button href="/signup?role=customer">
              {t("cta")} <span aria-hidden className="rtl:rotate-180">→</span>
            </Button>
          </div>
        </section>
      </main>
      <Footer />
    </>
  );
}
