-- Zones & leads: area master data, Pro lead CRM fields, activity log, export audit, saved filters, import mappings.
-- Additive only; nothing existing is dropped or rewritten.
ALTER TYPE "LeadSource" ADD VALUE IF NOT EXISTS 'WAITLIST';
ALTER TYPE "LeadSource" ADD VALUE IF NOT EXISTS 'APP';
ALTER TYPE "LeadSource" ADD VALUE IF NOT EXISTS 'IMPORT';
ALTER TYPE "LeadSource" ADD VALUE IF NOT EXISTS 'PRO_REFERRAL';

ALTER TYPE "LeadStatus" ADD VALUE IF NOT EXISTS 'INVITED';
ALTER TYPE "LeadStatus" ADD VALUE IF NOT EXISTS 'REGISTERED';
ALTER TYPE "LeadStatus" ADD VALUE IF NOT EXISTS 'VERIFIED';
ALTER TYPE "LeadStatus" ADD VALUE IF NOT EXISTS 'ACTIVE';
ALTER TYPE "LeadStatus" ADD VALUE IF NOT EXISTS 'WRONG_NUMBER';
ALTER TYPE "LeadStatus" ADD VALUE IF NOT EXISTS 'DO_NOT_CONTACT';

ALTER TABLE "Lead"
  ADD COLUMN IF NOT EXISTS "countryCode" TEXT NOT NULL DEFAULT 'PK',
  ADD COLUMN IF NOT EXISTS "cityId" TEXT,
  ADD COLUMN IF NOT EXISTS "areaId" TEXT,
  ADD COLUMN IF NOT EXISTS "zoneId" TEXT,
  ADD COLUMN IF NOT EXISTS "areaRaw" TEXT,
  ADD COLUMN IF NOT EXISTS "addressText" TEXT,
  ADD COLUMN IF NOT EXISTS "lat" DOUBLE PRECISION,
  ADD COLUMN IF NOT EXISTS "lng" DOUBLE PRECISION,
  ADD COLUMN IF NOT EXISTS "trades" "Trade"[] DEFAULT ARRAY[]::"Trade"[],
  ADD COLUMN IF NOT EXISTS "skills" TEXT,
  ADD COLUMN IF NOT EXISTS "experienceYears" INTEGER,
  ADD COLUMN IF NOT EXISTS "altPhone" TEXT,
  ADD COLUMN IF NOT EXISTS "whatsappSame" BOOLEAN NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS "sourceDetail" TEXT,
  ADD COLUMN IF NOT EXISTS "sources" TEXT[] DEFAULT ARRAY[]::TEXT[],
  ADD COLUMN IF NOT EXISTS "language" TEXT,
  ADD COLUMN IF NOT EXISTS "consent" TEXT NOT NULL DEFAULT 'unknown',
  ADD COLUMN IF NOT EXISTS "consentAt" TIMESTAMP(3),
  ADD COLUMN IF NOT EXISTS "doNotContact" BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS "ownerId" TEXT,
  ADD COLUMN IF NOT EXISTS "proUserId" TEXT,
  ADD COLUMN IF NOT EXISTS "refCode" TEXT,
  ADD COLUMN IF NOT EXISTS "lastContactedAt" TIMESTAMP(3);

CREATE UNIQUE INDEX IF NOT EXISTS "Lead_refCode_key" ON "Lead"("refCode");
CREATE INDEX IF NOT EXISTS "Lead_areaId_idx" ON "Lead"("areaId");
CREATE INDEX IF NOT EXISTS "Lead_zoneId_idx" ON "Lead"("zoneId");
CREATE INDEX IF NOT EXISTS "Lead_countryCode_idx" ON "Lead"("countryCode");
CREATE INDEX IF NOT EXISTS "Lead_callbackDate_idx" ON "Lead"("callbackDate");
CREATE INDEX IF NOT EXISTS "Lead_doNotContact_idx" ON "Lead"("doNotContact");

CREATE TABLE IF NOT EXISTS "LeadActivity" (
  "id" TEXT NOT NULL,
  "leadId" TEXT NOT NULL,
  "adminId" TEXT,
  "adminName" TEXT,
  "kind" TEXT NOT NULL,
  "outcome" TEXT,
  "note" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "LeadActivity_pkey" PRIMARY KEY ("id")
);
CREATE INDEX IF NOT EXISTS "LeadActivity_leadId_createdAt_idx" ON "LeadActivity"("leadId", "createdAt");

CREATE TABLE IF NOT EXISTS "ExportAudit" (
  "id" TEXT NOT NULL,
  "adminId" TEXT NOT NULL,
  "adminName" TEXT NOT NULL,
  "resource" TEXT NOT NULL,
  "format" TEXT NOT NULL,
  "filter" JSONB NOT NULL,
  "columns" TEXT[],
  "rowCount" INTEGER NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "ExportAudit_pkey" PRIMARY KEY ("id")
);
CREATE INDEX IF NOT EXISTS "ExportAudit_createdAt_idx" ON "ExportAudit"("createdAt");

CREATE TABLE IF NOT EXISTS "SavedFilter" (
  "id" TEXT NOT NULL,
  "adminId" TEXT NOT NULL,
  "resource" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "filter" JSONB NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "SavedFilter_pkey" PRIMARY KEY ("id")
);
CREATE INDEX IF NOT EXISTS "SavedFilter_adminId_resource_idx" ON "SavedFilter"("adminId", "resource");

CREATE TABLE IF NOT EXISTS "ImportMapping" (
  "id" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "mapping" JSONB NOT NULL,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "ImportMapping_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX IF NOT EXISTS "ImportMapping_name_key" ON "ImportMapping"("name");

CREATE TABLE IF NOT EXISTS "City" (
  "id" TEXT NOT NULL,
  "countryCode" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "lat" DOUBLE PRECISION,
  "lng" DOUBLE PRECISION,
  "status" TEXT NOT NULL DEFAULT 'waitlist',
  CONSTRAINT "City_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX IF NOT EXISTS "City_countryCode_name_key" ON "City"("countryCode", "name");

CREATE TABLE IF NOT EXISTS "Area" (
  "id" TEXT NOT NULL,
  "cityId" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "aliases" TEXT[] DEFAULT ARRAY[]::TEXT[],
  "lat" DOUBLE PRECISION,
  "lng" DOUBLE PRECISION,
  "polygon" JSONB,
  "status" TEXT NOT NULL DEFAULT 'waitlist',
  CONSTRAINT "Area_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX IF NOT EXISTS "Area_cityId_name_key" ON "Area"("cityId", "name");
CREATE INDEX IF NOT EXISTS "Area_cityId_idx" ON "Area"("cityId");
ALTER TABLE "Area" ADD CONSTRAINT "Area_cityId_fkey" FOREIGN KEY ("cityId") REFERENCES "City"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "LocaleConfig" ADD COLUMN IF NOT EXISTS "marketStatus" TEXT NOT NULL DEFAULT 'waitlist';
UPDATE "LocaleConfig" SET "marketStatus" = 'live' WHERE "isLive" = true;
ALTER TABLE "Market" ADD COLUMN IF NOT EXISTS "launchDate" TIMESTAMP(3);
ALTER TABLE "MarketCategory" ADD COLUMN IF NOT EXISTS "targetPros" INTEGER NOT NULL DEFAULT 10;
