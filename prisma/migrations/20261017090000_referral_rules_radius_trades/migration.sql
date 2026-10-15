-- Referral rules v2, pro radius limits, per-trade approval, Servigic-funded discount ledger line.

ALTER TABLE "SiteSettings" ADD COLUMN "referralNewProFreeJobs" INTEGER NOT NULL DEFAULT 3;
ALTER TABLE "SiteSettings" ADD COLUMN "referralNewCustomerDiscountPKR" INTEGER NOT NULL DEFAULT 200;
ALTER TABLE "SiteSettings" ADD COLUMN "referralNewCustomerMinJobPKR" INTEGER NOT NULL DEFAULT 1000;
ALTER TABLE "SiteSettings" ADD COLUMN "proRadiusMinKm" INTEGER NOT NULL DEFAULT 2;
ALTER TABLE "SiteSettings" ADD COLUMN "proRadiusMaxKm" INTEGER NOT NULL DEFAULT 15;
ALTER TABLE "SiteSettings" ADD COLUMN "proRadiusDefaultKm" INTEGER NOT NULL DEFAULT 5;
ALTER TABLE "SiteSettings" ADD COLUMN "maxTradesPerPro" INTEGER NOT NULL DEFAULT 3;
ALTER TABLE "SiteSettings" ALTER COLUMN "referralProJobsRequired" SET DEFAULT 3;
ALTER TABLE "SiteSettings" ALTER COLUMN "referralProBonusPKR" SET DEFAULT 300;
-- The referral programme has never been switched on, so moving the stored amounts to the new defaults is safe.
UPDATE "SiteSettings" SET "referralProJobsRequired" = 3, "referralProBonusPKR" = 300 WHERE "referralsEnabled" = false;

ALTER TABLE "ProviderProfile" ALTER COLUMN "serviceRadiusKm" SET DEFAULT 5;

ALTER TYPE "LedgerEntryType" ADD VALUE 'DISCOUNT_CREDIT';

ALTER TABLE "Referral" ADD COLUMN "referrerRole" "Role" NOT NULL DEFAULT 'CUSTOMER';
ALTER TABLE "Referral" ADD COLUMN "minJobPKR" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "Referral" ADD COLUMN "freeJobsGranted" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "Referral" ADD COLUMN "discountBookingId" TEXT;
UPDATE "Referral" r SET "referrerRole" = u."role" FROM "User" u WHERE u."id" = r."referrerId";

CREATE TYPE "TradeRequestStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED');

CREATE TABLE "ProviderTrade" (
    "id" TEXT NOT NULL,
    "providerId" TEXT NOT NULL,
    "trade" "Trade" NOT NULL,
    "status" "TradeRequestStatus" NOT NULL DEFAULT 'PENDING',
    "certificateRequested" BOOLEAN NOT NULL DEFAULT false,
    "certificateUrl" TEXT,
    "adminNote" TEXT,
    "requestedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "reviewedAt" TIMESTAMP(3),

    CONSTRAINT "ProviderTrade_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "ProviderTrade_providerId_trade_key" ON "ProviderTrade"("providerId", "trade");
CREATE INDEX "ProviderTrade_status_idx" ON "ProviderTrade"("status");
ALTER TABLE "ProviderTrade" ADD CONSTRAINT "ProviderTrade_providerId_fkey" FOREIGN KEY ("providerId") REFERENCES "ProviderProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Every trade a pro already works in stays active: backfill them as APPROVED.
INSERT INTO "ProviderTrade" ("id", "providerId", "trade", "status", "reviewedAt")
SELECT md5(p."id" || t::text), p."id", t, 'APPROVED', CURRENT_TIMESTAMP
FROM "ProviderProfile" p, unnest(p."trades") AS t
ON CONFLICT ("providerId", "trade") DO NOTHING;
