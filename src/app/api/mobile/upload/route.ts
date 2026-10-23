import { NextResponse } from "next/server";
import { UTApi } from "uploadthing/server";
import { requireRole } from "@/lib/requireRole";
import { PHOTO_MAX_BYTES, mb } from "@/lib/mediaLimits";

// React Native has no UploadThing browser SDK, so mobile apps multipart-POST
// a file here and this route uploads it server-side with the same API key —
// same UploadThing bucket the web app uses, just a different entry path.
const utapi = new UTApi();


export async function POST(req: Request) {
  const auth = await requireRole("CUSTOMER", "PROVIDER");
  if (!auth.ok) return auth.response;

  const formData = await req.formData();
  // @types/node's undici FormData type and lib.dom's disagree on .get()'s
  // signature in this TS/Next combo — cast at the boundary, runtime is fine.
  const file = (formData as unknown as { get(key: string): File | null }).get("file");
  if (!(file instanceof File)) {
    return NextResponse.json({ error: "No file provided" }, { status: 400 });
  }
  if (file.size > PHOTO_MAX_BYTES) {
    return NextResponse.json(
      { error: `Image size limit exceeded (${mb(file.size)} MB). Please upload an image of at most ${mb(PHOTO_MAX_BYTES)} MB.`, code: "IMAGE_TOO_LARGE", maxMb: mb(PHOTO_MAX_BYTES) },
      { status: 413 },
    );
  }

  const result = await utapi.uploadFiles(file);
  if (result.error) {
    return NextResponse.json({ error: result.error.message }, { status: 502 });
  }

  return NextResponse.json({ url: result.data.ufsUrl });
}
