"use client";

import { useEffect, useRef, useState } from "react";
import { useTranslations } from "next-intl";
import { LogoMark3D } from "@/components/brand/LogoMark3D";

/**
 * YouTube demo that autoplays (muted, as browsers require) the moment it
 * scrolls into view, pauses when it leaves, and offers a one-tap unmute.
 * The iframe is only created once the slot is visible, so it never costs the
 * page any load time above the fold. With no video configured it renders a
 * branded "coming soon" card instead, so the slot is already designed in.
 */
export function AutoVideo({ videoId, title }: { videoId: string | null; title: string }) {
  const t = useTranslations("video");
  const box = useRef<HTMLDivElement>(null);
  const frame = useRef<HTMLIFrameElement>(null);
  const [mounted, setMounted] = useState(false);
  const [muted, setMuted] = useState(true);

  const command = (func: string) => {
    frame.current?.contentWindow?.postMessage(JSON.stringify({ event: "command", func, args: [] }), "*");
  };

  useEffect(() => {
    const el = box.current;
    if (!el || !videoId) return;
    if (typeof IntersectionObserver === "undefined") {
      const id = setTimeout(() => setMounted(true), 0);
      return () => clearTimeout(id);
    }
    const io = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setMounted(true);
          command("playVideo");
        } else {
          command("pauseVideo");
        }
      },
      { threshold: 0.4 },
    );
    io.observe(el);
    return () => io.disconnect();
  }, [videoId]);

  if (!videoId) {
    return (
      <div className="sv-card relative grid aspect-video w-full place-items-center overflow-hidden">
        <div className="sv-grid-bg absolute inset-0" aria-hidden />
        <div className="sv-glow absolute inset-[15%]" aria-hidden />
        <div className="relative flex flex-col items-center gap-3 px-6 text-center">
          <LogoMark3D size={64} />
          <p className="text-lg font-bold">{t("soon")}</p>
          <p className="max-w-sm text-sm text-text-muted">{t("soonSub")}</p>
        </div>
      </div>
    );
  }

  const src = `https://www.youtube-nocookie.com/embed/${videoId}?autoplay=1&mute=1&playsinline=1&loop=1&playlist=${videoId}&rel=0&modestbranding=1&enablejsapi=1`;

  return (
    <div ref={box} className="sv-card relative aspect-video w-full overflow-hidden bg-black">
      {mounted ? (
        <iframe
          ref={frame}
          className="absolute inset-0 h-full w-full"
          src={src}
          title={title}
          loading="lazy"
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; fullscreen"
          allowFullScreen
        />
      ) : (
        <div className="absolute inset-0 grid place-items-center" aria-hidden>
          <LogoMark3D size={56} />
        </div>
      )}
      {mounted && (
        <button
          type="button"
          onClick={() => {
            command(muted ? "unMute" : "mute");
            setMuted((m) => !m);
          }}
          className="sv-glass absolute bottom-3 end-3 rounded-full px-3.5 py-2 text-xs font-semibold text-text transition-colors hover:border-accent/60"
        >
          {muted ? `🔊 ${t("unmute")}` : `🔇 ${t("mute")}`}
        </button>
      )}
    </div>
  );
}
