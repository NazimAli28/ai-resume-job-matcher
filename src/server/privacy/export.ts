import "server-only";
import { db } from "../db";
import { examplesFor } from "../training/service";
import { supabaseAdmin } from "../supabase/admin";
import type { ZipInput } from "./zip";

const BUCKET = "resumes";
/** Keeps a download within what the hosting will stream; older originals are listed in the README instead. */
export const MAX_FILE_BYTES = 15 * 1024 * 1024;

const README = (skipped: string[]) => `Your data from AI Resume Job Matcher

data.json holds everything we store about you:
  account         your account record
  consents        every consent you gave or withdrew, with its date
  profile         profile, skills, experience, education, projects, certifications, evidence bank
  uploads         your uploaded files (details, and the text we read from them)
  resumeVersions  each resume version and its analysis
  jobs            job posts you added, their requirements and match results
  applications    your tracker: status history, interview rounds, people, notes
  tailoring       resume suggestions for each job, and what you accepted
  coverLetters    your cover letters and their earlier drafts
  interviews      mock interview sessions: questions, your answers, scores and reports
  interviewPrep   prep questions made for your jobs
  aiExamples      de-identified examples kept to improve our AI (only if you said Yes; names and contact details removed)
  usage           what you used, month by month
  feedback        messages you sent us
  activity        security events on your account (sign-ins, exports, deletion requests)

files/ holds the original resumes you uploaded and haven't deleted.
${skipped.length ? `\nNot included because the download would be too large (download these from your resume pages):\n${skipped.map((s) => `  ${s}`).join("\n")}\n` : ""}`;

/** Every row belonging to the user. Scoped by userId throughout, and read-only. */
export async function collectUserData(userId: string) {
  const where = { userId };
  const [account, consents, profile, uploads, resumeVersions, jobs, applications, usage, feedback, activity, tailoring, coverLetters, interviews, interviewPrep, aiExamples] = await Promise.all([
    db.user.findUnique({ where: { id: userId } }),
    db.consentRecord.findMany({ where, orderBy: { createdAt: "asc" } }),
    db.profile.findUnique({ where, include: { skills: true, experiences: true, educations: true, projects: true, certifications: true, facts: true } }),
    db.resumeUpload.findMany({ where, orderBy: { createdAt: "desc" } }),
    db.resumeVersion.findMany({ where, orderBy: { createdAt: "asc" }, include: { analyses: true } }),
    db.job.findMany({ where, orderBy: { createdAt: "asc" }, include: { requirements: true, matches: true } }),
    db.application.findMany({ where, orderBy: { createdAt: "asc" }, include: { history: true, rounds: true, contacts: true } }),
    db.usageLedger.findMany({ where, orderBy: { createdAt: "asc" } }),
    db.feedback.findMany({ where, orderBy: { createdAt: "asc" } }),
    db.auditLog.findMany({ where: { subjectUserId: userId }, orderBy: { createdAt: "asc" }, select: { action: true, createdAt: true, ipPrefix: true } }),
    db.tailorSession.findMany({ where, orderBy: { createdAt: "asc" } }),
    db.coverLetter.findMany({ where, orderBy: { createdAt: "asc" } }),
    db.interviewSession.findMany({ where, orderBy: { createdAt: "asc" }, include: { questions: { orderBy: { order: "asc" }, include: { answers: { orderBy: { attempt: "asc" } } } } } }),
    db.interviewPrep.findMany({ where, orderBy: { createdAt: "asc" } }),
    examplesFor(userId),
  ]);
  return { exportedAt: new Date().toISOString(), account, consents, profile, uploads, resumeVersions, jobs, applications, tailoring, coverLetters, interviews, interviewPrep, aiExamples, usage, feedback, activity };
}

/** data.json, the README, then the original files one at a time. */
export async function* exportEntries(userId: string): AsyncGenerator<ZipInput> {
  const data = await collectUserData(userId);
  const stored = data.uploads.filter((u) => !u.fileDeletedAt && u.status === "PARSED");

  let total = 0;
  const included: typeof stored = [];
  const skipped: string[] = [];
  for (const u of stored) {
    if (total + u.sizeBytes <= MAX_FILE_BYTES) {
      total += u.sizeBytes;
      included.push(u);
    } else skipped.push(u.originalName);
  }

  yield { name: "data.json", data: Buffer.from(JSON.stringify(data, null, 2)) };
  const failed: string[] = [];
  const storage = supabaseAdmin().storage.from(BUCKET);
  for (const u of included) {
    const { data: blob, error } = await storage.download(u.storageKey);
    if (error || !blob) {
      failed.push(u.originalName);
      continue;
    }
    // The id keeps two uploads with the same name apart; originalName was sanitized at upload.
    yield { name: `files/${u.id}-${u.originalName}`, data: Buffer.from(await blob.arrayBuffer()) };
  }
  yield { name: "README.txt", data: Buffer.from(README([...skipped, ...failed])) };
}
