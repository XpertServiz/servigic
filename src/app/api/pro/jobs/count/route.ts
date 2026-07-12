import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/requireRole";
import { findJobsForProvider } from "@/lib/dispatch";

export async function GET() {
  const auth = await requireRole("PROVIDER");
  if (!auth.ok) return auth.response;

  const profile = await prisma.providerProfile.findUnique({ where: { userId: auth.session.user.id } });
  if (!profile) return NextResponse.json({ count: 0 });

  const jobs = await findJobsForProvider(profile.id);
  return NextResponse.json({ count: jobs.length });
}
