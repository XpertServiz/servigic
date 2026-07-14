"use client";

import { useState } from "react";
import { toast } from "sonner";
import { UploadButton } from "@/lib/uploadthing";
import { PhotoGallery } from "./PhotoGallery";

export function PhotoUploadField({
  endpoint,
  urls,
  onAdd,
  maxCount,
  label,
  thumbClassName = "h-16 w-16",
}: {
  endpoint: "jobPhotos" | "paymentProof" | "providerDocs" | "disputePhotos" | "changeOrderPhoto";
  urls: string[];
  onAdd: (newUrls: string[]) => void;
  maxCount: number;
  label: string;
  thumbClassName?: string;
}) {
  const [progress, setProgress] = useState<number | null>(null);

  return (
    <div>
      {urls.length > 0 && (
        <div className="mb-2">
          <PhotoGallery urls={urls} label={label} thumbClassName={thumbClassName} />
        </div>
      )}

      {urls.length < maxCount && (
        <div>
          <UploadButton
            endpoint={endpoint}
            appearance={{
              container: "w-auto items-start",
              button:
                "h-9 rounded-[8px] bg-accent px-4 text-xs font-bold text-accent-foreground after:hidden ut-uploading:bg-accent/60 focus-within:ring-0",
              allowedContent: "text-[11px] text-text-muted",
            }}
            content={{
              button: ({ isUploading }) => (isUploading ? `Uploading…` : `+ Add ${label}`),
            }}
            onUploadProgress={(p) => setProgress(p)}
            onClientUploadComplete={(res) => {
              setProgress(null);
              onAdd(res.map((r) => r.ufsUrl));
            }}
            onUploadError={(e) => {
              setProgress(null);
              toast.error(e.message);
            }}
          />
          {progress !== null && (
            <div className="mt-2 h-1.5 w-40 overflow-hidden rounded-full bg-bg-elevated-2">
              <div
                className="h-full rounded-full bg-accent transition-[width] duration-150"
                style={{ width: `${progress}%` }}
              />
            </div>
          )}
        </div>
      )}
    </div>
  );
}
