import { prisma } from "@/lib/prisma";
import { getFeatureFlags } from "@/lib/featureFlags";
import { getLeadPlaces } from "@/lib/leadPlaces";
import { LeadsClient } from "./LeadsClient";

export default async function AdminLeadsPage() {
  const [leads, flags, places] = await Promise.all([
    // No `take` cap — older leads were silently invisible once total count
    // passed 200. Client-side pagination (LeadsClient) handles display in
    // pages of 50 over the full set fetched here.
    prisma.lead.findMany({ orderBy: { createdAt: "desc" } }),
    getFeatureFlags(),
    getLeadPlaces(),
  ]);

  return (
    <div>
      <h1 className="mb-1 font-display text-3xl font-bold">Leads CRM</h1>
      <p className="mb-8 text-text-muted">Fetch prospective providers from Google Places, then work the outreach queue.</p>
      <LeadsClient initialLeads={leads} aiQualifierEnabled={flags.aiLeadQualifier} places={places} />
    </div>
  );
}
