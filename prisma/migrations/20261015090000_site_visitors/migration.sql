-- CreateTable
CREATE TABLE "SiteVisitor" (
    "id" TEXT NOT NULL,
    "day" TEXT NOT NULL,
    "visitorHash" TEXT NOT NULL,
    "country" TEXT NOT NULL DEFAULT 'XX',
    "pageViews" INTEGER NOT NULL DEFAULT 1,
    "firstSeenAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "lastSeenAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SiteVisitor_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "SiteVisitor_day_visitorHash_key" ON "SiteVisitor"("day", "visitorHash");

-- CreateIndex
CREATE INDEX "SiteVisitor_lastSeenAt_idx" ON "SiteVisitor"("lastSeenAt");

-- CreateIndex
CREATE INDEX "SiteVisitor_country_idx" ON "SiteVisitor"("country");
