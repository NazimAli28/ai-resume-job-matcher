-- CreateEnum
CREATE TYPE "CoverLetterLength" AS ENUM ('SHORT', 'MEDIUM', 'LONG');

-- CreateEnum
CREATE TYPE "CoverLetterTone" AS ENUM ('PROFESSIONAL', 'FRIENDLY', 'CONFIDENT');

-- CreateEnum
CREATE TYPE "InterviewType" AS ENUM ('BEHAVIORAL', 'TECHNICAL', 'MIXED', 'HR');

-- CreateEnum
CREATE TYPE "InterviewDifficulty" AS ENUM ('EASY', 'STANDARD', 'HARD');

-- CreateEnum
CREATE TYPE "InterviewPersona" AS ENUM ('FRIENDLY_RECRUITER', 'HIRING_MANAGER', 'TECHNICAL_PANEL', 'TOUGH_BUT_FAIR');

-- CreateEnum
CREATE TYPE "InterviewStatus" AS ENUM ('ACTIVE', 'COMPLETED', 'ABANDONED');

-- CreateTable
CREATE TABLE "TailorSession" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "jobId" TEXT NOT NULL,
    "resumeVersionId" TEXT NOT NULL,
    "inputsHash" TEXT NOT NULL,
    "promptVersion" TEXT NOT NULL,
    "suggestions" JSONB NOT NULL,
    "stats" JSONB NOT NULL,
    "resultVersionId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TailorSession_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CoverLetter" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "jobId" TEXT NOT NULL,
    "resumeVersionId" TEXT,
    "length" "CoverLetterLength" NOT NULL DEFAULT 'MEDIUM',
    "tone" "CoverLetterTone" NOT NULL DEFAULT 'PROFESSIONAL',
    "recipient" TEXT,
    "notes" TEXT,
    "text" TEXT NOT NULL,
    "history" JSONB NOT NULL DEFAULT '[]',
    "droppedCount" INTEGER NOT NULL DEFAULT 0,
    "lockedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CoverLetter_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "InterviewSession" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "jobId" TEXT,
    "resumeVersionId" TEXT,
    "targetRole" TEXT,
    "type" "InterviewType" NOT NULL,
    "questionCount" INTEGER NOT NULL,
    "difficulty" "InterviewDifficulty" NOT NULL,
    "persona" "InterviewPersona" NOT NULL,
    "timerSec" INTEGER NOT NULL DEFAULT 120,
    "status" "InterviewStatus" NOT NULL DEFAULT 'ACTIVE',
    "blueprint" JSONB NOT NULL,
    "followUpsUsed" INTEGER NOT NULL DEFAULT 0,
    "counted" BOOLEAN NOT NULL DEFAULT false,
    "overall" INTEGER,
    "report" JSONB,
    "completedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "InterviewSession_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "InterviewQuestion" (
    "id" TEXT NOT NULL,
    "sessionId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "order" INTEGER NOT NULL,
    "parentId" TEXT,
    "kind" TEXT NOT NULL,
    "competency" TEXT NOT NULL,
    "text" TEXT NOT NULL,
    "keyPoints" JSONB NOT NULL,
    "whyAsked" TEXT,
    "reqIds" TEXT[],
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "InterviewQuestion_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "InterviewAnswer" (
    "id" TEXT NOT NULL,
    "questionId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "attempt" INTEGER NOT NULL DEFAULT 1,
    "text" TEXT,
    "skipped" BOOLEAN NOT NULL DEFAULT false,
    "hintUsed" BOOLEAN NOT NULL DEFAULT false,
    "durationSec" INTEGER,
    "check" JSONB,
    "evaluation" JSONB,
    "score" INTEGER,
    "modelAnswer" JSONB,
    "textPurgedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "InterviewAnswer_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "InterviewPrep" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "jobId" TEXT NOT NULL,
    "resumeVersionId" TEXT,
    "questions" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "InterviewPrep_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "TailorSession_userId_jobId_resumeVersionId_key" ON "TailorSession"("userId", "jobId", "resumeVersionId");

-- CreateIndex
CREATE INDEX "CoverLetter_userId_jobId_idx" ON "CoverLetter"("userId", "jobId");

-- CreateIndex
CREATE INDEX "InterviewSession_userId_createdAt_idx" ON "InterviewSession"("userId", "createdAt");

-- CreateIndex
CREATE INDEX "InterviewSession_status_updatedAt_idx" ON "InterviewSession"("status", "updatedAt");

-- CreateIndex
CREATE INDEX "InterviewQuestion_sessionId_order_idx" ON "InterviewQuestion"("sessionId", "order");

-- CreateIndex
CREATE INDEX "InterviewAnswer_questionId_attempt_idx" ON "InterviewAnswer"("questionId", "attempt");

-- CreateIndex
CREATE INDEX "InterviewAnswer_userId_createdAt_idx" ON "InterviewAnswer"("userId", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "InterviewPrep_userId_jobId_key" ON "InterviewPrep"("userId", "jobId");

-- AddForeignKey
ALTER TABLE "TailorSession" ADD CONSTRAINT "TailorSession_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TailorSession" ADD CONSTRAINT "TailorSession_jobId_fkey" FOREIGN KEY ("jobId") REFERENCES "Job"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TailorSession" ADD CONSTRAINT "TailorSession_resumeVersionId_fkey" FOREIGN KEY ("resumeVersionId") REFERENCES "ResumeVersion"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CoverLetter" ADD CONSTRAINT "CoverLetter_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CoverLetter" ADD CONSTRAINT "CoverLetter_jobId_fkey" FOREIGN KEY ("jobId") REFERENCES "Job"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CoverLetter" ADD CONSTRAINT "CoverLetter_resumeVersionId_fkey" FOREIGN KEY ("resumeVersionId") REFERENCES "ResumeVersion"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InterviewSession" ADD CONSTRAINT "InterviewSession_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InterviewSession" ADD CONSTRAINT "InterviewSession_jobId_fkey" FOREIGN KEY ("jobId") REFERENCES "Job"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InterviewSession" ADD CONSTRAINT "InterviewSession_resumeVersionId_fkey" FOREIGN KEY ("resumeVersionId") REFERENCES "ResumeVersion"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InterviewQuestion" ADD CONSTRAINT "InterviewQuestion_sessionId_fkey" FOREIGN KEY ("sessionId") REFERENCES "InterviewSession"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InterviewAnswer" ADD CONSTRAINT "InterviewAnswer_questionId_fkey" FOREIGN KEY ("questionId") REFERENCES "InterviewQuestion"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InterviewPrep" ADD CONSTRAINT "InterviewPrep_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InterviewPrep" ADD CONSTRAINT "InterviewPrep_jobId_fkey" FOREIGN KEY ("jobId") REFERENCES "Job"("id") ON DELETE CASCADE ON UPDATE CASCADE;


-- The browser never queries the database: RLS on with no policies, roles revoked.
ALTER TABLE "TailorSession" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "CoverLetter" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "InterviewSession" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "InterviewQuestion" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "InterviewAnswer" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "InterviewPrep" ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE "TailorSession", "CoverLetter", "InterviewSession", "InterviewQuestion", "InterviewAnswer", "InterviewPrep" FROM anon, authenticated;
