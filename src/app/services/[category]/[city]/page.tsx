import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getLocale, getTranslations } from "next-intl/server";
import { prisma } from "@/lib/prisma";
import { Navbar } from "@/components/landing/Navbar";
import { Footer } from "@/components/landing/Footer";
import { Button } from "@/components/ui/Button";
import { Eyebrow } from "@/components/landing/Eyebrow";
import { LLink } from "@/components/i18n/LLink";
import { Reveal } from "@/components/ui/Reveal";
import { AutoVideo } from "@/components/media/AutoVideo";
import { JsonLd } from "@/components/seo/JsonLd";
import { detectMarket } from "@/lib/geoDetect";
import { formatApproxFromPKR } from "@/lib/currency";
import { getPriceBenchmark } from "@/lib/priceBenchmark";
import { getDemoVideos } from "@/lib/siteVideos";
import { CITY_SLUGS, TRADE_ICONS, slugToCity } from "@/lib/catalog";
import { breadcrumbJsonLd, faqJsonLd, pageMetadata, serviceJsonLd, SITE_NAME } from "@/lib/seo";
import type { Locale } from "@/i18n/locales";

export const dynamic = "force-dynamic";

async function getData(categorySlug: string, citySlug: string) {
  const cityLabel = slugToCity(citySlug);
  if (!cityLabel) return null;
  const category = await prisma.serviceCategory.findUnique({
    where: { slug: categorySlug },
    include: { subServices: true },
  });
  if (!category) return null;

  const [benchmark] = await Promise.all([getPriceBenchmark(category.id, cityLabel)]);
  return { category, cityLabel, benchmark };
}

export async function generateMetadata({ params }: { params: Promise<{ category: string; city: string }> }): Promise<Metadata> {
  const { category, city } = await params;
  const [data, t, ts, tc, locale] = await Promise.all([
    getData(category, city),
    getTranslations("meta.city"),
    getTranslations("services.trades"),
    getTranslations("cities"),
    getLocale(),
  ]);
  if (!data) return { robots: { index: false, follow: false } };
  const service = ts.has(data.category.trade) ? ts(data.category.trade) : data.category.name;
  const cityName = tc.has(data.cityLabel) ? tc(data.cityLabel) : data.cityLabel;
  return pageMetadata({
    path: `/services/${category}/${city}`,
    locale: locale as Locale,
    title: t("title", { service, city: cityName }),
    description: t("description", { service, city: cityName }),
    keywords: [`${service} ${cityName}`, `${service}`, `hire ${service} ${data.cityLabel}`, `${data.cityLabel} home services`, "Servigic"],
  });
}

