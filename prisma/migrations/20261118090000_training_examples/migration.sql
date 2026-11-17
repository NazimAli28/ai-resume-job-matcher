-- CreateEnum
CREATE TYPE "ExampleOutcome" AS ENUM ('IGNORED', 'ACCEPTED', 'EDITED', 'REJECTED');

-- CreateTable
CREATE TABLE "TrainingExample" (
    "id" TEXT NOT NULL,
    "subjectHash" TEXT NOT NULL,
    "refHash" TEXT,
    "task" TEXT NOT NULL,
    "promptVersion" TEXT NOT NULL,
    "model" TEXT NOT NULL,
    "input" JSONB NOT NULL,
    "output" JSONB NOT NULL,
    "outcome" "ExampleOutcome" NOT NULL DEFAULT 'IGNORED',
    "edited" JSONB,
    "signals" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TrainingExample_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "TrainingExample_subjectHash_idx" ON "TrainingExample"("subjectHash");

-- CreateIndex
CREATE INDEX "TrainingExample_refHash_idx" ON "TrainingExample"("refHash");

-- CreateIndex
CREATE INDEX "TrainingExample_createdAt_idx" ON "TrainingExample"("createdAt");


-- The browser never queries the database: RLS on with no policies, roles revoked.
ALTER TABLE "TrainingExample" ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE "TrainingExample" FROM anon, authenticated;
