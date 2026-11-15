import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/requireRole";
import { ALL_STATUSES, LOST_REASONS, canMove } from "@/lib/bigProjectsOptions";

// One endpoint for what an admin does on a Big Project: move the status, add a note / call log, schedule the site visit, set the
// contract amount agreed with the customer after the visit. Every change is written to the project's timeline.
const schema = z.discriminatedUnion("action", [
  z.object({ action: z.literal("status"), status: z.enum(ALL_STATUSES), lostReason: z.enum(LOST_REASONS).optional() }),
  z.object({ action: z.literal("note"), kind: z.enum(["note", "call"]), body: z.string().trim().min(1).max(2000), followUpAt: z.string().datetime().nullable().optional() }),
  z.object({ action: z.literal("visit"), siteVisitAt: z.string().datetime().nullable(), siteVisitNotes: z.string().trim().max(2000).optional() }),
  z.object({ action: z.literal("amount"), contractAmount: z.number().positive().max(1e10).nullable(), warrantyDays: z.number().int().min(0).max(365).optional() }),
]);

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireRole("ADMIN");
  if (!auth.ok) return auth.response;
  const { id } = await params;
  const parsed = schema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Invalid input" }, { status: 400 });
  const d = parsed.data;
  const p = await prisma.bigProject.findUnique({ where: { id } });
  if (!p) return NextResponse.json({ error: "Not found" }, { status: 404 });
  const actor = auth.session.user.id;
  const log = (type: string, body: string | null, data?: object) => prisma.bigProjectEvent.create({ data: { projectId: id, actor, type, body, data } });
  const touch = p.firstContactedAt ? {} : { firstContactedAt: new Date() };

  if (d.action === "status") {
    if (!canMove(p.status, d.status)) return NextResponse.json({ error: `Cannot move from ${p.status} to ${d.status}` }, { status: 400 });
    if (d.status === "lost" && !d.lostReason) return NextResponse.json({ error: "A reason is required when a project is lost" }, { status: 400 });
    await prisma.bigProject.update({ where: { id }, data: { status: d.status, lostReason: d.status === "lost" ? d.lostReason : null, ...(p.status === "new" ? touch : {}) } });
    await log("status", `${p.status} -> ${d.status}${d.lostReason ? ` (${d.lostReason})` : ""}`);
  } else if (d.action === "note") {
    await prisma.bigProject.update({ where: { id }, data: { ...(d.kind === "call" ? touch : {}), ...(d.followUpAt !== undefined ? { followUpAt: d.followUpAt ? new Date(d.followUpAt) : null } : {}) } });
    await log(d.kind, d.body);
  } else if (d.action === "visit") {
    await prisma.bigProject.update({ where: { id }, data: { siteVisitAt: d.siteVisitAt ? new Date(d.siteVisitAt) : null, siteVisitNotes: d.siteVisitNotes || null, ...touch } });
    await log("visit", d.siteVisitAt ? `Site visit set for ${d.siteVisitAt}${d.siteVisitNotes ? `: ${d.siteVisitNotes}` : ""}` : "Site visit cleared");
  } else {
    await prisma.bigProject.update({ where: { id }, data: { contractAmount: d.contractAmount, ...(d.warrantyDays !== undefined ? { warrantyDays: d.warrantyDays } : {}) } });
    await log("amount", d.contractAmount === null ? "Contract amount cleared" : `Contract amount set to ${p.currency} ${d.contractAmount}`);
  }
  return NextResponse.json({ ok: true });
}
