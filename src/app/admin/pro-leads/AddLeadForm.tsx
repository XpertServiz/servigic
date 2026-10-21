"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

const box = "rounded-[10px] border border-border-subtle bg-bg-elevated px-3 py-2 text-sm outline-none focus:border-accent";

// Quick manual add (works on the phone in the Admin app too): name, phone, trade in any wording, area.
export function AddLeadForm() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [v, setV] = useState({ name: "", phone: "", trade: "", area: "", city: "Karachi", shop: "" });
  const [busy, setBusy] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    try {
      const res = await fetch("/api/admin/pro-leads", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ ...v, countryCode: "PK" }) });
      const data = await res.json();
      if (!res.ok) return toast.error(data.error ?? "Could not add the lead.");
      toast.success(data.action === "created" ? "Lead added" : "That number was already a lead: updated it");
      setV({ ...v, name: "", phone: "", trade: "", area: "", shop: "" });
      router.refresh();
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="mb-5">
      <button type="button" onClick={() => setOpen(!open)} className="rounded-full border border-accent/50 px-4 py-2 text-sm font-semibold text-accent">{open ? "Close" : "+ Add a lead"}</button>
      {open && (
        <form onSubmit={submit} className="mt-3 flex flex-wrap items-end gap-3 rounded-[14px] border border-border-subtle p-4">
          <input required placeholder="Name" value={v.name} onChange={(e) => setV({ ...v, name: e.target.value })} className={`${box} w-44`} />
          <input required placeholder="Phone (03xx…)" dir="ltr" value={v.phone} onChange={(e) => setV({ ...v, phone: e.target.value })} className={`${box} w-44`} />
          <input placeholder="Trade (any wording)" value={v.trade} onChange={(e) => setV({ ...v, trade: e.target.value })} className={`${box} w-44`} />
          <input placeholder="Area" value={v.area} onChange={(e) => setV({ ...v, area: e.target.value })} className={`${box} w-40`} />
          <input placeholder="City" value={v.city} onChange={(e) => setV({ ...v, city: e.target.value })} className={`${box} w-32`} />
          <input placeholder="Shop (optional)" value={v.shop} onChange={(e) => setV({ ...v, shop: e.target.value })} className={`${box} w-40`} />
          <button type="submit" disabled={busy} className="rounded-full bg-accent px-5 py-2 text-sm font-semibold text-accent-foreground disabled:opacity-60">Add</button>
        </form>
      )}
    </div>
  );
}
