import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { checkRateLimit, clientKey } from "@/lib/rateLimit";
import { bigProjectsEnabled, adminRecipients } from "@/lib/bigProjects";
import { sendEmailChannel } from "@/lib/notify/channels/email";
import { sha } from "@/lib/bigProjectsFlow";
import { PROJECT_TRADES, WAITLIST_COUNTRIES } from "@/lib/bigProjectsOptions";

const t = (n: number) => z.string().trim().max(n);
const schema = z.object({
  country: z.enum(WAITLIST_COUNTRIES.map((c) => c[0]) as [string, ...string[]]),
  city: t(80).optional(),
  name: t(80).min(2),
  email: z.string().trim().email().max(120),
  phone: t(30).optional(),
  trades: z.array(z.enum(PROJECT_TRADES.map((x) => x[0]) as [string, ...string[]])).max(11).default([]),
  notes: t(500).optional(),
  language: t(8).optional(),
  website: z.string().optional(), // honeypot
});

// Public: someone outside Pakistan joins the waitlist for Big Projects in their country.
export async function POST(req: Request) {
  if (!bigProjectsEnabled()) return NextResponse.json({ error: "unavailable" }, { status: 404 });
  const parsed = schema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "invalid" }, { status: 400 });
  const d = parsed.data;
  if (d.website && d.website.trim() !== "") return NextResponse.json({ ok: true });
  const [ip, em] = await Promise.all([checkRateLimit(`wl:ip:${clientKey(req)}`, 5, 3600), checkRateLimit(`wl:mail:${d.email.toLowerCase()}`, 3, 86400)]);
  if (!ip.ok || !em.ok) return NextResponse.json({ error: "rate" }, { status: 429 });
  const country = WAITLIST_COUNTRIES.find((c) => c[0] === d.country)?.[1] ?? d.country;
  await prisma.bigProjectWaitlist.create({ data: { country: d.country, city: d.city || null, name: d.name, email: d.email.toLowerCase(), phone: d.phone || null, trades: d.trades, notes: d.notes || null, language: d.language ?? null, ipHash: sha(clientKey(req)) } });
  for (const to of await adminRecipients()) {
    await sendEmailChannel({ to, subject: `Big Projects waitlist: ${country}`, body: `${d.name} (${d.email}${d.phone ? `, ${d.phone}` : ""}) from ${d.city ? `${d.city}, ` : ""}${country} joined the waitlist. Trades: ${d.trades.join(", ") || "-"}. ${d.notes ?? ""}` }).catch(() => null);
  }
  return NextResponse.json({ ok: true });
}
