// Demo data model. Names follow the PRD glossary (docs/PRD.md §5) so the real
// backend can replace src/demo without renaming anything in the UI.

export type TargetMarket = "PK_LOCAL" | "INTERNATIONAL";
export type Plan = "FREE" | "PRO" | "SPRINT";
export type MatchClass = "STRONG" | "PARTIAL" | "MISSING" | "UNKNOWN";
export type MatchOverride = "CONFIRM" | "REJECT" | "LEARNING" | "ADD_EVIDENCE";
export type RequirementType = "MUST_HAVE" | "NICE_TO_HAVE";
export type Severity = "HIGH" | "MEDIUM" | "LOW" | "TIP";
export type ResumeVersionState = "DRAFT" | "LOCKED" | "ARCHIVED";
export type ApplicationStatus =
  | "SAVED" | "APPLIED" | "SCREENING" | "ASSESSMENT" | "INTERVIEWING"
  | "OFFER" | "ACCEPTED" | "REJECTED" | "WITHDRAWN" | "GHOSTED";
export type JobSource =
  | "LINKEDIN" | "ROZEE_PK" | "INDEED" | "MUSTAKBIL" | "COMPANY_SITE" | "REFERRAL"
  | "GOVT_PORTAL" | "JOB_FAIR" | "RECRUITER" | "SOCIAL_MEDIA" | "OTHER";
export type InterviewType = "BEHAVIORAL" | "TECHNICAL" | "MIXED" | "HR";
export type Difficulty = "EASY" | "STANDARD" | "HARD";
export type Persona = "FRIENDLY_RECRUITER" | "HIRING_MANAGER" | "TECHNICAL_PANEL" | "TOUGH_BUT_FAIR";
export type RoundType = "HR" | "TECHNICAL" | "FINAL" | "PANEL" | "TAKE_HOME" | "OTHER";

export interface User {
  id: string;
  name: string;
  email: string;
  city: string;
  targetMarket: TargetMarket;
  targetRoles: string[];
  plan: Plan;
  beta: boolean;
  onboarded: boolean;
}

export interface Experience {
  id: string;
  title: string;
  employer: string;
  location: string;
  start: string; // "2023-02"
  end: string | null;
  bullets: string[];
}
export interface Education { id: string; degree: string; school: string; start: string; end: string; grade?: string }
export interface Project { id: string; name: string; summary: string; tech: string[]; link?: string }
export interface Skill { id: string; name: string; level?: "Working" | "Strong" | "Expert"; confirmed: boolean }
/** User-confirmed facts the AI may use. Anything not here or in the resume must be asked, never invented. */
export interface FactBankItem { id: string; fact: string; source: "USER" | "RESUME"; addedAt: string }

export interface Profile {
  headline: string;
  phone: string;
  linkedin: string;
  github: string;
  experiences: Experience[];
  education: Education[];
  projects: Project[];
  skills: Skill[];
  certifications: string[];
  factBank: FactBankItem[];
}

/** A text span inside a ResumeVersion, used as evidence. */
export interface SourceSpan { section: string; text: string }

export interface ResumeFinding {
  id: string;
  ruleId: string; // e.g. "P3", "R2", "PII1"
  category: "PARSE" | "READABILITY" | "PRIVACY" | "CONTENT";
  severity: Severity;
  title: string;
  whatWeSaw: string;
  why: string;
  fix: string;
  evidence?: SourceSpan;
  resolved?: boolean;
}

export interface ResumeSection { heading: string; lines: string[] }

export interface ResumeVersion {
  id: string;
  label: string; // "v3"
  name: string; // "Frontend – general"
  fileName: string;
  createdAt: string;
  origin: "UPLOAD" | "TAILORED";
  tailoredForJobId?: string;
  state: ResumeVersionState;
  parseHealth: number;
  readability: number;
  parseBreakdown: { label: string; value: number }[];
  readabilityBreakdown: { label: string; value: number }[];
  sections: ResumeSection[];
  findings: ResumeFinding[];
}

