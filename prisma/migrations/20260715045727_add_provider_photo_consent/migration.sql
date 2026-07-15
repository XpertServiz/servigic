-- AlterTable
ALTER TABLE "ProviderProfile" ADD COLUMN     "photoConsentAt" TIMESTAMP(3),
ADD COLUMN     "photoConsentPublic" BOOLEAN NOT NULL DEFAULT false;
