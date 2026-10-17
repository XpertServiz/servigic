"use client";

import { useEffect, useRef } from "react";
import { setStored, useHiddenUntil, useStored } from "./useStored";
import { usePathname } from "next/navigation";
import { useLocale, useTranslations } from "next-intl";
import { localeMeta, localizePath, splitLocalePath, type Locale } from "@/i18n/locales";
import { useWaitlist } from "./WaitlistProvider";

export interface BarsProps {
  /** "pk" = launching soon in Karachi, "live" = apps are out, "other" = another country. */
  mode: "pk" | "live" | "other";
  city: string;
  countryName: string;
  /** A language to suggest (never applied automatically), already worded in that language. */
  suggestion: { code: Locale; native: string; text: string } | null;
}

// Pages that carry the banner: the public marketing pages, not the panels, sign-in or the admin.
const BANNER_PATHS = ["/", "/pro", "/how-it-works", "/services", "/trust-and-safety", "/business", "/legal", "/join"];
function showsBanner(pathname: string): boolean {
  const { path } = splitLocalePath(pathname);
  if (path === "/") return true;
  if (/^\/pro\/(dashboard|jobs|bookings|earnings|profile)/.test(path)) return false;
  return BANNER_PATHS.some((p) => p !== "/" && (path === p || path.startsWith(`${p}/`)));
}

const DISMISS_KEY = "sv_banner_until";
const LANG_KEY = "sv_lang_choice";
const WEEK = 7 * 24 * 60 * 60 * 1000;

/**
 * The sticky strip at the top of every marketing page: the country-aware pre-launch banner (dismissible for 7 days)
 * and, under it, a polite "View this page in …?" suggestion. Nothing here redirects or changes the page by itself.
 */
export function TopBars({ mode, city, countryName, suggestion }: BarsProps) {
  const t = useTranslations("prelaunch");
  const pathname = usePathname();
  const locale = useLocale();
  const { open, config } = useWaitlist();
  const box = useRef<HTMLDivElement>(null);
  // undefined = still hydrating: show nothing until we know whether the visitor already dismissed / chose.
  const bannerDismissed = useHiddenUntil(DISMISS_KEY);
  const langChoice = useStored(LANG_KEY);
  const hideBanner = bannerDismissed !== false;
  const hideLang = langChoice === undefined || !!langChoice;

  const visible = showsBanner(pathname);
  const bannerOn = visible && !hideBanner;
  const langOn = visible && !hideLang && !!suggestion && suggestion.code !== locale;

  // The navbar sticks just below this strip: publish its height.
  useEffect(() => {
    const el = box.current;
    const set = (h: number) => document.documentElement.style.setProperty("--sv-top-offset", `${h}px`);
    if (!el || (!bannerOn && !langOn)) {
      set(0);
      return;
    }
    const ro = new ResizeObserver(() => set(el.offsetHeight));
    ro.observe(el);
    set(el.offsetHeight);
    return () => ro.disconnect();
  }, [bannerOn, langOn]);

  if (!bannerOn && !langOn) return null;

  const text = mode === "pk" ? t("banner_live_country", { city }) : mode === "live" ? t("banner_live_now", { city }) : t("banner_other_country", { country: countryName });

  async function switchLanguage() {
    if (!suggestion) return;
    setStored(LANG_KEY, "1");
    await fetch("/api/locale", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ locale: suggestion.code }) }).catch(() => {});
    const { path } = splitLocalePath(window.location.pathname);
    window.location.assign(`${localizePath(path, suggestion.code)}${window.location.search}${window.location.hash}`);
  }

  return (
    <div ref={box} className="sticky top-0 z-[60]">
      {bannerOn && (
        <div className="flex items-center gap-3 bg-gradient-to-r from-accent to-[#ffc24a] px-4 py-2 text-accent-foreground">
          <p className="min-w-0 flex-1 text-center text-[13px] font-semibold leading-snug sm:text-sm">{text}</p>
          {mode === "live" ? (
            config.customerStoreUrl && (
              <a href={config.customerStoreUrl} target="_blank" rel="noopener noreferrer" className="flex-none rounded-full bg-bg px-4 py-1.5 text-[13px] font-semibold text-text">
                {t("get_on_play")}
              </a>
            )
          ) : (
            <button type="button" onClick={() => open()} className="flex-none rounded-full bg-bg px-4 py-1.5 text-[13px] font-semibold text-text transition-transform hover:-translate-y-0.5">
              {t("banner_cta")}
            </button>
          )}
          <button
            type="button"
            aria-label={t("banner_dismiss")}
            onClick={() => {
              setStored(DISMISS_KEY, String(Date.now() + WEEK));
            }}
            className="flex h-7 w-7 flex-none items-center justify-center rounded-full text-base leading-none hover:bg-black/10"
          >
            ✕
          </button>
        </div>
      )}
      {langOn && suggestion && (
        <div className="flex items-center justify-center gap-3 border-b border-white/10 bg-bg-elevated px-4 py-2 text-[13px] text-text">
          <button type="button" lang={suggestion.code} dir={localeMeta(suggestion.code).dir} onClick={switchLanguage} className="font-semibold text-accent underline-offset-2 hover:underline">
            {suggestion.text}
          </button>
          <button
            type="button"
            aria-label={t("banner_dismiss")}
            onClick={() => {
              setStored(LANG_KEY, "1");
            }}
            className="flex h-6 w-6 items-center justify-center rounded-full text-text-muted hover:bg-white/[0.07]"
          >
            ✕
          </button>
        </div>
      )}
    </div>
  );
}
