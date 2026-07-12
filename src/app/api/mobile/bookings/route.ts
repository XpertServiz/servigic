import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/requireRole";
import { runExpirySweep } from "@/lib/expiry";

export async function GET() {
  const auth = await requireRole("CUSTOMER", "PROVIDER");
  if (!auth.ok) return auth.response;

  await runExpirySweep();

  const isProvider = auth.session.user.role === "PROVIDER";
  const bookings = await prisma.booking.findMany({
    where: isProvider ? { providerUserId: auth.session.user.id } : { customerId: auth.session.user.id },
    orderBy: { createdAt: "desc" },
    include: { job: { include: { category: true } } },
  });

  return NextResponse.json({
    bookings: bookings.map((b) => ({
      id: b.id,
      status: b.status,
      totalPKR: b.totalPKR,
      payoutPKR: b.payoutPKR,
      jobTitle: b.job.title,
      categoryIcon: b.job.category.icon,
    })),
  });
}
