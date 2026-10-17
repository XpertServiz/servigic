import { getLocale, getTranslations } from "next-intl/server";
import { prisma } from "@/lib/prisma";
import { Button } from "@/components/ui/Button";
import { Reveal } from "@/components/ui/Reveal";
import { EarningsCalculator } from "@/components/landing/EarningsCalculator";
import { getDemoMoney } from "@/lib/money";
import { AppDownloadButton } from "@/components/prelaunch/AppDownloadButton";

// Real count only — hidden below threshold rather than showing a fabricated
// number (same rule ProofTicker follows: Master Brief §7A/§12, no fake stats).
const MIN_PROVIDERS_TO_SHOW = 5;

export async function ForPros() {
  const [t, locale, activeProviders] = await Promise.all([
    getTranslations("forPros"),
    getLocale(),
    prisma.providerProfile.count({ where: { verificationLevel: { gte: 1 } } }),
  ]);
  const showCount = activeProviders >= MIN_PROVIDERS_TO_SHOW;
  const demo = await getDemoMoney(locale);
  const perks = t.raw("perks") as string[];

  return (
    <section id="pros" className="container-x py-16 md:py-24">
      <div className="grid grid-cols-1 gap-5 md:grid-cols-[1fr_1.25fr]">
        <Reveal>
          <div className="sv-card flex h-full flex-col justify-center p-7 md:p-9">
            <h3 className="mb-3 text-2xl font-bold">{t("customerTitle")}</h3>
            <p className="mb-6 text-[15px] text-text-muted">{t("customerDesc")}</p>
            <div>
              <Button href="/signup?role=customer">{t("customerCta")} <span aria-hidden className="rtl:rotate-180">→</span></Button>
            </div>
          </div>
        </Reveal>
        <Reveal delay={100}>
          <div className="relative overflow-hidden rounded-[20px] border border-accent/40 bg-gradient-to-br from-accent/[0.10] to-bg-elevated p-7 md:p-9">
            <div className="sv-glow pointer-events-none absolute -top-20 end-[-10%] h-64 w-64 opacity-50" aria-hidden />
            <h3 className="relative mb-5 text-2xl font-bold md:text-3xl">{t("proTitle")}</h3>

            <div className="relative mb-6 rounded-2xl border border-secondary/30 bg-secondary/10 p-5">
              <div className="text-4xl font-extrabold text-secondary">{t("zero", { zero: demo.zero })}</div>
              <div className="mt-1 text-sm text-text-muted">{showCount ? t("zeroActive", { count: activeProviders }) : t("zeroGeneric")}</div>
            </div>

            <ul className="relative mb-6 flex flex-col gap-3">
              {perks.map((p) => (
                <li key={p} className="flex items-start gap-2.5 text-sm text-text-muted">
                  <b className="flex-none text-secondary">✓</b>
                  {p}
                </li>
              ))}
            </ul>
            <div className="relative">
              <EarningsCalculator />
              <Button href="/pro" className="w-full">
                {t("cta")} <span aria-hidden className="rtl:rotate-180">→</span>
              </Button>
              <div className="mt-3 flex justify-center">
                <AppDownloadButton app="pro" variant="ghost" size="md" />
              </div>
            </div>
          </div>
        </Reveal>
      </div>
    </section>
  );
}
