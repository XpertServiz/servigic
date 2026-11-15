CREATE TABLE "BigProject" (
  "id" TEXT NOT NULL,
  "reference" TEXT NOT NULL,
  "status" TEXT NOT NULL DEFAULT 'new',
  "source" TEXT NOT NULL DEFAULT 'web',
  "locale" TEXT,
  "country" TEXT NOT NULL DEFAULT 'PK',
  "city" TEXT,
  "area" TEXT,
  "address" TEXT,
  "customerUserId" TEXT,
  "customerName" TEXT NOT NULL,
  "customerPhone" TEXT NOT NULL,
  "customerEmail" TEXT NOT NULL,
  "preferredContact" TEXT,
  "bestTime" TEXT,
  "projectType" TEXT,
  "propertyStage" TEXT,
  "areaSqft" INTEGER,
  "floors" INTEGER,
  "budgetBand" TEXT,
  "startWindow" TEXT,
  "notes" TEXT,
  "trades" TEXT[],
  "answers" JSONB,
  "consentAt" TIMESTAMP(3) NOT NULL,
  "ipHash" TEXT,
  "duplicateOf" TEXT,
  "contractAmount" DECIMAL(14,2),
  "currency" TEXT NOT NULL DEFAULT 'PKR',
  "warrantyDays" INTEGER NOT NULL DEFAULT 15,
  "lostReason" TEXT,
  "firstContactedAt" TIMESTAMP(3),
  "slaReminderAt" TIMESTAMP(3),
  "siteVisitAt" TIMESTAMP(3),
  "siteVisitNotes" TEXT,
  "followUpAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "BigProject_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "BigProject_reference_key" ON "BigProject"("reference");
CREATE INDEX "BigProject_status_createdAt_idx" ON "BigProject"("status", "createdAt");
CREATE INDEX "BigProject_customerPhone_idx" ON "BigProject"("customerPhone");

CREATE TABLE "BigProjectEvent" (
  "id" TEXT NOT NULL,
  "projectId" TEXT NOT NULL,
  "actor" TEXT NOT NULL,
  "type" TEXT NOT NULL,
  "body" TEXT,
  "data" JSONB,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "BigProjectEvent_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "BigProjectEvent_projectId_createdAt_idx" ON "BigProjectEvent"("projectId", "createdAt");
ALTER TABLE "BigProjectEvent" ADD CONSTRAINT "BigProjectEvent_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "BigProject"("id") ON DELETE CASCADE ON UPDATE CASCADE;
