import { getTranslations } from "next-intl/server";
import { Button } from "@/components/ui/Button";
import { Eyebrow } from "@/components/landing/Eyebrow";
import { HeroVisual } from "@/components/hero/HeroVisual";
import { prisma } from "@/lib/prisma";

function initialsOf(name: string): string {
  const parts = name.trim().split(/\s+/);
  if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase();
  return name.trim().slice(0, 2).toUpperCase();
}

async function getTrustInitials(): Promise<string[]> {
  try {
    const customers = await prisma.user.findMany({ where: { role: "CUSTOMER" }, orderBy: { createdAt: "desc" }, take: 4, select: { name: true } });
    return customers.map((c) => initialsOf(c.name));
  } catch {
    return [];
  }
}

export async function Hero({ isLive = true }: { isLive?: boolean } = {}) {
  const [t, initials] = await Promise.all([getTranslations("hero"), getTrustInitials()]);
  const trustInitials = initials.length > 0 ? initials : ["AK", "SR", "MF", "HZ"];

  return (
    <section className="relative isolate overflow-hidden pb-16 pt-12 md:pb-24 md:pt-20">
      {/* atmosphere */}
      <div className="sv-grid-bg absolute inset-0 -z-10" aria-hidden />
      <div className="absolute -top-40 start-[-10%] -z-10 h-[620px] w-[620px] rounded-full bg-[radial-gradient(closest-side,rgba(255,176,32,0.20),transparent)]" aria-hidden />
      <div className="absolute -top-20 end-[-12%] -z-10 h-[520px] w-[520px] rounded-full bg-[radial-gradient(closest-side,rgba(34,197,94,0.10),transparent)]" aria-hidden />

      <div className="container-x grid grid-cols-1 items-center gap-10 lg:grid-cols-[1.05fr_0.95fr] lg:gap-6">
        <div>
          <Eyebrow>
            <span className="sv-live-dot" aria-hidden /> {t("eyebrow")}
          </Eyebrow>
          <h1 className="text-[clamp(44px,8.2vw,96px)] font-extrabold leading-[1.02] tracking-tight">
            {t("line1")}
            <br />
            {t("line2")}
            <br />
            <span className="text-gradient">{t("line3")}</span>
          </h1>
          <p className="my-6 max-w-[520px] text-base text-text-muted md:text-lg">{t("sub")}</p>
          <div className="mb-8 flex flex-wrap gap-3">
            {isLive ? (
              <Button href="/signup?role=customer" size="lg">
                {t("ctaPrimary")}
              </Button>
            ) : (
              <Button href="#waitlist" size="lg">
                {t("joinWaitlist")}
              </Button>
            )}
            <Button href="/how-it-works" variant="ghost" size="lg">
              <span aria-hidden>▶</span> {t("ctaSecondary")}
            </Button>
          </div>

          <div className="flex items-center gap-3">
            <div className="flex">
              {trustInitials.map((label, i) => (
                <span
                  key={`${label}-${i}`}
                  className="-ms-2.5 flex h-[36px] w-[36px] items-center justify-center rounded-full border-2 border-bg bg-gradient-to-br from-[#3a3f4d] to-[#1f2330] text-[12px] font-bold first:ms-0"
                  style={{ zIndex: 10 - i }}
                >
                  {label}
                </span>
              ))}
            </div>
            <small className="max-w-[280px] text-[13px] leading-snug text-text-muted">{t("trusted")}</small>
          </div>
        </div>

        <HeroVisual
          chips={[
            { label: t("chipPro"), tone: "accent" },
            { label: t("chipBid"), tone: "green" },
            { label: t("chipVerified"), tone: "red" },
          ]}
        />
      </div>
    </section>
  );
}
