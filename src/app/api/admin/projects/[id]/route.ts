import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/requireRole";
import { notify } from "@/lib/notify";
import { emailProInvite, emailRateRequest } from "@/lib/bigProjects";
import { ALL_STATUSES, LOST_REASONS, canMove } from "@/lib/bigProjectsOptions";
import { estimateItemSchema, sendEstimate } from "@/lib/bigProjectsFlow";

// Everything an admin does on a Big Project; each change is written to the project's timeline. Servigic is the contracting party:
// the customer pays Servigic the contract amount, and pros are assigned for labour with their own payout.
const iso = z.string().datetime().nullable();
const schema = z.discriminatedUnion("action", [
  z.object({ action: z.literal("status"), status: z.enum(ALL_STATUSES), lostReason: z.enum(LOST_REASONS).optional() }),
  z.object({ action: z.literal("note"), kind: z.enum(["note", "call"]), body: z.string().trim().min(1).max(2000), followUpAt: iso.optional() }),
  z.object({ action: z.literal("visit"), siteVisitAt: iso, siteVisitNotes: z.string().trim().max(2000).optional() }),
  z.object({ action: z.literal("amount"), contractAmount: z.number().positive().max(1e10).nullable(), warrantyDays: z.number().int().min(0).max(365).optional() }),
  z.object({ action: z.literal("estimate"), items: z.array(estimateItemSchema).min(1).max(60), discount: z.number().min(0).default(0), validUntil: iso.optional(), terms: z.string().trim().max(4000).nullable().optional() }),
  z.object({ action: z.literal("assign"), proId: z.string().min(1), role: z.enum(["lead", "crew"]).default("lead"), scope: z.string().trim().min(3).max(1000), payoutAmount: z.number().min(0).max(1e10), plannedStart: iso.optional(), plannedEnd: iso.optional() }),
  z.object({ action: z.literal("assign_remove"), assignmentId: z.string().min(1), reason: z.string().trim().min(2).max(300) }),
  z.object({ action: z.literal("confirm_team") }),
  z.object({ action: z.literal("milestone_add"), title: z.string().trim().min(2).max(120), amount: z.number().min(0).nullable().optional(), dueDate: iso.optional(), assignmentId: z.string().nullable().optional() }),
  z.object({ action: z.literal("milestone_set"), milestoneId: z.string().min(1), status: z.enum(["verified", "paid"]), paidAmount: z.number().min(0).optional() }),
]);

