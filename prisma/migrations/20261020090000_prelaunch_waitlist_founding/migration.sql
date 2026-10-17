-- Pre-launch waitlist, launch switches and Founding Pro commission.
ALTER TABLE "SiteSettings" ADD COLUMN "proAppLive" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "SiteSettings" ADD COLUMN "customerAppLive" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "SiteSettings" ADD COLUMN "proTesterGroupUrl" TEXT;
ALTER TABLE "SiteSettings" ADD COLUMN "proTestingOptInUrl" TEXT;
ALTER TABLE "SiteSettings" ADD COLUMN "customerPreregUrl" TEXT;
ALTER TABLE "SiteSettings" ADD COLUMN "signupNotifyEmail" TEXT;
ALTER TABLE "SiteSettings" ADD COLUMN "foundingProSlots" INTEGER NOT NULL DEFAULT 100;
ALTER TABLE "SiteSettings" ADD COLUMN "foundingProPct" DOUBLE PRECISION NOT NULL DEFAULT 10;
ALTER TABLE "SiteSettings" ADD COLUMN "foundingProMonths" INTEGER NOT NULL DEFAULT 3;
ALTER TABLE "SiteSettings" ADD COLUMN "foundingProCity" TEXT NOT NULL DEFAULT 'Karachi';

ALTER TABLE "ProviderProfile" ADD COLUMN "foundingUntil" TIMESTAMP(3);
ALTER TABLE "ProviderProfile" ADD COLUMN "foundingEndNotifiedAt" TIMESTAMP(3);

CREATE TABLE "WaitlistSignup" (
    "id" TEXT NOT NULL,
    "role" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "whatsapp" TEXT NOT NULL,
    "countryCode" TEXT NOT NULL,
    "detectedCountry" TEXT,
    "detectedRegion" TEXT,
    "city" TEXT,
    "area" TEXT,
    "email" TEXT,
    "trade" TEXT,
    "experienceYears" INTEGER,
    "gmail" TEXT,
    "language" TEXT NOT NULL,
    "sourcePage" TEXT,
    "utm" JSONB,
    "referredByCode" TEXT,
    "referralCode" TEXT NOT NULL,
    "consentAt" TIMESTAMP(3) NOT NULL,
    "launchMessageSentAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "WaitlistSignup_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "WaitlistSignup_whatsapp_key" ON "WaitlistSignup"("whatsapp");
CREATE UNIQUE INDEX "WaitlistSignup_referralCode_key" ON "WaitlistSignup"("referralCode");
CREATE INDEX "WaitlistSignup_role_idx" ON "WaitlistSignup"("role");
CREATE INDEX "WaitlistSignup_countryCode_idx" ON "WaitlistSignup"("countryCode");
CREATE INDEX "WaitlistSignup_createdAt_idx" ON "WaitlistSignup"("createdAt");
CREATE INDEX "WaitlistSignup_referredByCode_idx" ON "WaitlistSignup"("referredByCode");
