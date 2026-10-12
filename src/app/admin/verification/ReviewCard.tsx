"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

export interface ReviewItem {
  id: string;
  name: string;
  phone: string;
  city: string | null;
  cnicUrl: string;
  selfieUrl: string;
  policeCertUrl: string | null;
  ocr: { fullName?: string; idNumber?: string; dob?: string; address?: string; rawLines?: string[] } | null;
  hoursWaiting: number;
  overdue: boolean;
}

const REJECT_REASONS = [
  "ID photo is blurry or cut off",
  "Selfie does not match the ID photo",
  "Selfie must show your face clearly",
  "Name on the ID does not match your account",
];

export function ReviewCard({ item }: { item: ReviewItem }) {
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const [rejecting, setRejecting] = useState(false);
  const [reason, setReason] = useState(REJECT_REASONS[0]);

  async function submit(body: { action: "approve" } | { action: "reject"; reason: string }) {
    setPending(true);
    try {
      const res = await fetch(`/api/admin/verification/${item.id}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error ?? "Failed");
      toast.success(body.action === "approve" ? `${item.name} approved` : `${item.name} rejected`);
      router.refresh();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed");
    } finally {
      setPending(false);
    }
  }

  const fields: { label: string; value?: string }[] = [
    { label: "Name on ID", value: item.ocr?.fullName },
    { label: "ID number", value: item.ocr?.idNumber },
    { label: "Date of birth", value: item.ocr?.dob },
    { label: "Address", value: item.ocr?.address },
  ];

  return (
    <div className="rounded-[14px] border border-border-subtle bg-bg-elevated p-5">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
        <div>
          <div className="text-lg font-bold">{item.name}</div>
          <div className="text-sm text-text-muted">
            {item.phone}
            {item.city ? ` · ${item.city}` : ""}
          </div>
        </div>
        <span
          className={`rounded-full border px-3 py-1 text-xs font-bold ${
            item.overdue ? "border-danger/40 bg-danger/10 text-danger" : "border-border-subtle text-text-muted"
          }`}
        >
          Waiting {item.hoursWaiting}h{item.overdue ? " — overdue" : ""}
        </span>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <figure>
          <figcaption className="mb-1 text-xs font-semibold uppercase tracking-wide text-text-muted">ID photo</figcaption>
          <a href={item.cnicUrl} target="_blank" rel="noreferrer">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={item.cnicUrl} alt="ID" className="max-h-80 w-full rounded-lg border border-border-subtle object-contain bg-black/20" />
          </a>
        </figure>
        <figure>
          <figcaption className="mb-1 text-xs font-semibold uppercase tracking-wide text-text-muted">Selfie</figcaption>
          <a href={item.selfieUrl} target="_blank" rel="noreferrer">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={item.selfieUrl} alt="Selfie" className="max-h-80 w-full rounded-lg border border-border-subtle object-contain bg-black/20" />
          </a>
        </figure>
      </div>

      <div className="mt-4 rounded-lg border border-border-subtle p-4">
        <div className="mb-2 text-xs font-semibold uppercase tracking-wide text-text-muted">
          Read automatically from the ID (check against the photo)
        </div>
        {item.ocr ? (
          <dl className="grid gap-x-6 gap-y-2 text-sm sm:grid-cols-2">
            {fields.map((f) => (
              <div key={f.label}>
                <dt className="text-xs text-text-muted">{f.label}</dt>
                <dd className="font-semibold">{f.value || <span className="text-text-muted">not detected</span>}</dd>
              </div>
            ))}
          </dl>
        ) : (
          <p className="text-sm text-text-muted">No text could be read from this photo — check the ID by eye.</p>
        )}
        {item.policeCertUrl && (
          <a href={item.policeCertUrl} target="_blank" rel="noreferrer" className="mt-3 inline-block text-sm font-semibold text-accent">
            Police certificate attached →
          </a>
        )}
      </div>

      {!rejecting ? (
        <div className="mt-4 flex flex-wrap gap-3">
          <button
            disabled={pending}
            onClick={() => submit({ action: "approve" })}
            className="rounded-[10px] bg-secondary px-5 py-2.5 text-sm font-bold text-black disabled:opacity-50"
          >
            Approve
          </button>
          <button
            disabled={pending}
            onClick={() => setRejecting(true)}
            className="rounded-[10px] border border-danger/40 px-5 py-2.5 text-sm font-bold text-danger disabled:opacity-50"
          >
            Reject…
          </button>
        </div>
      ) : (
        <div className="mt-4 grid gap-3">
          <select
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            className="w-full rounded-[10px] border border-border-subtle bg-bg px-3 py-2.5 text-sm"
          >
            {REJECT_REASONS.map((r) => (
              <option key={r}>{r}</option>
            ))}
          </select>
          <div className="flex gap-3">
            <button
              disabled={pending}
              onClick={() => submit({ action: "reject", reason })}
              className="rounded-[10px] bg-danger px-5 py-2.5 text-sm font-bold text-white disabled:opacity-50"
            >
              Confirm rejection
            </button>
            <button disabled={pending} onClick={() => setRejecting(false)} className="px-3 text-sm text-text-muted">
              Back
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
