import ExcelJS from "exceljs";
import type { LeadSource, Trade } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { phoneVariants } from "@/lib/phone";
import { loadResolutionContext, resolveLocation } from "@/lib/areas";
import { mapTrades } from "@/lib/tradeKeywords";
import { normalizePhone, upsertLead, type LeadInput } from "@/lib/leads";
import type { ColumnMapping, ImportField, ImportReport } from "@/lib/leadImportShared";

// CSV / XLSX import for Pro leads: read the sheet, map its columns, normalise phones, map trades from keywords,
// match areas, de-duplicate on phone, and report exactly what happened.

export { IMPORT_FIELDS } from "@/lib/leadImportShared";
export type { ColumnMapping, ImportField, ImportReport } from "@/lib/leadImportShared";

const GUESS: Record<ImportField, RegExp> = {
  name: /^(name|full ?name|contact|person|owner|naam|نام)/i,
  phone: /(phone|mobile|cell|whats ?app|contact ?(no|number)|number|نمبر|فون)/i,
  altPhone: /(alt|alternate|second|other).*(phone|mobile|number)/i,
  whatsappSame: /whats ?app.*(same|yes)/i,
  trade: /(trade|service|category|skill ?set|profession|kaam|work|پیشہ)/i,
  skills: /(skills?|other|specialit)/i,
  experience: /(experience|exp\b|years)/i,
  shop: /(shop|business|company|firm|store|دکان)/i,
  address: /(address|location|پتہ)/i,
  area: /(area|locality|neighbou?rhood|town|colony|society|ایریا)/i,
  city: /^(city|شہر)/i,
  country: /country/i,
  lat: /^(lat|latitude)/i,
  lng: /^(lng|lon|long|longitude)/i,
  language: /(language|lang|زبان)/i,
  notes: /(notes?|remarks?|comment)/i,
  consent: /consent/i,
};

/** Best-guess mapping from the header row (the admin can correct it on screen). */
export function guessMapping(headers: string[]): ColumnMapping {
  const mapping: ColumnMapping = {};
  const used = new Set<number>();
  // Most specific first so "alternate phone" is not taken by "phone".
  const order: ImportField[] = ["altPhone", "whatsappSame", "lat", "lng", "country", "city", "experience", "shop", "area", "address", "language", "consent", "notes", "name", "phone", "trade", "skills"];
  for (const f of order) {
    const idx = headers.findIndex((h, i) => !used.has(i) && GUESS[f].test(h.trim()));
    if (idx >= 0) {
      mapping[f] = idx;
      used.add(idx);
    }
  }
  return mapping;
}

// ---------- reading the file ----------
function parseCsv(text: string): string[][] {
  const src = text.replace(/^﻿/, "");
  const rows: string[][] = [];
  let row: string[] = [];
  let cell = "";
  let q = false;
  for (let i = 0; i < src.length; i++) {
    const ch = src[i];
    if (q) {
      if (ch === '"') {
        if (src[i + 1] === '"') {
          cell += '"';
          i++;
        } else q = false;
      } else cell += ch;
    } else if (ch === '"') q = true;
    else if (ch === "," || ch === ";" || ch === "\t") {
      row.push(cell);
      cell = "";
    } else if (ch === "\n" || ch === "\r") {
      if (ch === "\r" && src[i + 1] === "\n") i++;
      row.push(cell);
      cell = "";
      if (row.some((c) => c.trim() !== "")) rows.push(row);
      row = [];
    } else cell += ch;
  }
  row.push(cell);
  if (row.some((c) => c.trim() !== "")) rows.push(row);
  return rows;
}

export async function parseSheet(buf: Buffer, filename: string): Promise<{ headers: string[]; rows: string[][] }> {
  let table: string[][];
  if (/\.xlsx$/i.test(filename)) {
    const wb = new ExcelJS.Workbook();
    await wb.xlsx.load(buf as unknown as ArrayBuffer);
    const ws = wb.worksheets[0];
    if (!ws) throw new Error("The workbook has no sheet.");
    table = [];
    ws.eachRow({ includeEmpty: false }, (row) => {
      const cells: string[] = [];
      for (let c = 1; c <= ws.columnCount; c++) cells.push(String(row.getCell(c).text ?? "").trim());
      table.push(cells);
    });
  } else {
    table = parseCsv(buf.toString("utf8"));
  }
  if (table.length < 2) throw new Error("The file needs a header row and at least one data row.");
  return { headers: table[0].map((h) => h.trim()), rows: table.slice(1) };
}

