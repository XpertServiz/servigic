import { prisma } from "@/lib/prisma";
import { TradeRequestActions } from "./TradeRequestActions";

export const dynamic = "force-dynamic";

const pretty = (t: string) => t.replace(/_/g, " ").toLowerCase().replace(/^\w/, (c) => c.toUpperCase());

export default async function AdminTradeApprovalsPage() {
  const [pending, settings] = await Promise.all([
    prisma.providerTrade.findMany({
      where: { status: "PENDING" },
      orderBy: { requestedAt: "asc" },
      include: { provider: { select: { displayName: true, isVerified: true, trades: true, user: { select: { name: true, phone: true, city: true } } } } },
    }),
    prisma.siteSettings.findUnique({ where: { id: "singleton" } }),
  ]);

  return (
    <div className="max-w-4xl">
      <h1 className="mb-1 font-display text-3xl font-bold">Trade approvals</h1>
      <p className="mb-8 text-text-muted">
        Each extra trade a pro adds waits here until you approve it. A pro receives job alerts only for approved trades, and can hold at most{" "}
        <b>{settings?.maxTradesPerPro ?? 3}</b> (change in Settings). For gas, electrical and AC work you can ask for a certificate or photo first.
      </p>

      <div className="flex flex-col gap-4">
        {pending.map((r) => (
          <div key={r.id} className="rounded-[14px] border border-border-subtle bg-bg-elevated p-5">
            <div className="mb-3 flex flex-wrap items-start justify-between gap-3">
              <div>
                <div className="text-lg font-bold">{pretty(r.trade)}</div>
                <div className="text-sm text-text-muted">
                  {r.provider.displayName || r.provider.user.name} · {r.provider.user.phone} · {r.provider.user.city ?? "no city"}
                </div>
                <div className="mt-1 text-xs text-text-muted">
                  Approved trades now: {r.provider.trades.length ? r.provider.trades.map(pretty).join(", ") : "none"}
                  {!r.provider.isVerified && " · documents not yet verified"}
                </div>
              </div>
              <div className="text-right text-xs text-text-muted">Asked {r.requestedAt.toLocaleDateString()}</div>
            </div>

            {r.certificateRequested && (
              <div className="mb-3 rounded-[10px] border border-accent/30 bg-accent/10 p-3 text-sm">
                Certificate requested{r.adminNote ? `: ${r.adminNote}` : ""}.{" "}
                {r.certificateUrl ? (
                  <a href={r.certificateUrl} target="_blank" rel="noreferrer" className="font-bold text-accent underline">
                    View the uploaded file
                  </a>
                ) : (
                  <b>Not uploaded yet.</b>
                )}
              </div>
            )}
            {!r.certificateRequested && r.certificateUrl && (
              <a href={r.certificateUrl} target="_blank" rel="noreferrer" className="mb-3 inline-block text-sm font-bold text-accent underline">
                View uploaded certificate
              </a>
            )}

            <TradeRequestActions id={r.id} certificateRequested={r.certificateRequested} />
          </div>
        ))}
        {pending.length === 0 && <p className="rounded-[14px] border border-border-subtle p-6 text-center text-sm text-text-muted">No trades waiting for approval.</p>}
      </div>
    </div>
  );
}
