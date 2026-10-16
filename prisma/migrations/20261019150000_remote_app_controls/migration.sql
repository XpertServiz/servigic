-- Remote app controls: announcement banner, minimum app version + store links, minimum top-up amount.
ALTER TABLE "SiteSettings" ADD COLUMN "announcementActive" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "SiteSettings" ADD COLUMN "announcementTitle" TEXT;
ALTER TABLE "SiteSettings" ADD COLUMN "announcementBody" TEXT;
ALTER TABLE "SiteSettings" ADD COLUMN "announcementAudience" TEXT NOT NULL DEFAULT 'ALL';
ALTER TABLE "SiteSettings" ADD COLUMN "minAndroidVersionCode" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "SiteSettings" ADD COLUMN "storeUrlPro" TEXT;
ALTER TABLE "SiteSettings" ADD COLUMN "storeUrlCustomer" TEXT;
ALTER TABLE "SiteSettings" ADD COLUMN "minTopUpPKR" INTEGER NOT NULL DEFAULT 500;