export interface JobRequirement {
  id: string;
  text: string; // as written in the JD
  skill: string; // normalized
  type: RequirementType;
  matchClass: MatchClass;
  evidence?: SourceSpan;
  note: string; // why this class
  override?: MatchOverride;
}

export interface Job {
  id: string;
  title: string;
  company: string;
  location: string;
  workMode: "On-site" | "Hybrid" | "Remote";
  url: string;
  source: JobSource;
  sourceDetail?: string;
  addedAt: string;
  salary?: string;
  description: string;
  requirements: JobRequirement[];
  archived?: boolean;
}

export interface JobMatch {
  jobId: string;
  resumeVersionId: string;
  score: number;
  factors: { key: string; label: string; weight: number; value: number; explanation: string }[];
  hardGapCap?: number;
  summary: string;
}

export interface Suggestion {
  id: string;
  jobId: string;
  kind: "REWRITE" | "KEYWORD" | "REORDER" | "SUMMARY" | "QUESTION";
  section: string;
  before: string;
  after: string;
  reason: string;
  evidence?: SourceSpan;
  /** QUESTION suggestions ask for a fact instead of inventing it. */
  question?: string;
  status: "PENDING" | "ACCEPTED" | "REJECTED";
  safe: boolean; // pure wording change, no new claims
}

export interface CoverLetter {
  id: string;
  jobId: string;
  length: "SHORT" | "MEDIUM" | "LONG";
  tone: "PROFESSIONAL" | "FRIENDLY" | "CONFIDENT";
  body: string;
  createdAt: string;
}

export interface StatusChange { status: ApplicationStatus; at: string; note?: string }
export interface Contact { id: string; name: string; role: string; email?: string; note?: string }
export interface InterviewRound { id: string; type: RoundType; at: string; note?: string; done: boolean }

export interface Application {
  id: string;
  jobId: string;
  company: string;
  title: string;
  status: ApplicationStatus;
  resumeVersionId: string;
  coverLetterId?: string;
  source: JobSource;
  sourceDetail?: string;
  appliedAt?: string;
  updatedAt: string;
  nextAction?: { label: string; due: string };
  salary?: string;
  notes: string;
  tags: string[];
  contacts: Contact[];
  rounds: InterviewRound[];
  history: StatusChange[];
}

export interface RubricScore { dimension: string; score: number; weight: number; quote: string; comment: string }

export interface InterviewQuestion {
  id: string;
  text: string;
  kind: "BEHAVIORAL" | "TECHNICAL" | "HR";
  whyAsked: string;
  targets: string; // which requirement / resume item it probes
}

export interface InterviewAnswer {
  questionId: string;
  answer: string;
  followUp?: { question: string; answer: string };
  seconds: number;
}

export interface InterviewEvaluation {
  questionId: string;
  overall: number; // 0-100
  rubric: RubricScore[];
  whatWorked: string;
  whatWasMissing: string;
  modelAnswer: string;
  modelAnswerSources: string[]; // FactBank / resume facts used
}

export interface InterviewSession {
  id: string;
  jobId: string;
  type: InterviewType;
  difficulty: Difficulty;
  persona: Persona;
  questionCount: 5 | 10 | 15;
  status: "IN_PROGRESS" | "COMPLETED" | "ABANDONED";
  createdAt: string;
  questions: InterviewQuestion[];
  answers: InterviewAnswer[];
  evaluations: InterviewEvaluation[];
  overall?: number;
  retryOf?: string;
}

export interface Notification {
  id: string;
  type: "REMINDER_DUE" | "GHOSTING_SUGGESTION" | "INACTIVITY_WARNING" | "SYSTEM";
  title: string;
  body: string;
  applicationId?: string;
  createdAt: string;
  read: boolean;
}

export interface Usage { analyses: number; tailored: number; coverLetters: number; interviews: number }

export interface DemoState {
  user: User;
  profile: Profile;
  resumes: ResumeVersion[];
  activeResumeId: string;
  jobs: Job[];
  matches: JobMatch[];
  suggestions: Suggestion[];
  coverLetters: CoverLetter[];
  applications: Application[];
  interviews: InterviewSession[];
  notifications: Notification[];
  usage: Usage;
  limits: Usage;
}
