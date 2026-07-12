"use client";

import { useRef, useState } from "react";
import { toast } from "sonner";
import { UploadButton } from "@/lib/uploadthing";
import { SquarePhotoCropModal } from "./SquarePhotoCropModal";
import { PhotoGallery } from "./PhotoGallery";

// Provider Photo Standardization Addendum v3 — zero-cost, client-side-only
// quality gate: reject anything below MIN_DIMENSION, force a square crop
// before it ever reaches UploadThing. No AI processing, no per-image cost.
const MIN_DIMENSION = 400;

function checkMinResolution(file: File): Promise<boolean> {
  return new Promise((resolve) => {
    const img = new Image();
    const objectUrl = URL.createObjectURL(file);
    img.onload = () => {
      URL.revokeObjectURL(objectUrl);
      resolve(img.naturalWidth >= MIN_DIMENSION && img.naturalHeight >= MIN_DIMENSION);
    };
    img.onerror = () => {
      URL.revokeObjectURL(objectUrl);
      resolve(false);
    };
    img.src = objectUrl;
  });
}

export function SelfieUploadField({ url, onUploaded }: { url: string; onUploaded: (url: string, photoQualityOk: boolean) => void }) {
  const [cropFile, setCropFile] = useState<File | null>(null);
  const [progress, setProgress] = useState<number | null>(null);
  const resolveRef = useRef<((files: File[]) => void) | null>(null);

  async function handleBeforeUploadBegin(files: File[]): Promise<File[]> {
    const file = files[0];
    if (!file) return files;

    const okResolution = await checkMinResolution(file);
    if (!okResolution) {
      toast.error(`Photo too small — please use one at least ${MIN_DIMENSION}×${MIN_DIMENSION}px`);
      return [];
    }

    return new Promise((resolve) => {
      resolveRef.current = resolve;
      setCropFile(file);
    });
  }

  function onCropConfirm(blob: Blob) {
    const croppedFile = new File([blob], "avatar.jpg", { type: "image/jpeg" });
    setCropFile(null);
    resolveRef.current?.([croppedFile]);
    resolveRef.current = null;
  }

  function onCropCancel() {
    setCropFile(null);
    resolveRef.current?.([]);
    resolveRef.current = null;
  }

  return (
    <div>
      {url && (
        <div className="mb-2">
          <PhotoGallery urls={[url]} label="Selfie" thumbClassName="h-20 w-20 rounded-full" />
        </div>
      )}
      <UploadButton
        endpoint="providerDocs"
        appearance={{
          container: "w-auto items-start",
          button:
            "h-9 rounded-[8px] bg-accent px-4 text-xs font-bold text-accent-foreground after:hidden ut-uploading:bg-accent/60",
          allowedContent: "text-[11px] text-text-muted",
        }}
        content={{ button: ({ isUploading }) => (isUploading ? "Uploading…" : url ? "Replace Selfie" : "+ Add Selfie") }}
        onBeforeUploadBegin={handleBeforeUploadBegin}
        onUploadProgress={(p) => setProgress(p)}
        onClientUploadComplete={(res) => {
          setProgress(null);
          if (res[0]) onUploaded(res[0].ufsUrl, true);
        }}
        onUploadError={(e) => {
          setProgress(null);
          toast.error(e.message);
        }}
      />
      {progress !== null && (
        <div className="mt-2 h-1.5 w-40 overflow-hidden rounded-full bg-bg-elevated-2">
          <div className="h-full rounded-full bg-accent transition-[width] duration-150" style={{ width: `${progress}%` }} />
        </div>
      )}
      {cropFile && <SquarePhotoCropModal file={cropFile} onConfirm={onCropConfirm} onCancel={onCropCancel} />}
    </div>
  );
}
