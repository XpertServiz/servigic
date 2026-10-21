import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/requireRole";
import { logLeadActivity, LEAD_STATUSES } from "@/lib/leads";

const schema = z.object({
  status: z.enum(LEAD_STATUSES as [string, ...string[]]).optional(),
  notes: z.string().trim().max(2000).optional(),
  ownerId: z.string().nullable().optional(),
  callbackDate: z.string().datetime().nullable().optional(),
  consent: z.enum(["unknown", "yes", "no"]).optional(),
  doNotContact: z.boolean().optional(),
  skills: z.string().trim().max(300).optional(),
  experienceYears: z.number().int().min(0).max(70).nullable().optional(),
  altPhone: z.string().trim().max(30).nullable().optional(),
});

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireRole("ADMIN");
  if (!auth.ok) return auth.response;
  const { id } = await params;
  const parsed = schema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Invalid input" }, { status: 400 });
  const d = parsed.data;
  const admin = { adminId: auth.session.user.id, adminName: auth.session.user.name };

  const before = await prisma.lead.findUnique({ where: { id } });
  if (!before) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const data: Record<string, unknown> = {};
  if (d.notes !== undefined) data.notes = d.notes;
  if (d.ownerId !== undefined) data.ownerId = d.ownerId;
  if (d.callbackDate !== undefined) data.callbackDate = d.callbackDate ? new Date(d.callbackDate) : null;
  if (d.skills !== undefined) data.skills = d.skills;
  if (d.experienceYears !== undefined) data.experienceYears = d.experienceYears;
  if (d.altPhone !== undefined) data.altPhone = d.altPhone;
  if (d.consent !== undefined) {
    data.consent = d.consent;
    data.consentAt = d.consent === "yes" ? new Date() : null;
  }
  if (d.status !== undefined) data.status = d.status;
  // Do-not-contact is both a flag and a status: either one switches the other on, and it takes the lead out of every export.
  if (d.doNotContact === true || d.status === "DO_NOT_CONTACT") {
    data.doNotContact = true;
    data.status = "DO_NOT_CONTACT";
    data.callbackDate = null;
  } else if (d.doNotContact === false) {
    data.doNotContact = false;
    if (before.status === "DO_NOT_CONTACT") data.status = "NEW";
  }
  const lead = await prisma.lead.update({ where: { id }, data });
  if (data.status && data.status !== before.status) await logLeadActivity(id, { ...admin, kind: "STATUS", note: `${before.status} -> ${String(data.status)}` });
  if (d.doNotContact === false) await logLeadActivity(id, { ...admin, kind: "NOTE", note: "Do-not-contact removed" });
  return NextResponse.json({ lead });
}

// Delete a lead completely (a person asked us to remove his data).
export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireRole("ADMIN");
  if (!auth.ok) return auth.response;
  const { id } = await params;
  await prisma.leadActivity.deleteMany({ where: { leadId: id } });
  await prisma.lead.delete({ where: { id } }).catch(() => null);
  return NextResponse.json({ ok: true });
}
