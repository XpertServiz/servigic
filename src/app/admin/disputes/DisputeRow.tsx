"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import type { Dispute, Booking, Job } from "@prisma/client";

type DisputeWithRelations = Dispute & {
  booking: Booking & { job: Job; customer: { name: string }; providerUser: { name: string } };
  openedBy: { name: string; role: string };
};

const RESOLUTIONS = [
  { value: "RELEASE", label: "Release full payout" },
  { value: "PARTIAL_REFUND", label: "Partial refund (50%)" },
  { value: "FULL_REFUND", label: "Full refund" },
] as const;

type AiSummary = { summary: string; suggestedResolution: string; reasoning: string };

export function DisputeRow({ dispute, aiSummarizerEnabled }: { dispute: DisputeWithRelations; aiSummarizerEnabled: boolean }) {
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const [aiSummary, setAiSummary] = useState<AiSummary | null>(null);
  const [aiPending, setAiPending] = useState(false);

  async function resolve(resolution: (typeof RESOLUTIONS)[number]["value"]) {
    setPending(true);
    try {
      const res = await fetch(`/api/admin/disputes/${dispute.id}/resolve`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ resolution }),
      });
      if (!res.ok) throw new Error();
      toast.success("Dispute resolved");
      router.refresh();
    } catch {
      toast.error("Failed to resolve");
    } finally {
      setPending(false);
    }
  }

  async function summarizeWithAi() {
    setAiPending(true);
    try {
      const res = await fetch(`/api/ai/disputes/${dispute.id}/summarize`, { method: "POST" });
      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error || "AI summarizer isn't available right now");
        return;
      }
      setAiSummary(data);
    } finally {
      setAiPending(false);
    }
  }

  return (
    <div className="rounded-[14px] border border-danger/30 bg-bg-elevated p-5">
      <div className="mb-2 flex items-center justify-between">
        <div>
          <div className="font-bold">{dispute.booking.job.title}</div>
          <div className="text-sm text-text-muted">
            {dispute.booking.customer.name} vs {dispute.booking.providerUser.name} · Opened by {dispute.openedBy.name} (
            {dispute.openedBy.role})
          </div>
        </div>
        <div className="font-display text-lg font-bold text-accent">PKR {dispute.booking.totalPKR.toLocaleString()}</div>
      </div>
      <p className="mb-3 text-sm text-text-muted">{dispute.reason}</p>
      {dispute.photos.length > 0 && (
        <div className="mb-3 flex flex-wrap gap-2">
          {dispute.photos.map((url) => (
            // eslint-disable-next-line @next/next/no-img-element
            <img key={url} src={url} alt="" className="h-20 w-20 rounded-[8px] object-cover" />
          ))}
        </div>
      )}

      {aiSummary ? (
        <div className="mb-3 rounded-[10px] border border-accent/30 bg-accent/10 p-3 text-xs">
          <p className="mb-1 font-bold text-accent">✨ AI summary</p>
          <p className="mb-1 text-text-muted">{aiSummary.summary}</p>
          <p className="text-text-muted">
            Suggests: <b className="text-text">{aiSummary.suggestedResolution.replace("_", " ")}</b> — {aiSummary.reasoning}
          </p>
        </div>
      ) : aiSummarizerEnabled ? (
        <button
          onClick={summarizeWithAi}
          disabled={aiPending}
          className="mb-3 text-xs font-semibold text-accent disabled:opacity-60"
        >
          {aiPending ? "Summarizing…" : "✨ Summarize with AI"}
        </button>
      ) : null}

      <div className="flex flex-wrap gap-2">
        {RESOLUTIONS.map((r) => (
          <button
            key={r.value}
            onClick={() => resolve(r.value)}
            disabled={pending}
            className="rounded-[8px] border border-border-subtle px-3 py-2 text-xs font-semibold hover:border-accent hover:text-accent disabled:opacity-60"
          >
            {r.label}
          </button>
        ))}
      </div>
    </div>
  );
}
