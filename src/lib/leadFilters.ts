import type { Prisma, Trade } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { haversineKm } from "@/lib/geo";
import { getMarkets, acceptsJobs, type MarketSnapshot } from "@/lib/marketConfig";
import { loadAreas, matchAreaByText, resolveLocation } from "@/lib/areas";
import { LEAD_STATUS_LABEL } from "@/lib/leads";
import { TRADE_LABELS } from "@/lib/trades";

// Shared filtering for the Pro Leads, Pros and Early-list pages and their exports. One filter object comes from the
// query string, so a filtered view, its map and its CSV/XLSX export always agree.

export interface Filter {
  country: string[];
  city: string[];
  areaText: string; // "dha, clifton": typed names/aliases, resolved against the area master list
  areaIds: string[];
  zoneIds: string[];
  zoneScope: "" | "inside" | "outside"; // inside / outside live zones
  near: string; // "zone:<id>" | "area:<id>" | "pin:<lat>,<lng>"
  km: number | null;
  trades: string[];
  q: string;
  createdFrom: string;
  createdTo: string;
  // leads
  status: string[];
  source: string[];
  owner: string;
  registered: "" | "yes" | "no";
  consent: string;
  contactedFrom: string;
  contactedTo: string;
  followUp: "" | "due" | "today";
  expMin: number | null;
  // pros
  verification: "" | "verified" | "unverified";
  founding: "" | "yes" | "no";
  // early list
  role: "" | "CUSTOMER" | "PROVIDER";
}

type SP = Record<string, string | string[] | undefined>;
const one = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v) ?? "";
// Accepts "a,b" and repeated params (a multi-select sends ?status=A&status=B).
const list = (v: string | string[] | undefined) =>
  (Array.isArray(v) ? v : [v ?? ""]).flatMap((x) => x.split(",")).map((s) => s.trim()).filter(Boolean);

export function parseFilter(sp: SP): Filter {
  const km = Number(one(sp.km));
  const exp = Number(one(sp.expMin));
  return {
    country: list(sp.country).map((c) => c.toUpperCase()),
    city: list(sp.city),
    areaText: one(sp.area),
    areaIds: list(sp.areaId),
    zoneIds: list(sp.zone),
    zoneScope: one(sp.zoneScope) === "inside" ? "inside" : one(sp.zoneScope) === "outside" ? "outside" : "",
    near: one(sp.near) || (one(sp.nearKind) && one(sp.nearVal) ? `${one(sp.nearKind)}:${one(sp.nearVal)}` : ""),
    km: Number.isFinite(km) && km > 0 ? km : null,
    trades: list(sp.trade),
    q: one(sp.q).trim(),
    createdFrom: one(sp.from),
    createdTo: one(sp.to),
    status: list(sp.status),
    source: list(sp.source),
    owner: one(sp.owner),
    registered: one(sp.registered) === "yes" ? "yes" : one(sp.registered) === "no" ? "no" : "",
    consent: one(sp.consent),
    contactedFrom: one(sp.cfrom),
    contactedTo: one(sp.cto),
    followUp: one(sp.followUp) === "due" ? "due" : one(sp.followUp) === "today" ? "today" : "",
    expMin: Number.isFinite(exp) && one(sp.expMin) !== "" ? exp : null,
    verification: one(sp.verification) === "verified" ? "verified" : one(sp.verification) === "unverified" ? "unverified" : "",
    founding: one(sp.founding) === "yes" ? "yes" : one(sp.founding) === "no" ? "no" : "",
    role: one(sp.role) === "CUSTOMER" ? "CUSTOMER" : one(sp.role) === "PROVIDER" ? "PROVIDER" : "",
  };
}

/** The filter as a plain query-string object (only non-empty parts), for links, presets and the export URL. */
export function filterToParams(f: Filter): Record<string, string> {
  const o: Record<string, string> = {};
  const set = (k: string, v: string | number | null | undefined) => {
    if (v !== null && v !== undefined && String(v) !== "") o[k] = String(v);
  };
  set("country", f.country.join(","));
  set("city", f.city.join(","));
  set("area", f.areaText);
  set("areaId", f.areaIds.join(","));
  set("zone", f.zoneIds.join(","));
  set("zoneScope", f.zoneScope);
  set("near", f.near);
  set("km", f.km);
  set("trade", f.trades.join(","));
  set("q", f.q);
  set("from", f.createdFrom);
  set("to", f.createdTo);
  set("status", f.status.join(","));
  set("source", f.source.join(","));
  set("owner", f.owner);
  set("registered", f.registered);
  set("consent", f.consent);
  set("cfrom", f.contactedFrom);
  set("cto", f.contactedTo);
  set("followUp", f.followUp);
  set("expMin", f.expMin);
  set("verification", f.verification);
  set("founding", f.founding);
  set("role", f.role);
  return o;
}

