"use client";

import { useTranslations } from "next-intl";
import { useWaitlist, type WaitlistRole } from "./WaitlistProvider";

/** Opens the early-list popup. Until an app is live this is what every "download the app" button becomes. */
export function JoinListButton({ role, variant = "primary", size = "lg", className = "" }: { role?: WaitlistRole; variant?: "primary" | "ghost"; size?: "md" | "lg"; className?: string }) {
  const t = useTranslations("prelaunch");
  const { open } = useWaitlist();
  const base =
    "inline-flex items-center justify-center gap-2 rounded-full font-semibold whitespace-nowrap transition-[transform,box-shadow,border-color,color,background-color] duration-200 hover:-translate-y-0.5 active:translate-y-0 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent";
  const look =
    variant === "primary"
      ? "sv-shine bg-gradient-to-b from-[#ffc24a] to-accent text-accent-foreground shadow-[0_6px_24px_-6px_var(--accent-glow)] hover:shadow-[0_10px_36px_-4px_var(--accent-glow)]"
      : "border border-white/12 bg-white/[0.03] text-text backdrop-blur hover:border-accent/60 hover:bg-accent/[0.07] hover:text-accent";
  const sz = size === "lg" ? "px-8 py-4 text-base" : "px-6 py-3 text-[15px]";
  return (
    <button type="button" onClick={() => open({ role })} className={`${base} ${look} ${sz} ${className}`}>
      {t("submit")}
    </button>
  );
}
