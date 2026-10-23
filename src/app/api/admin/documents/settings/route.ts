import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/requireRole";
import { DOC_TYPES } from "@/lib/proDocuments";

const schema = z.object({
  alertDays: z.array(z.number().int().min(1).max(365)).min(1).max(6),
  graceDays: z.number().int().min(0).max(90),
  mandatory: z.array(z.enum(DOC_TYPES)),
});

// Expiry reminder days, grace period before job access is paused, and which document types are mandatory.
export async function POST(req: Request) {
  const auth = await requireRole("ADMIN");
  if (!auth.ok) return auth.response;
  const parsed = schema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Invalid input" }, { status: 400 });
  const d = parsed.data;
  await prisma.siteSettings.upsert({
    where: { id: "singleton" },
    update: { docAlertDays: [...new Set(d.alertDays)].sort((a, b) => b - a).join(","), docGraceDays: d.graceDays, docMandatoryTypes: d.mandatory.join(",") },
    create: { id: "singleton", docAlertDays: [...new Set(d.alertDays)].sort((a, b) => b - a).join(","), docGraceDays: d.graceDays, docMandatoryTypes: d.mandatory.join(",") },
  });
  return NextResponse.json({ ok: true });
}
