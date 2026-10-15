-- CreateEnum
CREATE TYPE "MarketStatus" AS ENUM ('WAITLIST', 'PILOT', 'LIVE');

-- CreateEnum
CREATE TYPE "ProActivation" AS ENUM ('ACTIVE', 'WAITING');

-- AlterTable
ALTER TABLE "ProviderProfile" ADD COLUMN     "activatedAt" TIMESTAMP(3),
ADD COLUMN     "activation" "ProActivation" NOT NULL DEFAULT 'ACTIVE',
ADD COLUMN     "alertDailyCap" INTEGER NOT NULL DEFAULT 30,
ADD COLUMN     "alertQuietEndMin" INTEGER,
ADD COLUMN     "alertQuietStartMin" INTEGER,
ADD COLUMN     "alertsPaused" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "commissionFreeJobsLeft" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "foundingPro" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "waitingSince" TIMESTAMP(3);

-- AlterTable
ALTER TABLE "Job" ADD COLUMN     "extraRadiusKm" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "noBidsNotifiedAt" TIMESTAMP(3);

-- AlterTable
ALTER TABLE "DispatchAlert" ADD COLUMN     "alertCount" INTEGER NOT NULL DEFAULT 1,
ADD COLUMN     "pushSent" BOOLEAN NOT NULL DEFAULT false;

-- AlterTable
ALTER TABLE "SiteSettings" ADD COLUMN     "alertNearestN" INTEGER NOT NULL DEFAULT 12,
ADD COLUMN     "earlyProFreeJobs" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "noBidsAfterMin" INTEGER NOT NULL DEFAULT 20;

-- AlterTable
ALTER TABLE "CountryWaitlistEntry" ADD COLUMN     "phone" TEXT,
ADD COLUMN     "role" TEXT,
ADD COLUMN     "trade" "Trade",
ADD COLUMN     "userId" TEXT,
ADD COLUMN     "zone" TEXT,
ALTER COLUMN "email" DROP NOT NULL;

-- CreateTable
CREATE TABLE "Market" (
    "id" TEXT NOT NULL,
    "countryCode" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "cities" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "enabled" BOOLEAN NOT NULL DEFAULT false,
    "status" "MarketStatus" NOT NULL DEFAULT 'WAITLIST',
    "currency" "Currency" NOT NULL DEFAULT 'PKR',
    "phoneCode" TEXT NOT NULL DEFAULT '+92',
    "timezone" TEXT NOT NULL DEFAULT 'Asia/Karachi',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Market_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MarketCategory" (
    "id" TEXT NOT NULL,
    "marketId" TEXT NOT NULL,
    "trade" "Trade" NOT NULL,
    "enabled" BOOLEAN NOT NULL DEFAULT true,
    "maxActivePros" INTEGER,

    CONSTRAINT "MarketCategory_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Market_countryCode_name_key" ON "Market"("countryCode", "name");

-- CreateIndex
CREATE UNIQUE INDEX "MarketCategory_marketId_trade_key" ON "MarketCategory"("marketId", "trade");

-- CreateIndex
CREATE INDEX "CountryWaitlistEntry_trade_idx" ON "CountryWaitlistEntry"("trade");

-- AddForeignKey
ALTER TABLE "MarketCategory" ADD CONSTRAINT "MarketCategory_marketId_fkey" FOREIGN KEY ("marketId") REFERENCES "Market"("id") ON DELETE CASCADE ON UPDATE CASCADE;


-- Seed (idempotent). Pakistan keeps working exactly as before: every area is LIVE
-- with every existing service category enabled; narrow the launch trades in
-- Admin -> Markets. Canada is Movers-only and stays off until switched on.
INSERT INTO "Market" ("id","countryCode","name","cities","enabled","status","currency","phoneCode","timezone","updatedAt") VALUES
  ('mkt_pk_karachi','PK','Karachi',ARRAY['Karachi'],true,'LIVE','PKR','+92','Asia/Karachi',CURRENT_TIMESTAMP),
  ('mkt_pk_lahore','PK','Lahore',ARRAY['Lahore'],true,'LIVE','PKR','+92','Asia/Karachi',CURRENT_TIMESTAMP),
  ('mkt_pk_islamabad','PK','Islamabad / Rawalpindi',ARRAY['Islamabad','Rawalpindi'],true,'LIVE','PKR','+92','Asia/Karachi',CURRENT_TIMESTAMP),
  ('mkt_ca','CA','Canada',ARRAY['Toronto','Vancouver','Montreal','Calgary','Ottawa'],false,'WAITLIST','CAD','+1','America/Toronto',CURRENT_TIMESTAMP)
ON CONFLICT ("countryCode","name") DO NOTHING;

INSERT INTO "MarketCategory" ("id","marketId","trade","enabled")
SELECT md5(m."id" || c."trade"::text), m."id", c."trade", true
FROM "Market" m CROSS JOIN "ServiceCategory" c
WHERE m."countryCode" = 'PK'
ON CONFLICT ("marketId","trade") DO NOTHING;

INSERT INTO "MarketCategory" ("id","marketId","trade","enabled")
VALUES (md5('mkt_ca' || 'MOVERS'),'mkt_ca','MOVERS',true)
ON CONFLICT ("marketId","trade") DO NOTHING;
