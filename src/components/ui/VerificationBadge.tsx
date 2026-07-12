import { getVerificationTier } from "@/lib/verificationTiers";

export function VerificationBadge({ level, size = "sm" }: { level: number; size?: "sm" | "md" }) {
  const tier = getVerificationTier(level);
  return (
    <span
      title={tier.requirement}
      className={`inline-flex items-center gap-1 rounded-full border font-semibold ${tier.borderClasses} ${tier.bgClasses} ${tier.textClasses} ${
        size === "sm" ? "px-2 py-0.5 text-[11px]" : "px-3 py-1 text-xs"
      }`}
    >
      <span aria-hidden="true">{tier.icon}</span>
      {tier.label}
    </span>
  );
}
