import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/requireRole";
import { adminRecipients } from "@/lib/bigProjects";
import { sendEmailChannel } from "@/lib/notify/channels/email";

const schema = z.discriminatedUnion("action", [
  z.object({ action: z.literal("accept") }),
  z.object({ action: z.literal("decline") }),
  z.object({ action: z.literal("ready"), milestoneId: z.string().min(1), note: z.string().trim().max(500).optional(), photos: z.array(z.string().url()).max(6).optional() }),
]);

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireRole("PROVIDER");
  if (!auth.ok) return auth.response;
  const { id } = await params;
  const parsed = schema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Invalid input" }, { status: 400 });
  const me = await prisma.providerProfile.findUnique({ where: { userId: auth.session.user.id }, select: { id: true, displayName: true } });
  const a = me ? await prisma.bigProjectAssignment.findFirst({ where: { id, proId: me.id }, include: { project: { select: { id: true, reference: true } } } }) : null;
  if (!a || !me) return NextResponse.json({ error: "Not found" }, { status: 404 });
  const d = parsed.data;
  const base = (process.env.NEXT_PUBLIC_APP_URL || "https://www.servigic.com").replace(/\/$/, "");
  const tellAdmin = async (subject: string) => {
    for (const to of await adminRecipients()) await sendEmailChannel({ to, subject, body: `${subject}\n${base}/admin/projects/${a.project.id}` }).catch(() => null);
  };

  if (d.action === "accept" || d.action === "decline") {
    if (a.status !== "invited") return NextResponse.json({ error: "This invitation was already answered." }, { status: 400 });
    if (a.respondBy.getTime() < Date.now()) {
      await prisma.bigProjectAssignment.update({ where: { id }, data: { status: "expired" } });
      return NextResponse.json({ error: "The time to answer has passed." }, { status: 400 });
    }
    await prisma.bigProjectAssignment.update({ where: { id }, data: { status: d.action === "accept" ? "accepted" : "declined", respondedAt: new Date() } });
    await prisma.bigProjectEvent.create({ data: { projectId: a.project.id, actor: me.id, type: "assign", body: `${me.displayName} ${d.action === "accept" ? "accepted" : "declined"} the invitation` } });
    await tellAdmin(`${me.displayName} ${d.action === "accept" ? "accepted" : "declined"} project ${a.project.reference}`);
    return NextResponse.json({ ok: true });
  }

  if (a.status !== "active") return NextResponse.json({ error: "The project is not active yet." }, { status: 400 });
  const m = await prisma.bigProjectMilestone.findFirst({ where: { id: d.milestoneId, assignmentId: id } });
  if (!m || m.status !== "planned") return NextResponse.json({ error: "This stage cannot be marked ready." }, { status: 400 });
  await prisma.bigProjectMilestone.update({ where: { id: m.id }, data: { status: "ready", readyAt: new Date(), readyNote: d.note ?? null, photos: d.photos ?? [] } });
  await prisma.bigProjectEvent.create({ data: { projectId: a.project.id, actor: me.id, type: "milestone", body: `${me.displayName}: "${m.title}" is ready for approval` } });
  await tellAdmin(`Stage ready: ${m.title} (${a.project.reference})`);
  return NextResponse.json({ ok: true });
}
