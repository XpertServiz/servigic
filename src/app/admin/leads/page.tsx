import { prisma } from "@/lib/prisma";
import { getFeatureFlags } from "@/lib/featureFlags";
import { placesUsage } from "@/lib/placesUsage";
import { getLeadPlaces } from "@/lib/leadPlaces";
import { LeadsClient } from "./LeadsClient";

export default async function AdminLeadsPage() {
  const [leads, flags, places, usage] = await Promise.all([
    // No `take` cap — older leads were silently invisible once total count
    // passed 200. Client-side pagination (LeadsClient) handles display in
    // pages of 50 over the full set fetched here.
    prisma.lead.findMany({ orderBy: { createdAt: "desc" } }),
    getFeatureFlags(),
    getLeadPlaces(),
    placesUsage(),
  ]);
  const pct = usage.limit > 0 ? Math.min(100, Math.round((usage.used / usage.limit) * 100)) : 100;
  const tone = pct >= 90 ? "bg-danger" : pct >= 70 ? "bg-accent" : "bg-secondary";

  return (
    <div>
      <div className="mb-8 flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="mb-1 font-display text-3xl font-bold">Leads CRM</h1>
          <p className="text-text-muted">Fetch prospective providers from Google Places, then work the outreach queue.</p>
        </div>
        {/* Google's free monthly allowance: fetching stops at the limit so this project is never billed for it. */}
        <div className="min-w-[230px] rounded-[12px] border border-border-subtle bg-bg-elevated px-4 py-3 text-right">
          <div className="text-[11px] font-semibold uppercase tracking-wide text-text-muted">Google free credits this month</div>
          <div className="text-2xl font-bold">
            {usage.left.toLocaleString()} <span className="text-sm font-semibold text-text-muted">left</span>
          </div>
          <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-bg-elevated-2">
            <div className={`h-full ${tone}`} style={{ width: `${pct}%` }} />
          </div>
          <div className="mt-1 text-xs text-text-muted">
            {usage.used.toLocaleString()} of {usage.limit.toLocaleString()} used · renews {usage.resetsOn}
          </div>
        </div>
      </div>
      <LeadsClient initialLeads={leads} aiQualifierEnabled={flags.aiLeadQualifier} places={places} fetchPaused={usage.left <= 0} />
    </div>
  );
}
