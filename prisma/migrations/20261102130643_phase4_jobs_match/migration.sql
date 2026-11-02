-- CreateEnum
CREATE TYPE "JobSource" AS ENUM ('LINKEDIN', 'ROZEE_PK', 'INDEED', 'MUSTAKBIL', 'COMPANY_SITE', 'REFERRAL', 'GOVT_PORTAL', 'JOB_FAIR', 'RECRUITER', 'SOCIAL_MEDIA', 'OTHER');

-- CreateEnum
CREATE TYPE "RequirementType" AS ENUM ('MUST_HAVE', 'NICE_TO_HAVE');

-- CreateEnum
CREATE TYPE "RequirementKind" AS ENUM ('SKILL', 'TOOL', 'TITLE', 'YEARS', 'EDUCATION', 'CERT', 'LOCATION', 'WORK_AUTH', 'LANGUAGE', 'SOFT', 'OTHER');

-- CreateEnum
CREATE TYPE "MatchOverride" AS ENUM ('CONFIRM', 'REJECT', 'LEARNING', 'ADD_EVIDENCE');

-- CreateEnum
CREATE TYPE "AiRequestStatus" AS ENUM ('OK', 'INVALID_OUTPUT', 'REFUSED', 'ERROR');

-- CreateTable
CREATE TABLE "Job" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "company" TEXT,
    "location" TEXT,
    "workMode" TEXT,
    "seniorityHint" TEXT,
    "url" TEXT,
    "source" "JobSource" NOT NULL DEFAULT 'OTHER',
    "sourceDetail" TEXT,
    "rawText" TEXT NOT NULL,
    "textHash" TEXT NOT NULL,
    "responsibilities" TEXT[],
    "injectionSuspect" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Job_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "JobRequirement" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "jobId" TEXT NOT NULL,
    "text" TEXT NOT NULL,
    "quote" TEXT,
    "kind" "RequirementKind" NOT NULL,
    "priority" "RequirementType" NOT NULL,
    "hard" BOOLEAN NOT NULL DEFAULT false,
    "skillTerm" TEXT,
    "years" INTEGER,
    "degreeLevel" TEXT,
    "userEdited" BOOLEAN NOT NULL DEFAULT false,
    "override" "MatchOverride",
    "overrideAt" TIMESTAMP(3),
    "sortOrder" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "JobRequirement_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "JobMatch" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "jobId" TEXT NOT NULL,
    "resumeVersionId" TEXT NOT NULL,
    "score" INTEGER NOT NULL,
    "factors" JSONB NOT NULL,
    "items" JSONB NOT NULL,
    "cap" INTEGER,
    "lowConfidence" BOOLEAN NOT NULL DEFAULT false,
    "engineVersion" TEXT NOT NULL,
    "inputsHash" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "JobMatch_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AiRequest" (
    "id" TEXT NOT NULL,
    "userId" TEXT,
    "task" TEXT NOT NULL,
    "promptVersion" TEXT NOT NULL,
    "model" TEXT NOT NULL,
    "inTok" INTEGER NOT NULL DEFAULT 0,
    "outTok" INTEGER NOT NULL DEFAULT 0,
    "cachedTok" INTEGER NOT NULL DEFAULT 0,
    "costUsd" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "latencyMs" INTEGER NOT NULL DEFAULT 0,
    "status" "AiRequestStatus" NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AiRequest_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Job_userId_createdAt_idx" ON "Job"("userId", "createdAt");

-- CreateIndex
CREATE INDEX "Job_userId_textHash_idx" ON "Job"("userId", "textHash");

-- CreateIndex
CREATE INDEX "JobRequirement_userId_idx" ON "JobRequirement"("userId");

-- CreateIndex
CREATE INDEX "JobRequirement_jobId_sortOrder_idx" ON "JobRequirement"("jobId", "sortOrder");

-- CreateIndex
CREATE INDEX "JobMatch_userId_jobId_createdAt_idx" ON "JobMatch"("userId", "jobId", "createdAt");

-- CreateIndex
CREATE INDEX "AiRequest_userId_createdAt_idx" ON "AiRequest"("userId", "createdAt");

-- CreateIndex
CREATE INDEX "AiRequest_createdAt_idx" ON "AiRequest"("createdAt");

-- AddForeignKey
ALTER TABLE "Job" ADD CONSTRAINT "Job_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "JobRequirement" ADD CONSTRAINT "JobRequirement_jobId_fkey" FOREIGN KEY ("jobId") REFERENCES "Job"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "JobMatch" ADD CONSTRAINT "JobMatch_jobId_fkey" FOREIGN KEY ("jobId") REFERENCES "Job"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "JobMatch" ADD CONSTRAINT "JobMatch_resumeVersionId_fkey" FOREIGN KEY ("resumeVersionId") REFERENCES "ResumeVersion"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- The browser never queries the database: RLS on with no policies, roles revoked.
ALTER TABLE "Job" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "JobRequirement" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "JobMatch" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "AiRequest" ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE "Job", "JobRequirement", "JobMatch", "AiRequest" FROM anon, authenticated;
