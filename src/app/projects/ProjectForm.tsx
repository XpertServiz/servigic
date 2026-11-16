"use client";

import { useEffect, useState } from "react";
import Script from "next/script";
import { BUDGET_BANDS, PROJECT_TRADES, PROJECT_TYPES, PROPERTY_STAGES, START_WINDOWS } from "@/lib/bigProjectsOptions";

const inputCls = "w-full rounded-xl border border-border-subtle bg-bg-elevated-2 px-4 py-3 text-sm text-text outline-none transition-colors focus:border-accent";
const TS_KEY = process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY || "";
const UNIT_SQFT = { sqft: 1, marla: 272.25, kanal: 5445 } as const;

type Form = {
  trades: string[]; projectType: string; city: string; area: string; name: string; phone: string; email: string;
  propertyStage: string; size: string; unit: keyof typeof UNIT_SQFT; floors: string; budgetBand: string; startWindow: string; notes: string;
  preferredContact: string; bestTime: string; consent: boolean; website: string;
};
const EMPTY: Form = { trades: [], projectType: "", city: "Karachi", area: "", name: "", phone: "", email: "", propertyStage: "", size: "", unit: "sqft", floors: "", budgetBand: "", startWindow: "", notes: "", preferredContact: "both", bestTime: "anytime", consent: false, website: "" };

function Select({ value, onChange, options, placeholder }: { value: string; onChange: (v: string) => void; options: readonly (readonly [string, string])[]; placeholder: string }) {
  return (
    <select value={value} onChange={(e) => onChange(e.target.value)} className={inputCls}>
      <option value="">{placeholder}</option>
      {options.map(([k, l]) => <option key={k} value={k}>{l}</option>)}
    </select>
  );
}

