# PRD — AI Job Application Copilot (working title)

> **Version:** 1.0 (draft) · **Date:** 2026-10-20 · **Owner:** founder (solo + AI agents) · **Status:** Draft for founder review
> Based on the founder's SRD + six research reports in [`research/`](research/). This file is the **index and single source of truth for decisions**. Detailed sections live in [`prd/`](prd/). If a section file contradicts this index, **this index wins** until it is corrected.
> Labels: **[D]** decided by founder · **[P]** proposed by Claude (changeable) · **[?]** open question

## 1. One-line pitch
Upload your resume, paste a job, and get an honest, explainable plan: how well you fit, how to fix your resume (never inventing anything), practice with an AI recruiter, and track every application, including the exact resume you sent.

## 2. Section map (load only what you need)
| # | File | Contents |
|---|---|---|
| 01 | [prd/01-product.md](prd/01-product.md) | Vision, personas, market, competitors, differentiators, pricing, success metrics, name ideas |
| 02 | [prd/02-features.md](prd/02-features.md) | Functional requirements, user stories, acceptance criteria, MVP vs later |
| 03 | [prd/03-ux-design.md](prd/03-ux-design.md) | Design system, information architecture, key screens and flows, states, accessibility, PWA |
| 04 | [prd/04-architecture.md](prd/04-architecture.md) | Stack, system design, modules, data model, API, jobs, deployment, environments, cost |
| 05 | [prd/05-ai-engine.md](prd/05-ai-engine.md) | Deterministic engine, scoring formulas, LLM tasks and prompts, guardrails, eval harness, fine-tune roadmap |
| 06 | [prd/06-security-privacy.md](prd/06-security-privacy.md) | Threat model, security controls, privacy-by-design, retention, compliance checklist |
| 07 | [prd/07-legal.md](prd/07-legal.md) | Terms, Privacy Policy, AI disclaimer, Acceptable Use, Cookies, Refunds (outlines + key clauses) |
| 08 | [prd/08-roadmap-quality.md](prd/08-roadmap-quality.md) | Phases and timeline, Definition of Done, testing strategy, risks, open questions |

