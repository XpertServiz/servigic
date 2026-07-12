import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/requireRole";
import { createPlanSchema } from "@/lib/validation/plan";

export async function POST(req: Request) {
  const auth = await requireRole("CUSTOMER");
  if (!auth.ok) return auth.response;

  const body = await req.json();
  const parsed = createPlanSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Invalid input" }, { status: 400 });

  const { firstVisitDate, ...data } = parsed.data;

  const plan = await prisma.maintenancePlan.create({
    data: { ...data, customerId: auth.session.user.id, nextDueDate: new Date(firstVisitDate) },
  });

  return NextResponse.json({ plan });
}
