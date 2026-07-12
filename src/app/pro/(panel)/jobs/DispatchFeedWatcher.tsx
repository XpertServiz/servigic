"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

const POLL_MS = 15000;

function beep() {
  try {
    const ctx = new (window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = "sine";
    osc.frequency.value = 880;
    gain.gain.setValueAtTime(0.15, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.4);
    osc.connect(gain).connect(ctx.destination);
    osc.start();
    osc.stop(ctx.currentTime + 0.4);
  } catch {
    // Web Audio unavailable — silently skip.
  }
}

export function DispatchFeedWatcher({ initialCount }: { initialCount: number }) {
  const router = useRouter();
  const [soundOn, setSoundOn] = useState(true);
  const lastCount = useRef(initialCount);

  useEffect(() => {
    const interval = setInterval(async () => {
      try {
        const res = await fetch("/api/pro/jobs/count");
        if (!res.ok) return;
        const { count } = await res.json();
        if (count > lastCount.current) {
          if (soundOn) beep();
          toast.info("New job available");
          router.refresh();
        }
        lastCount.current = count;
      } catch {
        // Network hiccup — try again next tick.
      }
    }, POLL_MS);
    return () => clearInterval(interval);
  }, [router, soundOn]);

  return (
    <button
      onClick={() => setSoundOn((s) => !s)}
      className="rounded-full border border-border-subtle px-4 py-2 text-sm font-semibold text-text-muted hover:border-accent"
    >
      {soundOn ? "🔔 Sound on" : "🔕 Sound off"}
    </button>
  );
}
