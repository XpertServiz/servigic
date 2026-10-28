import { prisma } from "@/lib/prisma";
import { getMarkets, marketForCity } from "@/lib/marketConfig";

// The face check for pros: every time the app is opened (and after login) the pro takes a live selfie that is matched with
// his ID card photo and his profile photo (lib/faceMatch.ts). A pass is valid for FACE_VALID_MS on the server, so going
// online and bidding also need a recent pass - an old app that never asks cannot skip it.
export const FACE_VALID_MS = 24 * 60 * 60 * 1000;
export const FACE_MAX_FAILS = 3;

export type FaceMode = "off" | "saudi" | "all";

/** Is the face check switched on for this pro (the setting, and for "saudi" the country of his city)? */
export async function faceCheckRequired(userId: string): Promise<boolean> {
  const settings = await prisma.siteSettings.findUnique({ where: { id: "singleton" }, select: { faceVerifyMode: true } }).catch(() => null);
  const mode = (settings?.faceVerifyMode ?? "all") as FaceMode;
  if (mode === "off") return false;
  if (mode === "all") return true;
  const user = await prisma.user.findUnique({ where: { id: userId }, select: { city: true } });
  const market = user?.city ? marketForCity(await getMarkets(), user.city) : null;
  return market?.countryCode === "SA";
}

/** The face check compares the live selfie with the ID card photo and the profile photo: without either there is nothing to compare with. */
export function hasFaceReference(p: { cnicUrl: string | null; selfieUrl: string | null }): boolean {
  return Boolean(p.cnicUrl || p.selfieUrl);
}

export function faceIsFresh(p: { faceVerifiedAt: Date | null }, now = Date.now()): boolean {
  return p.faceVerifiedAt != null && now - p.faceVerifiedAt.getTime() <= FACE_VALID_MS;
}

/** null = fine; otherwise the reason the pro may not go online or bid right now. */
export async function faceBlock(
  userId: string,
  p: { faceVerifiedAt: Date | null; faceReviewAt: Date | null; cnicUrl: string | null; selfieUrl: string | null },
): Promise<{ code: "FACE_REQUIRED" | "FACE_REVIEW"; message: string } | null> {
  // Documents still to come: the verification flow (documents, then an admin) handles that, not the face check.
  if (!hasFaceReference(p)) return null;
  if (!(await faceCheckRequired(userId))) return null;
  if (p.faceReviewAt) return { code: "FACE_REVIEW", message: "Your face check is waiting for approval by Servigic support." };
  if (!faceIsFresh(p)) return { code: "FACE_REQUIRED", message: "Please do the face check first: close and open the app, then take the selfie." };
  return null;
}