// ---------- normalising rows ----------
const COUNTRY_NAMES: Record<string, string> = {
  pakistan: "PK", "saudi arabia": "SA", ksa: "SA", uae: "AE", "united arab emirates": "AE", dubai: "AE", canada: "CA", "united kingdom": "GB", uk: "GB", usa: "US", "united states": "US",
};
function countryCode(v: string | undefined, fallback: string): string {
  const t = (v ?? "").trim();
  if (!t) return fallback;
  if (/^[A-Za-z]{2}$/.test(t)) return t.toUpperCase();
  return COUNTRY_NAMES[t.toLowerCase()] ?? fallback;
}
const yes = (v: string | undefined) => /^(y|yes|true|1|ہاں)$/i.test((v ?? "").trim());
const no = (v: string | undefined) => /^(n|no|false|0|نہیں)$/i.test((v ?? "").trim());
const num = (v: string | undefined) => {
  const n = Number(String(v ?? "").replace(/[^\d.\-]/g, ""));
  return Number.isFinite(n) && String(v ?? "").trim() !== "" ? n : null;
};

export interface ParsedRow {
  rowNo: number;
  phoneRaw: string;
  input: LeadInput | null;
  errors: string[];
}

export function normaliseRows(rows: string[][], mapping: ColumnMapping, opts: { defaultCountry: string; defaultCity?: string; sourceName: string }): ParsedRow[] {
  const get = (r: string[], f: ImportField) => (mapping[f] == null ? undefined : (r[mapping[f]!] ?? "").trim());
  return rows.map((r, i) => {
    const errors: string[] = [];
    const phoneRaw = get(r, "phone") ?? "";
    const country = countryCode(get(r, "country"), opts.defaultCountry);
    const phone = normalizePhone(phoneRaw, country);
    if (!phone) errors.push(phoneRaw ? "invalid phone" : "no phone");
    const tradeText = [get(r, "trade"), get(r, "skills"), get(r, "shop")].filter(Boolean).join(" ");
    const trades: Trade[] = mapTrades(tradeText);
    const rawTrade = get(r, "trade") ?? "";
    const skillsText = [get(r, "skills"), trades.length === 0 && rawTrade ? rawTrade : ""].filter(Boolean).join("; ");
    const alt = get(r, "altPhone") ? normalizePhone(get(r, "altPhone"), country) : null;
    const input: LeadInput | null = phone
      ? {
          name: get(r, "name") || get(r, "shop") || "",
          businessName: get(r, "shop") || null,
          phone,
          altPhone: alt,
          whatsappSame: no(get(r, "whatsappSame")) ? false : yes(get(r, "whatsappSame")) ? true : undefined,
          trades,
          skills: skillsText || null,
          experienceYears: num(get(r, "experience")) != null ? Math.max(0, Math.min(70, Math.round(num(get(r, "experience"))!))) : null,
          addressText: get(r, "address") || null,
          areaRaw: get(r, "area") || get(r, "address") || null,
          cityName: get(r, "city") || opts.defaultCity || null,
          countryCode: country,
          lat: num(get(r, "lat")),
          lng: num(get(r, "lng")),
          language: get(r, "language") || null,
          notes: get(r, "notes") || null,
          source: "IMPORT" as LeadSource,
          sourceDetail: opts.sourceName,
          consent: yes(get(r, "consent")) ? "yes" : no(get(r, "consent")) ? "no" : "unknown",
        }
      : null;
    return { rowNo: i + 2, phoneRaw, input, errors };
  });
}

