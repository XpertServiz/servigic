import type { Metadata } from "next";
import { getLocale, getTranslations } from "next-intl/server";
import { prisma } from "@/lib/prisma";
import { Navbar } from "@/components/landing/Navbar";
import { Footer } from "@/components/landing/Footer";
import { Button } from "@/components/ui/Button";
import { Eyebrow } from "@/components/landing/Eyebrow";
import { Reveal } from "@/components/ui/Reveal";
import { TiltCard } from "@/components/ui/TiltCard";
import { EarningsCalculator } from "@/components/landing/EarningsCalculator";
import { VerificationBadge } from "@/components/ui/VerificationBadge";
import { AutoVideo } from "@/components/media/AutoVideo";
import { JsonLd } from "@/components/seo/JsonLd";
import { LogoMark3D } from "@/components/brand/LogoMark3D";
import { getDemoVideos } from "@/lib/siteVideos";
import { breadcrumbJsonLd, pageMetadata } from "@/lib/seo";
import { fmtNumber } from "@/lib/format";
import type { Locale } from "@/i18n/locales";

// Real count only — hidden below threshold rather than showing a fabricated
// number (same rule ProofTicker follows: Master Brief §7A/§12, no fake stats).
const MIN_PROVIDERS_TO_SHOW = 5;
const COMMISSIONS = ["12%", "11%", "10%"];

export async function generateMetadata(): Promise<Metadata> {
  const [t, locale] = await Promise.all([getTranslations("meta.pro"), getLocale()]);
  return pageMetadata({ path: "/pro", locale: locale as Locale, title: t("title"), description: t("description"), keywords: t("keywords").split(",").map((k) => k.trim()) });
}

export default async function ProLandingPage() {
  const [t, tn, locale, videos, activeProviders] = await Promise.all([
    getTranslations("pro"),
    getTranslations("nav"),
    getLocale(),
    getDemoVideos(),
    prisma.providerProfile.count({ where: { verificationLevel: { gte: 1 } } }).catch(() => 0),
  ]);
  const showCount = activeProviders >= MIN_PROVIDERS_TO_SHOW;
  const rows = t.raw("rows") as { feature: string; servigic: string; other: string }[];
  const ladder = t.raw("ladder") as { level: string; title: string; desc: string }[];

  return (
    <>
      <JsonLd data={breadcrumbJsonLd([{ name: "Servigic", path: "/" }, { name: tn("forPros"), path: "/pro" }], locale as Locale)} />
      <Navbar />
      <main id="main" className="flex-1">
        <section className="relative isolate overflow-hidden py-14 text-center md:py-24">
          <div className="sv-grid-bg absolute inset-0 -z-10" aria-hidden />
          <div className="absolute -top-32 start-1/2 -z-10 h-[520px] w-[720px] -translate-x-1/2 rounded-full bg-[radial-gradient(closest-side,rgba(255,176,32,0.18),transparent)] rtl:translate-x-1/2" aria-hidden />
          <div className="container-x">
            <div className="mb-3 flex justify-center">
              <LogoMark3D size={84} />
            </div>
            <Eyebrow>{t("eyebrow")}</Eyebrow>
            <h1 className="mx-auto max-w-3xl text-[clamp(38px,7vw,72px)] font-extrabold leading-[1.04] tracking-tight">
              {t("title1")} <span className="text-gradient">{t("title2")}</span>
            </h1>
            <p className="mx-auto mt-5 max-w-xl text-base text-text-muted md:text-lg">{t("sub")}</p>
            <Button href="/signup?role=provider" size="lg" className="mt-8">
              {t("cta")} <span aria-hidden className="rtl:rotate-180">→</span>
            </Button>
          </div>
        </section>

        {/* Autoplay demo: set the YouTube link in Admin → Settings (pro demo video) */}
        <section className="container-x max-w-[960px] pb-8" aria-label={t("videoTitle")}>
          <Reveal>
            <h2 className="mb-5 text-center text-xl font-bold md:text-2xl">{t("videoTitle")}</h2>
            <AutoVideo videoId={videos.pro} title={t("videoTitle")} />
          </Reveal>
        </section>

        <section className="container-x max-w-[760px] pt-12 text-center">
          <Reveal>
            <div className="rounded-3xl border border-secondary/30 bg-secondary/10 p-8">
              <div className="text-5xl font-extrabold text-secondary">PKR 0</div>
              <p className="mt-2 text-sm text-text-muted">{showCount ? t("zeroActive", { count: fmtNumber(activeProviders, locale) }) : t("zeroGeneric")}</p>
            </div>
          </Reveal>

          <Reveal className="sv-card mt-8 overflow-x-auto p-2 text-start md:p-4">
            <table className="w-full min-w-[480px] border-collapse text-sm">
              <thead>
                <tr>
                  <th className="border-b border-border-subtle p-3 text-start" />
                  <th className="border-b border-border-subtle p-3 text-start font-mono text-xs font-semibold uppercase tracking-wide text-accent">{t("compareServigic")}</th>
                  <th className="border-b border-border-subtle p-3 text-start font-mono text-xs font-semibold uppercase tracking-wide text-text-muted">{t("compareOther")}</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((r) => (
                  <tr key={r.feature}>
                    <td className="border-b border-border-subtle p-3 font-semibold text-text-muted">{r.feature}</td>
                    <td className="border-b border-border-subtle p-3 font-bold text-secondary">{r.servigic}</td>
                    <td className="border-b border-border-subtle p-3 text-danger">{r.other}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </Reveal>
        </section>

        <section className="container-x max-w-[1000px] py-16 md:py-20" id="earnings">
          <Reveal>
            <h2 className="mb-8 text-center text-3xl font-bold tracking-tight">{t("earningsTitle")}</h2>
            <div className="sv-card mx-auto max-w-md p-6 md:p-8">
              <EarningsCalculator />
            </div>
          </Reveal>
        </section>

        <section className="container-x max-w-[960px] py-8 md:py-12">
          <h2 className="mb-8 text-center text-3xl font-bold tracking-tight">{t("ladderTitle")}</h2>
          <div className="grid grid-cols-1 gap-4 md:grid-cols-3 md:gap-5">
            {ladder.map((l, i) => (
              <Reveal key={l.level} delay={i * 90}>
                <TiltCard className="h-full p-6">
                  <div className="mb-2 flex items-center justify-between">
                    <span className="font-mono text-xs font-bold uppercase tracking-wide text-accent">{l.level}</span>
                    <VerificationBadge level={i + 1} />
                  </div>
                  <h3 className="mb-2 text-lg font-bold">{l.title}</h3>
                  <p className="mb-4 text-sm text-text-muted">{l.desc}</p>
                  <div className="text-2xl font-extrabold text-secondary">{COMMISSIONS[i]}</div>
                  <div className="text-xs text-text-muted">{t("commission")}</div>
                </TiltCard>
              </Reveal>
            ))}
          </div>
        </section>

        <section className="container-x py-16 text-center md:py-24">
          <Reveal>
            <h2 className="mb-6 text-3xl font-bold tracking-tight">{t("readyTitle")}</h2>
            <Button href="/signup?role=provider" size="lg">
              {t("cta")} <span aria-hidden className="rtl:rotate-180">→</span>
            </Button>
          </Reveal>
        </section>
      </main>
      <Footer />
    </>
  );
}
