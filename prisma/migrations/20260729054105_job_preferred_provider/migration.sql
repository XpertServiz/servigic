-- AlterTable
ALTER TABLE "Job" ADD COLUMN     "preferredProviderId" TEXT;

-- AddForeignKey
ALTER TABLE "Job" ADD CONSTRAINT "Job_preferredProviderId_fkey" FOREIGN KEY ("preferredProviderId") REFERENCES "ProviderProfile"("id") ON DELETE SET NULL ON UPDATE CASCADE;
