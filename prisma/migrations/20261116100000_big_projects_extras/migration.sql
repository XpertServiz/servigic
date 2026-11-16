ALTER TABLE "BigProject" ADD COLUMN "files" JSONB, ADD COLUMN "rating" INTEGER, ADD COLUMN "ratingComment" TEXT, ADD COLUMN "ratedAt" TIMESTAMP(3);

CREATE TABLE "BigProjectWaitlist" (
    "id" TEXT NOT NULL,
    "country" TEXT NOT NULL,
    "city" TEXT,
    "name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "phone" TEXT,
    "trades" TEXT[],
    "notes" TEXT,
    "language" TEXT,
    "ipHash" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "BigProjectWaitlist_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "BigProjectWaitlist_country_createdAt_idx" ON "BigProjectWaitlist"("country", "createdAt");
