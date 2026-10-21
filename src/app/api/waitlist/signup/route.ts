import { NextResponse } from "next/server";
import { createHash } from "node:crypto";
import { z } from "zod";
import type { CountryCode } from "libphonenumber-js/mobile";
import { prisma } from "@/lib/prisma";
import { toE164 } from "@/lib/phone";
import { getPrelaunchConfig, randomWaitlistCode, FORM_COUNTRIES, WAITLIST_TRADES, TRADE_LABELS } from "@/lib/prelaunch";
import { isLocale } from "@/i18n/locales";
import { sendEmailChannel } from "@/lib/notify/channels/email";
import { logLeadActivity, upsertLead } from "@/lib/leads";

// Public waitlist signup. Spam protection: a hidden honeypot field and a small in-memory rate limit keyed by a salted
// hash of the connection (the IP itself is never stored anywhere). The visitor's country/region come from the hosting
// edge headers and are saved; the IP is not.
const hits = new Map<string, { n: number; reset: number }>();
const WINDOW_MS = 10 * 60 * 1000;
const MAX_PER_WINDOW = 8;

function limited(req: Request): boolean {
  const ip = (req.headers.get("x-forwarded-for") || "").split(",")[0].trim() || "local";
  const key = createHash("sha256").update(`${ip}|${new Date().toISOString().slice(0, 10)}|${process.env.AUTH_SECRET ?? "servigic"}`).digest("hex");
  const now = Date.now();
  const rec = hits.get(key);
  if (!rec || rec.reset < now) {
    hits.set(key, { n: 1, reset: now + WINDOW_MS });
    if (hits.size > 5000) for (const [k, v] of hits) if (v.reset < now) hits.delete(k);
    return false;
  }
  rec.n += 1;
  return rec.n > MAX_PER_WINDOW;
}

const text = (max: number) => z.string().trim().max(max);
const schema = z.object({
  role: z.enum(["CUSTOMER", "PROVIDER"]),
  name: text(80).min(2),
  whatsapp: text(30).min(5),
  countryCode: z.string().trim().toUpperCase().length(2),
  city: text(60).optional(),
  area: text(80).optional(),
  email: text(120).optional(),
  trade: z.enum(WAITLIST_TRADES).optional(),
  experienceYears: z.number().int().min(0).max(70).optional(),
  gmail: text(120).optional(),
  consent: z.literal(true),
  language: text(8).optional(),
  sourcePage: text(200).optional(),
  utm: z.record(z.string().max(100), z.string().max(200)).optional(),
  ref: text(20).optional(),
  website: z.string().optional(), // honeypot: real people leave it empty
});

