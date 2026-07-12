import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/requireRole";

const schema = z.object({
  status: z.enum(["NEW", "CONTACTED", "INTERESTED", "ONBOARDED", "NOT_INTERESTED", "CALLBACK"]).optional(),
  notes: z.string().trim().max(1000).optional(),
  callbackDate: z.string().datetime().optional(),
});

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireRole("ADMIN");
  if (!auth.ok) return auth.response;

  const { id } = await params;
  const body = await req.json();
  const parsed = schema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: "Invalid input" }, { status: 400 });

  const lead = await prisma.lead.update({
    where: { id },
    data: {
      ...parsed.data,
      callbackDate: parsed.data.callbackDate ? new Date(parsed.data.callbackDate) : undefined,
    },
  });

  return NextResponse.json({ lead });
}
