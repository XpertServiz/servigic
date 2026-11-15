"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

const inputCls = "min-h-[44px] w-full rounded-xl border border-border-subtle bg-bg-elevated-2 px-3 text-sm text-text";
const btnCls = "min-h-[44px] rounded-full bg-accent px-5 text-sm font-semibold text-accent-foreground disabled:opacity-60";
const ghost = "min-h-[40px] rounded-full border border-border-subtle px-4 text-xs font-semibold";
const box = "rounded-[14px] border border-border-subtle bg-bg-elevated p-4";

type Line = { description: string; unit: string; qty: string; unitPrice: string; materialsBy: "customer" | "servigic" };
export type FlowProps = {
  id: string;
  currency: string;
  estimates: { id: string; version: number; status: string; total: number; sentAt: string }[];
  pros: { id: string; name: string; trades: string[] }[];
  assignments: { id: string; proName: string; role: string; scope: string; payout: number; status: string }[];
  milestones: { id: string; title: string; status: string; amount: number | null; assignmentId: string | null; photos: string[]; note: string | null }[];
};

export function ProjectFlow(p: FlowProps) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [lines, setLines] = useState<Line[]>([{ description: "", unit: "job", qty: "1", unitPrice: "", materialsBy: "servigic" }]);
  const [discount, setDiscount] = useState("0");
  const [validUntil, setValidUntil] = useState("");
  const [terms, setTerms] = useState("");
  const [proId, setProId] = useState("");
  const [role, setRole] = useState<"lead" | "crew">("lead");
  const [scope, setScope] = useState("");
  const [payout, setPayout] = useState("");
  const [start, setStart] = useState("");
  const [end, setEnd] = useState("");
  const [msTitle, setMsTitle] = useState("");
  const [msAmount, setMsAmount] = useState("");
  const [msAssign, setMsAssign] = useState("");

  async function send(body: object, done: string): Promise<boolean> {
    setBusy(true);
    try {
      const res = await fetch(`/api/admin/projects/${p.id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) { toast.error(data.error || "Failed"); return false; }
      toast.success(done);
      router.refresh();
      return true;
    } finally {
      setBusy(false);
    }
  }

  const setLine = (i: number, patch: Partial<Line>) => setLines((ls) => ls.map((l, k) => (k === i ? { ...l, ...patch } : l)));
  const total = Math.max(0, lines.reduce((s, l) => s + (Number(l.qty) || 0) * (Number(l.unitPrice) || 0), 0) - (Number(discount) || 0));
  const valid = lines.every((l) => l.description.trim() && Number(l.qty) > 0 && Number(l.unitPrice) >= 0 && l.unitPrice !== "");

  return (
    <div className="mt-6 flex flex-col gap-4">
      <div className={box}>
        <h3 className="mb-1 font-bold">Estimate (sent to the customer by email and in the app)</h3>
        {p.estimates.length > 0 && <p className="mb-2 text-xs text-text-muted">{p.estimates.map((e) => `v${e.version} ${p.currency} ${e.total.toLocaleString()} (${e.status.replace("_", " ")})`).join("  |  ")}</p>}
        {lines.map((l, i) => (
          <div key={i} className="mb-2 grid grid-cols-2 gap-2 sm:grid-cols-[1fr_70px_80px_110px_120px_auto]">
            <input className={`${inputCls} col-span-2 sm:col-span-1`} placeholder="Item (e.g. Concealed wiring, ground floor)" value={l.description} onChange={(e) => setLine(i, { description: e.target.value })} />
            <input className={inputCls} placeholder="Unit" value={l.unit} onChange={(e) => setLine(i, { unit: e.target.value })} />
            <input className={inputCls} type="number" placeholder="Qty" value={l.qty} onChange={(e) => setLine(i, { qty: e.target.value })} />
            <input className={inputCls} type="number" placeholder="Unit price" value={l.unitPrice} onChange={(e) => setLine(i, { unitPrice: e.target.value })} />
            <select className={inputCls} value={l.materialsBy} onChange={(e) => setLine(i, { materialsBy: e.target.value as Line["materialsBy"] })}><option value="servigic">Materials: Servigic</option><option value="customer">Materials: customer</option></select>
            <button type="button" className={ghost} onClick={() => setLines((ls) => (ls.length > 1 ? ls.filter((_, k) => k !== i) : ls))}>Remove</button>
          </div>
        ))}
        <button type="button" className={ghost} onClick={() => setLines((ls) => [...ls, { description: "", unit: "job", qty: "1", unitPrice: "", materialsBy: "servigic" }])}>Add line</button>
        <div className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-3">
          <input className={inputCls} type="number" placeholder="Discount" value={discount} onChange={(e) => setDiscount(e.target.value)} />
          <input className={inputCls} type="date" value={validUntil} onChange={(e) => setValidUntil(e.target.value)} aria-label="Valid until" />
          <div className="flex items-center text-sm font-bold">Total: {p.currency} {total.toLocaleString()}</div>
        </div>
        <textarea rows={3} className={`${inputCls} mt-2 py-2`} placeholder="Terms shown on the estimate (payment stages, what is included...)" value={terms} onChange={(e) => setTerms(e.target.value)} />
        <button disabled={busy || !valid} className={`${btnCls} mt-3`} onClick={() => send({ action: "estimate", items: lines.map((l) => ({ description: l.description, unit: l.unit || "job", qty: Number(l.qty), unitPrice: Number(l.unitPrice), materialsBy: l.materialsBy })), discount: Number(discount) || 0, validUntil: validUntil ? new Date(`${validUntil}T23:59:59`).toISOString() : null, terms: terms || null }, "Estimate sent")}>Send estimate</button>
      </div>

      <div className={box}>
        <h3 className="mb-1 font-bold">Pros (labour only)</h3>
        {p.assignments.map((a) => (
          <div key={a.id} className="mb-2 flex flex-wrap items-center justify-between gap-2 rounded-xl border border-border-subtle p-3 text-sm">
            <span><b>{a.proName}</b> ({a.role}) - {a.scope} - payout {p.currency} {a.payout.toLocaleString()} - <i>{a.status}</i></span>
            {["invited", "accepted", "active"].includes(a.status) && <button className={ghost} disabled={busy} onClick={() => { const reason = window.prompt("Reason for removing this pro?"); if (reason && reason.trim().length > 1) void send({ action: "assign_remove", assignmentId: a.id, reason }, "Removed"); }}>Remove</button>}
          </div>
        ))}
        <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
          <select className={inputCls} value={proId} onChange={(e) => setProId(e.target.value)}><option value="">Choose a verified pro...</option>{p.pros.map((x) => <option key={x.id} value={x.id}>{x.name} - {x.trades.join(", ")}</option>)}</select>
          <select className={inputCls} value={role} onChange={(e) => setRole(e.target.value as "lead" | "crew")}><option value="lead">Lead</option><option value="crew">Crew</option></select>
          <input className={`${inputCls} sm:col-span-2`} placeholder="Scope (e.g. Concealed wiring, ground floor, 6 rooms)" value={scope} onChange={(e) => setScope(e.target.value)} />
          <input className={inputCls} type="number" placeholder={`Payout to this pro (${p.currency})`} value={payout} onChange={(e) => setPayout(e.target.value)} />
          <div className="grid grid-cols-2 gap-2"><input className={inputCls} type="date" value={start} onChange={(e) => setStart(e.target.value)} aria-label="Start" /><input className={inputCls} type="date" value={end} onChange={(e) => setEnd(e.target.value)} aria-label="End" /></div>
        </div>
        <div className="mt-3 flex flex-wrap gap-2">
          <button disabled={busy || !proId || scope.trim().length < 3 || payout === ""} className={btnCls} onClick={async () => { if (await send({ action: "assign", proId, role, scope, payoutAmount: Number(payout), plannedStart: start ? new Date(start).toISOString() : null, plannedEnd: end ? new Date(end).toISOString() : null }, "Invitation sent")) { setScope(""); setPayout(""); setProId(""); } }}>Invite pro</button>
          <button disabled={busy} className={ghost} onClick={() => send({ action: "confirm_team" }, "Team confirmed")}>Confirm team (reveal address to accepted pros)</button>
        </div>
      </div>

      <div className={box}>
        <h3 className="mb-1 font-bold">Stages</h3>
        {p.milestones.map((m) => (
          <div key={m.id} className="mb-2 rounded-xl border border-border-subtle p-3 text-sm">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <span><b>{m.title}</b> {m.amount ? `- pro payout ${p.currency} ${m.amount.toLocaleString()}` : ""} - <i>{m.status}</i></span>
              <span className="flex gap-2">
                {m.status === "ready" && <button className={ghost} disabled={busy} onClick={() => send({ action: "milestone_set", milestoneId: m.id, status: "verified" }, "Stage approved")}>Approve</button>}
                {["ready", "verified"].includes(m.status) && <button className={ghost} disabled={busy} onClick={() => send({ action: "milestone_set", milestoneId: m.id, status: "paid" }, "Marked paid")}>Mark paid</button>}
              </span>
            </div>
            {m.note && <p className="mt-1 text-xs text-text-muted">Pro note: {m.note}</p>}
            {m.photos.length > 0 && <div className="mt-2 flex gap-2">{m.photos.map((u) => <a key={u} href={u} target="_blank" rel="noopener noreferrer" className="text-xs text-accent underline">photo</a>)}</div>}
          </div>
        ))}
        <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
          <input className={inputCls} placeholder="Stage (e.g. Conduit and boxes)" value={msTitle} onChange={(e) => setMsTitle(e.target.value)} />
          <input className={inputCls} type="number" placeholder="Pro payout for this stage" value={msAmount} onChange={(e) => setMsAmount(e.target.value)} />
          <select className={inputCls} value={msAssign} onChange={(e) => setMsAssign(e.target.value)}><option value="">Whole project</option>{p.assignments.filter((a) => ["accepted", "active"].includes(a.status)).map((a) => <option key={a.id} value={a.id}>{a.proName}</option>)}</select>
        </div>
        <button disabled={busy || msTitle.trim().length < 2} className={`${btnCls} mt-3`} onClick={async () => { if (await send({ action: "milestone_add", title: msTitle, amount: msAmount ? Number(msAmount) : null, assignmentId: msAssign || null }, "Stage added")) { setMsTitle(""); setMsAmount(""); } }}>Add stage</button>
      </div>
    </div>
  );
}