const dayStart = (s: string) => new Date(`${s}T00:00:00.000Z`);
const dayEnd = (s: string) => new Date(`${s}T23:59:59.999Z`);
const validDate = (s: string) => s !== "" && !Number.isNaN(dayStart(s).getTime());
function range(from: string, to: string): { gte?: Date; lte?: Date } | undefined {
  const r: { gte?: Date; lte?: Date } = {};
  if (validDate(from)) r.gte = dayStart(from);
  if (validDate(to)) r.lte = dayEnd(to);
  return Object.keys(r).length ? r : undefined;
}

export interface Resolved {
  areas: Awaited<ReturnType<typeof loadAreas>>;
  markets: MarketSnapshot[];
  areaIds: string[]; // typed area text + chosen ids, resolved
  liveZoneIds: string[];
  near: { lat: number; lng: number; km: number } | null;
}

/** Looks up what the text filters refer to: typed area names -> area ids, "near" -> a point. */
export async function resolveFilter(f: Filter): Promise<Resolved> {
  const [areas, markets] = await Promise.all([loadAreas(), getMarkets({ fresh: true })]);
  const ids = new Set(f.areaIds);
  for (const token of f.areaText.split(",").map((t) => t.trim()).filter(Boolean)) {
    const a = matchAreaByText(token, areas);
    if (a) ids.add(a.id);
  }
  let near: Resolved["near"] = null;
  if (f.near && f.km) {
    const [kind, val] = f.near.split(":");
    if (kind === "pin") {
      const [la, ln] = (val ?? "").split(",").map(Number);
      if (Number.isFinite(la) && Number.isFinite(ln)) near = { lat: la, lng: ln, km: f.km };
    } else if (kind === "area") {
      const a = areas.find((x) => x.id === val);
      if (a?.lat != null && a.lng != null) near = { lat: a.lat, lng: a.lng, km: f.km };
    } else if (kind === "zone") {
      const z = markets.find((m) => m.id === val);
      const pts = z?.polygons.flat() ?? [];
      if (pts.length) near = { lat: pts.reduce((s, p) => s + p[0], 0) / pts.length, lng: pts.reduce((s, p) => s + p[1], 0) / pts.length, km: f.km };
    }
  }
  return { areas, markets, areaIds: [...ids], liveZoneIds: markets.filter((m) => acceptsJobs(m)).map((m) => m.id), near };
}

function withinNear(r: Resolved, lat: number | null, lng: number | null): boolean {
  if (!r.near) return true;
  if (lat == null || lng == null) return false;
  return haversineKm(r.near.lat, r.near.lng, lat, lng) <= r.near.km;
}

// ---------- leads ----------
export async function leadWhere(f: Filter, r: Resolved, me?: string): Promise<Prisma.LeadWhereInput> {
  const and: Prisma.LeadWhereInput[] = [];
  if (f.country.length) and.push({ countryCode: { in: f.country } });
  if (f.city.length) and.push({ OR: f.city.map((c) => ({ city: { equals: c, mode: "insensitive" as const } })) });
  const anyArea = f.areaText.trim() !== "" || f.areaIds.length > 0;
  if (anyArea) and.push(r.areaIds.length ? { areaId: { in: r.areaIds } } : { id: "__none__" });
  if (f.zoneIds.length) and.push({ zoneId: { in: f.zoneIds } });
  if (f.zoneScope === "inside") and.push({ zoneId: { in: r.liveZoneIds } });
  if (f.zoneScope === "outside") and.push({ OR: [{ zoneId: null }, { zoneId: { notIn: r.liveZoneIds } }] });
  if (f.trades.length) and.push({ OR: [{ trades: { hasSome: f.trades as Trade[] } }, { trade: { in: f.trades as Trade[] } }] });
  if (f.q) {
    and.push({ OR: [{ personName: { contains: f.q, mode: "insensitive" } }, { businessName: { contains: f.q, mode: "insensitive" } }, { skills: { contains: f.q, mode: "insensitive" } }, { phone: { contains: f.q.replace(/\s+/g, "") } }, { notes: { contains: f.q, mode: "insensitive" } }] });
  }
  if (f.status.length) and.push({ status: { in: f.status as never[] } });
  if (f.source.length) and.push({ OR: [{ source: { in: f.source as never[] } }, ...f.source.map((s) => ({ sources: { has: s } }))] });
  if (f.owner === "me" && me) and.push({ ownerId: me });
  else if (f.owner === "none") and.push({ ownerId: null });
  else if (f.owner && f.owner !== "me") and.push({ ownerId: f.owner });
  if (f.registered === "yes") and.push({ proUserId: { not: null } });
  if (f.registered === "no") and.push({ proUserId: null });
  if (f.consent) and.push({ consent: f.consent });
  const created = range(f.createdFrom, f.createdTo);
  if (created) and.push({ createdAt: created });
  const contacted = range(f.contactedFrom, f.contactedTo);
  if (contacted) and.push({ lastContactedAt: contacted });
  if (f.followUp === "due") and.push({ callbackDate: { lte: new Date() }, doNotContact: false });
  if (f.followUp === "today") {
    const end = new Date();
    end.setUTCHours(23, 59, 59, 999);
    and.push({ callbackDate: { lte: end }, doNotContact: false });
  }
  if (f.expMin != null) and.push({ experienceYears: { gte: f.expMin } });
  return and.length ? { AND: and } : {};
}

