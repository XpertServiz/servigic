import { getVerificationTier } from "@/lib/verificationTiers";

// Provider Photo Standardization Addendum v3 — one shared component,
// reused everywhere a provider's photo renders. All consistency is CSS-only
// (circular mask, fixed filter stack, badge-tier ring) — zero AI processing,
// zero per-image cost. Photos that never passed the upload-time crop/
// resolution gate (photoQualityOk) always fall back to the trade icon
// instead of rendering raw, so a low-quality photo never reaches the UI.
const SIZE_CLASSES = {
  sm: "h-8 w-8 text-sm",
  md: "h-14 w-14 text-xl",
  lg: "h-24 w-24 text-4xl",
} as const;

export function ProviderAvatar({
  photoUrl,
  photoQualityOk,
  verificationLevel,
  fallbackIcon = "👤",
  size = "md",
  alt = "Provider photo",
}: {
  photoUrl?: string | null;
  photoQualityOk?: boolean;
  verificationLevel: number;
  fallbackIcon?: string;
  size?: "sm" | "md" | "lg";
  alt?: string;
}) {
  const tier = getVerificationTier(verificationLevel);
  const showPhoto = Boolean(photoUrl && photoQualityOk);

  return (
    <div
      className={`relative flex shrink-0 items-center justify-center overflow-hidden rounded-full bg-bg-elevated-2 ${SIZE_CLASSES[size]}`}
      style={{ boxShadow: `0 0 0 2px var(--bg), 0 0 0 4px ${tier.color}` }}
    >
      {showPhoto ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={photoUrl!}
          alt={alt}
          className="h-full w-full object-cover"
          style={{ filter: "contrast(1.05) brightness(1.03) saturate(0.95)", aspectRatio: "1 / 1" }}
        />
      ) : (
        <span aria-hidden="true">{fallbackIcon}</span>
      )}
    </div>
  );
}
