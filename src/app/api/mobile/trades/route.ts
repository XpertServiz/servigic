import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

// Public (works before sign-in, e.g. on the Pro sign-up screen): the names and icons of the categories, so a category an admin
// created (Admin > Categories) shows up in the apps by its own name.
export async function GET() {
  const rows = await prisma.serviceCategory.findMany({ select: { trade: true, name: true, icon: true }, orderBy: { name: "asc" } }).catch(() => []);
  return NextResponse.json({ trades: rows });
}
