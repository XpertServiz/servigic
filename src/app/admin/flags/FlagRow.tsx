"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import type { ProviderFlag, ProviderProfile } from "@prisma/client";

type FlagWithRelations = ProviderFlag & {
  provider: ProviderProfile & { user: { name: string; phone: string } };
  customer: { name: string; phone: string } | null;
};

const TYPE_LABEL: Record<string, string> = {
  COLLUSION_ACCEPT_CANCEL_PAIR: "Repeat accept-then-cancel pair",
  COLLUSION_REBOOK_AVOIDANCE: "Rebook avoidance pattern",
  CONTACT_LEAKAGE_ATTEMPTS: "Contact-sharing attempts in chat",
  MANUAL_ADMIN: "Manually flagged",
};

export function FlagRow({ flag }: { flag: FlagWithRelations }) {
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const [expanded, setExpanded] = useState(false);

  async function act(action: "DISMISS" | "WARN" | "SUSPEND" | "DELIST") {
    setPending(true);
    try {
      const res = await fetch(`/api/admin/flags/${flag.id}/action`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action }),
      });
      if (!res.ok) throw new Error();
      toast.success(`Flag ${action === "DISMISS" ? "dismissed" : action.toLowerCase() + "ed"}`);
      router.refresh();
    } catch {
      toast.error("Action failed");
    } finally {
      setPending(false);
    }
  }

  const evidence = flag.evidence as Record<string, unknown>;

  return (
    <div className="rounded-[14px] border border-border-subtle bg-bg-elevated p-5">
      <div className="mb-3 flex items-center justify-between">
        <div>
          <div className="font-bold">{TYPE_LABEL[flag.type] ?? flag.type}</div>
          <div className="text-sm text-text-muted">
            {flag.provider.displayName || flag.provider.user.name} · {flag.provider.user.phone}
            {flag.customer && <> · vs. {flag.customer.name}</>}
          </div>
        </div>
        <button onClick={() => setExpanded((e) => !e)} className="text-xs font-semibold text-accent">
          {expanded ? "Hide evidence" : "Show evidence"}
        </button>
      </div>
      {expanded && (
        <pre className="mb-3 overflow-x-auto rounded-[8px] bg-bg-elevated-2 p-3 text-xs text-text-muted">
          {JSON.stringify(evidence, null, 2)}
        </pre>
      )}
      <div className="flex flex-wrap gap-2">
        <button
          onClick={() => act("DISMISS")}
          disabled={pending}
          className="rounded-[8px] border border-border-subtle px-3 py-1.5 text-xs font-semibold disabled:opacity-50"
        >
          Dismiss
        </button>
        <button
          onClick={() => act("WARN")}
          disabled={pending}
          className="rounded-[8px] border border-accent/40 px-3 py-1.5 text-xs font-semibold text-accent disabled:opacity-50"
        >
          Warn
        </button>
        <button
          onClick={() => act("SUSPEND")}
          disabled={pending}
          className="rounded-[8px] border border-danger/40 px-3 py-1.5 text-xs font-semibold text-danger disabled:opacity-50"
        >
          Suspend
        </button>
        <button
          onClick={() => act("DELIST")}
          disabled={pending}
          className="rounded-[8px] bg-danger px-3 py-1.5 text-xs font-bold text-white disabled:opacity-50"
        >
          Delist
        </button>
      </div>
    </div>
  );
}
