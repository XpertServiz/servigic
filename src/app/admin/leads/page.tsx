import { prisma } from "@/lib/prisma";
import { getFeatureFlags } from "@/lib/featureFlags";
import { LeadsClient } from "./LeadsClient";

export default async function AdminLeadsPage() {
  const [leads, flags] = await Promise.all([
    // No `take` cap — older leads were silently invisible once total count
    // passed 200. Client-side pagination (LeadsClient) handles display in
    // pages of 50 over the full set fetched here.
    prisma.lead.findMany({ orderBy: { createdAt: "desc" } }),
    getFeatureFlags(),
  ]);

  return (
    <div>
      <h1 className="mb-1 font-display text-3xl font-bold">Leads CRM</h1>
      <p className="mb-8 text-text-muted">Fetch prospective providers from Google Places, then work the outreach queue.</p>
      <LeadsClient initialLeads={leads} aiQualifierEnabled={flags.aiLeadQualifier} />
    </div>
  );
}
