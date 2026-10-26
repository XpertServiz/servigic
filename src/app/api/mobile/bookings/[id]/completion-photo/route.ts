import { NextResponse } from "next/server";
import { UTApi } from "uploadthing/server";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/requireRole";
import { fileKeyOf } from "@/lib/directUpload";
import { mb } from "@/lib/mediaLimits";

// "Photo of finished work": one optional photo the pro adds while the job is in progress or right after. Kept small
// (2 MB) to stay inside UploadThing's free storage, and deleted with the job's other media 24 hours after the job ends.
const COMPLETION_PHOTO_MAX_BYTES = 2 * 1024 * 1024;
const utapi = new UTApi();

async function ownBooking(id: string, userId: string) {
  const booking = await prisma.booking.findUnique({ where: { id }, select: { providerUserId: true, status: true, completionPhotoUrl: true } });
  if (!booking || booking.providerUserId !== userId) return null;
  return booking;
}

async function removeFile(url: string | null) {
  const key = url ? fileKeyOf(url) : null;
  if (key) await utapi.deleteFiles([key]).catch((e) => console.error("[completion-photo] delete", e));
}

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireRole("PROVIDER");
  if (!auth.ok) return auth.response;
  const { id } = await params;
  const booking = await ownBooking(id, auth.session.user.id);
  if (!booking) return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (!["ARRIVED", "WORKING", "DONE", "COMPLETED"].includes(booking.status)) {
    return NextResponse.json({ error: "Add the photo once you are working on the job." }, { status: 409 });
  }

  const formData = await req.formData();
  const file = (formData as unknown as { get(key: string): File | null }).get("file");
  if (!(file instanceof File)) return NextResponse.json({ error: "No file provided" }, { status: 400 });
  if (!file.type.startsWith("image/")) return NextResponse.json({ error: "Only photos can be added here." }, { status: 400 });
  if (file.size > COMPLETION_PHOTO_MAX_BYTES) {
    return NextResponse.json(
      { error: `Photo is ${mb(file.size)} MB. Please use a photo under ${mb(COMPLETION_PHOTO_MAX_BYTES)} MB.`, code: "IMAGE_TOO_LARGE", maxMb: mb(COMPLETION_PHOTO_MAX_BYTES) },
      { status: 413 },
    );
  }

  const result = await utapi.uploadFiles(file);
  if (result.error) return NextResponse.json({ error: result.error.message }, { status: 502 });
  await prisma.booking.update({ where: { id }, data: { completionPhotoUrl: result.data.ufsUrl } });
  await removeFile(booking.completionPhotoUrl);
  return NextResponse.json({ url: result.data.ufsUrl });
}

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireRole("PROVIDER");
  if (!auth.ok) return auth.response;
  const { id } = await params;
  const booking = await ownBooking(id, auth.session.user.id);
  if (!booking) return NextResponse.json({ error: "Not found" }, { status: 404 });
  await prisma.booking.update({ where: { id }, data: { completionPhotoUrl: null } });
  await removeFile(booking.completionPhotoUrl);
  return NextResponse.json({ ok: true });
}
