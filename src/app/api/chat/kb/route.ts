import { NextResponse } from "next/server";
import { buildKb } from "@/lib/chat/kb";

// The chatbot's knowledge for one language and country, built from the website's own texts. Public and cacheable:
// the browser and the CDN keep it, so nothing here costs anything per question.
export async function GET(req: Request) {
  const url = new URL(req.url);
  const lang = (url.searchParams.get("lang") ?? "en").slice(0, 5);
  const country = (url.searchParams.get("country") ?? "PK").toUpperCase().slice(0, 2);
  const kb = await buildKb(lang, country);
  return NextResponse.json(kb, { headers: { "Cache-Control": "public, max-age=900, s-maxage=3600, stale-while-revalidate=86400" } });
}
