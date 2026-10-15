-- Service-zone geofences, located waitlist entries, and the referral programme.

ALTER TABLE "Market" ADD COLUMN "polygons" JSONB;

ALTER TABLE "CountryWaitlistEntry" ADD COLUMN "lat" DOUBLE PRECISION;
ALTER TABLE "CountryWaitlistEntry" ADD COLUMN "lng" DOUBLE PRECISION;
ALTER TABLE "CountryWaitlistEntry" ADD COLUMN "area" TEXT;
ALTER TABLE "CountryWaitlistEntry" ADD COLUMN "marketId" TEXT;
ALTER TABLE "CountryWaitlistEntry" ADD COLUMN "notifiedAt" TIMESTAMP(3);
CREATE INDEX "CountryWaitlistEntry_marketId_idx" ON "CountryWaitlistEntry"("marketId");

ALTER TABLE "SiteSettings" ADD COLUMN "referralsEnabled" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "SiteSettings" ADD COLUMN "referralCustomerCreditPKR" INTEGER NOT NULL DEFAULT 200;
ALTER TABLE "SiteSettings" ADD COLUMN "referralProBonusPKR" INTEGER NOT NULL DEFAULT 500;
ALTER TABLE "SiteSettings" ADD COLUMN "referralProJobsRequired" INTEGER NOT NULL DEFAULT 5;

ALTER TABLE "User" ADD COLUMN "referralCode" TEXT;
ALTER TABLE "User" ADD COLUMN "signupDeviceId" TEXT;
CREATE UNIQUE INDEX "User_referralCode_key" ON "User"("referralCode");
CREATE INDEX "User_signupDeviceId_idx" ON "User"("signupDeviceId");

ALTER TYPE "LedgerEntryType" ADD VALUE 'REFERRAL_BONUS';

CREATE TYPE "ReferralStatus" AS ENUM ('PENDING', 'RELEASED', 'REJECTED');

CREATE TABLE "Referral" (
    "id" TEXT NOT NULL,
    "referrerId" TEXT NOT NULL,
    "referredUserId" TEXT NOT NULL,
    "role" "Role" NOT NULL,
    "status" "ReferralStatus" NOT NULL DEFAULT 'PENDING',
    "referrerRewardPKR" INTEGER NOT NULL,
    "refereeRewardPKR" INTEGER NOT NULL DEFAULT 0,
    "jobsRequired" INTEGER NOT NULL DEFAULT 1,
    "rejectReason" TEXT,
    "deviceId" TEXT,
    "phoneKey" TEXT NOT NULL,
    "releasedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Referral_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "Referral_referredUserId_key" ON "Referral"("referredUserId");
CREATE INDEX "Referral_referrerId_idx" ON "Referral"("referrerId");
CREATE INDEX "Referral_status_idx" ON "Referral"("status");
CREATE INDEX "Referral_deviceId_idx" ON "Referral"("deviceId");
CREATE INDEX "Referral_phoneKey_idx" ON "Referral"("phoneKey");
