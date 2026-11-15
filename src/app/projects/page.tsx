import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { InfoPageShell, InfoBlock } from "@/components/landing/InfoPageShell";
import { getSiteSettingsPublic } from "@/lib/publicData";
import { bigProjectsEnabled } from "@/lib/bigProjects";
import { ProjectForm } from "./ProjectForm";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Big Projects: whole-house wiring, plumbing and renovation | Servigic",
  description: "Building or renovating? Tell us about your project. We call you, visit your site free, agree a clear amount and use verified pros for the work.",
};

// Phase 1 page (English): the request form. The full landing page, languages and SEO pages come next.
export default async function ProjectsPage() {
  if (!bigProjectsEnabled()) notFound();
  const settings = await getSiteSettingsPublic().catch(() => null);
  return (
    <InfoPageShell eyebrow="Big Projects" title="Building or renovating? Get the whole job done by verified pros.">
      <p>Tell us about your project. We call you, visit your site (free), agree one clear amount with you, and Servigic&apos;s verified pros do the work. Any problem within 15 days, Servigic comes back and fixes it.</p>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        <InfoBlock title="1. Tell us">Two minutes: the trades, where, and your phone and email.</InfoBlock>
        <InfoBlock title="2. We visit">A Servigic specialist calls you and visits the site, free.</InfoBlock>
        <InfoBlock title="3. One clear amount">After the visit you get the contract amount in writing before any work starts.</InfoBlock>
      </div>
      <ProjectForm whatsapp={settings?.whatsappSupportNumber ?? null} />
    </InfoPageShell>
  );
}
