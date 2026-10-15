import { getLocale, getTranslations } from "next-intl/server";
import { Button } from "@/components/ui/Button";
import { SectionHead } from "@/components/ui/SectionHead";
import { Reveal } from "@/components/ui/Reveal";
import { TiltCard } from "@/components/ui/TiltCard";
import { minPriceLabel } from "@/lib/marketPrices";
import { getMoney } from "@/lib/money";

interface PlanTeaserCard {
  trade: string;
  icon: string;
  title: string;
  fromPKR: number;
}

export async function PlansTeaser({ cards }: { cards: PlanTeaserCard[] }) {
  const [t, ts, locale, money] = await Promise.all([getTranslations("plans"), getTranslations("services.trades"), getLocale(), getMoney()]);
  if (cards.length === 0) return null;

  return (
    <section className="container-x max-w-[1000px] py-16 md:py-20">
      <SectionHead eyebrow={t("eyebrow")} title={t("title")} />
      <div className="mb-8 grid grid-cols-1 gap-4 md:grid-cols-3 md:gap-5">
        {cards.map((c, i) => (
          <Reveal key={c.trade} delay={i * 80}>
            <TiltCard className="h-full p-6">
              <div className="mb-2 text-3xl">{c.icon}</div>
              <h3 className="mb-1 text-lg font-bold">{ts.has(c.trade) ? ts(c.trade) : c.title}</h3>
              <p className="mb-4 text-sm text-text-muted">{t(`cadence.${c.trade}`)}</p>
              <div className="text-lg font-bold text-accent">{t("from", { price: minPriceLabel({ trade: c.trade, pkr: c.fromPKR, country: money.country, locale, currency: money.currency, rate: money.rate }) ?? "" })}</div>
            </TiltCard>
          </Reveal>
        ))}
      </div>
      <Button href="/signup?role=customer">
        {t("cta")} <span aria-hidden className="rtl:rotate-180">→</span>
      </Button>
    </section>
  );
}
