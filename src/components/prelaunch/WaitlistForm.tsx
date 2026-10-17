"use client";

import { useEffect, useMemo, useState } from "react";
import { setStored, useStored } from "./useStored";
import { useLocale, useTranslations } from "next-intl";
import { FORM_COUNTRIES, KARACHI_AREAS, TRADE_LABELS, WAITLIST_TRADES } from "@/lib/prelaunchData";
import { useWaitlist, type WaitlistRole } from "./WaitlistProvider";
import { InstallEarlyBlock } from "./InstallEarlyBlock";

const input =
  "w-full rounded-[12px] border border-border-subtle bg-bg px-4 py-3 text-[15px] text-text outline-none transition-colors placeholder:text-text-muted/60 focus:border-accent";
const label = "mb-1.5 block text-[13px] font-semibold text-text-muted";

interface Saved {
  code: string;
  role: WaitlistRole;
  country: string;
}

function parseSaved(raw: string | null | undefined): Saved | null {
  try {
    return raw ? (JSON.parse(raw) as Saved) : null;
  } catch {
    return null;
  }
}

/** The early-list form (Customer / Pro tabs) and its thank-you screens. Used inside the popup and on /join. */
export function WaitlistForm({ initialRole = "CUSTOMER" }: { initialRole?: WaitlistRole }) {
  const t = useTranslations("prelaunch");
  const locale = useLocale();
  const { config, detectedCountry } = useWaitlist();

  const defaultCountry = detectedCountry && FORM_COUNTRIES.some((c) => c.code === detectedCountry) ? detectedCountry : detectedCountry ? "XX" : "PK";
  const [role, setRole] = useState<WaitlistRole>(initialRole);
  const [country, setCountry] = useState(defaultCountry);
  const [name, setName] = useState("");
  const [whatsapp, setWhatsapp] = useState("");
  const [city, setCity] = useState(defaultCountry === "PK" ? "Karachi" : "");
  const [area, setArea] = useState("");
  const [email, setEmail] = useState("");
  const [trade, setTrade] = useState<string>(WAITLIST_TRADES[0]);
  const [years, setYears] = useState("");
  const [gmail, setGmail] = useState("");
  const [consent, setConsent] = useState(false);
  const [honeypot, setHoneypot] = useState("");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [justDone, setDone] = useState<Saved | null>(null);
  const storedRaw = useStored("sv_wl_joined");
  // Someone who already joined sees their thank-you screen (and referral count) again.
  const done = justDone ?? parseSaved(storedRaw);
  const [referred, setReferred] = useState<number | null>(null);

  const names = useMemo(() => {
    try {
      return new Intl.DisplayNames([locale], { type: "region" });
    } catch {
      return null;
    }
  }, [locale]);
  const countryName = (code: string) => (code === "XX" ? "Other" : (names?.of(code) ?? FORM_COUNTRIES.find((c) => c.code === code)?.name ?? code));

  useEffect(() => {
    if (!done) return;
    fetch(`/api/waitlist/referrals?code=${encodeURIComponent(done.code)}`)
      .then((r) => r.json())
      .then((j: { count?: number }) => setReferred(typeof j.count === "number" ? j.count : 0))
      .catch(() => {});
  }, [done]);

  const isPk = country === "PK";
  const karachi = city.trim().toLowerCase() === "karachi";
  const proGmailRequired = role === "PROVIDER" && isPk;

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (!consent) return setError(t("error_consent"));
    setPending(true);
    try {
      let ref: string | undefined;
      let utm: Record<string, string> | undefined;
      try {
        ref = localStorage.getItem("sv_wl_ref") ?? undefined;
        const rawUtm = localStorage.getItem("sv_wl_utm");
        utm = rawUtm ? JSON.parse(rawUtm) : undefined;
      } catch {
        /* no storage */
      }
      const res = await fetch("/api/waitlist/signup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          role,
          name,
          whatsapp,
          countryCode: country,
          city: city || undefined,
          area: area || undefined,
          email: email || undefined,
          ...(role === "PROVIDER" ? { trade, experienceYears: years === "" ? undefined : Number(years), gmail: gmail || undefined } : {}),
          consent: true,
          language: locale,
          sourcePage: window.location.pathname,
          utm,
          ref,
          website: honeypot,
        }),
      });
      const data = (await res.json().catch(() => ({}))) as { error?: string; referralCode?: string };
      if (!res.ok || !data.referralCode) {
        setError(data.error === "whatsapp" ? t("error_whatsapp") : data.error === "gmail" ? t("error_gmail") : data.error === "consent" ? t("error_consent") : t("error_generic"));
        return;
      }
      const saved: Saved = { code: data.referralCode, role, country };
      setStored("sv_wl_joined", JSON.stringify(saved));
      setDone(saved);
    } catch {
      setError(t("error_generic"));
    } finally {
      setPending(false);
    }
  }

  if (done) return <ThankYou saved={done} referred={referred} />;

  return (
    <form onSubmit={submit} className="flex flex-col gap-4" noValidate={false}>
      <h2 className="pe-10 text-2xl font-bold leading-tight">{t("form_title")}</h2>

      <div role="tablist" className="grid grid-cols-2 gap-1 rounded-full border border-white/10 bg-bg p-1">
        {(["CUSTOMER", "PROVIDER"] as const).map((r) => (
          <button
            key={r}
            type="button"
            role="tab"
            aria-selected={role === r}
            onClick={() => setRole(r)}
            className={`rounded-full px-3 py-2.5 text-[13px] font-semibold leading-tight transition-colors ${role === r ? "bg-accent text-accent-foreground" : "text-text-muted hover:text-text"}`}
          >
            {r === "CUSTOMER" ? t("tab_customer") : t("tab_pro")}
          </button>
        ))}
      </div>

      {role === "PROVIDER" ? (
        <>
          {isPk && config.foundingOpen && <p className="rounded-[12px] border border-accent/30 bg-accent/10 p-3 text-[13px] leading-relaxed text-accent">{t("offer_pro")}</p>}
          <p className="text-[13px] text-text-muted">{t("pro_commission_compare")}</p>
        </>
      ) : (
        <p className="text-[13px] text-text-muted">{t("offer_customer")}</p>
      )}

      {/* Honeypot: invisible to people, bots fill it in */}
      <div aria-hidden className="absolute -start-[9999px] h-0 w-0 overflow-hidden">
        <label>
          Website
          <input tabIndex={-1} autoComplete="off" value={honeypot} onChange={(e) => setHoneypot(e.target.value)} />
        </label>
      </div>

      <div>
        <label className={label} htmlFor="wl-name">{t("field_name")}</label>
        <input id="wl-name" required minLength={2} maxLength={80} autoComplete="name" value={name} onChange={(e) => setName(e.target.value)} className={input} />
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label className={label} htmlFor="wl-country">{t("field_country")}</label>
          <select
            id="wl-country"
            value={country}
            onChange={(e) => {
              setCountry(e.target.value);
              if (e.target.value === "PK" && !city) setCity("Karachi");
            }}
            className={input}
          >
            {FORM_COUNTRIES.map((c) => (
              <option key={c.code} value={c.code}>
                {countryName(c.code)}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className={label} htmlFor="wl-whatsapp">{t("field_whatsapp")}</label>
          <input
            id="wl-whatsapp"
            required
            type="tel"
            inputMode="tel"
            dir="ltr"
            autoComplete="tel"
            placeholder={isPk ? "03XX XXXXXXX" : "+"}
            value={whatsapp}
            onChange={(e) => setWhatsapp(e.target.value)}
            className={input}
          />
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label className={label} htmlFor="wl-city">{t("field_city")}</label>
          <input id="wl-city" required maxLength={60} value={city} onChange={(e) => { setCity(e.target.value); setArea(""); }} className={input} />
        </div>
        <div>
          <label className={label} htmlFor="wl-area">{t("field_area")}</label>
          {isPk && karachi ? (
            <select id="wl-area" required value={area} onChange={(e) => setArea(e.target.value)} className={input}>
              <option value="">{t("select")}</option>
              {KARACHI_AREAS.map((a) => (
                <option key={a} value={a}>{a}</option>
              ))}
            </select>
          ) : (
            <input id="wl-area" maxLength={80} value={area} onChange={(e) => setArea(e.target.value)} className={input} />
          )}
        </div>
      </div>

      <div>
        <label className={label} htmlFor="wl-email">{t("field_email")}</label>
        <input id="wl-email" type="email" dir="ltr" autoComplete="email" maxLength={120} value={email} onChange={(e) => setEmail(e.target.value)} className={input} />
      </div>

      {role === "PROVIDER" && (
        <>
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className={label} htmlFor="wl-trade">{t("field_trade")}</label>
              <select id="wl-trade" value={trade} onChange={(e) => setTrade(e.target.value)} className={input}>
                {WAITLIST_TRADES.map((k) => (
                  <option key={k} value={k}>{TRADE_LABELS[k]}</option>
                ))}
              </select>
            </div>
            <div>
              <label className={label} htmlFor="wl-years">{t("field_experience")}</label>
              <input id="wl-years" type="number" inputMode="numeric" min={0} max={70} value={years} onChange={(e) => setYears(e.target.value)} className={input} />
            </div>
          </div>
          <div>
            <label className={label} htmlFor="wl-gmail">{t("field_gmail")}</label>
            <input id="wl-gmail" type="email" dir="ltr" required={proGmailRequired} placeholder="name@gmail.com" maxLength={120} value={gmail} onChange={(e) => setGmail(e.target.value)} className={input} />
          </div>
        </>
      )}

      <label className="flex items-start gap-3 text-[13px] leading-relaxed text-text-muted">
        <input type="checkbox" required checked={consent} onChange={(e) => setConsent(e.target.checked)} className="mt-1 h-4 w-4 flex-none accent-[var(--accent)]" />
        <span>{t("consent")}</span>
      </label>

      {error && <p role="alert" className="rounded-[10px] border border-danger/40 bg-danger/10 px-3 py-2 text-[13px] text-danger">{error}</p>}

      <button
        type="submit"
        disabled={pending}
        className="sv-shine rounded-full bg-gradient-to-b from-[#ffc24a] to-accent px-8 py-3.5 text-base font-semibold text-accent-foreground shadow-[0_6px_24px_-6px_var(--accent-glow)] transition-transform hover:-translate-y-0.5 disabled:opacity-60"
      >
        {t("submit")}
      </button>
    </form>
  );
}

function ThankYou({ saved, referred }: { saved: Saved; referred: number | null }) {
  const t = useTranslations("prelaunch");
  const locale = useLocale();
  const { config } = useWaitlist();
  const isPk = saved.country === "PK";
  const names = useMemo(() => {
    try {
      return new Intl.DisplayNames([locale], { type: "region" });
    } catch {
      return null;
    }
  }, [locale]);
  const countryLabel = saved.country === "XX" ? "" : (names?.of(saved.country) ?? saved.country);
  const [copied, setCopied] = useState(false);

  const shareUrl = typeof window === "undefined" ? "" : `${window.location.origin}/join?ref=${saved.code}`;
  const shareText = t("share_message", { url: shareUrl });
  const whatsappHref = `https://wa.me/?text=${encodeURIComponent(shareText)}`;

  return (
    <div className="flex flex-col gap-4">
      <h2 className="pe-10 text-2xl font-bold leading-tight">{t("thanks_title")}</h2>

      {!isPk ? (
        <p className="text-[15px] text-text-muted">{t("thanks_other_country", { country: countryLabel })}</p>
      ) : saved.role === "PROVIDER" ? (
        <>
          <p className="text-[15px] text-text-muted">{t("thanks_pro")}</p>
          <InstallEarlyBlock config={config} />
        </>
      ) : (
        <>
          <p className="text-[15px] text-text-muted">{t("thanks_customer")}</p>
          {config.customerPreregUrl && (
            <div className="rounded-[14px] border border-white/10 bg-bg p-4">
              <a href={config.customerPreregUrl} target="_blank" rel="noopener noreferrer" className="inline-flex rounded-full bg-accent px-5 py-2.5 text-sm font-semibold text-accent-foreground">
                {t("customer_prereg")}
              </a>
              <p className="mt-2 text-[12.5px] text-text-muted">{t("customer_prereg_note")}</p>
            </div>
          )}
        </>
      )}

      <div className="rounded-[14px] border border-white/10 bg-bg p-4">
        <div className="mb-2 text-[13px] font-semibold text-text-muted">{t("share")}</div>
        <div className="flex flex-wrap items-center gap-2">
          <a href={whatsappHref} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-2 rounded-full bg-[#25D366] px-5 py-2.5 text-sm font-semibold text-[#06170d]">
            WhatsApp
          </a>
          <button
            type="button"
            onClick={() => {
              navigator.clipboard?.writeText(shareUrl).then(() => setCopied(true)).catch(() => {});
            }}
            dir="ltr"
            className="rounded-full border border-white/15 px-4 py-2.5 font-mono text-[12.5px] text-text-muted hover:border-accent/60 hover:text-text"
          >
            {copied ? "✓ " : ""}
            {saved.code}
          </button>
        </div>
        {referred !== null && referred > 0 && <p className="mt-3 text-sm font-semibold text-secondary">{t("referral_count", { n: referred })}</p>}
      </div>
    </div>
  );
}
