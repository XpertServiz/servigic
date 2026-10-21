import { NextResponse } from "next/server";
import { z } from "zod";
import { requireRole } from "@/lib/requireRole";
import { upsertLead, normalizePhone, logLeadActivity } from "@/lib/leads";
import { mapTrades } from "@/lib/tradeKeywords";
import { WAITLIST_TRADES } from "@/lib/prelaunchData";

// Manual add (also used from the Admin app while visiting markets). Same phone again = update, never a duplicate.
const schema = z.object({
  name: z.string().trim().min(1).max(80),
  phone: z.string().trim().min(5).max(30),
  countryCode: z.string().trim().length(2).default("PK"),
  trade: z.string().trim().max(120).optional(), // any wording: "AC repair", "bijli wala"...
  area: z.string().trim().max(120).optional(),
  city: z.string().trim().max(60).optional(),
  shop: z.string().trim().max(120).optional(),
  notes: z.string().trim().max(1000).optional(),
});

export async function POST(req: Request) {
  const auth = await requireRole("ADMIN");
  if (!auth.ok) return auth.response;
  const parsed = schema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Please fill in a name and a phone number." }, { status: 400 });
  const d = parsed.data;

  const phone = normalizePhone(d.phone, d.countryCode);
  if (!phone) return NextResponse.json({ error: "That phone number is not valid." }, { status: 400 });
  const trades = d.trade ? (WAITLIST_TRADES.includes(d.trade.toUpperCase() as never) ? [d.trade.toUpperCase() as never] : mapTrades(d.trade)) : [];

  const r = await upsertLead({
    name: d.name, businessName: d.shop ?? null, phone, countryCode: d.countryCode, trades, skills: trades.length === 0 && d.trade ? d.trade : null,
    areaRaw: d.area ?? null, cityName: d.city ?? null, notes: d.notes ?? null, source: "MANUAL", ownerId: auth.session.user.id,
  });
  await logLeadActivity(r.id, { adminId: auth.session.user.id, adminName: auth.session.user.name, kind: "NOTE", note: r.action === "created" ? "Added manually" : "Added again manually (existing lead updated)" });
  return NextResponse.json({ id: r.id, action: r.action, areaMatched: r.areaMatched });
}
