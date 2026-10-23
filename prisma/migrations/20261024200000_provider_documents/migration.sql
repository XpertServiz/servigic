CREATE TABLE IF NOT EXISTS "ProviderDocument" (
  "id" TEXT NOT NULL,
  "providerId" TEXT NOT NULL,
  "type" TEXT NOT NULL,
  "label" TEXT NOT NULL,
  "fileUrl" TEXT NOT NULL,
  "expiresAt" TIMESTAMP(3),
  "status" TEXT NOT NULL DEFAULT 'PENDING',
  "rejectReason" TEXT,
  "submittedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "reviewedAt" TIMESTAMP(3),
  "reviewedById" TEXT,
  "lastExpiryAlert" TEXT,
  CONSTRAINT "ProviderDocument_pkey" PRIMARY KEY ("id")
);
CREATE INDEX IF NOT EXISTS "ProviderDocument_providerId_status_idx" ON "ProviderDocument"("providerId", "status");
CREATE INDEX IF NOT EXISTS "ProviderDocument_status_expiresAt_idx" ON "ProviderDocument"("status", "expiresAt");
DO $$ BEGIN
  ALTER TABLE "ProviderDocument" ADD CONSTRAINT "ProviderDocument_providerId_fkey" FOREIGN KEY ("providerId") REFERENCES "ProviderProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
ALTER TABLE "ProviderProfile" ADD COLUMN IF NOT EXISTS "documentsBlockedAt" TIMESTAMP(3);
ALTER TABLE "ProviderProfile" ADD COLUMN IF NOT EXISTS "documentsBlockedReason" TEXT;
ALTER TABLE "SiteSettings" ADD COLUMN IF NOT EXISTS "docAlertDays" TEXT NOT NULL DEFAULT '30,14,7';
ALTER TABLE "SiteSettings" ADD COLUMN IF NOT EXISTS "docGraceDays" INTEGER NOT NULL DEFAULT 7;
ALTER TABLE "SiteSettings" ADD COLUMN IF NOT EXISTS "docMandatoryTypes" TEXT NOT NULL DEFAULT 'ID';
