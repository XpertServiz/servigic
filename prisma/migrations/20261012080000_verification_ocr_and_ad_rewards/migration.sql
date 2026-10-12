-- AlterTable
ALTER TABLE "ProviderProfile" ADD COLUMN     "cnicOcr" JSONB,
ADD COLUMN     "verificationEscalatedAt" TIMESTAMP(3),
ADD COLUMN     "verificationRejectedAt" TIMESTAMP(3),
ADD COLUMN     "verificationRejectedReason" TEXT,
ADD COLUMN     "verificationReviewedAt" TIMESTAMP(3),
ADD COLUMN     "verificationReviewedById" TEXT,
ADD COLUMN     "verificationSubmittedAt" TIMESTAMP(3);

-- AlterTable
ALTER TABLE "Booking" ADD COLUMN     "rewardDiscountPKR" INTEGER NOT NULL DEFAULT 0;

-- CreateTable
CREATE TABLE "RewardCredit" (
    "id" TEXT NOT NULL,
    "customerId" TEXT NOT NULL,
    "kind" TEXT NOT NULL DEFAULT 'AD_DISCOUNT',
    "amountPKR" INTEGER NOT NULL DEFAULT 50,
    "earnedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "consumedAt" TIMESTAMP(3),
    "bookingId" TEXT,

    CONSTRAINT "RewardCredit_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "RewardCredit_customerId_earnedAt_idx" ON "RewardCredit"("customerId", "earnedAt");

-- CreateIndex
CREATE INDEX "RewardCredit_customerId_consumedAt_idx" ON "RewardCredit"("customerId", "consumedAt");

-- AddForeignKey
ALTER TABLE "RewardCredit" ADD CONSTRAINT "RewardCredit_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

