-- Admin-posted jobs: placeholder customer accounts, claim-on-register, and audit columns.
ALTER TABLE "User" ADD COLUMN "managedByAdmin" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "User" ADD COLUMN "pendingPasswordHash" TEXT;
ALTER TABLE "User" ADD COLUMN "pendingName" TEXT;
ALTER TABLE "User" ADD COLUMN "pendingEmail" TEXT;
ALTER TABLE "Job" ADD COLUMN "postedByAdminId" TEXT;
ALTER TABLE "Booking" ADD COLUMN "confirmedByAdminId" TEXT;
