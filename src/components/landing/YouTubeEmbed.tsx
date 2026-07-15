"use client";

import { useState } from "react";
import { youTubeThumbnailUrl } from "@/lib/youtube";

export function YouTubeEmbed({ videoId, label }: { videoId: string; label: string }) {
  const [playing, setPlaying] = useState(false);
  const [fullscreen, setFullscreen] = useState(false);

  const player = (
    <iframe
      className="h-full w-full"
      src={`https://www.youtube.com/embed/${videoId}?autoplay=1`}
      title={label}
      allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
      allowFullScreen
    />
  );

  return (
    <>
      <div className="relative aspect-video overflow-hidden rounded-[12px] border border-border-subtle bg-bg-elevated">
        {playing ? (
          player
        ) : (
          <button
            onClick={() => setPlaying(true)}
            className="group relative block h-full w-full"
            aria-label={`Play: ${label}`}
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={youTubeThumbnailUrl(videoId)} alt={label} className="h-full w-full object-cover" />
            <div className="absolute inset-0 flex items-center justify-center bg-black/30 transition group-hover:bg-black/40">
              <span className="flex h-12 w-12 items-center justify-center rounded-full bg-accent text-accent-foreground shadow-lg">
                ▶
              </span>
            </div>
            <span className="absolute bottom-2 left-2 rounded-[6px] bg-black/70 px-2 py-1 text-[11px] font-semibold text-white">
              {label}
            </span>
          </button>
        )}
        {playing && (
          <button
            onClick={() => setFullscreen(true)}
            className="absolute right-2 top-2 rounded-[6px] bg-black/70 px-2 py-1 text-[11px] font-semibold text-white hover:bg-black/90"
          >
            ⛶ Fullscreen
          </button>
        )}
      </div>

      {fullscreen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 p-6" onClick={() => setFullscreen(false)}>
          <div className="aspect-video w-full max-w-4xl" onClick={(e) => e.stopPropagation()}>
            {player}
          </div>
          <button
            onClick={() => setFullscreen(false)}
            className="absolute right-6 top-6 text-2xl font-bold text-white"
            aria-label="Close"
          >
            ✕
          </button>
        </div>
      )}
    </>
  );
}
