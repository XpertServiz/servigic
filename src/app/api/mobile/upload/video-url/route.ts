import { NextResponse } from "next/server";
import { z } from "zod";
import { requireRole } from "@/lib/requireRole";
import { signUpload, storedBytes } from "@/lib/directUpload";
import { STORAGE_GUARD_BYTES, VIDEO_MAX_BYTES, VIDEO_MAX_SECONDS, mb } from "@/lib/mediaLimits";
import { checkRateLimit } from "@/lib/rateLimit";

const schema = z.object({
  name: z.string().trim().min(1).max(120),
  size: z.number().int().positive(),
  type: z.string().regex(/^video\//, "Only video files"),
  durationSec: z.number().nonnegative().optional(),
});

// The Customer app asks here for a one-time upload link for its job video, then sends the video straight to UploadThing
// (it is too big to pass through our server). Size, length and type are checked first, with clear messages.
export async function POST(req: Request) {
  const auth = await requireRole("CUSTOMER");
  if (!auth.ok) return auth.response;
  const parsed = schema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Invalid video", code: "INVALID" }, { status: 400 });
  const { name, size, type, durationSec } = parsed.data;

  if (size > VIDEO_MAX_BYTES) {
    return NextResponse.json(
      { error: `Video size limit exceeded (${mb(size)} MB). Please upload a video of at most ${mb(VIDEO_MAX_BYTES)} MB: record a shorter clip (up to ${VIDEO_MAX_SECONDS} seconds).`, code: "VIDEO_TOO_LARGE", maxMb: mb(VIDEO_MAX_BYTES) },
      { status: 413 },
    );
  }
  if (durationSec !== undefined && durationSec > VIDEO_MAX_SECONDS + 1) {
    return NextResponse.json({ error: `The video is too long (${Math.round(durationSec)} s). Please upload at most ${VIDEO_MAX_SECONDS} seconds.`, code: "VIDEO_TOO_LONG", maxSeconds: VIDEO_MAX_SECONDS }, { status: 413 });
  }
  const limited = await checkRateLimit(`video-url:${auth.session.user.id}`, 10, 60 * 60);
  if (!limited.ok) return NextResponse.json({ error: "Too many video uploads. Please try again later.", code: "RATE_LIMITED" }, { status: 429 });

  const used = await storedBytes();
  if (used !== null && used > STORAGE_GUARD_BYTES) {
    return NextResponse.json({ error: "Video uploads are paused for a while. Please add a photo instead.", code: "STORAGE_FULL" }, { status: 507 });
  }

  const signed = await signUpload({ name: name.replace(/[^\w.\-]+/g, "_"), size, type });
  return NextResponse.json(signed);
}