export function ProjectForm({ whatsapp }: { whatsapp: string | null }) {
  const [step, setStep] = useState(1);
  const [f, setF] = useState<Form>(EMPTY);
  const [error, setError] = useState("");
  const [pending, setPending] = useState(false);
  const [done, setDone] = useState<string | null>(null);
  const [cf, setCf] = useState("");
  useEffect(() => {
    (window as unknown as { svTsOk?: (t: string) => void }).svTsOk = (t) => setCf(t);
  }, []);

  const set = <K extends keyof Form>(k: K, v: Form[K]) => setF((p) => ({ ...p, [k]: v }));
  const toggleTrade = (k: string) => set("trades", f.trades.includes(k) ? f.trades.filter((t) => t !== k) : [...f.trades, k]);

  function next() {
    setError("");
    if (f.trades.length === 0) return setError("Pick at least one trade.");
    if (f.name.trim().length < 2) return setError("Please enter your name.");
    if (f.phone.trim().length < 5) return setError("Please enter your mobile number.");
    if (!/^\S+@\S+\.\S+$/.test(f.email.trim())) return setError("Please enter your email so we can send your estimate.");
    if (f.city.trim().length < 2) return setError("Please enter your city.");
    setStep(2);
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    if (!f.consent) return setError("Please tick the box so we may contact you.");
    setPending(true);
    try {
      const size = Number(f.size);
      const res = await fetch("/api/projects/request", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          trades: f.trades, projectType: f.projectType || undefined, city: f.city.trim(), area: f.area.trim() || undefined, name: f.name.trim(), phone: f.phone.trim(), email: f.email.trim(),
          propertyStage: f.propertyStage || undefined, areaSqft: size > 0 ? Math.round(size * UNIT_SQFT[f.unit]) : undefined, floors: Number(f.floors) > 0 ? Number(f.floors) : undefined,
          budgetBand: f.budgetBand || undefined, startWindow: f.startWindow || undefined, notes: f.notes.trim() || undefined,
          preferredContact: f.preferredContact, bestTime: f.bestTime, consent: true, language: document.documentElement.lang || "en", website: f.website, cf: cf || undefined,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(data.error === "captcha" ? "Please complete the check below and try again." : data.error === "rate" ? "Too many requests from this connection. Please try again later or WhatsApp us." : data.field === "phone" ? "That mobile number does not look right." : "Something went wrong. Please check the details and try again.");
        return;
      }
      setDone(data.reference);
    } finally {
      setPending(false);
    }
  }

  if (done) {
    const wa = whatsapp ? `https://wa.me/${whatsapp.replace(/\D/g, "")}?text=${encodeURIComponent(`Hi Servigic, my big project reference is ${done}`)}` : null;
    return (
      <div className="rounded-2xl border border-secondary/30 bg-secondary/10 p-6 text-center" data-testid="project-done">
        <p className="text-lg font-bold text-text">Thank you, we received your request.</p>
        <p className="mt-2">Your reference: <b className="text-accent">{done}</b></p>
        <p className="mt-2 text-sm">A Servigic specialist will call you within 2 working hours. We also sent you an email.</p>
        {wa && <a href={wa} target="_blank" rel="noopener noreferrer" className="mt-4 inline-flex rounded-full bg-accent px-6 py-3 text-sm font-semibold text-accent-foreground">WhatsApp us</a>}
      </div>
    );
  }

  return (
    <form onSubmit={submit} className="sv-card flex flex-col gap-5 p-5 md:p-7" data-testid="project-form">
      <div className="flex items-center justify-between text-sm text-text-muted"><span>Step {step} of 3</span><span className="h-1.5 w-32 overflow-hidden rounded-full bg-bg-elevated-2"><span className="block h-full bg-accent" style={{ width: `${(step / 3) * 100}%` }} /></span></div>
      {TS_KEY && (<><Script src="https://challenges.cloudflare.com/turnstile/v0/api.js" strategy="lazyOnload" /><div className="cf-turnstile" data-sitekey={TS_KEY} data-callback="svTsOk" /></>)}
      <input type="text" name="website" tabIndex={-1} autoComplete="off" value={f.website} onChange={(e) => set("website", e.target.value)} className="hidden" aria-hidden />

      {step === 1 && (
        <>
          <div>
            <p className="mb-2 text-sm font-semibold text-text">What do you need done?</p>
            <div className="flex flex-wrap gap-2">
              {PROJECT_TRADES.map(([k, l]) => (
                <button type="button" key={k} onClick={() => toggleTrade(k)} aria-pressed={f.trades.includes(k)} className={`min-h-[44px] rounded-full border px-4 text-sm transition-colors ${f.trades.includes(k) ? "border-accent bg-accent/15 text-accent" : "border-border-subtle text-text-muted hover:border-accent"}`}>{l}</button>
              ))}
            </div>
          </div>
          <Select value={f.projectType} onChange={(v) => set("projectType", v)} options={PROJECT_TYPES} placeholder="Type of project" />
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <input placeholder="City" value={f.city} onChange={(e) => set("city", e.target.value)} className={inputCls} />
            <input placeholder="Area / society" value={f.area} onChange={(e) => set("area", e.target.value)} className={inputCls} />
            <input placeholder="Your name" value={f.name} onChange={(e) => set("name", e.target.value)} className={inputCls} />
            <input placeholder="Mobile number (03xx...)" inputMode="tel" dir="ltr" value={f.phone} onChange={(e) => set("phone", e.target.value)} className={inputCls} />
          </div>
          <input type="email" placeholder="Email (we send your estimate here)" dir="ltr" value={f.email} onChange={(e) => set("email", e.target.value)} className={inputCls} />
        </>
      )}

      {step === 2 && (
        <>
          <p className="text-sm text-text-muted">Optional, but it helps us prepare. You can also tell us on the call.</p>
          <Select value={f.propertyStage} onChange={(v) => set("propertyStage", v)} options={PROPERTY_STAGES} placeholder="Stage of the property" />
          <div className="grid grid-cols-3 gap-3">
            <input type="number" min={0} placeholder="Size" value={f.size} onChange={(e) => set("size", e.target.value)} className={`${inputCls} col-span-1`} />
            <select value={f.unit} onChange={(e) => set("unit", e.target.value as Form["unit"])} className={`${inputCls} col-span-1`}><option value="sqft">sq ft</option><option value="marla">marla</option><option value="kanal">kanal</option></select>
            <input type="number" min={1} placeholder="Floors" value={f.floors} onChange={(e) => set("floors", e.target.value)} className={`${inputCls} col-span-1`} />
          </div>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <Select value={f.budgetBand} onChange={(v) => set("budgetBand", v)} options={BUDGET_BANDS} placeholder="Budget (PKR)" />
            <Select value={f.startWindow} onChange={(v) => set("startWindow", v)} options={START_WINDOWS} placeholder="When to start" />
          </div>
          <textarea rows={4} maxLength={1000} placeholder="Anything else we should know" value={f.notes} onChange={(e) => set("notes", e.target.value)} className={inputCls} />
        </>
      )}

      {step === 3 && (
        <>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <select value={f.preferredContact} onChange={(e) => set("preferredContact", e.target.value)} className={inputCls}><option value="both">Call or WhatsApp</option><option value="call">Call</option><option value="whatsapp">WhatsApp</option></select>
            <select value={f.bestTime} onChange={(e) => set("bestTime", e.target.value)} className={inputCls}><option value="anytime">Any time</option><option value="morning">Morning</option><option value="afternoon">Afternoon</option><option value="evening">Evening</option></select>
          </div>
          <label className="flex items-start gap-3 text-sm text-text-muted">
            <input type="checkbox" checked={f.consent} onChange={(e) => set("consent", e.target.checked)} className="mt-1 h-5 w-5 accent-[#F5A623]" />
            <span>I agree that Servigic may contact me about this request. See the <a href="/legal/privacy" className="text-accent underline">Privacy Policy</a>.</span>
          </label>
        </>
      )}

      {error && <p role="alert" className="text-sm text-danger">{error}</p>}
      <div className="flex gap-3">
        {step > 1 && <button type="button" onClick={() => setStep(step - 1)} className="min-h-[44px] rounded-full border border-border-subtle px-6 text-sm font-semibold text-text">Back</button>}
        {step === 1 && <button type="button" onClick={next} className="min-h-[44px] flex-1 rounded-full bg-gradient-to-b from-[#ffc24a] to-accent px-6 font-semibold text-accent-foreground">Continue</button>}
        {step === 2 && <button type="button" onClick={() => setStep(3)} className="min-h-[44px] flex-1 rounded-full bg-gradient-to-b from-[#ffc24a] to-accent px-6 font-semibold text-accent-foreground">Continue</button>}
        {step === 3 && <button type="submit" disabled={pending} className="min-h-[44px] flex-1 rounded-full bg-gradient-to-b from-[#ffc24a] to-accent px-6 font-semibold text-accent-foreground disabled:opacity-60">{pending ? "Sending..." : "Get free estimate"}</button>}
      </div>
    </form>
  );
}
