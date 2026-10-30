-- CreateEnum
CREATE TYPE "FileKind" AS ENUM ('PDF', 'DOCX');

-- CreateEnum
CREATE TYPE "UploadStatus" AS ENUM ('PENDING', 'UPLOADED', 'PARSED', 'REJECTED', 'FAILED');

-- CreateEnum
CREATE TYPE "ResumeVersionSource" AS ENUM ('UPLOAD', 'MANUAL', 'TAILORED', 'SUGGESTIONS_APPLIED', 'DUPLICATE');

-- CreateEnum
CREATE TYPE "ResumeVersionState" AS ENUM ('DRAFT', 'LOCKED', 'ARCHIVED');

-- CreateTable
CREATE TABLE "ResumeUpload" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "storageKey" TEXT NOT NULL,
    "originalName" TEXT NOT NULL,
    "kind" "FileKind",
    "sizeBytes" INTEGER NOT NULL,
    "sha256" TEXT,
    "pageCount" INTEGER,
    "status" "UploadStatus" NOT NULL DEFAULT 'PENDING',
    "rejectReason" TEXT,
    "atsText" TEXT,
    "fileDeletedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ResumeUpload_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ResumeVersion" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "uploadId" TEXT,
    "parentId" TEXT,
    "jobId" TEXT,
    "label" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "source" "ResumeVersionSource" NOT NULL,
    "state" "ResumeVersionState" NOT NULL DEFAULT 'DRAFT',
    "targetMarket" "TargetMarket" NOT NULL,
    "schemaVersion" INTEGER NOT NULL DEFAULT 1,
    "content" JSONB NOT NULL,
    "contentHash" TEXT NOT NULL,
    "lockedAt" TIMESTAMP(3),
    "deletedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ResumeVersion_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ResumeAnalysis" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "resumeVersionId" TEXT NOT NULL,
    "parseHealth" INTEGER NOT NULL,
    "readability" INTEGER NOT NULL,
    "parts" JSONB NOT NULL,
    "findings" JSONB NOT NULL,
    "engineVersion" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ResumeAnalysis_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "ResumeUpload_storageKey_key" ON "ResumeUpload"("storageKey");

-- CreateIndex
CREATE INDEX "ResumeUpload_userId_createdAt_idx" ON "ResumeUpload"("userId", "createdAt");

-- CreateIndex
CREATE INDEX "ResumeVersion_userId_createdAt_idx" ON "ResumeVersion"("userId", "createdAt");

-- CreateIndex
CREATE INDEX "ResumeAnalysis_userId_resumeVersionId_idx" ON "ResumeAnalysis"("userId", "resumeVersionId");

-- AddForeignKey
ALTER TABLE "ResumeUpload" ADD CONSTRAINT "ResumeUpload_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ResumeVersion" ADD CONSTRAINT "ResumeVersion_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ResumeVersion" ADD CONSTRAINT "ResumeVersion_uploadId_fkey" FOREIGN KEY ("uploadId") REFERENCES "ResumeUpload"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ResumeVersion" ADD CONSTRAINT "ResumeVersion_parentId_fkey" FOREIGN KEY ("parentId") REFERENCES "ResumeVersion"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ResumeAnalysis" ADD CONSTRAINT "ResumeAnalysis_resumeVersionId_fkey" FOREIGN KEY ("resumeVersionId") REFERENCES "ResumeVersion"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- ───────── Security: deny-all for Supabase client roles ─────────
ALTER TABLE "ResumeUpload" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "ResumeVersion" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "ResumeAnalysis" ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON ALL TABLES IN SCHEMA public FROM anon, authenticated;

-- Defense in depth (04 §4.1): a locked version's content can never change.
CREATE OR REPLACE FUNCTION resume_version_immutable() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF OLD."lockedAt" IS NOT NULL AND NEW."content" IS DISTINCT FROM OLD."content" THEN
    RAISE EXCEPTION 'ResumeVersion % is locked', OLD.id;
  END IF;
  RETURN NEW;
END $$;
CREATE TRIGGER resume_version_immutable BEFORE UPDATE ON "ResumeVersion"
  FOR EACH ROW EXECUTE FUNCTION resume_version_immutable();

-- The private "resumes" storage bucket lives in Supabase's storage schema (not visible to Prisma's
-- shadow DB); it is created by supabase/storage.sql.