// ---------- geocoding (optional) ----------
async function geocode(address: string, cache: Map<string, { lat: number; lng: number } | null>): Promise<{ lat: number; lng: number } | null> {
  const key = process.env.GOOGLE_GEOCODING_API_KEY || process.env.GOOGLE_PLACES_API_KEY;
  if (!key) return null;
  const k = address.toLowerCase();
  if (cache.has(k)) return cache.get(k)!;
  try {
    const res = await fetch(`https://maps.googleapis.com/maps/api/geocode/json?address=${encodeURIComponent(address)}&key=${key}`);
    const json = (await res.json()) as { status: string; results?: { geometry: { location: { lat: number; lng: number } } }[] };
    const loc = json.status === "OK" ? json.results?.[0]?.geometry.location : null;
    const out = loc ? { lat: loc.lat, lng: loc.lng } : null;
    cache.set(k, out);
    return out;
  } catch {
    cache.set(k, null);
    return null;
  }
}

export async function runImport(args: {
  rows: string[][];
  mapping: ColumnMapping;
  sourceName: string;
  defaultCountry: string;
  defaultCity?: string;
  geocode: boolean;
  commit: boolean;
}): Promise<ImportReport> {
  const parsed = normaliseRows(args.rows, args.mapping, { defaultCountry: args.defaultCountry, defaultCity: args.defaultCity, sourceName: args.sourceName });
  const ctx = await loadResolutionContext();
  const report: ImportReport = { total: parsed.length, added: 0, updated: 0, duplicatesInFile: 0, invalid: [], unmatchedAreas: [], geocoded: 0, sample: [], committed: args.commit };
  const seen = new Set<string>();
  const unmatched = new Map<string, number>();
  const cache = new Map<string, { lat: number; lng: number } | null>();
  let geocodeBudget = 300;

  // In a preview we only need to know which phones already exist.
  const existingPhones = new Set<string>();
  if (!args.commit) {
    const all = parsed.filter((p) => p.input).flatMap((p) => phoneVariants(p.input!.phone));
    const found = await prisma.lead.findMany({ where: { phone: { in: all } }, select: { phone: true } });
    for (const f of found) existingPhones.add(f.phone);
  }

  for (const p of parsed) {
    if (!p.input) {
      report.invalid.push({ rowNo: p.rowNo, value: p.phoneRaw, why: p.errors.join(", ") });
      continue;
    }
    const inp = p.input;
    const dupInFile = seen.has(inp.phone);
    seen.add(inp.phone);
    if (dupInFile) report.duplicatesInFile++;

    if (args.geocode && inp.lat == null && inp.lng == null && inp.addressText && geocodeBudget > 0) {
      const g = await geocode(`${inp.addressText}, ${inp.cityName ?? ""}, ${inp.countryCode ?? ""}`, cache);
      geocodeBudget--;
      if (g) {
        inp.lat = g.lat;
        inp.lng = g.lng;
        report.geocoded++;
      }
    }

    const loc = resolveLocation({ text: inp.areaRaw, lat: inp.lat, lng: inp.lng, cityName: inp.cityName }, ctx.areas, ctx.markets);
    if (!loc.areaId && (inp.areaRaw || inp.addressText)) {
      const t = (inp.areaRaw || inp.addressText)!.trim();
      unmatched.set(t, (unmatched.get(t) ?? 0) + 1);
    }

    let action: string;
    if (args.commit) {
      const r = await upsertLead(inp, ctx);
      if (r.action === "created") report.added++;
      else report.updated++;
      action = r.action;
    } else {
      const exists = phoneVariants(inp.phone).some((v) => existingPhones.has(v)) || dupInFile;
      if (exists) report.updated++;
      else report.added++;
      action = exists ? "will update" : "will add";
    }
    if (report.sample.length < 30) {
      report.sample.push({ rowNo: p.rowNo, name: inp.name || inp.businessName || "", phone: inp.phone, trades: inp.trades ?? [], area: loc.areaId ? (ctx.areas.find((a) => a.id === loc.areaId)?.name ?? null) : null, action });
    }
  }
  report.unmatchedAreas = [...unmatched.entries()].map(([text, count]) => ({ text, count })).sort((a, b) => b.count - a.count).slice(0, 50);
  return report;
}
