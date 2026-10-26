ALTER TABLE "SiteSettings" ADD COLUMN IF NOT EXISTS "customerTesterGroupUrl" TEXT;
ALTER TABLE "SiteSettings" ADD COLUMN IF NOT EXISTS "customerTestingOptInUrl" TEXT;