export async function queryLeads(f: Filter, opts: { page?: number; pageSize?: number; all?: boolean; me?: string; excludeDnc?: boolean } = {}) {
  const r = await resolveFilter(f);
  const base = await leadWhere(f, r, opts.me);
  const where: Prisma.LeadWhereInput = opts.excludeDnc ? { AND: [base, { doNotContact: false }, { status: { not: "DO_NOT_CONTACT" } }] } : base;
  const orderBy: Prisma.LeadOrderByWithRelationInput[] = [{ callbackDate: "asc" }, { createdAt: "desc" }];
  if (r.near || opts.all) {
    const rows = await prisma.lead.findMany({ where, orderBy: { createdAt: "desc" }, take: 20000 });
    const kept = r.near ? rows.filter((l) => withinNear(r, l.lat, l.lng)) : rows;
    const page = opts.page ?? 1;
    const size = opts.pageSize ?? kept.length;
    return { rows: opts.all ? kept : kept.slice((page - 1) * size, page * size), total: kept.length, resolved: r };
  }
  const page = opts.page ?? 1;
  const size = opts.pageSize ?? 50;
  const [rows, total] = await Promise.all([prisma.lead.findMany({ where, orderBy, skip: (page - 1) * size, take: size }), prisma.lead.count({ where })]);
  return { rows, total, resolved: r };
}

// ---------- columns / datasets for export ----------
export type Cell = string | number | boolean | null;
export interface Column<T> {
  key: string;
  label: string;
  value: (row: T, ctx: Resolved) => Cell;
  default?: boolean;
}

const tradeName = (t: string) => TRADE_LABELS[t as keyof typeof TRADE_LABELS]?.name ?? t;
const iso = (d: Date | null | undefined) => (d ? d.toISOString().slice(0, 16).replace("T", " ") : "");

type LeadRow = Awaited<ReturnType<typeof queryLeads>>["rows"][number];
export const LEAD_COLUMNS: Column<LeadRow>[] = [
  { key: "name", label: "Name", default: true, value: (l) => l.personName ?? l.businessName },
  { key: "shop", label: "Shop / business", value: (l) => l.businessName },
  { key: "phone", label: "Phone", default: true, value: (l) => l.phone },
  { key: "altPhone", label: "Alternate phone", value: (l) => l.altPhone },
  { key: "whatsapp", label: "WhatsApp same as phone", value: (l) => (l.whatsappSame ? "yes" : "no") },
  { key: "trades", label: "Trades", default: true, value: (l) => (l.trades.length ? l.trades : [l.trade]).map(tradeName).join(", ") },
  { key: "skills", label: "Other skills", value: (l) => l.skills },
  { key: "experience", label: "Experience (years)", value: (l) => l.experienceYears },
  { key: "country", label: "Country", default: true, value: (l) => l.countryCode },
  { key: "city", label: "City", default: true, value: (l, r) => l.city || r.areas.find((a) => a.id === l.areaId)?.cityName || "" },
  { key: "area", label: "Area", default: true, value: (l, r) => r.areas.find((a) => a.id === l.areaId)?.name ?? l.areaLabel ?? l.areaRaw },
  { key: "address", label: "Address", value: (l) => l.addressText },
  { key: "zone", label: "Zone", value: (l, r) => r.markets.find((m) => m.id === l.zoneId)?.name ?? "" },
  { key: "lat", label: "Latitude", value: (l) => l.lat },
  { key: "lng", label: "Longitude", value: (l) => l.lng },
  { key: "status", label: "Status", default: true, value: (l) => LEAD_STATUS_LABEL[l.status] ?? l.status },
  { key: "source", label: "Source", default: true, value: (l) => l.source },
  { key: "sourceDetail", label: "Source detail", value: (l) => l.sourceDetail },
  { key: "language", label: "Language", value: (l) => l.language },
  { key: "consent", label: "Consent", value: (l) => l.consent },
  { key: "owner", label: "Owner", value: (l) => l.ownerId },
  { key: "followUp", label: "Next follow-up", value: (l) => iso(l.callbackDate) },
  { key: "lastContacted", label: "Last contacted", value: (l) => iso(l.lastContactedAt) },
  { key: "registered", label: "Registered in app", value: (l) => (l.proUserId ? "yes" : "no") },
  { key: "created", label: "Created", value: (l) => iso(l.createdAt) },
  { key: "notes", label: "Notes", value: (l) => l.notes },
];

