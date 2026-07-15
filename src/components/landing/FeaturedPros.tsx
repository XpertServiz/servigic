import { prisma } from "@/lib/prisma";
import { Eyebrow } from "@/components/landing/Eyebrow";
import { ProviderAvatar } from "@/components/ui/ProviderAvatar";
import { VerificationBadge } from "@/components/ui/VerificationBadge";
import { TRADE_LABELS } from "@/lib/trades";

// Provider Photo Standardization Addendum v3 §2.3, extended for photo consent —
// a pro's selfie only ever renders publicly if they explicitly opted in
// (photoConsentPublic, captured with a timestamp at the KYC/profile step).
// Non-consenting pros still appear in the gallery (real verified pros, real
// ratings) but fall back to a trade-icon avatar instead of their photo.
// Below MIN_FEATURED_PROS the whole gallery switches to generic trade cards
// instead of showing a sparse-looking section — same threshold-gate pattern
// as ProofTicker/Results (real data only).
const MIN_FEATURED_PROS = 5;
const GALLERY_SIZE = 8;
const ACHIEVER_MIN_RATING = 4.5;
const ACHIEVER_MIN_JOBS = 10;

export async function FeaturedPros() {
  const featuredProviders = await prisma.providerProfile.findMany({
    where: { verificationLevel: { gte: 1 } },
    orderBy: [{ ratingAvg: "desc" }, { jobsCompleted: "desc" }],
    take: GALLERY_SIZE,
  });

  if (featuredProviders.length >= MIN_FEATURED_PROS) {
    return (
      <section className="mx-auto max-w-[1200px] px-6 py-20">
        <Eyebrow>Featured Verified Pros</Eyebrow>
        <h2 className="mb-8 font-display text-[clamp(28px,4.5vw,44px)] font-bold uppercase leading-tight">
          Real pros. Verified and rated.
        </h2>
        <div className="grid grid-cols-2 gap-5 sm:grid-cols-4">
          {featuredProviders.map((p) => {
            const isAchiever = p.ratingAvg >= ACHIEVER_MIN_RATING && p.jobsCompleted >= ACHIEVER_MIN_JOBS;
            const showPhoto = p.photoConsentPublic && p.photoQualityOk;
            return (
              <div key={p.id} className="flex flex-col items-center gap-2 text-center">
                <div className="relative">
                  {isAchiever && (
                    <span
                      className="absolute -inset-1.5 rounded-full"
                      style={{ background: "conic-gradient(from 0deg, #ffb020, #ffe08a, #ffb020)" }}
                      aria-hidden="true"
                    />
                  )}
                  <div className="relative">
                    <ProviderAvatar
                      photoUrl={showPhoto ? p.selfieUrl : null}
                      photoQualityOk={p.photoQualityOk}
                      verificationLevel={p.verificationLevel}
                      fallbackIcon={TRADE_LABELS[p.trades[0]]?.icon ?? "👤"}
                      size="lg"
                    />
                  </div>
                  {isAchiever && (
                    <span
                      className="absolute -bottom-1 left-1/2 -translate-x-1/2 rounded-full bg-[#ffb020] px-2 py-0.5 text-[10px] font-bold text-black shadow"
                      title="Top-rated achiever"
                    >
                      🏆 Achiever
                    </span>
                  )}
                </div>
                <div className="text-sm font-bold">{p.displayName}</div>
                <VerificationBadge level={p.verificationLevel} />
                {p.ratingCount > 0 && <div className="text-xs text-text-muted">{p.ratingAvg.toFixed(1)}★ · {p.jobsCompleted} jobs</div>}
              </div>
            );
          })}
        </div>
      </section>
    );
  }

  const trades = await prisma.serviceCategory.findMany({
    select: { trade: true, name: true, icon: true },
    take: 6,
    orderBy: { name: "asc" },
  });
  if (trades.length === 0) return null;

  return (
    <section className="mx-auto max-w-[1200px] px-6 py-20">
      <Eyebrow>Verified Pros</Eyebrow>
      <h2 className="mb-8 font-display text-[clamp(28px,4.5vw,44px)] font-bold uppercase leading-tight">
        Verified pros across every trade.
      </h2>
      <div className="grid grid-cols-2 gap-5 sm:grid-cols-3 md:grid-cols-6">
        {trades.map((t) => (
          <div key={t.trade} className="flex flex-col items-center gap-2 text-center">
            <ProviderAvatar photoUrl={null} verificationLevel={1} fallbackIcon={t.icon} size="lg" />
            <div className="text-sm font-semibold text-text-muted">{t.name}</div>
          </div>
        ))}
      </div>
    </section>
  );
}
