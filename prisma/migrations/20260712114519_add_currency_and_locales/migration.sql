-- CreateEnum
CREATE TYPE "Currency" AS ENUM ('PKR', 'USD', 'CAD', 'EUR', 'PLN', 'SAR', 'AED', 'QAR');

-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "Language" ADD VALUE 'de';
ALTER TYPE "Language" ADD VALUE 'fr';
ALTER TYPE "Language" ADD VALUE 'pl';

-- CreateTable
CREATE TABLE "ExchangeRate" (
    "currency" "Currency" NOT NULL,
    "ratePerPKR" DOUBLE PRECISION NOT NULL,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ExchangeRate_pkey" PRIMARY KEY ("currency")
);