// ---------- pros ----------
export async function queryPros(f: Filter) {
  const r = await resolveFilter(f);
  const and: Prisma.ProviderProfileWhereInput[] = [];
  if (f.city.length) and.push({ user: { OR: f.city.map((c) => ({ city: { equals: c, mode: "insensitive" as const } })) } });
  if (f.trades.length) and.push({ trades: { hasSome: f.trades as Trade[] } });
  if (f.q) and.push({ OR: [{ displayName: { contains: f.q, mode: "insensitive" } }, { user: { phone: { contains: f.q.replace(/\s+/g, "") } } }, { skillsNote: { contains: f.q, mode: "insensitive" } }] });
  if (f.verification === "verified") and.push({ isVerified: true });
  if (f.verification === "unverified") and.push({ isVerified: false });
  if (f.founding === "yes") and.push({ foundingUntil: { not: null } });
  if (f.founding === "no") and.push({ foundingUntil: null });
  const created = range(f.createdFrom, f.createdTo);
  if (created) and.push({ createdAt: created });
  const rows = await prisma.providerProfile.findMany({ where: and.length ? { AND: and } : {}, include: { user: { select: { name: true, phone: true, city: true, createdAt: true } } }, orderBy: { createdAt: "desc" }, take: 20000 });
  const withLoc = rows.map((p) => {
    const loc = resolveLocation({ lat: p.baseLat, lng: p.baseLng, cityName: p.user.city }, r.areas, r.markets);
    return { p, loc };
  });
  const kept = withLoc.filter(({ p, loc }) => {
    if (r.near && !withinNear(r, p.baseLat, p.baseLng)) return false;
    if (f.areaText.trim() !== "" || f.areaIds.length) {
      if (!loc.areaId || !r.areaIds.includes(loc.areaId)) return false;
    }
    if (f.zoneIds.length && !(loc.zoneId && f.zoneIds.includes(loc.zoneId))) return false;
    if (f.zoneScope === "inside" && !(loc.zoneId && r.liveZoneIds.includes(loc.zoneId))) return false;
    if (f.zoneScope === "outside" && loc.zoneId && r.liveZoneIds.includes(loc.zoneId)) return false;
    return true;
  });
  return { rows: kept, total: kept.length, resolved: r };
}
type ProRow = Awaited<ReturnType<typeof queryPros>>["rows"][number];
export const PRO_COLUMNS: Column<ProRow>[] = [
  { key: "name", label: "Name", default: true, value: ({ p }) => p.displayName || p.user.name },
  { key: "phone", label: "Phone", default: true, value: ({ p }) => p.user.phone },
  { key: "trades", label: "Trades", default: true, value: ({ p }) => p.trades.map(tradeName).join(", ") },
  { key: "city", label: "City", default: true, value: ({ p }) => p.user.city },
  { key: "area", label: "Area", default: true, value: ({ loc }, r) => r.areas.find((a) => a.id === loc.areaId)?.name ?? "" },
  { key: "zone", label: "Zone", default: true, value: ({ loc }, r) => r.markets.find((m) => m.id === loc.zoneId)?.name ?? "" },
  { key: "verified", label: "Verified", default: true, value: ({ p }) => (p.isVerified ? "yes" : "no") },
  { key: "level", label: "Verification level", value: ({ p }) => p.verificationLevel },
  { key: "founding", label: "Founding Pro", value: ({ p }) => (p.foundingUntil ? "yes" : "no") },
  { key: "foundingUntil", label: "Founding rate until", value: ({ p }) => iso(p.foundingUntil) },
  { key: "activation", label: "Activation", value: ({ p }) => p.activation },
  { key: "jobs", label: "Jobs completed", value: ({ p }) => p.jobsCompleted },
  { key: "rating", label: "Rating", value: ({ p }) => p.ratingAvg },
  { key: "radius", label: "Radius (km)", value: ({ p }) => p.serviceRadiusKm },
  { key: "lat", label: "Latitude", value: ({ p }) => p.baseLat },
  { key: "lng", label: "Longitude", value: ({ p }) => p.baseLng },
  { key: "created", label: "Registered", value: ({ p }) => iso(p.createdAt) },
];

