-- CreateEnum
CREATE TYPE "WalletDispatchStatus" AS ENUM ('NORMAL', 'WARNED', 'THROTTLED', 'SUSPENDED');

-- CreateEnum
CREATE TYPE "LedgerEntryType" AS ENUM ('COMMISSION_DEBIT', 'TOPUP_CREDIT', 'ADJUSTMENT');

-- CreateEnum
CREATE TYPE "TopUpStatus" AS ENUM ('SUBMITTED', 'VERIFIED', 'REJECTED');

-- CreateEnum
CREATE TYPE "CancelledByRole" AS ENUM ('CUSTOMER', 'PROVIDER', 'ADMIN');

-- CreateEnum
CREATE TYPE "CancellationReasonCode" AS ENUM ('CUSTOMER_CHANGED_MIND', 'CUSTOMER_FOUND_ANOTHER_PRO', 'CUSTOMER_PRICE_TOO_HIGH', 'CUSTOMER_PRO_ASKED_TO_CANCEL', 'PROVIDER_UNAVAILABLE', 'PROVIDER_JOB_TOO_FAR', 'PROVIDER_PRICE_DISPUTE', 'OTHER');

-- CreateEnum
CREATE TYPE "FlagType" AS ENUM ('COLLUSION_ACCEPT_CANCEL_PAIR', 'COLLUSION_REBOOK_AVOIDANCE', 'CONTACT_LEAKAGE_ATTEMPTS', 'MANUAL_ADMIN');

-- CreateEnum
CREATE TYPE "FlagStatus" AS ENUM ('OPEN', 'DISMISSED', 'WARNED', 'SUSPENDED', 'DELISTED');

-- AlterTable
ALTER TABLE "Booking" ALTER COLUMN "paymentDeadline" DROP NOT NULL;

-- AlterTable
ALTER TABLE "Message" ADD COLUMN     "scrubHit" BOOLEAN NOT NULL DEFAULT false;

-- AlterTable
ALTER TABLE "ProviderProfile" ADD COLUMN     "cancellationCount30d" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "cancellationRate30d" DOUBLE PRECISION NOT NULL DEFAULT 0,
ADD COLUMN     "dispatchBlockedReason" TEXT,
ADD COLUMN     "dispatchStatus" "WalletDispatchStatus" NOT NULL DEFAULT 'NORMAL',
ADD COLUMN     "suspendedUntil" TIMESTAMP(3);

-- AlterTable
ALTER TABLE "SiteSettings" ADD COLUMN     "defaultWalletCeilingPKR" INTEGER NOT NULL DEFAULT 3000;

-- AlterTable
ALTER TABLE "User" ADD COLUMN     "cancellationCount30d" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "cancellationRate30d" DOUBLE PRECISION NOT NULL DEFAULT 0,
ADD COLUMN     "postingPaused" BOOLEAN NOT NULL DEFAULT false;

