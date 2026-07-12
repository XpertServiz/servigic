import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { ProviderProfileForm } from "./ProviderProfileForm";

export default async function ProviderProfilePage() {
  const session = await auth();
  const profile = await prisma.providerProfile.findUnique({ where: { userId: session!.user.id } });

  return (
    <div className="max-w-2xl">
      <h1 className="mb-1 font-display text-3xl font-bold">Profile &amp; Verification</h1>
      <p className="mb-8 text-text-muted">
        Complete your profile and upload documents to unlock bidding. Verification levels: Level 1 (admin-approved) →
        Level 2 (Verified Pro) → Level 3 (Gold Ustad, 10 jobs at 4.5★+).
      </p>
      <ProviderProfileForm initial={profile} />
    </div>
  );
}
