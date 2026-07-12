import { getTranslations } from "next-intl/server";
import { Button } from "@/components/ui/Button";
import { Eyebrow } from "@/components/landing/Eyebrow";
import { DispatchSimulation } from "@/components/landing/DispatchSimulation";

// Real trades, free-license stock (Pexels), resized+compressed via Pexels'
// own query params so 9 photos don't bloat the hero's load weight. Behind a
// low-opacity grid + a dark gradient so headline contrast never suffers.
const HERO_BG_PHOTOS = [
  "https://images.pexels.com/photos/32588548/pexels-photo-32588548.jpeg?auto=compress&cs=tinysrgb&w=600", // plumber
  "https://images.pexels.com/photos/9875418/pexels-photo-9875418.jpeg?auto=compress&cs=tinysrgb&w=600", // solar installer
  "https://images.pexels.com/photos/3807517/pexels-photo-3807517.jpeg?auto=compress&cs=tinysrgb&w=600", // mechanic
  "https://images.pexels.com/photos/5463581/pexels-photo-5463581.jpeg?auto=compress&cs=tinysrgb&w=600", // AC technician
  "https://images.pexels.com/photos/17514177/pexels-photo-17514177/free-photo-of-woman-holding-smart-phone-applications.jpeg?auto=compress&cs=tinysrgb&w=600", // customer booking on app
  "https://images.pexels.com/photos/33531830/pexels-photo-33531830.jpeg?auto=compress&cs=tinysrgb&w=600", // electrician
  "https://images.pexels.com/photos/8817851/pexels-photo-8817851.jpeg?auto=compress&cs=tinysrgb&w=600", // carpenter
  "https://images.pexels.com/photos/7218579/pexels-photo-7218579.jpeg?auto=compress&cs=tinysrgb&w=600", // painter
  "https://images.pexels.com/photos/6196566/pexels-photo-6196566.jpeg?auto=compress&cs=tinysrgb&w=600", // cleaner
];

export async function Hero({ isLive = true }: { isLive?: boolean } = {}) {
  const t = await getTranslations("hero");

  return (
    <section className="relative overflow-hidden bg-[radial-gradient(ellipse_80%_60%_at_30%_0%,rgba(255,176,32,.16),transparent_60%),radial-gradient(ellipse_60%_50%_at_90%_20%,rgba(34,197,94,.08),transparent_60%)] pb-20 pt-24">
      <div className="absolute inset-0 grid grid-cols-3 gap-px opacity-[0.16] sm:grid-cols-5" aria-hidden="true">
        {HERO_BG_PHOTOS.map((src) => (
          <div key={src} className="bg-cover bg-center grayscale-[10%]" style={{ backgroundImage: `url(${src})` }} />
        ))}
      </div>
      <div className="absolute inset-0 bg-gradient-to-b from-bg/90 via-bg/85 to-bg" aria-hidden="true" />
      <div className="relative mx-auto grid max-w-[1200px] grid-cols-1 items-center gap-14 px-6 lg:grid-cols-[1.1fr_1fr]">
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