export default async function ServiceCityPage({ params }: { params: Promise<{ category: string; city: string }> }) {
  const { category, city } = await params;
  const [data, market, t, ts, tc, tn, locale, videos] = await Promise.all([
    getData(category, city),
    detectMarket(),
    getTranslations("cityPage"),
    getTranslations("services.trades"),
    getTranslations("cities"),
    getTranslations("nav"),
    getLocale(),
    getDemoVideos(),
  ]);
  if (!data) notFound();

  const service = ts.has(data.category.trade) ? ts(data.category.trade) : data.category.name;
  const cityName = tc.has(data.cityLabel) ? tc(data.cityLabel) : data.cityLabel;

  const [avgWinningBidLabel, minPriceLabel] = await Promise.all([
    data.benchmark ? formatApproxFromPKR(data.benchmark.avgWinningPKR, market.currency) : Promise.resolve(null),
    data.category.minPricePKR ? formatApproxFromPKR(data.category.minPricePKR, market.currency) : Promise.resolve(null),
  ]);

  const faqs = (t.raw("faq") as { q: string; a: string }[]).map((f) => ({
    q: f.q.replaceAll("{service}", service).replaceAll("{city}", cityName),
    a: f.a.replaceAll("{service}", service).replaceAll("{city}", cityName),
  }));
  const path = `/services/${category}/${city}`;
  const metaT = await getTranslations("meta.city");

  return (
    <>
      <JsonLd
        data={[
          faqJsonLd(faqs),
          serviceJsonLd({ name: `${service} — ${cityName}`, description: metaT("description", { service, city: cityName }), city: data.cityLabel, path, locale: locale as Locale }),
          breadcrumbJsonLd(
            [
              { name: SITE_NAME, path: "/" },
              { name: tn("services"), path: "/services" },
              { name: `${service} — ${cityName}`, path },
            ],
            locale as Locale,
          ),
        ]}
      />
      <Navbar />
      <main id="main" className="flex-1">
        <section className="container-x relative max-w-[960px] py-14 md:py-20">
          <div className="sv-glow pointer-events-none absolute -top-20 start-[-10%] -z-10 h-72 w-72 opacity-40" aria-hidden />
          <Eyebrow>{t("eyebrow", { service, city: cityName })}</Eyebrow>
          <h1 className="mb-4 text-[clamp(30px,5vw,52px)] font-extrabold leading-[1.08] tracking-tight">{t("h1", { service, city: cityName })}</h1>
          <p className="mb-8 max-w-2xl text-base text-text-muted md:text-lg">{t("sub", { service, city: cityName })}</p>

          <div className="mb-8 flex flex-wrap gap-4">
            <div className="sv-card px-5 py-4">
              <div className="text-2xl font-extrabold text-accent" dir="ltr">
                {avgWinningBidLabel ?? <span className="text-xl">{TRADE_ICONS[data.category.trade] ?? "🛠️"} {t("getRealBids")}</span>}
              </div>
              <div className="text-xs text-text-muted">
                {avgWinningBidLabel ? t("avgWinning", { count: data.benchmark!.sampleSize, days: data.benchmark!.windowDays }) : t("priceVaries")}
              </div>
            </div>
            {minPriceLabel && (
              <div className="sv-card px-5 py-4">
                <div className="text-2xl font-extrabold text-accent" dir="ltr">
                  {minPriceLabel}+
                </div>
                <div className="text-xs text-text-muted">{t("startingPrice")}</div>
              </div>
            )}
          </div>

          <Button href="/jobs/new" size="lg" className="mb-14">
            {t("post", { service })} <span aria-hidden className="rtl:rotate-180">→</span>
          </Button>

          {/* Autoplay demo: set the YouTube link in Admin → Settings (customer demo video) */}
          <Reveal className="mb-14">
            <h2 className="mb-4 text-xl font-bold">{t("videoTitle")}</h2>
            <AutoVideo videoId={videos.customer} title={t("videoTitle")} />
          </Reveal>

          {data.category.subServices.length > 0 && (
            <div className="mb-14">
              <h2 className="mb-4 text-xl font-bold">{t("subServices")}</h2>
              <div className="flex flex-wrap gap-2">
                {data.category.subServices.map((s) => (
                  <span key={s.id} className="rounded-full border border-border-subtle px-3.5 py-1.5 text-sm text-text-muted">
                    {s.name}
                  </span>
                ))}
              </div>
            </div>
          )}

          <div className="mb-14">
            <h2 className="mb-4 text-xl font-bold">{t("faqTitle")}</h2>
            <div className="flex flex-col gap-3">
              {faqs.map((f) => (
                <div key={f.q} className="sv-card p-5">
                  <h3 className="mb-1 font-semibold">{f.q}</h3>
                  <p className="text-sm text-text-muted">{f.a}</p>
                </div>
              ))}
            </div>
          </div>

          <div>
            <h2 className="mb-4 text-xl font-bold">{t("otherCities", { service })}</h2>
            <div className="flex flex-wrap gap-2">
              {CITY_SLUGS.filter((c) => c.slug !== city.toLowerCase()).map((c) => (
                <LLink key={c.slug} href={`/services/${category}/${c.slug}`} className="rounded-full border border-border-subtle px-4 py-2 text-sm text-text-muted transition-colors hover:border-accent hover:text-accent">
                  {service} — {tc(c.name)}
                </LLink>
              ))}
            </div>
          </div>
        </section>
      </main>
      <Footer />
    </>
  );
}
