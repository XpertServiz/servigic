import Image from "next/image";
import { LLink } from "@/components/i18n/LLink";

/** Shared frame for login / signup / verify: brand header over a soft glow. */
export function AuthShell({ children, width = 420, center = false }: { children: React.ReactNode; width?: number; center?: boolean }) {
  return (
    <main id="main" className="relative isolate flex flex-1 items-center justify-center overflow-hidden px-5 py-14 md:py-20">
      <div className="sv-grid-bg absolute inset-0 -z-10" aria-hidden />
      <div className="absolute -top-24 start-1/2 -z-10 h-[460px] w-[460px] -translate-x-1/2 rounded-full bg-[radial-gradient(closest-side,rgba(255,176,32,0.16),transparent)] rtl:translate-x-1/2" aria-hidden />
      <div className={`sv-card w-full p-6 sm:p-8 ${center ? "text-center" : ""}`} style={{ maxWidth: width }}>
        <LLink href="/" className={`mb-7 inline-flex items-center gap-2.5 text-xl font-bold tracking-[-0.018em] ${center ? "" : "flex"}`}>
          <Image src="/icons/icon-192.png" alt="" width={36} height={36} className="rounded-[10px]" />
          Servigic
        </LLink>
        {children}
      </div>
    </main>
  );
}

export const authInput =
  "w-full rounded-xl border border-border-subtle bg-bg-elevated-2 px-4 py-3 text-text outline-none transition-colors focus:border-accent";
export const authLabel = "mb-1.5 block text-sm font-semibold text-text-muted";
export const authButton =
  "sv-shine mt-2 rounded-full bg-gradient-to-b from-[#ffc24a] to-accent px-6 py-3.5 font-semibold text-accent-foreground transition-opacity disabled:opacity-60";
