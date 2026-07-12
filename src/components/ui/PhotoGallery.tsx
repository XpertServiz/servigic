"use client";

import { useState } from "react";
import { ImageLightbox } from "./ImageLightbox";

export function PhotoGallery({
  urls,
  label,
  thumbClassName = "h-16 w-16",
}: {
  urls: string[];
  label: string;
  thumbClassName?: string;
}) {
  const [openIndex, setOpenIndex] = useState<number | null>(null);

  if (urls.length === 0) return null;

  const images = urls.map((url, i) => ({ url, label: urls.length > 1 ? `${label} ${i + 1}` : label }));

  return (
    <>
      <div className="flex flex-wrap gap-2">
        {urls.map((url, i) => (
          <button
            key={url}
            type="button"
            onClick={() => setOpenIndex(i)}
            className={`${thumbClassName} shrink-0 overflow-hidden rounded-[8px] border border-border-subtle transition-opacity hover:opacity-80`}
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={url} alt={label} className="h-full w-full object-cover" />
          </button>
        ))}
      </div>
      <ImageLightbox images={images} openIndex={openIndex} onClose={() => setOpenIndex(null)} onNavigate={setOpenIndex} />
    </>
  );
}
