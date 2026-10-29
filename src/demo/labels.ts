import type { ApplicationStatus, Difficulty, InterviewType, JobSource, Persona } from "./types";

export const SOURCE_LABEL: Record<JobSource, string> = {
  LINKEDIN: "LinkedIn",
  ROZEE_PK: "Rozee.pk",
  INDEED: "Indeed",
  MUSTAKBIL: "Mustakbil",
  COMPANY_SITE: "Company website",
  REFERRAL: "Referral",
  GOVT_PORTAL: "Government portal",
  JOB_FAIR: "Job fair",
  RECRUITER: "Recruiter",
  SOCIAL_MEDIA: "Social media",
  OTHER: "Other",
};

/** Kanban column order. Side states (rejected, withdrawn, ghosted) are grouped as "Closed". */
export const PIPELINE: ApplicationStatus[] = ["SAVED", "APPLIED", "SCREENING", "ASSESSMENT", "INTERVIEWING", "OFFER", "ACCEPTED"];
export const CLOSED: ApplicationStatus[] = ["REJECTED", "WITHDRAWN", "GHOSTED"];

export const INTERVIEW_TYPE_LABEL: Record<InterviewType, string> = {
  BEHAVIORAL: "Behavioral",
  TECHNICAL: "Technical",
  MIXED: "Mixed",
  HR: "HR screen",
};

export const DIFFICULTY_LABEL: Record<Difficulty, string> = { EASY: "Easy", STANDARD: "Standard", HARD: "Hard" };

export const PERSONA_LABEL: Record<Persona, { name: string; blurb: string }> = {
  FRIENDLY_RECRUITER: { name: "Friendly recruiter", blurb: "Warm, encouraging, asks one follow-up when you're vague." },
  HIRING_MANAGER: { name: "Hiring manager", blurb: "Focused on impact and how you'd work on the team." },
  TECHNICAL_PANEL: { name: "Technical panel", blurb: "Probes depth on the job's technical requirements." },
  TOUGH_BUT_FAIR: { name: "Tough but fair", blurb: "Pushes back on vague answers. Good practice before a final round." },
};
