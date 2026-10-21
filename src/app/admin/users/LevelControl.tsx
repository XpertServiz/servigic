"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

// Staff level of an admin account (who may export and see full phone numbers).
export function LevelControl({ userId, level, editable }: { userId: string; level: string; editable: boolean }) {
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const label: Record<string, string> = { super_admin: "Super admin", growth_admin: "Growth admin", admin: "Admin (numbers hidden, no export)" };
  if (!editable) return <span className="text-xs text-text-muted">{label[level] ?? level}</span>;

  async function change(next: string) {
    setPending(true);
    try {
      const res = await fetch(`/api/admin/users/${userId}/level`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ level: next }) });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error ?? "Failed");
      toast.success("Level saved");
      router.refresh();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed");
    } finally {
      setPending(false);
    }
  }
  return (
    <select disabled={pending} value={level} onChange={(e) => change(e.target.value)} className="rounded-md border border-border-subtle bg-bg px-2 py-1 text-xs" aria-label="Admin level">
      <option value="super_admin">Super admin</option>
      <option value="growth_admin">Growth admin</option>
      <option value="admin">Admin (numbers hidden, no export)</option>
    </select>
  );
}
