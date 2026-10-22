import { applyTokens, tokensFor } from "@/lib/countryProfile";
import { isLocale } from "@/i18n/locales";
import { prisma } from "@/lib/prisma";
import type { KbEntry } from "./match";

type Messages = Record<string, unknown>;
const isObj = (v: unknown): v is Messages => typeof v === "object" && v !== null && !Array.isArray(v);

function deepMerge(base: Messages, over: Messages): Messages {
  const out: Messages = { ...base };
  for (const [k, v] of Object.entries(over)) out[k] = isObj(v) && isObj(base[k]) ? deepMerge(base[k] as Messages, v) : v;
  return out;
}

function regionName(code: string, locale: string): string {
  try {
    return new Intl.DisplayNames([locale], { type: "region" }).of(code) ?? code;
  } catch {
    return code;
  }
}

export interface ChatKb {
  lang: string;
  ui: Record<string, string>;
  entries: KbEntry[];
  suggested: string[]; // ids of the entries shown as "popular questions"
}

/**
 * The chatbot's knowledge in one language, taken from the website's own texts (FAQ, how it works, trust and safety, pro levels)
 * with the visitor's country filled in (cities, ID document, payment methods). Built per (language, country); the route that
 * serves it is cached by the CDN, so the database is read rarely.
 */
export async function buildKb(langInput: string, country: string): Promise<ChatKb> {
  const lang = isLocale(langInput) ? langInput : "en";
  const en = (await import("../../../messages/en.json")).default as Messages;
  let messages = en;
  if (lang !== "en") {
    try {
      messages = deepMerge(en, (await import(`../../../messages/${lang}.json`)).default as Messages);
    } catch {
      messages = en;
    }
  }
  const [cfg, live] = await Promise.all([
    prisma.localeConfig.findUnique({ where: { countryCode: country.toUpperCase() } }).catch(() => null),
    prisma.localeConfig.findMany({ where: { isLive: true }, select: { countryCode: true } }).catch(() => []),
  ]);
  const resolved = applyTokens(
    messages,
    tokensFor({ countryCode: country, locale: lang, countryName: regionName(country, lang), liveCities: cfg?.citiesLive ?? [], isLive: Boolean(cfg?.isLive), liveCountryNames: live.map((l) => regionName(l.countryCode, lang)) }),
  ) as Messages;

  const entries: KbEntry[] = [];
  // The how-to answers people ask first (sign up, password, price offer, payment ...), with the extra words they use for them.
  const help = ((resolved.chatHelp as Messages | undefined)?.items ?? []) as { q: string; a: string; k?: string }[];
  help.forEach((h, i) => entries.push({ id: `help${i}`, q: h.q, a: h.a, k: h.k }));
  const faq = ((resolved.faq as Messages | undefined)?.items ?? []) as { q: string; a: string }[];
  faq.forEach((f, i) => entries.push({ id: `faq${i}`, q: f.q, a: f.a }));
  const steps = ((resolved.howPage as Messages | undefined)?.steps ?? []) as { title: string; desc: string }[];
  steps.forEach((s, i) => entries.push({ id: `how${i}`, q: s.title, a: s.desc }));
  const sections = ((resolved.trustPage as Messages | undefined)?.sections ?? []) as { title: string; desc: string }[];
  sections.forEach((s, i) => entries.push({ id: `trust${i}`, q: s.title, a: s.desc }));
  const ladder = ((resolved.pro as Messages | undefined)?.ladder ?? []) as { level: string; title: string; desc: string }[];
  ladder.forEach((l, i) => entries.push({ id: `ladder${i}`, q: `${l.level} ${l.title}`, a: l.desc }));

  const ui = ((resolved.chat as Record<string, string> | undefined) ?? {}) as Record<string, string>;
  return { lang, ui, entries, suggested: ["faq0", "faq5", "faq6", "faq4"].filter((id) => entries.some((e) => e.id === id)) };
}
