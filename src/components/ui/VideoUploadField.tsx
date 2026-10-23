"use client";

import { toast } from "sonner";
import { UploadButton } from "@/lib/uploadthing";

/** One optional short video of the problem (max 32 MB / 30 s, see src/lib/mediaLimits.ts). */
export function VideoUploadField({ url, onChange }: { url: string | null; onChange: (url: string | null) => void }) {
  if (url) {
    return (
      <div className="flex flex-col gap-2">
        <video src={url} controls preload="metadata" className="max-h-64 w-full max-w-sm rounded-[12px] border border-border-subtle bg-black" />
        <button type="button" onClick={() => onChange(null)} className="self-start text-sm font-semibold text-danger underline-offset-2 hover:underline">
          Remove video
        </button>
      </div>
    );
  }
  return (
    <UploadButton
      endpoint="jobVideo"
      onClientUploadComplete={(res) => {
        const u = res?.[0]?.ufsUrl;
        if (u) onChange(u);
      }}
      onUploadError={(e) => {
        const tooBig = /size|large|FileSizeMismatch/i.test(e.message);
        toast.error(tooBig ? "Video size limit exceeded. Please upload a video of at most 32 MB (about 30 seconds)." : e.message);
      }}
      appearance={{
        button: "rounded-full border border-accent bg-transparent px-4 py-2 text-sm font-semibold text-accent ut-uploading:opacity-60",
        allowedContent: "text-xs text-text-muted",
      }}
      content={{
        button: ({ isUploading }) => (isUploading ? "Uploading video…" : "+ Add a short video"),
        allowedContent: "Optional · max 32 MB · up to 30 seconds",
      }}
    />
  );
}
