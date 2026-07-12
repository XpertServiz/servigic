"use client";

import { useState } from "react";
import { toast } from "sonner";

export function OnlineToggle({ initial }: { initial: boolean }) {
  const [isOnline, setIsOnline] = useState(initial);
  const [pending, setPending] = useState(false);

  async function toggle() {
    setPending(true);
    const next = !isOnline;
    try {
      const res = await fetch("/api/provider/online", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isOnline: next }),
      });
      if (!res.ok) throw new Error();
      setIsOnline(next);
      toast.success(next ? "You're online — dispatch alerts active" : "You're offline");
    } catch {
      toast.error("Couldn't update status");
    } finally {
      setPending(false);
    }
  }

  return (
    <button
      onClick={toggle}
      disabled={pending}
      className={`flex items-center gap-3 rounded-full border px-5 py-3 font-bold transition-colors disabled:opacity-60 ${
        isOnline ? "border-secondary bg-secondary/10 text-secondary" : "border-border-subtle bg-bg-elevated text-text-muted"
      }`}
    >
      <span className={`h-2.5 w-2.5 rounded-full ${isOnline ? "bg-secondary" : "bg-text-dim"}`} />
      {isOnline ? "Online — receiving jobs" : "Offline"}
    </button>
  );
}
