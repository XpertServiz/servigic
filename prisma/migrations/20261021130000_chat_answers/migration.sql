CREATE TABLE IF NOT EXISTS "ChatAnswer" (
  "id" TEXT NOT NULL,
  "lang" TEXT NOT NULL,
  "qHash" TEXT NOT NULL,
  "question" TEXT NOT NULL,
  "answer" TEXT,
  "source" TEXT NOT NULL,
  "hits" INTEGER NOT NULL DEFAULT 1,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "lastAskedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "ChatAnswer_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX IF NOT EXISTS "ChatAnswer_lang_qHash_key" ON "ChatAnswer"("lang", "qHash");
CREATE INDEX IF NOT EXISTS "ChatAnswer_source_hits_idx" ON "ChatAnswer"("source", "hits");
