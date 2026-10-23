import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/requireRole";
import { DOC_TYPES, backfillDocuments, docSettings, submitDocument, viewStatus } from "@/lib/proDocuments";

// The pro's documents with their status (Valid, Expiring soon, Expired, Pending approval, Rejected) and expiry dates.
export async function GET() {
  const auth = await requireRole("PROVIDER");
  if (!auth.ok) return auth.response;
  const profile = await prisma.providerProfile.findUnique({ where: { userId: auth.session.user.id }, select: { id: true, documentsBlockedAt: true, documentsBlockedReason: true } });
  if (!profile) return NextResponse.json({ documents: [] });
  await backfillDocuments(profile.id);
  const [{ alertDays, mandatory }, docs] = await Promise.all([
    docSettings(),
    prisma.providerDocument.findMany({ where: { providerId: profile.id, status: { not: "SUPERSEDED" } }, orderBy: [{ type: "asc" }, { submittedAt: "desc" }] }),
  ]);
  return NextResponse.json({
    documents: docs.map((d) => ({ id: d.id, type: d.type, label: d.label, fileUrl: d.fileUrl, expiresAt: d.expiresAt, status: viewStatus(d, alertDays), rejectReason: d.rejectReason, submittedAt: d.submittedAt, mandatory: mandatory.includes(d.type) })),
    blocked: profile.documentsBlockedAt ? { since: profile.documentsBlockedAt, reason: profile.documentsBlockedReason } : null,
    reviewHours: "24-48",
  });
}

const schema = z.object({
  type: z.enum(DOC_TYPES),
  label: z.string().trim().min(2).max(80),
  fileUrl: z.string().url(),
  expiresAt: z.string().datetime().nullable().optional(),
});

// A new or replacement document: saved as Pending approval; the current one stays active until an admin approves.
export async function POST(req: Request) {
  const auth = await requireRole("PROVIDER");
  if (!auth.ok) return auth.response;
  const parsed = schema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Invalid document" }, { status: 400 });
  const profile = await prisma.providerProfile.findUnique({ where: { userId: auth.session.user.id }, select: { id: true } });
  if (!profile) return NextResponse.json({ error: "Not found" }, { status: 404 });
  const pending = await prisma.providerDocument.count({ where: { providerId: profile.id, status: "PENDING" } });
  if (pending >= 5) return NextResponse.json({ error: "You already have 5 documents waiting for review. Please wait for the team to check them." }, { status: 429 });
  const doc = await submitDocument(profile.id, auth.session.user.id, { ...parsed.data, expiresAt: parsed.data.expiresAt ? new Date(parsed.data.expiresAt) : null });
  return NextResponse.json({ ok: true, id: doc.id, reviewHours: "24-48" });
}
