import { getTranslations } from "next-intl/server";
import { prisma } from "@/lib/prisma";
import { LLink } from "@/components/i18n/LLink";
import { SectionHead } from "@/components/ui/SectionHead";
import { Reveal } from "@/components/ui/Reveal";
import { detectMarket } from "@/lib/geoDetect";
import { formatApproxFromPKR } from "@/lib/currency";
import { SERVICE_CATALOG, TRADE_ICONS } from "@/lib/catalog";

async function getCategories() {
  try {
    const categories = await prisma.serviceCategory.findMany({ orderBy: { name: "asc" } });
    if (categories.length > 0) return categories.map((c) => ({ trade: c.trade as string, name: c.name, slug: c.slug, minPricePKR: c.minPricePKR }));
  } catch {
    // fall through to the static catalog
  }
  return SERVICE_CATALOG.map((c) => ({ trade: c.trade as string, name: c.trade, slug: c.slug, minPricePKR: c.minPricePKR as number | null }));
}

export async function ServicesGrid({ showAll = false }: { showAll?: boolean } = {}) {
  const [t, ts, categories, market] = await Promise.all([getTranslations("services"), getTranslations("services.trades"), getCategories(), detectMarket()]);
  const shown = showAll ? categories : categories.slice(0, 12);

  const priceLabels = await Promise.all(shown.map((c) => (c.minPricePKR ? formatApproxFromPKR(c.minPricePKR, market.currency) : Promise.resolve(null))));

  return (
    <section id="services" className="container-x py-16 md:py-24">
      <SectionHead eyebrow={t("eyebrow")} title={t("title")} sub={t("sub")} />
      <div className="grid grid-cols-2 gap-3 sm:gap-4 md:grid-cols-4">
        {shown.map((c, i) => (
          <Reveal key={c.trade} delay={(i % 4) * 70}>
            <LLink
              href={`/services/${c.slug}/karachi`}
              className="sv-card group flex h-full flex-col p-4 sm:p-5"
            >
              <div className="mb-3.5 flex h-11 w-11 items-center justify-center rounded-xl bg-accent/10 text-xl transition-transform duration-300 group-hover:scale-110 group-hover:-rotate-6">{TRADE_ICONS[c.trade] ?? "🛠️"}</div>
              <h3 className="text-[15px] font-bold">{ts.has(c.trade) ? ts(c.trade) : c.name}</h3>
              <small className="mt-1 text-xs text-text-muted">{priceLabels[i] ? t("from", { price: priceLabels[i] as string }) : t("seePricing")}</small>
            </LLink>
          </Reveal>
        ))}
      </div>
    </section>
  );
}