// ---------- early list ----------
export async function queryWaitlist(f: Filter) {
  const r = await resolveFilter(f);
  const and: Prisma.WaitlistSignupWhereInput[] = [];
  if (f.role) and.push({ role: f.role });
  if (f.country.length) and.push({ countryCode: { in: f.country } });
  if (f.city.length) and.push({ OR: f.city.map((c) => ({ city: { equals: c, mode: "insensitive" as const } })) });
  if (f.trades.length) and.push({ trade: { in: f.trades } });
  if (f.q) and.push({ OR: [{ name: { contains: f.q, mode: "insensitive" } }, { whatsapp: { contains: f.q.replace(/\s+/g, "") } }] });
  const created = range(f.createdFrom, f.createdTo);
  if (created) and.push({ createdAt: created });
  const rows = await prisma.waitlistSignup.findMany({ where: and.length ? { AND: and } : {}, orderBy: { createdAt: "desc" }, take: 20000 });
  const withLoc = rows.map((w) => ({ w, loc: resolveLocation({ text: w.area, cityName: w.city }, r.areas, r.markets) }));
  const kept = withLoc.filter(({ loc }) => {
    if (f.areaText.trim() !== "" || f.areaIds.length) {
      if (!loc.areaId || !r.areaIds.includes(loc.areaId)) return false;
    }
    if (f.zoneIds.length && !(loc.zoneId && f.zoneIds.includes(loc.zoneId))) return false;
    if (f.zoneScope === "inside" && !(loc.zoneId && r.liveZoneIds.includes(loc.zoneId))) return false;
    if (f.zoneScope === "outside" && loc.zoneId && r.liveZoneIds.includes(loc.zoneId)) return false;
    return true;
  });
  return { rows: kept, total: kept.length, resolved: r };
}
type WlRow = Awaited<ReturnType<typeof queryWaitlist>>["rows"][number];
export const WAITLIST_COLUMNS: Column<WlRow>[] = [
  { key: "joined", label: "Joined", default: true, value: ({ w }) => iso(w.createdAt) },
  { key: "role", label: "Role", default: true, value: ({ w }) => (w.role === "PROVIDER" ? "Pro" : "Customer") },
  { key: "name", label: "Name", default: true, value: ({ w }) => w.name },
  { key: "whatsapp", label: "WhatsApp", default: true, value: ({ w }) => w.whatsapp },
  { key: "country", label: "Country", default: true, value: ({ w }) => w.countryCode },
  { key: "city", label: "City", default: true, value: ({ w }) => w.city },
  { key: "area", label: "Area", default: true, value: ({ w, loc }, r) => r.areas.find((a) => a.id === loc.areaId)?.name ?? w.area },
  { key: "areaRaw", label: "Area (as typed)", value: ({ w }) => w.area },
  { key: "zone", label: "Zone", value: ({ loc }, r) => r.markets.find((m) => m.id === loc.zoneId)?.name ?? "" },
  { key: "email", label: "Email", value: ({ w }) => w.email },
  { key: "trade", label: "Trade", value: ({ w }) => (w.trade ? tradeName(w.trade) : "") },
  { key: "experience", label: "Experience (years)", value: ({ w }) => w.experienceYears },
  { key: "gmail", label: "Gmail", value: ({ w }) => w.gmail },
  { key: "language", label: "Language", value: ({ w }) => w.language },
  { key: "referredBy", label: "Referred by", value: ({ w }) => w.referredByCode },
  { key: "source", label: "Source page", value: ({ w }) => w.sourcePage },
];