## 3. Locked decisions
| Area | Decision | Tag |
|---|---|---|
| Goal | Portfolio-quality build first, designed so it can launch as a SaaS | D |
| Platform | Responsive web app + PWA (mobile-first for tracking/interviews; desktop-optimized for resume editing) | D |
| Market | **Pakistan first**, then global. English only, permanently | D |
| Auth | Email/password (with verification and reset) + Google OAuth | D |
| AI | Claude behind a provider-agnostic `AiProvider` interface. **Deterministic scripts first** (parsing, ATS checks, normalization, scoring); LLM only for language tasks; **eval harness ("dry run") from day 1**; fine-tune our own model later when volume and consented data justify it | D |
| Models | Claude Haiku 5.5 (extraction, cheap tasks) · Claude Sonnet 5.5 (tailoring, interview evaluation, cover letters). Opus 5.5 only for offline eval/labeling | P |
| Resume output | Two paths: **(A) Download improved resume:** preview with highlighted changes, undo per change / accept all, then ATS-safe PDF/DOCX. **(B) Suggestions:** user edits in app or in their own file | D |
| Job capture | Paste JD + URL + source picker. Browser extension = phase 2. No server-side scraping | D |
| Mock interview | Text in MVP, voice phase 2. Configurable (type, 5/10/15 questions, difficulty), 1–2 adaptive follow-ups, rubric report with evidence quotes, model answer built from the user's own resume, retry per question | D |
| Retention | Keep until the user deletes; self-serve export and delete; inactive 24 months → warn → purge; raw interview answers deleted after 12 months | D |
| Monetization | Freemium + Pro monthly + Job-Search Sprint pass. **Free beta first**; plans and entitlements built from day 1; Safepay (PKR) switched on later; merchant of record for USD later | D |
| Platforms | **Only 5 platforms** (founder, 2026-10-21): **GitHub** (code, CI, daily backup + keep-alive job) · **Vercel** (hosting) · **Supabase** (Postgres + Auth + Storage + pg_cron, Singapore) · **Anthropic** (AI) · **Resend** (email, also used as Supabase Auth's SMTP). Rejected: Inngest, Sentry, PostHog, Neon, Cloudflare R2, Upstash, Better Auth | D |
| Stack | Next.js (App Router, TypeScript) · Supabase Postgres · Prisma (ORM + migrations) · Supabase Auth (email/password + Google) · Supabase Storage (private buckets, signed URLs) · Tailwind + shadcn/ui · Zod · Resend. **Built in-house on Postgres:** background task queue (`BackgroundTask` + pg_cron tick + `FOR UPDATE SKIP LOCKED`), error log (`ErrorEvent`), product analytics (`ProductEvent`), rate limiting (`RateLimitBucket`). Free tiers at portfolio stage; **verify limits at setup** | P (founder delegated: "best and free") |
| Hosting | Vercel Hobby during portfolio + private invite-only beta (no payments, no marketing). **Upgrade to Pro (~$20/mo) before public launch** | D |
| Region | **Singapore** for DB and functions (closest to Pakistan); transfers disclosed (Anthropic is US-based); EU region later if needed | D |
| Interview models | **Haiku 5.5 plays the recruiter** (questions + follow-ups) · **Sonnet 5.5 scores** and writes model answers after the session | D |
| Privacy details | 7-day undo on account deletion · optional "delete original file after parsing" toggle (originals kept by default) · religion off resumes by default in both markets · validate pricing with a **≥100-respondent** survey | D |
| Scanned PDFs (OCR) | **Out of MVP.** Scanned/image-only PDFs get a clear message ("export a text PDF or upload DOCX"). LLM-vision OCR is P2 behind a flag, and needs a privacy disclosure since it can't be masked | P |
| Design | Calm professional SaaS (Linear/Notion-like), light + dark, one accent color | D |
| Analytics/Admin | Minimal admin (users, usage, AI cost, flags, abuse blocks, **error log**, **funnel**) built on our own `ProductEvent`/`ErrorEvent` tables. First-party and server-side only: no third-party analytics, no session replay, no resume text in events | D |
| Name | **AI Resume & Job Matcher** (2026-10-30); repo `ai-resume-job-matcher` (public). Default accent mint, admin-configurable in Phase 8 | D |
| Requirement edge cases | "Learning" override = PARTIAL weighted by self-rating; UNCLEAR excluded from the score and listed separately; Sprint price set after measuring AI cost | D |
| Capacity | Solo + AI agents, ~15–20 h/week → MVP ≈ 10–14 weeks | D |

## 4. Product principles (non-negotiable)
1. **Never fabricate.** No invented experience, skills, employers, dates, education, projects or metrics. Every AI suggestion must trace to evidence in the user's profile/resume or be labeled as a question to the user ("Do you have a number for this?").
2. **User stays in control.** All AI output is editable; nothing leaves the app without an explicit user action. No auto-apply.
3. **Explainable scores.** Scores are computed in code from visible factors. The LLM explains them; it never decides the number. Never call it an "ATS score" or imply hiring probability.
4. **Honest marketing.** No "beat the ATS", "guaranteed interviews", or "75% of resumes are rejected" claims.
5. **Practice only.** The interview coach is never a live-interview copilot, overlay, or anything that helps users cheat in real interviews.
6. **Privacy by default.** Minimum data, PII masked before LLM calls, no training on user data without explicit opt-in consent, easy export and delete.
7. **Deterministic where possible; AI where it adds value.**
8. **Small, verifiable increments.** Phase by phase (see 08).

## 5. Canonical glossary (all sections must use these names)
**Scores (0–100, all labeled "estimate"):**
- `ParseHealth`: can machines read it? Deterministic.
- `Readability`: can a recruiter scan it in about 7 seconds? Deterministic plus AI notes.
- `JobMatch`: fit to a specific job. Hybrid formula, computed in code.

**Requirement match classes:** `STRONG` · `PARTIAL` · `MISSING` · `UNKNOWN`. User overrides: confirm / reject / learning / add-evidence.

**Target market:** `PK_LOCAL` · `INTERNATIONAL`. Drives resume conventions, for example photo, DOB and father's name are allowed for PK_LOCAL with a warning, and stripped for INTERNATIONAL. **CNIC is never placed on a resume.**

**Application status:** `SAVED → APPLIED → SCREENING → ASSESSMENT → INTERVIEWING → OFFER → ACCEPTED`, with terminal/side states `REJECTED`, `WITHDRAWN`, `GHOSTED`.
- Individual interview rounds (HR / technical / final / panel) are child `InterviewRound` records, not statuses.
- Every change is written to `ApplicationStatusHistory`.

**Job source:** `LINKEDIN`, `ROZEE_PK`, `INDEED`, `MUSTAKBIL`, `COMPANY_SITE`, `REFERRAL`, `GOVT_PORTAL`, `JOB_FAIR`, `RECRUITER`, `SOCIAL_MEDIA`, `OTHER`, plus free-text detail.

**Plans:** `FREE` · `PRO` (monthly) · `SPRINT` (2–4 week pass). Limits are enforced through `UsageLedger` and entitlement checks.

**Core entities:**
- **Identity:** `User`, `Account`, `Session`.
- **Profile:** `Profile`, `Skill`, `Experience`, `Education`, `Project`, `Certification`, `FactBankItem` (user-confirmed facts and metrics).
- **Resumes:**
  - `ResumeUpload`: original file.
  - `ResumeVersion`: structured JSON. It becomes **immutable once linked to an application**; edits create a new version.
  - `ResumeAnalysis`, `Suggestion`, `ExportFile`.
- **Jobs and applications:** `Job`, `JobRequirement`, `JobMatch`, `Application`, `ApplicationStatusHistory`, `InterviewRound`, `Contact`, `CoverLetter`.
- **Mock interviews:** `InterviewSession`, `InterviewQuestion`, `InterviewAnswer`, `InterviewEvaluation`.
- **Platform:** `AiRequest` (metadata only), `UsageLedger`, `Subscription`, `AuditLog`, `FeatureFlag`, `ConsentRecord`.
- **Evaluation:** `EvalCase` (eval harness, not user data).

**Additional entities:**
- **Identity:** Supabase Auth owns credentials and sessions (`auth.users`). Our `User` row shares the auth user's id; `Account`/`Session` are Supabase-managed, not our tables.
- **Platform (in-house):** `BackgroundTask` (job queue: type, payload of IDs only, status, attempts, runAt, lockedAt, lastError, idempotencyKey) · `ErrorEvent` (PII-scrubbed errors) · `ProductEvent` (fixed event names, no PII) · `RateLimitBucket`. The name `BackgroundTask` avoids clashing with `Job` (a job posting).
- **Profile:** `SkillAlias` (taxonomy aliases).
- **Matching:** `JobMatchItem` (per-requirement row of a `JobMatch`), `SourceSpan` (evidence pointer into a `ResumeVersion`).
- **Privacy:** `PrivacyRequest` (export/delete), `DeletionLedger` (re-applies deletes after a backup restore).
- **Notifications:** `Notification` (in-app; reminders and ghosting nudges).
- **Training:** `TrainingExample` (anonymized, consented, stored separately from user data).

**Canonical enums:**
- `ResumeVersionState`: DRAFT · LOCKED · ARCHIVED. LOCKED once linked to an application.
- `RequirementType`: MUST_HAVE · NICE_TO_HAVE.
- `MatchOverride`: CONFIRM · REJECT · LEARNING · ADD_EVIDENCE.
- `InterviewType`: BEHAVIORAL · TECHNICAL · MIXED · HR.
- `Difficulty`: EASY · STANDARD · HARD.
- `Persona`: FRIENDLY_RECRUITER · HIRING_MANAGER · TECHNICAL_PANEL · TOUGH_BUT_FAIR.
- `RoundType`: HR · TECHNICAL · FINAL · PANEL · TAKE_HOME · OTHER.
- `ConsentType`: TERMS · PRIVACY · AGE_16_PLUS · SENSITIVE_DATA · AI_PROCESSING · `TRAINING_OPT_IN` · MARKETING_EMAIL · ANALYTICS_COOKIES · SUPPORT_ACCESS · EU_WITHDRAWAL_WAIVER. TRAINING_OPT_IN is the only name for training consent and defaults to off.

**`ResumeJSON`:** the structured resume schema stored in `ResumeVersion` (defined in [05](prd/05-ai-engine.md)).

## 5b. Canonical constants (section files must reference these, not restate different values)
| Constant | Value | Tag |
|---|---|---|
| Plan limits / month | **FREE:** 3 analyses · 3 tailored versions · 3 cover letters · 2 mock interviews (≤10 questions) · unlimited tracking. **PRO:** 40 · 30 · 30 · 15 (5/10/15 questions). **SPRINT:** PRO caps for the pass duration. **Beta:** FREE limits ×2. 15-question sessions are PRO/SPRINT only. Failed AI calls don't consume quota | P |
| AI spend guards | Monthly ceiling per user: FREE $0.75 (FREE at full use ≈ $0.70) · beta FREE $1.50 (limits ×2) · SPRINT $4 · PRO $6. Daily per-user cap: FREE $0.50 · PRO/SPRINT $3. Global beta cap $10/day. Alerts at 50/80/100% (degrade at 80%, block at 100%). Plus the vendor spend limit | P |
| Cost per action (estimate) | Analysis ≈ $0.04 · tailored version ≈ $0.05 · interview ≈ $0.09 / $0.17 / $0.25 (5/10/15 questions). Source: [05 §11](prd/05-ai-engine.md) | P |
| Model routing | **Haiku:** resume/job extraction, readability notes, match explanation, interview turns and follow-ups. **Sonnet:** suggestions, tailored version, cover letter, interview blueprint, answer evaluation, model answers. **Opus:** offline eval labeling only | D/P |
| JobMatch | must-have 45% · nice-to-have 15% · title/seniority 15% · evidence quality 15% · thresholds (years, education, location) 10%. One hard-requirement gap caps the score at 60; two or more cap it at 45. Formula lives in [05 §5](prd/05-ai-engine.md) | P |
| Interview | 5/10/15 questions · ≤2 follow-ups per question · session follow-up cap 3/6/8 · soft timer default 120 s (configurable) · an unfinished session can be resumed for 7 days, then closed by a job | D/P |
| Uploads | PDF/DOCX only (magic bytes). Hard limit 5 MB and 6 pages; warn above 2.5 MB. DOCX: ≤200 zip entries and ≤25 MB uncompressed | P |
| Sessions | 7-day idle timeout, 30-day absolute. Supabase's own session time-box/inactivity settings may be paid-plan only; if so, enforce in middleware via `lastSeenAt` (**verify at setup**). Password hashing: bcrypt (Supabase Auth) | P |
| Account deletion | 7-day undo window, then hard delete. Backups expire within 30 days after that (fully gone ≤37 days). `DeletionLedger` re-applies deletes after any restore | D/P |
| Domain / DNS | Optional custom domain bought and managed in **Vercel** (keeps to 5 platforms). Default: free `*.vercel.app` | P |
| Bot protection | MVP: email verification + disposable-domain block + `RateLimitBucket` limits. A CAPTCHA vendor is an open question (it would be a 6th platform) | P/? |
| Backups | 30-day retention: a daily GitHub Actions `pg_dump`, encrypted, kept as a 30-day artifact (the Supabase free plan has no backups). Storage files are **not** backed up: originals can be re-uploaded and exports regenerate.
- **Repos:** the main app repo is **public** (portfolio). Backup and keep-alive workflows live in a separate **private** repo (e.g. `job-copilot-ops`), because artifacts in a public repo are downloadable.
- **Storage limit:** GitHub free artifact storage is 500 MB. If one compressed dump grows past ~13 MB, cut retention to 7 days or switch to Supabase Pro's daily backups. The same job pings the app, so the free Supabase project doesn't pause after 7 idle days | P |
| Background tasks | Enqueue = insert a `BackgroundTask` row + kick the worker immediately via Next.js `after()`. pg_cron hits `/api/tasks/tick` every minute (secret header) for retries and schedules. Max 5 attempts (**AI-calling tasks: max 2**, to cap cost) with exponential backoff → `FAILED`, visible in admin. Each run must finish within Vercel's function time limit | P |
| Inactivity purge | 24 months inactive → warning emails at −30 days and −7 days → purge | D/P |
| Interview data | Raw answers and evidence quotes deleted after 12 months; scores and summaries remain. Shorter user-chosen auto-delete is P2 | D/P |
| Exports | `ExportFile` purged after 30 days (regenerated on demand). Data-export (DSAR) link expires in 7 days and needs re-auth to download | P |
| Admin support access | Break-glass grant: user-consented, 30 minutes, audit-logged | P |
| Survey | ≥100 respondents before pricing goes live | D |

## 6. MVP Definition of Done (end-to-end)
Register (email or Google)
→ Set target market and profile
→ Upload PDF/DOCX resume
→ See ParseHealth and Readability with fixes
→ Paste a job (+ URL, source)
→ See JobMatch with STRONG/PARTIAL/MISSING requirements
→ Choose (A) improved resume: preview diff → download PDF/DOCX, or (B) suggestions → edit
→ Generate a cover letter
→ Run a configurable mock interview → get a scored report with model answers
→ Create an application linked to the exact `ResumeVersion` and source
→ Move it through statuses
→ See dashboard stats
→ Export or delete all my data.

Everything persists, every AI output passes schema validation and guardrail tests, and the core flow has an E2E test. See [08](prd/08-roadmap-quality.md).

## 7. Out of scope for MVP
**MVP vs P2 boundaries [P]:**
- **MVP:** in-app reminders + email for due follow-ups; installable PWA with a read-only offline cache of the tracker; CSV export.
- **P2:** offline edit queue, web push, weekly digest email, CSV import, OCR, TOTP for users, per-user RLS policies, malware scanning, adding Sentry/PostHog back if scale needs it.
- **MVP security baseline on Supabase:** the browser never queries the database directly. All tables have RLS enabled with **deny-all** for the `anon`/`authenticated` roles, and the server accesses data through Prisma with repository-level `userId` scoping. Storage buckets are private, with short-lived signed URLs.

**Not built in MVP:** auto-apply or browser automation · job-board scraping · voice/video interviews · native mobile apps · Urdu UI · employer/recruiter-side features (they would make the product EU AI Act high-risk) · payments live · multi-agent job discovery · teams/universities.

## 8. Open questions [?]
1. Brand name (shortlist in 01).
2. Exact plan limits and PKR prices: validate with a ≥100-respondent survey before billing goes live.
3. Safepay onboarding requirements (NTN / company registration) and provincial SaaS sales tax: needs a Pakistani tax adviser.
4. Paddle / Lemon Squeezy support for Pakistan-based sellers: email them before building USD billing.
5. Lawyer review of Terms, Privacy Policy and AI Disclaimer before paid launch.
