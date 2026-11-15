import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/requireRole";
import { bigProjectsEnabled } from "@/lib/bigProjects";

// Pro app: my project invitations and projects. A pro sees only his own scope and payout, never the customer's budget or the
// contract amount; the address and the customer's contact appear only once Servigic confirmed the team (assignment is active).
export async function GET() {
  const auth = await requireRole("PROVIDER");
  if (!auth.ok) return auth.response;
  if (!bigProjectsEnabled()) return NextResponse.json({ enabled: false, items: [] });
  const me = await prisma.providerProfile.findUnique({ where: { userId: auth.session.user.id }, select: { id: true, isVerified: true } });
  if (!me?.isVerified) return NextResponse.json({ enabled: false, items: [] });
  const rows = await prisma.bigProjectAssignment.findMany({
    where: { proId: me.id, status: { in: ["invited", "accepted", "active", "completed"] } },
    orderBy: { invitedAt: "desc" },
    take: 50,
    include: {
      project: { select: { reference: true, city: true, area: true, trades: true, areaSqft: true, floors: true, address: true, customerName: true, customerPhone: true } },
      milestones: { orderBy: { dueDate: "asc" } },
    },
  });
  const now = Date.now();
  return NextResponse.json({
    enabled: true,
    items: rows.map((a) => {
      const reveal = a.status === "active" || a.status === "completed";
      return {
        id: a.id,
        status: a.status === "invited" && a.respondBy.getTime() < now ? "expired" : a.status,
        role: a.role,
        scope: a.scope,
        payoutAmount: Number(a.payoutAmount),
        plannedStart: a.plannedStart,
        plannedEnd: a.plannedEnd,
        respondBy: a.respondBy,
        project: { reference: a.project.reference, city: a.project.city, area: a.project.area, trades: a.project.trades, areaSqft: a.project.areaSqft, floors: a.project.floors },
        contact: reveal ? { address: [a.project.address, a.project.area, a.project.city].filter(Boolean).join(", "), name: a.project.customerName, phone: a.project.customerPhone } : null,
        milestones: a.milestones.map((m) => ({ id: m.id, title: m.title, amount: m.amount ? Number(m.amount) : null, dueDate: m.dueDate, status: m.status, paidAmount: m.paidAmount ? Number(m.paidAmount) : null })),
      };
    }),
  });
}
