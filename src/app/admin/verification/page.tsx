import { prisma } from "@/lib/prisma";
import { hoursSince, isAwaitingReview, VERIFICATION_SLA_HOURS } from "@/lib/staff";
import { ReviewCard, type ReviewItem } from "./ReviewCard";

// Pro verification queue (OCR-assisted manual review). Open to ADMIN and to
// SUPPORT reviewers. The ID fields are read off the photo on the Pro's phone
// to save typing; the reviewer's job is the quick selfie-vs-ID face check.
export default async function VerificationQueuePage() {
  const candidates = await prisma.providerProfile.findMany({
    where: { isVerified: false, verificationLevel: 0, cnicUrl: { not: null }, selfieUrl: { not: null } },
    include: { user: { select: { name: true, phone: true, city: true } } },
    orderBy: { verificationSubmittedAt: "asc" },
  });
  const pending = candidates.filter(isAwaitingReview);

  const items: ReviewItem[] = pending.map((p) => {
    const submittedAt = p.verificationSubmittedAt ?? p.createdAt;
    const hoursWaiting = hoursSince(submittedAt);
    return {
      id: p.id,
      name: p.user.name,
      phone: p.user.phone,
      city: p.user.city,
      cnicUrl: p.cnicUrl as string,
      cnicBackUrl: p.cnicBackUrl,
      selfieUrl: p.selfieUrl as string,
      policeCertUrl: p.policeCertUrl,
      ocr: (p.cnicOcr as ReviewItem["ocr"]) ?? null,
      hoursWaiting,
      overdue: hoursWaiting >= VERIFICATION_SLA_HOURS,
    };
  });

  return (
    <div>
      <h1 className="mb-1 font-display text-3xl font-bold">Verification queue</h1>
      <p className="mb-8 max-w-2xl text-text-muted">
        Compare the selfie with the photo on the ID, check the auto-filled details, then approve or reject. Nothing is
        activated automatically — the text below was only read off the photo to save you typing.
      </p>

      {items.length === 0 ? (
        <div className="rounded-[14px] border border-border-subtle p-8 text-center text-text-muted">
          Nothing waiting for review. 🎉
        </div>
      ) : (
        <div className="grid gap-6">
          {items.map((item) => (
            <ReviewCard key={item.id} item={item} />
          ))}
        </div>
      )}
    </div>
  );
}
