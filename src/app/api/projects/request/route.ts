import { NextResponse } from "next/server";
import { createHash } from "node:crypto";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { toE164 } from "@/lib/phone";
import { checkRateLimit, clientKey } from "@/lib/rateLimit";
import { isLocale } from "@/i18n/locales";
import { BUDGET_BANDS, PROJECT_TRADES, PROJECT_TYPES, PROPERTY_STAGES, START_WINDOWS, bigProjectsEnabled, emailCustomerReceived, emailNewProject, nextReference } from "@/lib/bigProjects";

// Public: a visitor asks for a Big Project estimate (no account needed). Honeypot + per-IP and per-phone limits.
const keys = (l: readonly (readonly [string, string])[]) => l.map(([k]) => k) as [string, ...string[]];
const text = (max: number) => z.string().trim().max(max);
const schema = z.object({
  trades: z.array(z.enum(keys(PROJECT_TRADES))).min(1).max(11),
  projectType: z.enum(keys(PROJECT_TYPES)).optional(),
  city: text(60).min(2),
  area: text(80).optional(),
  name: text(80).min(2),
  phone: text(30).min(5),
  email: z.string().trim().email().max(120),
  propertyStage: z.enum(keys(PROPERTY_STAGES)).optional(),
  areaSqft: z.number().int().min(50).max(1_000_000).optional(),
  floors: z.number().int().min(1).max(60).optional(),
  budgetBand: z.enum(keys(BUDGET_BANDS)).optional(),
  startWindow: z.enum(keys(START_WINDOWS)).optional(),
  notes: text(1000).optional(),
  preferredContact: z.enum(["call", "whatsapp", "both"]).optional(),
  bestTime: z.enum(["morning", "afternoon", "evening", "anytime"]).optional(),
  consent: z.literal(true),
  language: text(8).optional(),
  website: z.string().optional(), // honeypot
});

export async function POST(req: Request) {
  if (!bigProjectsEnabled()) return NextResponse.json({ error: "unavailable" }, { status: 404 });
  const parsed = schema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "invalid", field: String(parsed.error.issues[0]?.path[0] ?? "") }, { status: 400 });
  const d = parsed.data;
  if (d.website && d.website.trim() !== "") return NextResponse.json({ ok: true, reference: "SP-0000-0000" });

  const phone = toE164(d.phone, "PK");
  if (!phone) return NextResponse.json({ error: "phone", field: "phone" }, { status: 400 });

  const [ip, ph] = await Promise.all([checkRateLimit(`proj:ip:${clientKey(req)}`, 5, 3600), checkRateLimit(`proj:phone:${phone}`, 3, 86400)]);
  if (!ip.ok || !ph.ok) return NextResponse.json({ error: "rate" }, { status: 429 });

  const dup = await prisma.bigProject.findFirst({
    where: { customerPhone: phone, city: { equals: d.city, mode: "insensitive" }, trades: { hasSome: d.trades }, createdAt: { gt: new Date(Date.now() - 7 * 86400_000) } },
    select: { id: true },
  });
  const ipHash = createHash("sha256").update(`${clientKey(req)}|${process.env.AUTH_SECRET ?? "servigic"}`).digest("hex").slice(0, 32);

  let project = null;
  for (let i = 0; i < 5 && !project; i++) {
    try {
      project = await prisma.bigProject.create({
        data: {
          reference: await nextReference(), source: "web", locale: d.language && isLocale(d.language) ? d.language : "en", country: "PK",
          city: d.city, area: d.area || null, customerName: d.name, customerPhone: phone, customerEmail: d.email.toLowerCase(),
          preferredContact: d.preferredContact ?? null, bestTime: d.bestTime ?? null, projectType: d.projectType ?? null, propertyStage: d.propertyStage ?? null,
          areaSqft: d.areaSqft ?? null, floors: d.floors ?? null, budgetBand: d.budgetBand ?? null, startWindow: d.startWindow ?? null, notes: d.notes || null,
          trades: d.trades, consentAt: new Date(), ipHash, duplicateOf: dup?.id ?? null,
          events: { create: { actor: "customer", type: "created", body: dup ? "Possible duplicate of an earlier request" : null } },
        },
      });
    } catch (e) {
      if (i === 4) throw e; // a reference clash (two requests at once) retries with the next number
    }
  }
  await Promise.all([emailNewProject(project!), emailCustomerReceived(project!)]);
  return NextResponse.json({ ok: true, reference: project!.reference });
}
