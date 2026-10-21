import type { LeadSource, LeadStatus, Trade } from "@prisma/client";
import type { CountryCode } from "libphonenumber-js/mobile";
import { prisma } from "@/lib/prisma";
import { phoneVariants, toE164 } from "@/lib/phone";
import { loadResolutionContext, resolveLocation } from "@/lib/areas";

// Pro lead CRM core: one lead per phone number, filled from every source (waitlist, app sign-up, sheet import,
// manual entry), with the pipeline status moved forward automatically as the person registers / gets verified.

export const LEAD_STATUSES: LeadStatus[] = ["NEW", "CONTACTED", "INTERESTED", "INVITED", "REGISTERED", "VERIFIED", "ACTIVE", "CALLBACK", "NOT_INTERESTED", "WRONG_NUMBER", "DO_NOT_CONTACT"];
export const LEAD_STATUS_LABEL: Record<string, string> = {
  NEW: "New", CONTACTED: "Contacted", INTERESTED: "Interested", INVITED: "Invited", REGISTERED: "Registered", ONBOARDED: "Registered",
  VERIFIED: "Verified", ACTIVE: "Active", CALLBACK: "Call back", NOT_INTERESTED: "Not interested", WRONG_NUMBER: "Wrong number", DO_NOT_CONTACT: "Do not contact",
};
/** Forward-only pipeline order, used when a status is moved automatically. */
const RANK: Record<string, number> = { NEW: 0, CONTACTED: 1, CALLBACK: 1, INTERESTED: 2, INVITED: 3, REGISTERED: 4, ONBOARDED: 4, VERIFIED: 5, ACTIVE: 6 };

const CODE_ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
export function leadRefCode(): string {
  let s = "LD";
  for (let i = 0; i < 6; i++) s += CODE_ALPHABET[Math.floor(Math.random() * CODE_ALPHABET.length)];
  return s;
}

/** E.164 or null. A Pakistani number may be typed 03xx / 3xx / +92 3xx; other countries need their country code. */
export function normalizePhone(raw: string | null | undefined, country = "PK"): string | null {
  if (!raw) return null;
  return toE164(String(raw), country.toUpperCase() as CountryCode);
}

export interface LeadInput {
  name: string; // personName
  businessName?: string | null;
  phone: string; // already E.164
  altPhone?: string | null;
  whatsappSame?: boolean;
  trades?: Trade[];
  skills?: string | null;
  experienceYears?: number | null;
  addressText?: string | null;
  areaRaw?: string | null;
  cityName?: string | null;
  countryCode?: string;
  lat?: number | null;
  lng?: number | null;
  language?: string | null;
  notes?: string | null;
  source: LeadSource;
  sourceDetail?: string | null;
  consent?: "unknown" | "yes" | "no";
  status?: LeadStatus;
  ownerId?: string | null;
  proUserId?: string | null;
}

type Ctx = Awaited<ReturnType<typeof loadResolutionContext>>;

export async function logLeadActivity(leadId: string, a: { adminId?: string | null; adminName?: string | null; kind: string; outcome?: string | null; note?: string | null }) {
  await prisma.leadActivity.create({ data: { leadId, adminId: a.adminId ?? null, adminName: a.adminName ?? null, kind: a.kind, outcome: a.outcome ?? null, note: a.note ?? null } });
}

/**
 * Creates the lead, or (same phone already known) fills the blanks of the existing one, keeps its first source and
 * adds the new one to `sources`. Never overwrites existing values, resets a status or clears do-not-contact.
 */
