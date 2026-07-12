-- CreateEnum
CREATE TYPE "PlanFrequency" AS ENUM ('MONTHLY', 'QUARTERLY', 'BIANNUAL');

-- CreateEnum
CREATE TYPE "PlanStatus" AS ENUM ('ACTIVE', 'PAUSED', 'CANCELLED');

-- CreateTable
CREATE TABLE "MaintenancePlan" (
    "id" TEXT NOT NULL,
    "customerId" TEXT NOT NULL,
    "categoryId" TEXT NOT NULL,
    "city" TEXT NOT NULL,
    "areaLabel" TEXT NOT NULL,
    "exactAddress" TEXT NOT NULL,
    "lat" DOUBLE PRECISION NOT NULL,
    "lng" DOUBLE PRECISION NOT NULL,
    "frequency" "PlanFrequency" NOT NULL,
    "preferredProviderId" TEXT,
    "pricePerVisitPKR" INTEGER NOT NULL,
    "nextDueDate" TIMESTAMP(3) NOT NULL,
    "status" "PlanStatus" NOT NULL DEFAULT 'ACTIVE',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "MaintenancePlan_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PlanVisit" (
    "id" TEXT NOT NULL,
    "planId" TEXT NOT NULL,
    "scheduledDate" TIMESTAMP(3) NOT NULL,
    "jobId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PlanVisit_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "MaintenancePlan_status_nextDueDate_idx" ON "MaintenancePlan"("status", "nextDueDate");

-- CreateIndex
CREATE INDEX "MaintenancePlan_customerId_idx" ON "MaintenancePlan"("customerId");

-- CreateIndex
CREATE UNIQUE INDEX "PlanVisit_jobId_key" ON "PlanVisit"("jobId");

-- CreateIndex
CREATE INDEX "PlanVisit_planId_idx" ON "PlanVisit"("planId");

-- AddForeignKey
ALTER TABLE "MaintenancePlan" ADD CONSTRAINT "MaintenancePlan_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MaintenancePlan" ADD CONSTRAINT "MaintenancePlan_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "ServiceCategory"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MaintenancePlan" ADD CONSTRAINT "MaintenancePlan_preferredProviderId_fkey" FOREIGN KEY ("preferredProviderId") REFERENCES "ProviderProfile"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PlanVisit" ADD CONSTRAINT "PlanVisit_planId_fkey" FOREIGN KEY ("planId") REFERENCES "MaintenancePlan"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PlanVisit" ADD CONSTRAINT "PlanVisit_jobId_fkey" FOREIGN KEY ("jobId") REFERENCES "Job"("id") ON DELETE SET NULL ON UPDATE CASCADE;