export async function POST(req: Request) {
  const body = await req.json().catch(() => null);
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    const field = parsed.error.issues[0]?.path[0];
    return NextResponse.json({ error: field === "consent" ? "consent" : "invalid", field: String(field ?? "") }, { status: 400 });
  }
  const d = parsed.data;

  // Bots fill the honeypot: pretend it worked, store nothing.
  if (d.website && d.website.trim() !== "") return NextResponse.json({ ok: true, referralCode: "WLXXXXXX" });
  if (limited(req)) return NextResponse.json({ error: "rate" }, { status: 429 });

  if (!FORM_COUNTRIES.some((c) => c.code === d.countryCode)) return NextResponse.json({ error: "invalid", field: "countryCode" }, { status: 400 });

  // WhatsApp: read in the chosen country's format (Pakistan 03xx works); "Other" needs a full +country-code number.
  const whatsapp =
    d.countryCode === "XX" ? (/^(\+|00)/.test(d.whatsapp.trim()) ? toE164(d.whatsapp) : null) : toE164(d.whatsapp, d.countryCode as CountryCode);
  if (!whatsapp) return NextResponse.json({ error: "whatsapp", field: "whatsapp" }, { status: 400 });

  const email = d.email && d.email !== "" ? d.email : null;
  if (email && !z.string().email().safeParse(email).success) return NextResponse.json({ error: "invalid", field: "email" }, { status: 400 });
  const gmail = d.gmail && d.gmail !== "" ? d.gmail.toLowerCase() : null;
  if (gmail && !/^[^\s@]+@(gmail|googlemail)\.com$/i.test(gmail)) return NextResponse.json({ error: "gmail", field: "gmail" }, { status: 400 });
  if (d.role === "PROVIDER" && d.countryCode === "PK" && !gmail) return NextResponse.json({ error: "gmail", field: "gmail" }, { status: 400 });

  const h = req.headers;
  const detectedCountry = (h.get("x-vercel-ip-country") || h.get("cf-ipcountry") || "").toUpperCase() || null;
  const detectedRegion = h.get("x-vercel-ip-country-region") || null;
  const language = d.language && isLocale(d.language) ? d.language : "en";
  const isPro = d.role === "PROVIDER";

  // Referral: the code must be a real one, and never your own number's code.
  const refCode = d.ref ? d.ref.toUpperCase() : null;
  const referrer = refCode ? await prisma.waitlistSignup.findUnique({ where: { referralCode: refCode }, select: { whatsapp: true } }) : null;
  // A "LD…" code is a Pro lead's own join link (Pro CRM), not another waitlist member's referral code.
  const leadRef = refCode && refCode.startsWith("LD") ? await prisma.lead.findUnique({ where: { refCode }, select: { id: true, status: true } }) : null;
  const referredByCode = (referrer && referrer.whatsapp !== whatsapp) || leadRef ? refCode : null;

  const fields = {
    role: d.role,
    name: d.name,
    countryCode: d.countryCode,
    detectedCountry,
    detectedRegion,
    city: d.city || null,
    area: d.area || null,
    email,
    trade: isPro ? (d.trade ?? null) : null,
    experienceYears: isPro ? (d.experienceYears ?? null) : null,
    gmail: isPro ? gmail : null,
    language,
    sourcePage: d.sourcePage || null,
    utm: d.utm && Object.keys(d.utm).length > 0 ? d.utm : undefined,
    consentAt: new Date(),
  };

  // The same WhatsApp number joining again updates its row instead of adding a second one.
  const existing = await prisma.waitlistSignup.findUnique({ where: { whatsapp } });
  let referralCode: string;
  if (existing) {
    const updated = await prisma.waitlistSignup.update({
      where: { whatsapp },
      data: { ...fields, referredByCode: existing.referredByCode ?? referredByCode },
    });
    referralCode = updated.referralCode;
  } else {
    let created = null;
    for (let i = 0; i < 5 && !created; i++) {
      try {
        created = await prisma.waitlistSignup.create({ data: { ...fields, whatsapp, referredByCode, referralCode: randomWaitlistCode() } });
      } catch (e) {
        // A code clash (very rare) retries with a new code; a duplicate number that raced in just means "already joined".
        const raced = await prisma.waitlistSignup.findUnique({ where: { whatsapp } });
        if (raced) created = raced;
        else if (i === 4) throw e;
      }
    }
    referralCode = created!.referralCode;
  }

  // Pro CRM: every Pro who joins the early list is a lead too (same phone = same lead; consent is given on the form).
  if (isPro) {
    const trades = d.trade && d.trade !== "OTHER" ? [d.trade as never] : [];
    const r = await upsertLead({
      name: d.name, phone: whatsapp, countryCode: d.countryCode, cityName: d.city ?? null, areaRaw: d.area ?? null, trades,
      skills: d.trade === "OTHER" ? "Other (from the early-list form)" : null, experienceYears: d.experienceYears ?? null, language, source: "WAITLIST", sourceDetail: d.sourcePage ?? null, consent: "yes",
    }).catch((e) => {
      console.error("[leads]", e);
      return null;
    });
    if (r && leadRef) {
      await logLeadActivity(r.id, { kind: "SYSTEM", note: "Joined the early list through his join link" });
      if (["NEW", "CONTACTED", "INVITED"].includes(leadRef.status)) await prisma.lead.update({ where: { id: leadRef.id }, data: { status: "INTERESTED" } }).catch(() => null);
    }
  }

  // A message to the team on every signup (new or updated).
  const cfg = await getPrelaunchConfig();
  if (cfg.notifyEmail) {
    const lines = [
      `${existing ? "Updated" : "New"} ${isPro ? "Pro" : "Customer"} waitlist signup`,
      "",
      `Name: ${d.name}`,
      `WhatsApp: ${whatsapp}`,
      `Country: ${d.countryCode}${detectedCountry && detectedCountry !== d.countryCode ? ` (detected ${detectedCountry})` : ""}`,
      `City / area: ${[d.city, d.area].filter(Boolean).join(" / ") || "-"}`,
      `Email: ${email ?? "-"}`,
      ...(isPro ? [`Trade: ${d.trade ? TRADE_LABELS[d.trade] : "-"}`, `Experience: ${d.experienceYears ?? "-"} years`, `Gmail: ${gmail ?? "-"}`] : []),
      `Language: ${language}`,
      `From page: ${d.sourcePage ?? "-"}`,
      `Referred by: ${existing?.referredByCode ?? referredByCode ?? "-"}`,
    ];
    await sendEmailChannel({
      to: cfg.notifyEmail,
      subject: `Servigic waitlist: ${isPro ? "Pro" : "Customer"} - ${d.name} (${d.countryCode})`,
      body: lines.join("\n"),
    }).catch(() => {});
  }

  return NextResponse.json({ ok: true, referralCode });
}
