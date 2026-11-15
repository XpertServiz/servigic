CREATE INDEX "BigProject_customerUserId_idx" ON "BigProject"("customerUserId");
CREATE TABLE "BigProjectEstimate" (
  "id" TEXT NOT NULL, "projectId" TEXT NOT NULL, "version" INTEGER NOT NULL, "status" TEXT NOT NULL DEFAULT 'sent',
  "currency" TEXT NOT NULL DEFAULT 'PKR', "items" JSONB NOT NULL, "subtotal" DECIMAL(14,2) NOT NULL, "discount" DECIMAL(14,2) NOT NULL DEFAULT 0,
  "total" DECIMAL(14,2) NOT NULL, "validUntil" TIMESTAMP(3), "terms" TEXT, "token" TEXT NOT NULL, "sentAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "respondedAt" TIMESTAMP(3), "customerComment" TEXT, CONSTRAINT "BigProjectEstimate_pkey" PRIMARY KEY ("id"));
CREATE UNIQUE INDEX "BigProjectEstimate_token_key" ON "BigProjectEstimate"("token");
CREATE INDEX "BigProjectEstimate_projectId_version_idx" ON "BigProjectEstimate"("projectId", "version");
ALTER TABLE "BigProjectEstimate" ADD CONSTRAINT "BigProjectEstimate_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "BigProject"("id") ON DELETE CASCADE ON UPDATE CASCADE;
CREATE TABLE "BigProjectAssignment" (
  "id" TEXT NOT NULL, "projectId" TEXT NOT NULL, "proId" TEXT NOT NULL, "role" TEXT NOT NULL DEFAULT 'lead', "scope" TEXT NOT NULL,
  "payoutAmount" DECIMAL(14,2) NOT NULL, "plannedStart" TIMESTAMP(3), "plannedEnd" TIMESTAMP(3), "status" TEXT NOT NULL DEFAULT 'invited',
  "invitedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, "respondBy" TIMESTAMP(3) NOT NULL, "respondedAt" TIMESTAMP(3), "removeReason" TEXT,
  "contactRevealedAt" TIMESTAMP(3), CONSTRAINT "BigProjectAssignment_pkey" PRIMARY KEY ("id"));
CREATE INDEX "BigProjectAssignment_proId_status_idx" ON "BigProjectAssignment"("proId", "status");
CREATE INDEX "BigProjectAssignment_projectId_idx" ON "BigProjectAssignment"("projectId");
ALTER TABLE "BigProjectAssignment" ADD CONSTRAINT "BigProjectAssignment_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "BigProject"("id") ON DELETE CASCADE ON UPDATE CASCADE;
CREATE TABLE "BigProjectMilestone" (
  "id" TEXT NOT NULL, "projectId" TEXT NOT NULL, "assignmentId" TEXT, "title" TEXT NOT NULL, "amount" DECIMAL(14,2), "dueDate" TIMESTAMP(3),
  "status" TEXT NOT NULL DEFAULT 'planned', "readyAt" TIMESTAMP(3), "readyNote" TEXT, "photos" TEXT[] DEFAULT ARRAY[]::TEXT[], "verifiedAt" TIMESTAMP(3),
  "paidAt" TIMESTAMP(3), "paidAmount" DECIMAL(14,2), CONSTRAINT "BigProjectMilestone_pkey" PRIMARY KEY ("id"));
CREATE INDEX "BigProjectMilestone_projectId_idx" ON "BigProjectMilestone"("projectId");
CREATE INDEX "BigProjectMilestone_assignmentId_idx" ON "BigProjectMilestone"("assignmentId");
ALTER TABLE "BigProjectMilestone" ADD CONSTRAINT "BigProjectMilestone_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "BigProject"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "BigProjectMilestone" ADD CONSTRAINT "BigProjectMilestone_assignmentId_fkey" FOREIGN KEY ("assignmentId") REFERENCES "BigProjectAssignment"("id") ON DELETE SET NULL ON UPDATE CASCADE;
