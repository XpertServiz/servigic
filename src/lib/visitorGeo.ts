import { headers } from "next/headers";

// Where the visitor is, from the hosting edge headers (Vercel / Cloudflare). No IP address is read or stored.
export interface VisitorGeo {
  country: string | null; // ISO 3166-1 alpha-2, null when unknown (local dev, privacy tools)
  region: string | null;
  isBot: boolean;
}

const BOT_RE = /bot|crawl|spider|slurp|bing|duckduck|baidu|yandex|facebookexternalhit|embedly|preview|lighthouse|headless|google-inspectiontool|apis-google|mediapartners/i;

export async function getVisitorGeo(): Promise<VisitorGeo> {
  const h = await headers();
  const raw = (h.get("x-vercel-ip-country") || h.get("cf-ipcountry") || "").toUpperCase();
  const country = /^[A-Z]{2}$/.test(raw) && raw !== "XX" && raw !== "T1" ? raw : null;
  const region = h.get("x-vercel-ip-country-region") || null;
  return { country, region, isBot: BOT_RE.test(h.get("user-agent") || "") };
}
