ALTER TABLE "Market" ADD COLUMN IF NOT EXISTS "proRadiusMaxKm" INTEGER;
ALTER TABLE "Market" ADD COLUMN IF NOT EXISTS "maxUnpaidJobs" INTEGER;
ALTER TABLE "SiteSettings" ALTER COLUMN "proRadiusMaxKm" SET DEFAULT 30;
ALTER TABLE "ProviderProfile" ALTER COLUMN "serviceRadiusKm" SET DEFAULT 15;
-- Pros may now go up to 30 km; new pros start at 15 km. Saudi Arabia: 10 unpaid jobs before the pause.
UPDATE "SiteSettings" SET "proRadiusMaxKm" = 30 WHERE "proRadiusMaxKm" < 30;
UPDATE "SiteSettings" SET "proRadiusDefaultKm" = 15 WHERE "proRadiusDefaultKm" IS NOT NULL;
UPDATE "Market" SET "maxUnpaidJobs" = 10 WHERE "countryCode" = 'SA' AND "maxUnpaidJobs" IS NULL;
