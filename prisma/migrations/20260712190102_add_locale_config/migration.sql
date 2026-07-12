-- CreateTable
CREATE TABLE "LocaleConfig" (
    "countryCode" TEXT NOT NULL,
    "countryName" TEXT NOT NULL,
    "language" "Language" NOT NULL DEFAULT 'en',
    "direction" TEXT NOT NULL DEFAULT 'ltr',
    "currency" "Currency" NOT NULL DEFAULT 'PKR',
    "paymentMethodsShown" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "legalDisclaimer" TEXT NOT NULL DEFAULT '',
    "isLive" BOOLEAN NOT NULL DEFAULT false,
    "citiesLive" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "LocaleConfig_pkey" PRIMARY KEY ("countryCode")
);

-- CreateTable
CREATE TABLE "CountryWaitlistEntry" (
    "id" TEXT NOT NULL,
    "countryCode" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "name" TEXT,
    "city" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CountryWaitlistEntry_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "CountryWaitlistEntry_countryCode_idx" ON "CountryWaitlistEntry"("countryCode");