-- CreateTable
CREATE TABLE "ProWallet" (
    "id" TEXT NOT NULL,
    "providerId" TEXT NOT NULL,
    "balancePKR" INTEGER NOT NULL DEFAULT 0,
    "ceilingPKR" INTEGER NOT NULL DEFAULT 3000,
    "unsettledJobCount" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ProWallet_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CommissionLedgerEntry" (
    "id" TEXT NOT NULL,
    "walletId" TEXT NOT NULL,
    "type" "LedgerEntryType" NOT NULL,
    "amountPKR" INTEGER NOT NULL,
    "bookingId" TEXT,
    "topUpId" TEXT,
    "memo" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CommissionLedgerEntry_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TopUp" (
    "id" TEXT NOT NULL,
    "walletId" TEXT NOT NULL,
    "amountPKR" INTEGER NOT NULL,
    "method" "PaymentMethod" NOT NULL,
    "proofImageUrl" TEXT,
    "status" "TopUpStatus" NOT NULL DEFAULT 'SUBMITTED',
    "verifiedAt" TIMESTAMP(3),
    "verifiedBy" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "TopUp_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CancellationEvent" (
    "id" TEXT NOT NULL,
    "bookingId" TEXT NOT NULL,
    "cancelledById" TEXT NOT NULL,
    "cancelledByRole" "CancelledByRole" NOT NULL,
    "reasonCode" "CancellationReasonCode" NOT NULL,
    "reasonNote" TEXT,
    "excludedFromCancellerRate" BOOLEAN NOT NULL DEFAULT false,
    "flaggedProviderId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CancellationEvent_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ProviderFlag" (
    "id" TEXT NOT NULL,
    "providerId" TEXT NOT NULL,
    "customerId" TEXT,
    "type" "FlagType" NOT NULL,
    "evidence" JSONB NOT NULL,
    "status" "FlagStatus" NOT NULL DEFAULT 'OPEN',
    "reviewedBy" TEXT,
    "reviewNote" TEXT,
    "reviewedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ProviderFlag_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "ProWallet_providerId_key" ON "ProWallet"("providerId");

-- CreateIndex
CREATE INDEX "ProWallet_providerId_idx" ON "ProWallet"("providerId");

-- CreateIndex
CREATE UNIQUE INDEX "CommissionLedgerEntry_topUpId_key" ON "CommissionLedgerEntry"("topUpId");

-- CreateIndex
CREATE INDEX "CommissionLedgerEntry_walletId_idx" ON "CommissionLedgerEntry"("walletId");

-- CreateIndex
CREATE INDEX "CommissionLedgerEntry_bookingId_idx" ON "CommissionLedgerEntry"("bookingId");

-- CreateIndex
CREATE INDEX "TopUp_status_idx" ON "TopUp"("status");

-- CreateIndex
CREATE INDEX "TopUp_walletId_idx" ON "TopUp"("walletId");

-- CreateIndex
CREATE UNIQUE INDEX "CancellationEvent_bookingId_key" ON "CancellationEvent"("bookingId");

-- CreateIndex
CREATE INDEX "CancellationEvent_cancelledById_createdAt_idx" ON "CancellationEvent"("cancelledById", "createdAt");

-- CreateIndex
CREATE INDEX "CancellationEvent_flaggedProviderId_idx" ON "CancellationEvent"("flaggedProviderId");

-- CreateIndex
CREATE INDEX "ProviderFlag_providerId_status_idx" ON "ProviderFlag"("providerId", "status");

-- CreateIndex
CREATE INDEX "ProviderFlag_type_status_idx" ON "ProviderFlag"("type", "status");

-- AddForeignKey
ALTER TABLE "ProWallet" ADD CONSTRAINT "ProWallet_providerId_fkey" FOREIGN KEY ("providerId") REFERENCES "ProviderProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CommissionLedgerEntry" ADD CONSTRAINT "CommissionLedgerEntry_walletId_fkey" FOREIGN KEY ("walletId") REFERENCES "ProWallet"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CommissionLedgerEntry" ADD CONSTRAINT "CommissionLedgerEntry_bookingId_fkey" FOREIGN KEY ("bookingId") REFERENCES "Booking"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CommissionLedgerEntry" ADD CONSTRAINT "CommissionLedgerEntry_topUpId_fkey" FOREIGN KEY ("topUpId") REFERENCES "TopUp"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TopUp" ADD CONSTRAINT "TopUp_walletId_fkey" FOREIGN KEY ("walletId") REFERENCES "ProWallet"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CancellationEvent" ADD CONSTRAINT "CancellationEvent_bookingId_fkey" FOREIGN KEY ("bookingId") REFERENCES "Booking"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CancellationEvent" ADD CONSTRAINT "CancellationEvent_cancelledById_fkey" FOREIGN KEY ("cancelledById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProviderFlag" ADD CONSTRAINT "ProviderFlag_providerId_fkey" FOREIGN KEY ("providerId") REFERENCES "ProviderProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProviderFlag" ADD CONSTRAINT "ProviderFlag_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
