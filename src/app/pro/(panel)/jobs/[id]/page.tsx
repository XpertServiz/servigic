import { notFound } from "next/navigation";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { firstNameOnly, distanceBand } from "@/lib/anon";
import { haversineKm } from "@/lib/geo";
import { getFeatureFlags } from "@/lib/featureFlags";
import { PhotoGallery } from "@/components/ui/PhotoGallery";
import { BidForm } from "./BidForm";

export default async function ProviderJobDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const session = await auth();

  const [job, profile, flags] = await Promise.all([
    prisma.job.findUnique({
      where: { id },
      include: { category: true, customer: { select: { name: true } } },
    }),
    prisma.providerProfile.findUnique({ where: { userId: session!.user.id } }),
    getFeatureFlags(),
  ]);

  if (!job || !profile) notFound();

  const myBid = await prisma.bid.findUnique({
    where: { jobId_providerId: { jobId: job.id, providerId: profile.id } },
  });

  const distance =
    profile.baseLat && profile.baseLng ? distanceBand(haversineKm(job.lat, job.lng, profile.baseLat, profile.baseLng)) : "—";

  return (
    <div className="max-w-2xl">
      <div className="mb-6">
        <div className="mb-1 flex items-center gap-2 text-sm text-text-muted">
          <span>{job.category.icon}</span> {job.category.name} · {job.areaLabel} · {distance}
        </div>
        <h1 className="font-display text-3xl font-bold">{job.title}</h1>
        <p className="mt-2 text-text-muted">{job.description}</p>
        <p className="mt-3 text-sm text-text-muted">
          Customer: {firstNameOnly(job.customer.name)} · Contact unlocks after payment.
        </p>
        {job.photos.length > 0 && (
          <div className="mt-4">
            <PhotoGallery urls={job.photos} label="Job photo" thumbClassName="h-24 w-24" />
          </div>
        )}
      </div>

      <BidForm
        jobId={job.id}
        jobStatus={job.status}
        existingBid={myBid}
        verificationLevel={profile.verificationLevel}
        bidWinHintEnabled={flags.aiBidWinHint}
      />
    </div>
  );
}
