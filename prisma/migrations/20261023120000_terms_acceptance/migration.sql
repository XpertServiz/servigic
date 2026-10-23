CREATE TABLE IF NOT EXISTS "TermsAcceptance" (
  "id" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "role" "Role" NOT NULL,
  "document" TEXT NOT NULL,
  "country" TEXT NOT NULL,
  "version" TEXT NOT NULL,
  "docHash" TEXT NOT NULL,
  "documentText" TEXT NOT NULL,
  "signedName" TEXT NOT NULL,
  "ip" TEXT,
  "userAgent" TEXT,
  "locale" TEXT,
  "source" TEXT NOT NULL,
  "acceptedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "TermsAcceptance_pkey" PRIMARY KEY ("id")
);
CREATE INDEX IF NOT EXISTS "TermsAcceptance_userId_document_idx" ON "TermsAcceptance"("userId", "document");
DO $$ BEGIN
  ALTER TABLE "TermsAcceptance" ADD CONSTRAINT "TermsAcceptance_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
