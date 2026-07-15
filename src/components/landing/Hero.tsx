import { getTranslations } from "next-intl/server";
import { Button } from "@/components/ui/Button";
import { Eyebrow } from "@/components/landing/Eyebrow";
import { DispatchSimulation } from "@/components/landing/DispatchSimulation";
import { YouTubeEmbed } from "@/components/landing/YouTubeEmbed";
import { prisma } from "@/lib/prisma";
import { extractYouTubeId } from "@/lib/youtube";

function initialsOf(name: string): string {
  const parts = name.trim().split(/\s+/);
  if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase();
  return name.trim().slice(0, 2).toUpperCase();
}

async function getTrustData() {
  try {
    const [customers, settings] = await Promise.all([
      prisma.user.findMany({ where: { role: "CUSTOMER" }, orderBy: { createdAt: "desc" }, take: 4, select: { name: true } }),
      prisma.siteSettings.findUnique({ where: { id: "singleton" } }),
    ]);
    return {
      initials: customers.map((c) => initialsOf(c.name)),
      customerVideoId: settings?.demoVideoCustomerUrl ? extractYouTubeId(settings.demoVideoCustomerUrl) : null,
      proVideoId: settings?.demoVideoProUrl ? extractYouTubeId(settings.demoVideoProUrl) : null,
    };
  } catch {
    return { initials: [], customerVideoId: null, proVideoId: null };
  }
}

// Real trades, free-license stock (Pexels), resized+compressed via Pexels'
// own query params. Full-bleed crossfade, one photo visible at a time (much
// clearer than a low-opacity grid) — pure CSS animation via staggered
// negative animation-delay, no client JS needed in this server component.
const HERO_BG_PHOTOS = [
  "https://images.pexels.com/photos/32588548/pexels-photo-32588548.jpeg?auto=compress&cs=tinysrgb&w=1200", // plumber
  "https://images.pexels.com/photos/9875418/pexels-photo-9875418.jpeg?auto=compress&cs=tinysrgb&w=1200", // solar installer
  "https://images.pexels.com/photos/3807517/pexels-photo-3807517.jpeg?auto=compress&cs=tinysrgb&w=1200", // mechanic
  "https://images.pexels.com/photos/5463581/pexels-photo-5463581.jpeg?auto=compress&cs=tinysrgb&w=1200", // AC technician
  "https://images.pexels.com/photos/17514177/pexels-photo-17514177/free-photo-of-woman-holding-smart-phone-applications.jpeg?auto=compress&cs=tinysrgb&w=1200", // customer booking on app
  "https://images.pexels.com/photos/33531830/pexels-photo-33531830.jpeg?auto=compress&cs=tinysrgb&w=1200", // electrician
  "https://images.pexels.com/photos/8817851/pexels-photo-8817851.jpeg?auto=compress&cs=tinysrgb&w=1200", // carpenter
  "https://images.pexels.com/photos/7218579/pexels-photo-7218579.jpeg?auto=compress&cs=tinysrgb&w=1200", // painter
  "https://images.pexels.com/photos/6196566/pexels-photo-6196566.jpeg?auto=compress&cs=tinysrgb&w=1200", // cleaner
];
const SLOT_SECONDS = 4;
const CYCLE_SECONDS = HERO_BG_PHOTOS.length * SLOT_SECONDS;

export async function Hero({ isLive = true }: { isLive?: boolean } = {}) {
  const [t, { initials, customerVideoId, proVideoId }] = await Promise.all([getTranslations("hero"), getTrustData()]);
  const hasVideos = Boolean(customerVideoId || proVideoId);
  const trustInitials = initials.length > 0 ? initials : ["AK", "SR", "MF", "HZ"];

  return (
    <section className="relative overflow-hidden bg-[radial-gradient(ellipse_80%_60%_at_30%_0%,rgba(255,176,32,.16),transparent_60%),radial-gradient(ellipse_60%_50%_at_90%_20%,rgba(34,197,94,.08),transparent_60%)] pb-20 pt-24">
      <style>{`
        @keyframes heroBgCycle {
          0% { opacity: 0; }
          2% { opacity: 0.7; }
          ${Math.round((100 * (SLOT_SECONDS - 0.6)) / CYCLE_SECONDS)}% { opacity: 0.7; }
          ${Math.round((100 * SLOT_SECONDS) / CYCLE_SECONDS)}% { opacity: 0; }
          100% { opacity: 0; }
        }
        .hero-bg-photo { animation: heroBgCycle ${CYCLE_SECONDS}s linear infinite; }
        @media (prefers-reduced-motion: reduce) {
          .hero-bg-photo { animation: none; opacity: 0.35; }
          .hero-bg-photo:not(:first-child) { display: none; }
        }
      `}</style>
      <div className="absolute inset-0" aria-hidden="true">
        {HERO_BG_PHOTOS.map((src, i) => (
          <div
            key={src}
            className="hero-bg-photo absolute inset-0 bg-cover bg-center"
            style={{ backgroundImage: `url(${src})`, animationDelay: `-${i * SLOT_SECONDS}s` }}
          />
        ))}
      </div>
      <div className="absolute inset-0 bg-gradient-to-r from-bg from-15% via-bg/85 via-45% to-bg/45" aria-hidden="true" />
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
          <div className="mb-6 flex flex-wrap gap-4">
            {isLive ? (
              <Button href="/signup?role=customer" size="lg">
                {t("ctaPrimary")}
              </Button>
            ) : (
              <Button href="#waitlist" size="lg">
                Join the Waitlist →
              </Button>
            )}
            {!hasVideos && (
              <Button href="#demo" variant="ghost" size="lg">
                ▶ {t("ctaSecondary")}
              </Button>
            )}
          </div>

          <div className="flex flex-wrap items-center gap-6">
            {hasVideos && (
              <div className="flex gap-3">
                {customerVideoId && (
                  <div className="w-[140px] sm:w-[160px]">
                    <YouTubeEmbed videoId={customerVideoId} label="Post a job" />
                  </div>
                )}
                {proVideoId && (
                  <div className="w-[140px] sm:w-[160px]">
                    <YouTubeEmbed videoId={proVideoId} label="Accept a bid" />
                  </div>
                )}
              </div>
            )}
            <div className="flex items-center gap-3">
              <div className="flex">
                {trustInitials.map((label, i) => (
                  <span
                    key={`${label}-${i}`}
                    className="-ms-2.5 flex h-[34px] w-[34px] items-center justify-center rounded-full border-2 border-bg bg-gradient-to-br from-[#333] to-[#555] text-[12px] font-bold first:ms-0"
                    style={{ zIndex: 10 - i }}
                  >
                    {label}
                  </span>
                ))}
              </div>
              <small className="text-text-muted">Trusted by homeowners across Karachi, Lahore &amp; Islamabad</small>
            </div>
          </div>
        </div>

        <DispatchSimulation />
      </div>
    </section>
  );
}
