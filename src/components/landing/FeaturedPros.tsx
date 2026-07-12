import { prisma } from "@/lib/prisma";
import { Eyebrow } from "@/components/landing/Eyebrow";
import { ProviderAvatar } from "@/components/ui/ProviderAvatar";
import { VerificationBadge } from "@/components/ui/VerificationBadge";
import { TRADE_LABELS } from "@/lib/trades";

// Provider Photo Standardization Addendum v3 §2.3 — gallery is only ever
// fed by providers whose photo passed the upload-time crop/resolution gate
// (photoQualityOk). Below MIN_COMPLIANT_PHOTOS, the whole gallery switches
// to generic trade-icon cards instead of showing a sparse-looking section —
// same threshold-gate pattern as ProofTicker/ForPros (real data only).
const MIN_COMPLIANT_PHOTOS = 5;
const GALLERY_SIZE = 8;

export async function FeaturedPros() {
  const compliantProviders = await prisma.providerProfile.findMany({
    where: { verificationLevel: { gte: 1 }, photoQualityOk: true, selfieUrl: { not: null } },
    orderBy: [{ ratingAvg: "desc" }, { jobsCompleted: "desc" }],
    take: GALLERY_SIZE,
  });

  if (compliantProviders.length >= MIN_COMPLIANT_PHOTOS) {
    return (
      <section className="mx-auto max-w-[1200px] px-6 py-20">
        <Eyebrow>Featured Verified Pros</Eyebrow>
        <h2 className="mb-8 font-display text-[clamp(28px,4.5vw,44px)] font-bold uppercase leading-tight">
          Real pros. Verified and rated.
        </h2>
        <div className="grid grid-cols-2 gap-5 sm:grid-cols-4">
          {compliantProviders.map((p) => (
            <div key={p.id} className="flex flex-col items-center gap-2 text-center">
              <ProviderAvatar
                photoUrl={p.selfieUrl}
                photoQualityOk={p.photoQualityOk}
                verificationLevel={p.verificationLevel}
                fallbackIcon={TRADE_LABELS[p.trades[0]]?.icon ?? "👤"}
                size="lg"
              />
              <div className="text-sm font-bold">{p.displayName}</div>
              <VerificationBadge level={p.verificationLevel} />
              {p.ratingCount > 0 && <div className="text-xs text-text-muted">{p.ratingAvg.toFixed(1)}★ · {p.jobsCompleted} jobs</div>}
            </div>
          ))}
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
