import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { notify } from "@/lib/notify";

const schema = z.object({
  companyName: z.string().trim().min(2).max(120),
  contactName: z.string().trim().min(2).max(120),
  phone: z.string().trim().min(8).max(20),
  email: z.string().trim().email().optional().or(z.literal("")),
  unitCount: z.number().int().positive().max(100_000).optional(),
  city: z.string().trim().max(60).optional(),
  notes: z.string().trim().max(500).optional(),
});

export async function POST(req: Request) {
  const body = await req.json();
  const parsed = schema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Invalid input" }, { status: 400 });

  const entry = await prisma.businessWaitlistEntry.create({
    data: { ...parsed.data, email: parsed.data.email || undefined },
  });

  const admins = await prisma.user.findMany({ where: { role: "ADMIN" }, select: { id: true } });
  await Promise.allSettled(
    admins.map((a) =>
      notify({
        userId: a.id,
        type: "SYSTEM",
        title: "New Servigic for Business waitlist signup",
        body: `${parsed.data.companyName} — ${parsed.data.contactName} · ${parsed.data.phone}`,
        linkUrl: "/admin/business-waitlist",
      })
    )
  );

  return NextResponse.json({ id: entry.id });
}
