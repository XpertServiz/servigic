import { NextResponse } from "next/server";
import { UTApi } from "uploadthing/server";
import { requireRole } from "@/lib/requireRole";

// React Native has no UploadThing browser SDK, so mobile apps multipart-POST
// a file here and this route uploads it server-side with the same API key —
// same UploadThing bucket the web app uses, just a different entry path.
const utapi = new UTApi();

const MAX_BYTES = 4 * 1024 * 1024;

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
  if (file.size > MAX_BYTES) {
    return NextResponse.json({ error: "File too large (max 4MB)" }, { status: 400 });
  }

  const result = await utapi.uploadFiles(file);
  if (result.error) {
    return NextResponse.json({ error: result.error.message }, { status: 502 });
  }

  return NextResponse.json({ url: result.data.ufsUrl });
}