const RESPONSE_HOURS = () => Number(process.env.PROJECTS_INVITE_RESPONSE_HOURS) || 12;

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
  const tell = (userId: string | null | undefined, title: string, body: string) => (userId ? notify({ userId, type: "STATUS_UPDATE", title, body, linkUrl: `/projects/${id}` }).catch(() => null) : Promise.resolve());

  if (d.action === "status") {
    if (!canMove(p.status, d.status)) return NextResponse.json({ error: `Cannot move from ${p.status} to ${d.status}` }, { status: 400 });
    if (d.status === "lost" && !d.lostReason) return NextResponse.json({ error: "A reason is required when a project is lost" }, { status: 400 });
    await prisma.bigProject.update({ where: { id }, data: { status: d.status, lostReason: d.status === "lost" ? d.lostReason : null, ...(p.status === "new" ? touch : {}) } });
    await log("status", `${p.status} -> ${d.status}${d.lostReason ? ` (${d.lostReason})` : ""}`);
    if (d.status === "completed") {
      await prisma.bigProjectAssignment.updateMany({ where: { projectId: id, status: "active" }, data: { status: "completed" } });
      await emailRateRequest(id).catch(() => null);
      await tell(p.customerUserId, "Your project is complete", `${p.reference}: thank you for choosing Servigic. Any problem within ${p.warrantyDays} days, we will come and fix it.`);
    } else if (d.status === "in_progress") await tell(p.customerUserId, "Work has started", p.reference);
  } else if (d.action === "note") {
    await prisma.bigProject.update({ where: { id }, data: { ...(d.kind === "call" ? touch : {}), ...(d.followUpAt !== undefined ? { followUpAt: d.followUpAt ? new Date(d.followUpAt) : null } : {}) } });
    await log(d.kind, d.body);
  } else if (d.action === "visit") {
    await prisma.bigProject.update({ where: { id }, data: { siteVisitAt: d.siteVisitAt ? new Date(d.siteVisitAt) : null, siteVisitNotes: d.siteVisitNotes || null, ...(d.siteVisitAt && ["new", "contacted"].includes(p.status) ? { status: "site_visit_scheduled" } : {}), ...touch } });
    await log("visit", d.siteVisitAt ? `Site visit set for ${new Date(d.siteVisitAt).toLocaleString()}` : "Site visit cleared");
    if (d.siteVisitAt) await tell(p.customerUserId, "Site visit scheduled", `${p.reference}: ${new Date(d.siteVisitAt).toLocaleString()}`);
  } else if (d.action === "amount") {
    await prisma.bigProject.update({ where: { id }, data: { contractAmount: d.contractAmount, ...(d.warrantyDays !== undefined ? { warrantyDays: d.warrantyDays } : {}) } });
    await log("amount", d.contractAmount === null ? "Contract amount cleared" : `Contract amount set to ${p.currency} ${d.contractAmount}`);
  } else if (d.action === "estimate") {
    await sendEstimate(id, actor, { items: d.items, discount: d.discount, validUntil: d.validUntil ? new Date(d.validUntil) : null, terms: d.terms ?? null });
  } else if (d.action === "assign") {
    const pro = await prisma.providerProfile.findUnique({ where: { id: d.proId }, select: { id: true, userId: true, isVerified: true, displayName: true } });
    if (!pro || !pro.isVerified) return NextResponse.json({ error: "Only verified pros can be assigned" }, { status: 400 });
    const open = await prisma.bigProjectAssignment.findFirst({ where: { projectId: id, proId: d.proId, status: { in: ["invited", "accepted", "active"] } } });
    if (open) return NextResponse.json({ error: "This pro is already on the project" }, { status: 400 });
    const respondBy = new Date(Date.now() + RESPONSE_HOURS() * 3600_000);
    await prisma.bigProjectAssignment.create({ data: { projectId: id, proId: d.proId, role: d.role, scope: d.scope, payoutAmount: d.payoutAmount, plannedStart: d.plannedStart ? new Date(d.plannedStart) : null, plannedEnd: d.plannedEnd ? new Date(d.plannedEnd) : null, respondBy } });
    await log("assign", `Invited ${pro.displayName} (${d.role}): ${d.scope} - payout ${p.currency} ${d.payoutAmount}`);
    await notify({ userId: pro.userId, type: "STATUS_UPDATE", title: "New project invitation", body: `${p.city ?? ""}: ${d.scope}. Reply within ${RESPONSE_HOURS()} hours.`, linkUrl: "/projects" }).catch(() => null);
    // Always email the full brief (online or offline), without address or phone.
    const u = await prisma.user.findUnique({ where: { id: pro.userId }, select: { email: true } });
    if (u?.email) await emailProInvite({ scope: d.scope, role: d.role, payoutAmount: d.payoutAmount, plannedStart: d.plannedStart ? new Date(d.plannedStart) : null, plannedEnd: d.plannedEnd ? new Date(d.plannedEnd) : null, respondBy }, p, u.email, pro.displayName);
  } else if (d.action === "assign_remove") {
    const a = await prisma.bigProjectAssignment.findFirst({ where: { id: d.assignmentId, projectId: id } });
    if (!a) return NextResponse.json({ error: "Not found" }, { status: 404 });
    await prisma.bigProjectAssignment.update({ where: { id: a.id }, data: { status: "removed", removeReason: d.reason } });
    await log("assign", `Removed assignment (${d.reason})`);
  } else if (d.action === "confirm_team") {
    const accepted = await prisma.bigProjectAssignment.findMany({ where: { projectId: id, status: "accepted" } });
    if (accepted.length === 0) return NextResponse.json({ error: "No pro has accepted yet" }, { status: 400 });
    await prisma.bigProjectAssignment.updateMany({ where: { projectId: id, status: "accepted" }, data: { status: "active", contactRevealedAt: new Date() } });
    if (["accepted", "negotiating", "estimate_sent", "site_visit_scheduled", "contacted"].includes(p.status)) await prisma.bigProject.update({ where: { id }, data: { status: "pros_assigned" } });
    await log("status", `Team confirmed (${accepted.length} pro${accepted.length > 1 ? "s" : ""}); site address and contact revealed to them`);
    const pros = await prisma.providerProfile.findMany({ where: { id: { in: accepted.map((a) => a.proId) } }, select: { userId: true } });
    await Promise.all(pros.map((x) => notify({ userId: x.userId, type: "STATUS_UPDATE", title: "Project confirmed", body: `${p.reference}: you can now see the address and contact.`, linkUrl: "/projects" }).catch(() => null)));
    await tell(p.customerUserId, "Your team is ready", `${p.reference}: verified pros have been assigned.`);
  } else if (d.action === "milestone_add") {
    await prisma.bigProjectMilestone.create({ data: { projectId: id, title: d.title, amount: d.amount ?? null, dueDate: d.dueDate ? new Date(d.dueDate) : null, assignmentId: d.assignmentId || null } });
    await log("milestone", `Milestone added: ${d.title}`);
  } else {
    const m = await prisma.bigProjectMilestone.findFirst({ where: { id: d.milestoneId, projectId: id }, include: { assignment: true } });
    if (!m) return NextResponse.json({ error: "Not found" }, { status: 404 });
    if (d.status === "verified" && m.status !== "ready") return NextResponse.json({ error: "The pro has not marked this stage ready" }, { status: 400 });
    if (d.status === "paid" && !["verified", "ready"].includes(m.status)) return NextResponse.json({ error: "Verify the stage first" }, { status: 400 });
    const amount = d.paidAmount ?? (m.amount ? Number(m.amount) : 0);
    await prisma.bigProjectMilestone.update({ where: { id: m.id }, data: d.status === "verified" ? { status: "verified", verifiedAt: new Date() } : { status: "paid", paidAt: new Date(), paidAmount: amount, verifiedAt: m.verifiedAt ?? new Date() } });
    await log("milestone", `${m.title}: ${d.status}${d.status === "paid" ? ` (${p.currency} ${amount} to the pro)` : ""}`);
    await tell(p.customerUserId, "Progress update", `${p.reference}: "${m.title}" is ${d.status === "verified" ? "approved" : "complete"}.`);
    if (d.status === "paid" && m.assignment) {
      const pr = await prisma.providerProfile.findUnique({ where: { id: m.assignment.proId }, select: { userId: true } });
      if (pr) await notify({ userId: pr.userId, type: "PAYOUT_SENT", title: "Payout recorded", body: `${p.reference}: ${p.currency} ${amount} for "${m.title}"`, linkUrl: "/projects" }).catch(() => null);
    }
  }
  return NextResponse.json({ ok: true });
}
