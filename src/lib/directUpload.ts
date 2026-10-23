import { generateKey, generateSignedURL } from "@uploadthing/shared";
import { Micro, Redacted } from "effect";
import { UTApi } from "uploadthing/server";

// Direct uploads to UploadThing for files too big to pass through our own server (Vercel accepts at most 4.5 MB per request):
// the server checks who is uploading and how big the file is, signs a one-time upload URL for exactly that file, and the app
// sends the file straight to UploadThing. The signature covers the size and type, so nothing bigger than allowed can be sent.

interface Token {
  apiKey: string;
  appId: string;
  regions: string[];
  ingestHost?: string;
}

function readToken(): Token {
  const raw = process.env.UPLOADTHING_TOKEN;
  if (!raw) throw new Error("UPLOADTHING_TOKEN is not set");
  return JSON.parse(Buffer.from(raw, "base64").toString("utf8")) as Token;
}

export interface SignedUpload {
  uploadUrl: string; // PUT the file here as multipart form data, field "file"
  key: string;
  fileUrl: string; // where the file can be viewed once uploaded
}

export async function signUpload(file: { name: string; size: number; type: string }): Promise<SignedUpload> {
  const { apiKey, appId, regions, ingestHost } = readToken();
  const base = `https://${regions?.[0] ?? "sea1"}.${ingestHost ?? "ingest.uploadthing.com"}`;
  const meta = { name: file.name, size: file.size, type: file.type, lastModified: Date.now() };
  const key = await Micro.runPromise(generateKey(meta, appId));
  const uploadUrl = await Micro.runPromise(
    generateSignedURL(`${base}/${key}`, Redacted.make(apiKey), {
      ttlInSeconds: 15 * 60,
      data: { "x-ut-identifier": appId, "x-ut-file-name": file.name, "x-ut-file-size": file.size, "x-ut-file-type": file.type, "x-ut-content-disposition": "inline" },
    }),
  );
  return { uploadUrl, key, fileUrl: `https://${appId}.ufs.sh/f/${key}` };
}

let usageCache: { at: number; bytes: number } | null = null;

/** Total bytes stored in UploadThing (cached for 10 minutes); null if it cannot be read. */
export async function storedBytes(): Promise<number | null> {
  if (usageCache && Date.now() - usageCache.at < 10 * 60_000) return usageCache.bytes;
  try {
    const usage = await new UTApi().getUsageInfo();
    usageCache = { at: Date.now(), bytes: usage.totalBytes };
    return usage.totalBytes;
  } catch {
    return null;
  }
}

/** The UploadThing key of a stored file URL (".../f/<key>"), or null. */
export function fileKeyOf(url: string | null | undefined): string | null {
  if (!url) return null;
  const m = url.match(/\/f\/([^/?#]+)/);
  return m ? m[1] : null;
}
