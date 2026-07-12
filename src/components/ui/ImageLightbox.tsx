"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";

export interface LightboxImage {
  url: string;
  label: string;
}

export function ImageLightbox({
  images,
  openIndex,
  onClose,
  onNavigate,
}: {
  images: LightboxImage[];
  openIndex: number | null;
  onClose: () => void;
  onNavigate: (index: number) => void;
}) {
  useEffect(() => {
    if (openIndex === null) return;
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
      if (e.key === "ArrowRight" && openIndex !== null && openIndex < images.length - 1) onNavigate(openIndex + 1);
      if (e.key === "ArrowLeft" && openIndex !== null && openIndex > 0) onNavigate(openIndex - 1);
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [openIndex, images.length, onClose, onNavigate]);

  const [mounted, setMounted] = useState(false);
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- standard SSR-safe portal mount guard (document.body doesn't exist during SSR)
    setMounted(true);
  }, []);

  if (openIndex === null || !mounted) return null;
  const current = images[openIndex];
  if (!current) return null;

  return createPortal(
    <div
      className="fixed inset-0 z-[100] flex flex-col items-center justify-center bg-black/90 p-6"
      onClick={onClose}
    >
      <div className="mb-4 flex items-center gap-4 text-sm font-semibold text-white">
        <span>
          {current.label} ({openIndex + 1}/{images.length})
        </span>
        <button onClick={onClose} className="rounded-full border border-white/30 px-3 py-1 hover:border-white">
          ✕ Close
        </button>
      </div>

      <div className="relative flex max-h-[80vh] max-w-[90vw] items-center justify-center" onClick={(e) => e.stopPropagation()}>
        {openIndex > 0 && (
          <button
            onClick={() => onNavigate(openIndex - 1)}
            className="absolute left-[-56px] flex h-10 w-10 items-center justify-center rounded-full border border-white/30 text-white hover:border-white"
            aria-label="Previous"
          >
            ‹
          </button>
        )}
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={current.url} alt={current.label} className="max-h-[80vh] max-w-[90vw] rounded-[8px] object-contain" />
        {openIndex < images.length - 1 && (
          <button
            onClick={() => onNavigate(openIndex + 1)}
            className="absolute right-[-56px] flex h-10 w-10 items-center justify-center rounded-full border border-white/30 text-white hover:border-white"
            aria-label="Next"
          >
            ›
          </button>
        )}
      </div>
    </div>,
    document.body
  );
}
