import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/requireRole";

export async function GET() {
  const auth = await requireRole("CUSTOMER", "PROVIDER");
  if (!auth.ok) return auth.response;

  const categories = await prisma.serviceCategory.findMany({
    orderBy: { name: "asc" },
    include: { subServices: { where: { active: true } } },
  });
  return NextResponse.json({ categories });
}
