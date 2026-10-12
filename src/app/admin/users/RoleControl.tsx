"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

type Role = "ADMIN" | "SUPPORT" | "CUSTOMER";

// Add more reviewers/admins so Pro verification never waits on a single person.
export function RoleControl({ userId, role, isSelf }: { userId: string; role: string; isSelf: boolean }) {
  const router = useRouter();
  const [pending, setPending] = useState(false);

  if (isSelf || role === "PROVIDER") return <span className="text-xs text-text-muted">—</span>;

  async function change(next: Role) {
    setPending(true);
    try {
      const res = await fetch(`/api/admin/users/${userId}/role`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ role: next }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error ?? "Failed");
      toast.success(`Role set to ${next}`);
      router.refresh();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed");
    } finally {
      setPending(false);
    }
  }

  return (
    <select
      disabled={pending}
      value={role}
      onChange={(e) => change(e.target.value as Role)}
      className="rounded-md border border-border-subtle bg-bg px-2 py-1 text-xs"
      aria-label="Role"
    >
      <option value="CUSTOMER">Customer</option>
      <option value="SUPPORT">Reviewer (verification only)</option>
      <option value="ADMIN">Admin</option>
    </select>
  );
}
