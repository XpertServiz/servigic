export interface VerificationTier {
  label: string;
  icon: string;
  requirement: string;
  color: string;
  textClasses: string;
  borderClasses: string;
  bgClasses: string;
}

export const VERIFICATION_TIERS: Record<number, VerificationTier> = {
  0: {
    label: "Unverified",
    icon: "○",
    requirement: "Not yet verified — cannot bid on jobs",
    color: "var(--border-subtle)",
    textClasses: "text-text-muted",
    borderClasses: "border-border-subtle",
    bgClasses: "bg-bg-elevated-2",
  },
  1: {
    label: "Verified",
    icon: "✓",
    requirement: "CNIC + selfie verified by Servigic",
    color: "#3b82f6",
    textClasses: "text-[#3b82f6]",
    borderClasses: "border-[#3b82f6]/40",
    bgClasses: "bg-[#3b82f6]/10",
  },
  2: {
    label: "Verified Pro",
    icon: "🛡",
    requirement: "Police certificate verified — lower 11% commission",
    color: "#eab308",
    textClasses: "text-[#eab308]",
    borderClasses: "border-[#eab308]/40",
    bgClasses: "bg-[#eab308]/10",
  },
  3: {
    label: "Gold Ustad",
    icon: "★",
    requirement: "10+ completed jobs at 4.5★ or higher — lowest 10% commission",
    color: "#eab308",
    textClasses: "text-[#eab308] font-bold",
    borderClasses: "border-[#eab308]/60",
    bgClasses: "bg-[#eab308]/15",
  },
};

export function getVerificationTier(level: number): VerificationTier {
  return VERIFICATION_TIERS[level] ?? VERIFICATION_TIERS[0];
}
