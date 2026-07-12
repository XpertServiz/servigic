import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/requireRole";
import { planStatusSchema } from "@/lib/validation/plan";

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireRole("CUSTOMER");
  if (!auth.ok) return auth.response;

  const { id } = await params;
  const body = await req.json();
  const parsed = planStatusSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: "Invalid status" }, { status: 400 });

  const plan = await prisma.maintenancePlan.findUnique({ where: { id } });
  if (!plan || plan.customerId !== auth.session.user.id) {
    return NextResponse.json({ error: "Plan not found" }, { status: 404 });
  }

  const updated = await prisma.maintenancePlan.update({ where: { id }, data: { status: parsed.data.status } });
  return NextResponse.json({ plan: updated });
}
