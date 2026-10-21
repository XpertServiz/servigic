import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/requireRole";
import { logLeadActivity } from "@/lib/leads";
import { LEAD_OUTCOMES } from "@/lib/leadOutcomes";

// After a call or a WhatsApp message: which way it went, a note and the next follow-up date.
const schema = z.object({
  kind: z.enum(["CALL", "WHATSAPP", "NOTE"]),
  outcome: z.string().max(40).optional(),
  note: z.string().trim().max(1000).optional(),
  nextFollowUp: z.string().datetime().nullable().optional(),
});

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireRole("ADMIN");
  if (!auth.ok) return auth.response;
  const { id } = await params;
  const parsed = schema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Invalid input" }, { status: 400 });
  const d = parsed.data;

  const lead = await prisma.lead.findUnique({ where: { id } });
  if (!lead) return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (lead.doNotContact && d.kind !== "NOTE") return NextResponse.json({ error: "This person asked not to be contacted." }, { status: 409 });

  const outcome = LEAD_OUTCOMES.find((o) => o.key === d.outcome);
  const data: Record<string, unknown> = {};
  if (d.kind !== "NOTE") data.lastContactedAt = new Date();
  if (d.nextFollowUp !== undefined) data.callbackDate = d.nextFollowUp ? new Date(d.nextFollowUp) : null;
  if (outcome?.status) {
    // Moves forward through the pipeline; side states (not interested, wrong number, STOP) can always be set.
    data.status = outcome.status;
    if (outcome.status === "DO_NOT_CONTACT") {
      data.doNotContact = true;
      data.callbackDate = null;
    }
    if (outcome.status === "INTERESTED" || outcome.status === "CONTACTED" || outcome.status === "INVITED" || outcome.status === "CALLBACK") data.consent = lead.consent === "unknown" && outcome.status !== "CONTACTED" ? "yes" : undefined;
    if (data.consent === "yes") data.consentAt = new Date();
  }
  if (Object.keys(data).length) await prisma.lead.update({ where: { id }, data });
  await logLeadActivity(id, { adminId: auth.session.user.id, adminName: auth.session.user.name, kind: d.kind, outcome: outcome?.label ?? null, note: d.note ?? null });
  return NextResponse.json({ ok: true });
}
