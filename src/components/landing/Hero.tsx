import { getTranslations } from "next-intl/server";
import { Button } from "@/components/ui/Button";
import { Eyebrow } from "@/components/landing/Eyebrow";
import { DispatchSimulation } from "@/components/landing/DispatchSimulation";

export async function Hero({ isLive = true }: { isLive?: boolean } = {}) {
  const t = await getTranslations("hero");

  return (
    <section className="relative bg-[radial-gradient(ellipse_80%_60%_at_30%_0%,rgba(255,176,32,.16),transparent_60%),radial-gradient(ellipse_60%_50%_at_90%_20%,rgba(34,197,94,.08),transparent_60%)] pb-20 pt-24">
      <div className="mx-auto grid max-w-[1200px] grid-cols-1 items-center gap-14 px-6 lg:grid-cols-[1.1fr_1fr]">
        <div>
          <Eyebrow>⚡ {t("eyebrow")}</Eyebrow>
          <h1 className="font-display text-[clamp(48px,9vw,108px)] font-bold uppercase leading-[1.02] tracking-tight">
            {t("line1")}
            <br />
            {t("line2")}
            <br />
            <span className="text-accent">{t("line3")}</span>
          </h1>
          <p className="my-6 max-w-[520px] text-lg text-text-muted">{t("sub")}</p>
          <div className="mb-9 flex flex-wrap gap-4">
            {isLive ? (
              <Button href="/signup?role=customer" size="lg">
                {t("ctaPrimary")}
              </Button>
            ) : (
              <Button href="#waitlist" size="lg">
                Join the Waitlist →
              </Button>
            )}
            <Button href="#demo" variant="ghost" size="lg">
              ▶ {t("ctaSecondary")}
            </Button>
          </div>
          <div className="flex items-center gap-3">
            <div className="flex">
              {["AK", "SR", "MF", "HZ"].map((initials, i) => (
                <span
                  key={initials}
                  className="-ms-2.5 flex h-[34px] w-[34px] items-center justify-center rounded-full border-2 border-bg bg-gradient-to-br from-[#333] to-[#555] text-[12px] font-bold first:ms-0"
                  style={{ zIndex: 10 - i }}
                >
                  {initials}
                </span>
              ))}
            </div>
            <small className="text-text-muted">Trusted by homeowners across Karachi, Lahore &amp; Islamabad</small>
          </div>
        </div>

        <DispatchSimulation />
      </div>
    </section>
  );
}
