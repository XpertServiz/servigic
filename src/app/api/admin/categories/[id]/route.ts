import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/requireRole";

const updateSchema = z.object({
  minPricePKR: z.number().int().min(0).optional(),
  maxPricePKR: z.number().int().min(0).optional(),
  activeCities: z.array(z.string()).optional(),
});

export async function PUT(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireRole("ADMIN");
  if (!auth.ok) return auth.response;

  const { id } = await params;
  const body = await req.json();
  const parsed = updateSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: "Invalid input" }, { status: 400 });

  const category = await prisma.serviceCategory.update({ where: { id }, data: parsed.data });
  return NextResponse.json({ category });
}

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireRole("ADMIN");
  if (!auth.ok) return auth.response;

  const { id } = await params;

  // Job.category is onDelete: Cascade — deleting a category with real jobs
  // would silently delete those jobs (and their bids/bookings). Block it
  // instead; the admin can still delete an unused category freely.
  const jobCount = await prisma.job.count({ where: { categoryId: id } });
  if (jobCount > 0) {
    return NextResponse.json(
      { error: `Can't delete — ${jobCount} job(s) exist in this category. Deactivate its cities instead.` },
      { status: 409 }
    );
  }

  await prisma.serviceCategory.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