export async function upsertLead(input: LeadInput, ctx?: Ctx): Promise<{ action: "created" | "updated"; id: string; areaMatched: boolean }> {
  const c = ctx ?? (await loadResolutionContext());
  const loc = resolveLocation({ text: input.areaRaw ?? input.addressText, lat: input.lat, lng: input.lng, cityName: input.cityName }, c.areas, c.markets);
  const matchedArea = loc.areaId ? c.areas.find((a) => a.id === loc.areaId) : null;
  const trades = input.trades ?? [];
  const sourceTag = input.sourceDetail ? `${input.source}:${input.sourceDetail}` : input.source;

  const variants = phoneVariants(input.phone);
  const existing = await prisma.lead.findFirst({ where: { phone: { in: variants } } });

  if (existing) {
    const mergedTrades = Array.from(new Set([...(existing.trades ?? []), ...trades]));
    await prisma.lead.update({
      where: { id: existing.id },
      data: {
        personName: existing.personName || input.name || undefined,
        businessName: existing.businessName || input.businessName || input.name || existing.businessName,
        altPhone: existing.altPhone ?? input.altPhone ?? undefined,
        trades: mergedTrades,
        skills: existing.skills ?? input.skills ?? undefined,
        experienceYears: existing.experienceYears ?? input.experienceYears ?? undefined,
        addressText: existing.addressText ?? input.addressText ?? undefined,
        areaRaw: existing.areaRaw ?? input.areaRaw ?? undefined,
        areaLabel: existing.areaLabel ?? matchedArea?.name ?? input.areaRaw ?? undefined,
        areaId: existing.areaId ?? loc.areaId ?? undefined,
        cityId: existing.cityId ?? loc.cityId ?? undefined,
        zoneId: existing.zoneId ?? loc.zoneId ?? undefined,
        lat: existing.lat ?? input.lat ?? matchedArea?.lat ?? undefined,
        lng: existing.lng ?? input.lng ?? matchedArea?.lng ?? undefined,
        language: existing.language ?? input.language ?? undefined,
        sources: Array.from(new Set([...(existing.sources ?? []), sourceTag])),
        sourceDetail: existing.sourceDetail ?? input.sourceDetail ?? undefined,
        consent: existing.consent === "unknown" && input.consent && input.consent !== "unknown" ? input.consent : undefined,
        consentAt: existing.consent === "unknown" && input.consent === "yes" ? new Date() : undefined,
        proUserId: existing.proUserId ?? input.proUserId ?? undefined,
        refCode: existing.refCode ?? leadRefCode(),
      },
    });
    return { action: "updated", id: existing.id, areaMatched: !!loc.areaId };
  }

  for (let i = 0; i < 5; i++) {
    try {
      const created = await prisma.lead.create({
        data: {
          businessName: input.businessName || input.name || "Unnamed",
          personName: input.name || null,
          phone: input.phone,
          whatsapp: input.whatsappSame === false ? null : input.phone,
          whatsappSame: input.whatsappSame ?? true,
          altPhone: input.altPhone ?? null,
          trade: trades[0] ?? "HANDYMAN",
          trades,
          skills: input.skills ?? null,
          experienceYears: input.experienceYears ?? null,
          city: input.cityName || (loc.areaId ? c.areas.find((a) => a.id === loc.areaId)?.cityName : null) || "",
          areaLabel: matchedArea?.name ?? input.areaRaw ?? null,
          areaRaw: input.areaRaw ?? null,
          addressText: input.addressText ?? null,
          countryCode: (input.countryCode ?? "PK").toUpperCase(),
          areaId: loc.areaId,
          cityId: loc.cityId,
          zoneId: loc.zoneId,
          lat: input.lat ?? matchedArea?.lat ?? null,
          lng: input.lng ?? matchedArea?.lng ?? null,
          language: input.language ?? null,
          notes: input.notes ?? null,
          source: input.source,
          sourceDetail: input.sourceDetail ?? null,
          sources: [sourceTag],
          consent: input.consent ?? "unknown",
          consentAt: input.consent === "yes" ? new Date() : null,
          status: input.status ?? "NEW",
          ownerId: input.ownerId ?? null,
          proUserId: input.proUserId ?? null,
          refCode: leadRefCode(),
        },
      });
      return { action: "created", id: created.id, areaMatched: !!loc.areaId };
    } catch (e) {
      // refCode clash (rare) -> retry; a parallel insert of the same phone -> treat as updated
      const raced = await prisma.lead.findFirst({ where: { phone: { in: variants } } });
      if (raced) return { action: "updated", id: raced.id, areaMatched: !!loc.areaId };
      if (i === 4) throw e;
    }
  }
  throw new Error("unreachable");
}

/**
 * The person behind this user account is (or becomes) a lead at stage REGISTERED / VERIFIED / ACTIVE. Finds the lead
 * by phone, links it to the account and moves the status forward only; creates a lead if there was none.
 */
export async function syncLeadForUser(userId: string, stage: "REGISTERED" | "VERIFIED" | "ACTIVE", source: LeadSource = "APP"): Promise<void> {
  const user = await prisma.user.findUnique({ where: { id: userId }, select: { id: true, name: true, phone: true, city: true, role: true } });
  if (!user || user.role !== "PROVIDER") return;
  const variants = phoneVariants(user.phone);
  const lead = await prisma.lead.findFirst({ where: { phone: { in: variants } } });
  if (!lead) {
    if (stage !== "REGISTERED") return;
    const e164 = normalizePhone(user.phone) ?? user.phone;
    const profile = await prisma.providerProfile.findUnique({ where: { userId }, select: { trades: true, baseLat: true, baseLng: true } });
    await upsertLead({ name: user.name, phone: e164, cityName: user.city, trades: profile?.trades ?? [], lat: profile?.baseLat ?? null, lng: profile?.baseLng ?? null, source, status: "REGISTERED", proUserId: userId });
    return;
  }
  const higher = (RANK[stage] ?? 0) > (RANK[lead.status] ?? -1) || ["NOT_INTERESTED", "WRONG_NUMBER", "DO_NOT_CONTACT"].includes(lead.status);
  await prisma.lead.update({
    where: { id: lead.id },
    data: { proUserId: userId, ...(higher && lead.status !== "DO_NOT_CONTACT" ? { status: stage } : {}) },
  });
  if (higher) await logLeadActivity(lead.id, { kind: "SYSTEM", note: `Status moved to ${stage} automatically (matched by phone)` });
}
