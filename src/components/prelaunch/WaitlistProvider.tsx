"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { useTranslations } from "next-intl";
import type { PrelaunchPublic } from "@/lib/prelaunchPublic";
import { WaitlistForm } from "./WaitlistForm";

export type WaitlistRole = "CUSTOMER" | "PROVIDER";

interface Ctx {
  config: PrelaunchPublic;
  /** Country detected from the connection (null when unknown). */
  detectedCountry: string | null;
  open: (opts?: { role?: WaitlistRole }) => void;
}

const WaitlistContext = createContext<Ctx | null>(null);

export function useWaitlist(): Ctx {
  const ctx = useContext(WaitlistContext);
  if (!ctx) throw new Error("useWaitlist must be used inside WaitlistProvider");
  return ctx;
}

/** Remember ?ref=CODE and the UTM tags from the first page the visitor lands on, to attach them to a later signup. */
function CaptureAttribution() {
  useEffect(() => {
    try {
      const q = new URLSearchParams(window.location.search);
      const ref = q.get("ref");
      if (ref && /^(WL|LD)[A-Za-z0-9]{6}$/.test(ref)) localStorage.setItem("sv_wl_ref", ref.toUpperCase());
      const utm: Record<string, string> = {};
      q.forEach((v, k) => {
        if (k.startsWith("utm_")) utm[k] = v.slice(0, 200);
      });
      if (document.referrer && !document.referrer.startsWith(window.location.origin)) utm.referrer = document.referrer.slice(0, 200);
      if (Object.keys(utm).length > 0) localStorage.setItem("sv_wl_utm", JSON.stringify(utm));
    } catch {
      /* private mode: attribution is simply skipped */
    }
  }, []);
  return null;
}

export function WaitlistProvider({
  config,
  detectedCountry,
  children,
}: {
  config: PrelaunchPublic;
  detectedCountry: string | null;
  children: React.ReactNode;
}) {
  const t = useTranslations("prelaunch");
  const [isOpen, setIsOpen] = useState(false);
  const [role, setRole] = useState<WaitlistRole>("CUSTOMER");

  const open = useCallback((opts?: { role?: WaitlistRole }) => {
    if (opts?.role) setRole(opts.role);
    setIsOpen(true);
  }, []);
  const value = useMemo(() => ({ config, detectedCountry, open }), [config, detectedCountry, open]);

  useEffect(() => {
    if (!isOpen) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setIsOpen(false);
    document.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [isOpen]);

  return (
    <WaitlistContext.Provider value={value}>
      <CaptureAttribution />
      {children}
      {isOpen && (
        <div className="fixed inset-0 z-[100] flex items-end justify-center bg-black/70 p-0 sm:items-center sm:p-6" role="dialog" aria-modal="true" aria-label={t("form_title")} onMouseDown={(e) => e.target === e.currentTarget && setIsOpen(false)}>
          <div className="relative max-h-[94vh] w-full overflow-y-auto rounded-t-[24px] border border-white/10 bg-bg-elevated p-5 shadow-2xl sm:max-w-[560px] sm:rounded-[24px] sm:p-7">
            <button
              type="button"
              onClick={() => setIsOpen(false)}
              aria-label={t("banner_dismiss")}
              className="absolute end-4 top-4 flex h-9 w-9 items-center justify-center rounded-full text-text-muted transition-colors hover:bg-white/[0.07] hover:text-text"
            >
              ✕
            </button>
            <WaitlistForm initialRole={role} />
          </div>
        </div>
      )}
    </WaitlistContext.Provider>
  );
}
