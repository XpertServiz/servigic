-- Payment accounts shown to pros for wallet top-ups (editable in admin Settings).
ALTER TABLE "SiteSettings" ADD COLUMN "payJazzcashNumber" TEXT;
ALTER TABLE "SiteSettings" ADD COLUMN "payJazzcashTitle" TEXT;
ALTER TABLE "SiteSettings" ADD COLUMN "payEasypaisaNumber" TEXT;
ALTER TABLE "SiteSettings" ADD COLUMN "payEasypaisaTitle" TEXT;
ALTER TABLE "SiteSettings" ADD COLUMN "payBankName" TEXT;
ALTER TABLE "SiteSettings" ADD COLUMN "payBankAccountTitle" TEXT;
ALTER TABLE "SiteSettings" ADD COLUMN "payBankAccountNumber" TEXT;
