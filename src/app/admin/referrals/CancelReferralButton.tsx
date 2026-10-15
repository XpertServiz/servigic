"use client";

import { useRouter } from "next/navigation";
import { toast } from "sonner";

export function CancelReferralButton({ id }: { id: string }) {
  const router = useRouter();
  async function cancel() {
    if (!confirm("Cancel this referral? The reward will not be paid.")) return;
    const res = await fetch(`/api/admin/referrals/${id}`, { method: "DELETE" });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) return toast.error(data.error || "Could not cancel");
    toast.success("Referral cancelled");
    router.refresh();
  }
  return (
    <button onClick={cancel} className="rounded-[8px] border border-danger/40 px-3 py-1.5 text-xs font-bold text-danger">
      Cancel
    </button>
  );
}
