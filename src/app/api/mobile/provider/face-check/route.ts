import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/requireRole";
import { faceCheckRequired, faceIsFresh, FACE_MAX_FAILS } from "@/lib/faceCheck";
import { faceDescriptor, faceDistance, matchScore } from "@/lib/faceMatch";

export const maxDuration = 60;

const SELFIE_MAX_BYTES = 3.5 * 1024 * 1024;

async function fetchImage(url: string | null): Promise<Buffer | null> {
  if (!url) return null;
  try {
    const res = await fetch(url);
    return res.ok ? Buffer.from(await res.arrayBuffer()) : null;
  } catch {
    return null;
  }
}

/** The faces of the ID card photo and the profile photo, cached until either photo changes. */
async function referenceFaces(p: { id: string; cnicUrl: string | null; selfieUrl: string | null; faceRef: unknown; faceRefKey: string | null }): Promise<number[][]> {
  const key = `${p.cnicUrl ?? ""}|${p.selfieUrl ?? ""}`;
  if (p.faceRefKey === key && Array.isArray(p.faceRef)) return p.faceRef as number[][];
  const faces: number[][] = [];
  for (const url of [p.cnicUrl, p.selfieUrl]) {
    const img = await fetchImage(url);
    const d = img ? await faceDescriptor(img).catch(() => null) : null;
    if (d) faces.push(d);
  }
  await prisma.providerProfile.update({ where: { id: p.id }, data: { faceRef: faces, faceRefKey: key } });
  return faces;
}

// GET: does the app have to show the face check now?
export async function GET() {
  const auth = await requireRole("PROVIDER");
  if (!auth.ok) return auth.response;
  const p = await prisma.providerProfile.findUnique({ where: { userId: auth.session.user.id }, select: { faceVerifiedAt: true, faceFailCount: true, faceReviewAt: true, selfieUrl: true } });
  if (!p) return NextResponse.json({ required: false });
  const required = await faceCheckRequired(auth.session.user.id);
  return NextResponse.json({ required, locked: Boolean(p.faceReviewAt), attemptsLeft: Math.max(0, FACE_MAX_FAILS - p.faceFailCount), recentlyVerified: faceIsFresh(p) });
}

// POST (multipart "file"): the live selfie. Matched in memory and never stored.
export async function POST(req: Request) {
  const auth = await requireRole("PROVIDER");
  if (!auth.ok) return auth.response;
  const userId = auth.session.user.id;
  const p = await prisma.providerProfile.findUnique({ where: { userId } });
  if (!p) return NextResponse.json({ error: "No profile" }, { status: 404 });
  if (!(await faceCheckRequired(userId))) return NextResponse.json({ ok: true, skipped: true });
  if (p.faceReviewAt) return NextResponse.json({ ok: false, code: "REVIEW", message: "Your face check is waiting for approval by Servigic support.", attemptsLeft: 0 }, { status: 423 });

  const formData = await req.formData();
  const file = (formData as unknown as { get(key: string): File | null }).get("file");
  if (!(file instanceof File)) return NextResponse.json({ error: "No photo" }, { status: 400 });
  if (file.size > SELFIE_MAX_BYTES) return NextResponse.json({ error: "Photo too large. Please try again." }, { status: 413 });

  const settings = await prisma.siteSettings.findUnique({ where: { id: "singleton" }, select: { faceMatchMinPct: true } });
  const minPct = settings?.faceMatchMinPct ?? 50;

  let live: number[] | null;
  try {
    live = await faceDescriptor(Buffer.from(await file.arrayBuffer()));
  } catch (e) {
    console.error("[face-check]", e);
    return NextResponse.json({ error: "The face check is not available right now. Please try again in a minute." }, { status: 503 });
  }
  // No face in the picture is not a failed match: just ask again.
  if (!live) return NextResponse.json({ ok: false, code: "NO_FACE", message: "No face found. Look straight at the camera in good light.", attemptsLeft: Math.max(0, FACE_MAX_FAILS - p.faceFailCount) });

  const refs = await referenceFaces(p).catch(() => [] as number[][]);
  if (refs.length === 0) {
    // His photos have no readable face: a person has to look at it.
    await prisma.providerProfile.update({ where: { id: p.id }, data: { faceReviewAt: new Date() } });
    return NextResponse.json({ ok: false, code: "REVIEW", message: "We could not read your ID photo. Servigic support will check your account.", attemptsLeft: 0 }, { status: 423 });
  }

  const score = Math.max(...refs.map((r) => matchScore(faceDistance(live!, r))));
  if (score >= minPct) {
    await prisma.providerProfile.update({ where: { id: p.id }, data: { faceVerifiedAt: new Date(), faceFailCount: 0, faceLastScore: score, faceReviewAt: null } });
    return NextResponse.json({ ok: true });
  }
  const fails = p.faceFailCount + 1;
  await prisma.providerProfile.update({ where: { id: p.id }, data: { faceFailCount: fails, faceLastScore: score, ...(fails >= FACE_MAX_FAILS ? { faceReviewAt: new Date() } : {}) } });
  return NextResponse.json({ ok: false, code: fails >= FACE_MAX_FAILS ? "REVIEW" : "NO_MATCH", message: "The face did not match your ID.", attemptsLeft: Math.max(0, FACE_MAX_FAILS - fails) }, { status: fails >= FACE_MAX_FAILS ? 423 : 200 });
}
