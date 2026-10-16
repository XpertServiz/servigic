-- Pro wallet top-ups: transaction id (required for new top-ups in the API; nullable here for older rows).
ALTER TABLE "TopUp" ADD COLUMN "reference" TEXT;
CREATE INDEX "TopUp_reference_idx" ON "TopUp"("reference");
