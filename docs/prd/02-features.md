# 02 - Functional Requirements

> Part of the PRD. Index and decisions: [../PRD.md](../PRD.md) (the index wins on conflict). Glossary names (entities, statuses, sources, plans, scores) are used exactly as defined there.
> Tags: **[D]** decided by founder · **[P]** proposed by Claude · **[?]** open question.
> Phase: **MVP** / **P2** / **Later**. Priority: MoSCoW (**M**ust, **S**hould, **C**ould, **W**on't-now).
> Non-functional requirements (performance, security controls, retention mechanics) live in 04 and 06; this file references them only where behavior is user-visible.

## 0. Conventions

- **ID format:** `<MODULE>-NNN`. Modules: AUTH, PRO, RES, JOB, MAT, TLR, CVL, INT, TRK, DSH, PLN, SET, NTF, ADM, FUT.
- **Cross-cutting rules (apply to every module):**

| ID | Rule | Tag |
|---|---|---|
| X-001 | **No fabrication.** Any AI-generated claim about the user must trace to a resume line, `Profile` field, or `FactBankItem`; otherwise it is phrased as a question to the user. Violations fail guardrail tests (see 05). | D |
| X-002 | Every AI output is schema-validated (Zod) before display; on failure, retry once, then show a recoverable error with no quota consumed. | D |
| X-003 | All AI output is editable and nothing leaves the app without an explicit user action. No auto-apply. | D |
| X-004 | Every list/detail screen has loading, empty, and error states; destructive actions need confirmation. | P |
| X-005 | All data is scoped to the owning `User`; cross-user access returns 404, never 403 (no existence leaks). | D |
| X-006 | Scores are labeled "estimate", computed in code from visible factors, and never called "ATS score" or a hiring probability. | D |
| X-007 | PII (CNIC, phone, email, address) is masked before any LLM call. | D |
| X-008 | English only, permanently. No i18n scaffolding for other languages in MVP. | D |
| X-009 | Quota is consumed (`UsageLedger` row) only on successful AI generation, never on validation failure or provider error. | P |

---

## 1. AUTH - Authentication and sessions

**Purpose:** Let users create and secure an account with email/password or Google, with safe verification, recovery, and session control. Stack: Supabase Auth [P].

**User stories**
- As a new user, I want to register with email and password so that I can start without a third-party account.
- As a user, I want to sign in with Google so that I do not manage another password.
- As a user, I want to reset a forgotten password so that I can regain access.
- As a user, I want to sign out of all devices so that I can recover from a lost phone.
- As a user with both methods, I want my Google and password logins linked so that I do not end up with two accounts.

**Functional requirements**

| ID | Requirement | Phase | MoSCoW | Tag |
|---|---|---|---|---|
| AUTH-001 | Register with email + password; password min 10 chars, checked against a breached-password list; strength meter. | MVP | M | P |
| AUTH-002 | Email verification: single-use, expiring (24 h) link sent on register. Unverified users can sign in but cannot use AI features or uploads until verified. Resend allowed (rate-limited). | MVP | M | D |
| AUTH-003 | Login with email + password; generic error ("Email or password is incorrect") to prevent enumeration. | MVP | M | D |
| AUTH-004 | Google OAuth sign-in and sign-up (scopes: openid, email, profile only). | MVP | M | D |
| AUTH-005 | Account linking: if a Google sign-in email matches an existing verified email/password `User`, link as an additional `Account` after the user proves control (signs in with the password once, or via an emailed confirmation). Never auto-link to an unverified email. | MVP | M | P |
| AUTH-006 | Password reset: request form always responds "if the account exists, an email was sent"; link is single-use, expires in 1 h; a successful reset revokes all other `Session`s. | MVP | M | D |
| AUTH-007 | Sessions: HttpOnly, Secure, SameSite=Lax cookie; 7-day idle timeout and 30-day absolute lifetime (see PRD §5b); session list (device, last used, approximate location) in Settings. | MVP | M | P |
| AUTH-008 | Logout (current session) and "Sign out everywhere" (revokes all `Session`s). | MVP | M | D |
| AUTH-009 | Change password (requires current password); change email (re-verification of the new address; old address gets a notice). | MVP | S | P |
| AUTH-010 | Rate limiting on login, reset, verify-resend (`RateLimitBucket` table in Postgres); progressive delay after 5 failures, no permanent lockout. | MVP | M | P |
| AUTH-011 | Accept Terms and Privacy Policy at registration (`ConsentRecord` with version + timestamp). | MVP | M | D |
| AUTH-012 | Google-only users can set a password later; a login method can be unlinked only if another remains. | MVP | S | P |
| AUTH-013 | Optional TOTP two-factor authentication. | P2 | C | P |
| AUTH-014 | Beta gating: signup can be switched to invite-code-only via `FeatureFlag`. | MVP | S | P |

**Acceptance criteria**
- AUTH-002: *Given* a newly registered unverified user, *When* they open the resume upload page, *Then* they see a "Verify your email" banner and upload is disabled; *When* they click the valid link, *Then* the email is marked verified and upload is enabled without re-login.
- AUTH-005: *Given* an existing verified password account for a@x.com, *When* the user signs in with Google as a@x.com, *Then* they are asked to confirm with their password (or an emailed link) and, on success, one `User` with two `Account`s exists.
- AUTH-006: *Given* a reset link already used, *When* it is opened again, *Then* it is rejected with "link expired or already used".
- AUTH-008: *Given* a user signed in on two browsers, *When* they choose "Sign out everywhere" on one, *Then* the other is redirected to login on its next request.

**Edge cases**
- Google account email unverified at Google: reject sign-in with an explanation.
- User registers by email, never verifies, later signs in with Google using the same address: Google proof verifies the email and merges (AUTH-005).
- Hard bounce on the verification email: show "check the address" after the Resend webhook reports it.
- Disposable-email domains: allowed in beta but flagged in admin [?].
- Concurrent reset requests: only the newest token is valid.

---

## 2. PRO - Onboarding and Profile (including FactBank)

**Purpose:** Capture target market and target roles and build a structured `Profile` that is the single source of truth for what the AI may say about the user. `FactBankItem`s are user-confirmed facts and metrics the AI is allowed to use.

**User stories**
- As a new user, I want a short guided setup so that results fit my market and role from the first resume.
- As a Pakistani job seeker, I want to choose `PK_LOCAL` so that the resume follows local norms and warns me appropriately.
- As a user, I want to record achievements and numbers once so that the AI reuses only what I confirmed.
- As a career switcher, I want my profile auto-filled from my resume so that I do not retype it.

**Functional requirements**

| ID | Requirement | Phase | MoSCoW | Tag |
|---|---|---|---|---|
| PRO-001 | Onboarding wizard (skippable per step, resumable): (1) target market `PK_LOCAL` / `INTERNATIONAL`, (2) target roles (1-5 job titles, free text with suggestions), (3) experience level, (4) upload resume or start from scratch. Completion is not required to reach the app. | MVP | M | D |
| PRO-002 | Target market is stored on `Profile`, can be changed any time in Settings, and drives resume conventions (RES-040 to RES-046), template defaults, and PII lint rules. | MVP | M | D |
| PRO-003 | Profile personal fields: name, email, phone, city/country, LinkedIn URL, GitHub URL, portfolio URL. URLs validated; phone normalized (E.164, default +92 for `PK_LOCAL`). | MVP | M | D |
| PRO-004 | Professional preferences: target titles, years of experience, work type (remote / hybrid / on-site), preferred locations, salary expectation (min/max, currency PKR/USD/other, period). Salary is private and never placed on a resume or sent to an LLM unless the user selects it for a cover letter. | MVP | M | D |
| PRO-005 | Structured sections with full CRUD and reordering: `Skill` (name, category, level optional), `Experience`, `Education`, `Project`, `Certification` (optional). | MVP | M | D |
| PRO-006 | Import from resume: after a successful parse (RES-010), offer "Fill my profile from this resume" with a per-field review screen; nothing is written until the user confirms. | MVP | M | P |
| PRO-007 | **FactBank:** user-confirmed `FactBankItem`s with fields: text, type (METRIC / ACHIEVEMENT / TOOL_USED / RESPONSIBILITY / OTHER), linked `Experience`/`Project` (optional), metric value + unit (optional), source (FROM_RESUME / USER_ADDED / FROM_INTERVIEW), `confirmedAt`. | MVP | M | D |
| PRO-008 | The AI may use only FactBank items with `confirmedAt` set plus text already present in the user's resume/Profile. Unconfirmed candidate facts are shown as "Confirm?" cards. | MVP | M | D |
| PRO-009 | When a suggestion asks "Do you have a number for this?", the user's answer can be saved straight into the FactBank (one click), then re-applied. | MVP | S | P |
| PRO-010 | A `Skill` may carry evidence links (Experience, Project, FactBankItem) and a state (CONFIRMED / LEARNING); this feeds MAT-020. | MVP | S | P |
| PRO-011 | Profile completeness meter (deterministic; lists what is missing and why it helps); never blocking, no dark patterns. | MVP | C | P |
| PRO-012 | Sensitive attributes (DOB, father's name, marital status, photo) live in a separate private `Profile` block, are never sent to an LLM, and appear on a resume only when market rules and the user toggle allow it (RES-042/043). CNIC is never stored in `Profile`. | MVP | M | D |

**Acceptance criteria**
- PRO-008: *Given* a FactBank item "Reduced API latency by 40%" with `confirmedAt` set, *When* a bullet rewrite is generated, *Then* the suggestion cites that item as evidence; *Given* the item is unconfirmed, *Then* no suggestion contains "40%" and the UI shows a Confirm card instead.
- PRO-002: *Given* target market `INTERNATIONAL` and a stored photo, *When* the user exports a resume, *Then* the photo is omitted and the export report says "Photo removed for INTERNATIONAL".
- PRO-012: *Given* a stored DOB, *When* any LLM request is built, *Then* the payload contains no DOB (asserted in a unit test on the prompt builder).

**Edge cases**
- Market changed after exports: existing `ResumeVersion`s are unchanged; a banner suggests re-running the PII lint.
- Parsed resume yields duplicate skills ("JS", "JavaScript"): merge suggestion using the normalization dictionary (see 05).
- Metric entered as text ("about 2x"): accepted with an `approximate` flag; the AI must keep the hedge.
- A FactBank item deleted after being cited by an immutable `ResumeVersion`: version text stays; citation shows "source removed".

---

## 3. RES - Resume upload, parsing, analysis, versions

**Purpose:** Turn an uploaded PDF/DOCX into a structured `ResumeVersion`, tell the user honestly how machine-readable (`ParseHealth`) and scannable (`Readability`) it is, flag privacy and market problems, and manage versions.

**User stories**
- As a user, I want to upload my PDF or DOCX so that the app reads it and shows what it understood.
- As a user, I want to see what a parser extracted next to my original so that I can trust and correct it.
- As a Pakistani applicant, I want a warning if my CNIC is on the resume so that I avoid identity theft.
- As a user, I want several versions, a default, and the original file download so that I never lose my work.

**Upload and parsing**

| ID | Requirement | Phase | MoSCoW | Tag |
|---|---|---|---|---|
| RES-001 | Upload PDF or DOCX via picker or drag-and-drop. Limits: hard max 5 MB and 6 pages, with a warning above 2.5 MB (PRD §5b); MIME + magic-byte check; reject password-protected and macro-enabled files. | MVP | M | P |
| RES-002 | Files stored in a private Supabase Storage bucket under non-guessable keys; original filename kept as metadata only; malware-scan hook before parsing (provider decided in 06) [?]. | MVP | M | P |
| RES-003 | Per-user cap: 10 `ResumeUpload`s on FREE, 50 on PRO/SPRINT (storage limit, not AI usage). | MVP | S | P |
| RES-004 | Optional toggle "Delete the original file after parsing" (Settings and upload dialog). Default OFF: originals are kept. When ON, the stored file is deleted once parsing succeeds and the structured `ResumeVersion` remains; RES-053 then shows "Original file deleted". | MVP | S | D |
| RES-010 | Parse task (`BackgroundTask` queue): text extraction -> section detection -> structured JSON (contact, summary, skills, experience, education, projects, certifications) -> `ResumeVersion` (origin UPLOAD). Deterministic first; Haiku 5.5 only for ambiguous section assignment and date/entity normalization. | MVP | M | D |
| RES-011 | Parse runs asynchronously with visible progress (queued, extracting, structuring, analyzing); target under 30 s p95. | MVP | M | P |
| RES-012 | **Parse review screen:** original document beside the extracted structure; user can edit any field, move text between sections, and re-run analysis. Edits create a new `ResumeVersion` (never mutate an immutable one). | MVP | M | D |
| RES-013 | Scanned/image-only PDF: detect missing text layer, show "This file looks like a scan. Export a text PDF or upload DOCX"; OCR is out of MVP (see RES-014). | MVP | M | P |
| RES-014 | OCR for scanned resumes via LLM vision, behind a `FeatureFlag`; needs a privacy disclosure because the image cannot be PII-masked before the LLM call. In MVP scanned PDFs only get the RES-013 message. | P2 | C | P |
| RES-015 | Start-from-scratch path: build a `ResumeVersion` from the `Profile` with the same editor. | MVP | S | P |

**Analysis**

| ID | Requirement | Phase | MoSCoW | Tag |
|---|---|---|---|---|
| RES-020 | `ParseHealth` (0-100 estimate, deterministic): text layer present, reading order sane, standard section headings found, dates parseable, contact info found, no tables/multi-column in the extraction path, no text-in-images, contact not only in header/footer, fonts/encoding extractable. Each factor shown pass/warn/fail with weight. | MVP | M | D |
| RES-021 | `Readability` (0-100 estimate): length vs market norm, bullet length, action-verb starts, quantified-bullet ratio, density/white space, summary present and short, recency ordering, repeated phrases, clichés. Number computed in code; AI only phrases the notes. | MVP | M | D |
| RES-022 | Each finding has severity (BLOCKER / WARN / TIP), plain-language reason, location (section/line) and a **fix** (one-click deterministic fix where possible, otherwise a guided edit). | MVP | M | D |
| RES-023 | "How we calculated this" panel lists factors and weights; never labeled "ATS score". | MVP | M | D |
| RES-024 | "Recruiter 6-second view": top signals a skim would catch (name, current title, top employer, years, top skills); deterministic, no AI score. | P2 | C | P |
| RES-025 | Bullet impact check: flags bullets without result/metric and prompts the user for a real number (never invents one). | MVP | S | D |
| RES-026 | `ResumeAnalysis` stored per `ResumeVersion` with engine version for reproducibility; re-analysis on demand (counts toward quota only if content changed). | MVP | M | P |
| RES-027 | Quota: FREE 3 analyses/month (beta 6) via `UsageLedger`; deterministic checks are unmetered, only AI notes are metered. | MVP | M | P |

**PII linter and market rules**

| ID | Requirement | Phase | MoSCoW | Tag |
|---|---|---|---|---|
| RES-040 | PII linter runs on every parse and every export, using the target market from `Profile`. | MVP | M | D |
| RES-041 | **CNIC:** detect `#####-#######-#` and 13 contiguous digits (excluding phone-like context). Always a BLOCKER: "Remove your CNIC. Employers collect it later on official forms." One-click removal; export blocked until removed or the user overrides after reading a warning (override logged without storing the number). | MVP | M | D |
| RES-042 | **Photo:** `PK_LOCAL` allowed with a WARN (ATS may garble it; include only if the employer asks); `INTERNATIONAL` stripped from exports and flagged. | MVP | M | D |
| RES-043 | **DOB, marital status, father's/husband's name, domicile:** `PK_LOCAL` allowed with a WARN (modern practice is to give these on application forms); `INTERNATIONAL` stripped and flagged. Religion is off resumes by default in both markets (included only if the user explicitly adds it, with a WARN). | MVP | M | D |
| RES-044 | Other contact checks: unprofessional email, missing phone/email, full street address (suggest city only). | MVP | S | P |
| RES-045 | References: "Available on request" accepted; full lists flagged as TIP. | MVP | C | P |
| RES-046 | Length guidance: `INTERNATIONAL` 1 page (<10 years) else 2; `PK_LOCAL` 1-2 pages. Warnings, not blocks. | MVP | S | P |
| RES-047 | Further Pakistan sub-modes (private corporate, Gulf, govt-form). | Later | C | ? |

**Versions**

| ID | Requirement | Phase | MoSCoW | Tag |
|---|---|---|---|---|
| RES-050 | Versions list: name (editable), origin (UPLOAD / EDITED / TAILORED for job X), created date, `ParseHealth`, `Readability`, linked-application count, immutable badge. | MVP | M | D |
| RES-051 | Exactly one **default** `ResumeVersion`; the first successful upload becomes default automatically. | MVP | M | D |
| RES-052 | A `ResumeVersion` becomes immutable when linked to an `Application`; editing prompts "Save as new version". | MVP | M | D |
| RES-053 | Download the original uploaded file (signed URL, 60 s expiry, audit-logged). | MVP | M | D |
| RES-054 | Rename, duplicate-as-new-version, and compare two versions (reuses the TLR diff component). | MVP | S | P |
| RES-055 | Delete: a version linked to an `Application` cannot be deleted while linked (dialog lists the applications); offered alternative "Delete the file, keep the frozen text snapshot". Unlinked versions hard-delete (DB rows + stored file) immediately. | MVP | M | D |
| RES-056 | Deleting the default promotes the most recent remaining version after confirmation. | MVP | S | P |
| RES-057 | In-app resume editor (section by section; bold/italic/bullets only; reorder sections by drag). | MVP | M | D |

**Acceptance criteria**
- RES-001: *Given* a 7 MB PDF, *When* uploaded, *Then* it is rejected before storage with "File is larger than 5 MB".
- RES-020: *Given* a two-column PDF whose extraction interleaves columns, *When* parsed, *Then* ParseHealth shows FAIL on "Reading order" with the fix "Use a single-column layout (or export from our template)" and scores lower than a single-column version of the same content.
- RES-041: *Given* a resume containing `35202-1234567-1`, *When* the user clicks Export, *Then* export is blocked with the CNIC warning; *When* they click "Remove it", *Then* the number is deleted from a new `ResumeVersion` and export proceeds.
- RES-052: *Given* a version linked to an application, *When* the user edits it, *Then* the original is unchanged and a new version "Name (edited)" is created.
- RES-055: *Given* a version linked to two applications, *When* the user tries to delete it, *Then* a dialog lists both applications and offers only "Keep" or "Delete the file, keep snapshots".

**Edge cases**
- DOCX with tracked changes/comments: accepted text used; comments ignored with a notice.
- Resume not in English: best-effort parse, notice that analysis is English-only [D].
- Duplicate upload (same SHA-256): offer "Use the existing version".
- Parse worker crash/timeout: retried once, then FAILED with "Try again"; no quota consumed.
- Fresher/short resume: not penalized for missing experience; Readability weights shift to education/projects.
- 13-digit phone vs CNIC: linter checks context and lets the user dismiss a finding for that version.
- Injected prompt text in the resume ("ignore previous instructions"): treated as data, logged, never executed (see 05/06).

---

## 4. JOB - Job capture and extraction

**Purpose:** Let the user bring any job into the app by paste, with optional URL and source, and turn it into structured `JobRequirement`s. No server-side scraping [D].

**User stories**
- As a user, I want to paste a job description so that the app can analyze it without any integration.
- As a user, I want to tag where I found the job so that I can later see which source works best.
- As a user, I want to edit the extracted requirements so that mistakes do not poison my match.
- As a user, I want a duplicate warning so that I do not track the same job twice.

**Functional requirements**

| ID | Requirement | Phase | MoSCoW | Tag |
|---|---|---|---|---|
| JOB-001 | "Add job" form: JD text (required, 200-20,000 chars), job URL (optional, stored as a link only, never fetched), source picker (`LINKEDIN`, `ROZEE_PK`, `INDEED`, `MUSTAKBIL`, `COMPANY_SITE`, `REFERRAL`, `GOVT_PORTAL`, `JOB_FAIR`, `RECRUITER`, `SOCIAL_MEDIA`, `OTHER`) plus free-text detail. | MVP | M | D |
| JOB-002 | Optional manual fields: title, company, location, employment type, salary range, deadline. Blank fields are extracted. | MVP | M | D |
| JOB-003 | Extraction (Haiku 5.5 after a deterministic pre-pass for emails, URLs, salary patterns, headings): title, company, location, employment type, seniority, years required, education requirement, responsibilities, must-have and nice-to-have requirements, deadline, contact email. Stored as `Job` + `JobRequirement`. | MVP | M | D |
| JOB-004 | Each `JobRequirement`: text, type (SKILL / TOOL / EXPERIENCE_YEARS / EDUCATION / CERTIFICATION / DOMAIN / SOFT_SKILL / OTHER), priority (MUST_HAVE / NICE_TO_HAVE), canonical skill key where possible, source span in the JD for highlighting. | MVP | M | D |
| JOB-005 | Review screen after extraction: edit text, change priority, add, delete, merge. Edits mark the requirement `userEdited` and prompt a MAT recompute. | MVP | M | D |
| JOB-006 | Raw JD text stored as an immutable snapshot (`Job.rawText`) because postings disappear. | MVP | M | D |
| JOB-007 | Jobs list: search, filter by source/archived, sort by date or match; shows `JobMatch` when computed. | MVP | M | P |
| JOB-008 | Archive/unarchive; delete (hard delete; if an `Application` references the job, dialog offers deleting both or keeping the application with its job snapshot). | MVP | M | D |
| JOB-009 | **Duplicate detection** on save: normalized company + title + location, canonical URL/board job ID when present, and JD text similarity (shingle hash). On a hit: "You already saved this on <date>" with Open existing / Save anyway. Runs before extraction so nothing is billed. | MVP | S | P |
| JOB-010 | Job without JD ("manual job"): title + company only; MAT and TLR disabled until a JD is added. | MVP | S | P |
| JOB-011 | Extraction is a cheap task (not counted against analyses/tailors); soft cap of 50 jobs/day per user. | MVP | S | P |
| JOB-012 | Notice "Paste only text you have the right to use"; URL is never fetched. | MVP | M | D |
| JOB-013 | One-click capture from the browser (extension), parsing title/company/salary from the current page on user click. | P2 | S | D |
| JOB-014 | Deadline stored in JOB-002 feeds TRK reminders (TRK-040). | MVP | S | P |
| JOB-015 | Scam/low-quality warning heuristics (asks for payment, WhatsApp-only contact, free email for a "company"); informational only. Relevant to the Pakistan market. | P2 | C | P |

**Acceptance criteria**
- JOB-003/004: *Given* a pasted JD stating "3+ years Node.js (required); Docker is a plus", *When* extracted, *Then* "Node.js, 3+ years" is MUST_HAVE and "Docker" is NICE_TO_HAVE, each with a highlighted source span.
- JOB-009: *Given* a saved job "Backend Engineer, Acme, Lahore", *When* the same JD is pasted again, *Then* the duplicate notice with a link appears before extraction runs.
- JOB-008: *Given* a job with an application, *When* the user clicks Delete, *Then* the dialog states the consequence and requires confirmation.

**Edge cases**
- Text that is not a job ("chat spam"): rejected with "This doesn't look like a job description".
- JD with injected instructions: treated as data.
- Multiple roles in one JD: ask the user to pick or split into jobs [?].
- Urdu/mixed script: English parts accepted, notice shown [D].
- Salary "50k-70k": normalized to numeric min/max with currency; ambiguity flagged for confirmation.
- Same job via different URLs: caught by text similarity.

---

## 5. MAT - JobMatch and skill-gap analysis

**Purpose:** Compute an explainable `JobMatch` (0-100 estimate) between a `ResumeVersion` + `Profile` and a `Job`, classify each requirement, and let the user correct it. Formula and weights live in 05; this section defines behavior.

**User stories**
- As a user, I want to see why my match is what it is so that I trust it.
- As a user, I want to tell the app I know a skill, and give evidence, so that it counts.
- As a user, I want honesty about skills I lack so that I can decide to apply, learn, or skip.

**Functional requirements**

| ID | Requirement | Phase | MoSCoW | Tag |
|---|---|---|---|---|
| MAT-001 | Compute `JobMatch` for (Job, ResumeVersion); default is the default `ResumeVersion`, user can pick another. Stored with engine version, inputs hash, timestamp. | MVP | M | D |
| MAT-002 | Score is computed in code from weighted factors (must-have coverage 45, nice-to-have coverage 15, title/seniority alignment 15, evidence quality 15, thresholds (years, education, location) 10). One hard-requirement gap caps the score at 60, two or more at 45. Formula in 05 §5; see PRD §5b. The LLM only explains. A factor table with each contribution is always shown. | MVP | M | D |
| MAT-003 | Each `JobRequirement` is classified `STRONG` / `PARTIAL` / `MISSING` / `UNKNOWN` with a one-sentence reason and **evidence**: the resume line, `Skill`, `Experience`, `Project` or `FactBankItem` relied on (clickable), or "No evidence found". | MVP | M | D |
| MAT-004 | `UNKNOWN` is used when the requirement cannot be evaluated from available data; it never counts as a match and appears separately with a "Tell us" action. A skill is never marked present because the AI "assumes" it. | MVP | M | D |
| MAT-005 | Synonym credit ("managed projects" for "project management") displays the mapping reason and is capped at `PARTIAL` unless evidence is explicit. | MVP | S | P |
| MAT-006 | Summary view: score labeled "estimate", band (Low / Fair / Good / Strong fit), grouped Strong / Partial / Missing / Unknown, experience and education alignment, requirement conflicts (e.g., 5+ years required, 2 found), 3 prioritized recommendations. | MVP | M | D |
| MAT-007 | Visible disclaimer: "A fit estimate to guide your preparation, not a hiring prediction." | MVP | M | D |
| MAT-020 | **User overrides** (`MatchOverride`: `CONFIRM` / `REJECT` / `LEARNING` / `ADD_EVIDENCE`) per requirement: **confirm** (I have this; needs evidence text, saved as a user-confirmed `FactBankItem`), **reject** (AI is wrong; set to MISSING), **learning** (counts as PARTIAL at most; adds a learning tag), **add-evidence** (free text -> user-confirmed `FactBankItem`). Stored with user + timestamp. | MVP | M | D |
| MAT-021 | A confirmed override persists across jobs for the same canonical skill, shown as "from your confirmation". | MVP | S | P |
| MAT-022 | Overrides never silently change the resume; if a confirmed skill is absent from the resume, show a TLR suggestion "Add this to your resume?". | MVP | S | P |
| MAT-030 | **Recompute:** manual button; prompt when JD requirements, chosen `ResumeVersion`, `Profile`, or FactBank changed. Keep last 5 results and show the delta ("+6 since adding Docker evidence"). | MVP | M | D |
| MAT-031 | Compare one resume across many jobs (jobs-list column) and many resumes for one job (picker shows each version's score). | MVP | S | P |
| MAT-032 | Honest gap guidance per MISSING must-have: reframe adjacent experience only if it genuinely exists, plan to learn, or consider skipping; never "add this keyword". | MVP | S | D |
| MAT-033 | The numeric score is free; only the AI explanation counts toward the analyses quota. | MVP | S | P |
| MAT-034 | The score is snapshotted into the `Application` at creation for analytics (DSH-020). | MVP | M | P |

**Acceptance criteria**
- MAT-004: *Given* a requirement "Kubernetes" and a resume with no related text, *Then* it is `MISSING` with "No evidence found"; *Given* "strong communication skills" (not verifiable), *Then* it is `UNKNOWN`.
- MAT-020: *Given* MISSING "Docker", *When* the user adds evidence "Dockerized my capstone project", *Then* a user-confirmed `FactBankItem` is created, the class updates per evidence rules, the score recomputes, and the delta is shown.
- MAT-002: *Given* identical inputs and engine version, *When* matched twice, *Then* the numeric score is identical (determinism test).
- MAT-006: *Then* the word "ATS" is not shown next to the score and the disclaimer is visible.

**Edge cases**
- Job with no must-haves extracted: "Low confidence: few requirements found" and a prompt to edit requirements.
- Resume changed after a match: stale badge.
- Over-qualified candidate: noted, not penalized.
- Conflicting evidence (resume 2 years, Profile 4): conflict flagged, lower value used until resolved.
- Override on a deleted requirement: dropped with it.

---

## 6. TLR - Resume tailoring (Path A and Path B)

**Purpose:** Improve the resume for a specific job without inventing anything. **Path A "Download improved resume":** generate a tailored `ResumeVersion`, review the diff, export. **Path B "Suggestions":** an evidence-linked list the user applies in the app or in their own file. Both draw only from the resume, `Profile`, and confirmed FactBank [D].

**User stories**
- As a user in a hurry, I want an improved resume I can review and download so that I can apply today.
- As a user who edits in Word, I want a list of reasoned suggestions so that I can apply them myself.
- As a careful user, I want to see every change and undo any of them so that I stay in control.
- As a user, I want the AI to ask for missing numbers rather than make them up.

**Shared requirements**

| ID | Requirement | Phase | MoSCoW | Tag |
|---|---|---|---|---|
| TLR-001 | Entry from a Job: "Improve my resume for this job" offers Path A and Path B; requires a computed `JobMatch` (auto-run if absent). | MVP | M | D |
| TLR-002 | Every `Suggestion` has: id, type (KEYWORD / BULLET_REWRITE / SUMMARY / SKILL_ORDER / SECTION_ORDER / REMOVE / ADD_QUESTION), target (section + item), before text, proposed text, rationale, linked requirement(s), **evidence** reference, status (PENDING / APPLIED / DISMISSED). | MVP | M | D |
| TLR-003 | **Evidence rule:** a Suggestion introducing a skill, tool, metric, employer, date, or claim not already in the resume/Profile/confirmed FactBank is **not generated as a change**; it becomes an `ADD_QUESTION` ("You don't mention Docker. Have you used it? If yes, add a line"). The answer can create a FactBank item and then yield a proper evidence-linked suggestion. | MVP | M | D |
| TLR-004 | Deterministic post-generation validator compares proposed text with the allowed-facts set: new numbers, new proper nouns/tools, new date ranges, new employers cause the suggestion to be dropped or converted to a question. Results are logged in `AiRequest` metadata. | MVP | M | D |
| TLR-005 | Keyword suggestions read "Your resume supports X (line Y); the job says Z; consider the job's wording" and give an honest note for true gaps (MAT-032). No keyword stuffing; per-section cap on suggested terms. | MVP | M | D |
| TLR-006 | Preserve the user's voice; flag clichés ("results-driven", "team player") and offer specifics only where evidence exists. | MVP | S | P |
| TLR-007 | Quota: one "tailor" per (Job, source `ResumeVersion`) generation; regenerating on identical inputs within 24 h is free. FREE 3/month (beta 6). | MVP | M | P |
| TLR-008 | Market rules (RES-040 to RES-046) and the PII linter apply to all generated output. | MVP | M | D |

**Path A - Download improved resume**

| ID | Requirement | Phase | MoSCoW | Tag |
|---|---|---|---|---|
| TLR-010 | Generate a new `ResumeVersion` (origin TAILORED, linked to Job and parent) from validated suggestions applied in draft state. | MVP | M | D |
| TLR-011 | **Preview with highlighted diff:** additions, edits, removals distinguished by color and by icon/text (not color alone); each change shows its evidence on hover/tap. | MVP | M | D |
| TLR-012 | **Undo per change** (with redo); **Accept all** applies remaining changes; **Reject all** reverts to the parent. Draft persists across sessions. | MVP | M | D |
| TLR-013 | Inline edit of any text in the preview; edited text re-runs the TLR-004 validator and PII linter and is marked "edited by you". | MVP | M | D |
| TLR-014 | Finalize saves the TAILORED `ResumeVersion` and recomputes `ParseHealth`, `Readability`, and `JobMatch` to show before/after. | MVP | M | D |
| TLR-015 | **Export** ATS-safe PDF and DOCX from 1-2 templates (single column, standard headings, real text, no tables/images in body, standard embedded fonts, correct reading order, metadata set). Market defaults select template options. Each export creates an `ExportFile` (Supabase Storage) and re-parses the produced file to verify `ParseHealth`. | MVP | M | D |
| TLR-016 | Export pre-flight lists unresolved PII findings (CNIC blocks as RES-041), pending `ADD_QUESTION`s, and accepted/rejected changes. | MVP | M | D |
| TLR-017 | Export is free on FREE (basic templates, no watermark). | MVP | S | P |
| TLR-018 | Additional templates (3-5), accent color, section-order presets. | P2 | C | P |
| TLR-019 | Round-trip: user edits exported DOCX and re-uploads it as a child version. | P2 | C | P |

**Path B - Suggestions**

| ID | Requirement | Phase | MoSCoW | Tag |
|---|---|---|---|---|
| TLR-030 | Suggestions list grouped by section and impact; filter by type and requirement; counters (pending/applied/dismissed). | MVP | M | D |
| TLR-031 | Each suggestion supports **Copy** (proposed text to clipboard), **Apply** (writes into the in-app editor as a draft `ResumeVersion`), and **Dismiss** (optional reason; not regenerated for the same inputs). | MVP | M | D |
| TLR-032 | In-app editor (RES-057) shows suggestions as margin cards; applying updates the document and an impact hint ("covers 2 more requirements"). | MVP | M | D |
| TLR-033 | `ADD_QUESTION` cards accept the answer inline and save to FactBank on confirm (PRO-009). | MVP | M | D |
| TLR-034 | Summary header: "5 quick wins, 3 need your input, 2 optional". | MVP | S | P |
| TLR-035 | Export suggestions as a checklist (PDF/copyable text) for users editing in Word. | P2 | C | P |

**Acceptance criteria**
- TLR-003/004: *Given* a resume with no Docker and an empty FactBank, *When* suggestions are generated for a job requiring Docker, *Then* no bullet contains "Docker" and one `ADD_QUESTION` exists. *Given* the user answers "Yes, in my FYP" and confirms, *Then* a bullet suggestion appears citing the new FactBank item.
- TLR-004: *Given* an LLM output "Increased sales by 30%" where 30% is in no allowed fact, *When* validated, *Then* the suggestion is dropped and "Do you have a number for this?" is shown (guardrail eval case).
- TLR-012: *Given* 10 changes, *When* the user undoes change 4 then clicks Accept all, *Then* change 4 stays undone and the export has 9 changes [?: confirm Accept all skips user-undone changes].
- TLR-015: *Given* an exported PDF from the standard template, *When* re-parsed by our parser, *Then* ParseHealth >= 90 (regression test).
- TLR-016: *Given* a CNIC present, *Then* export is blocked as in RES-041.

**Edge cases**
- Invalid LLM JSON: retry once, then deterministic-only suggestions (keyword gaps, ordering) with a banner; no quota consumed.
- Content too long for the template (3+ pages): length warning plus `REMOVE` suggestions; nothing auto-deleted.
- Parent version edited after a draft was generated: draft flagged "based on an older version" with rebase/keep options.
- Job requirements edited after tailoring: "Suggestions may be outdated - refresh".
- Names in Urdu/Arabic script are preserved if the template font supports them; the product stays English-only [D].

---

## 7. CVL - Cover letter

**Purpose:** Generate an editable, job-specific `CoverLetter` using only candidate evidence and user-provided company information.

**User stories**
- As a user, I want a first draft in my chosen tone and length so that I edit instead of writing from zero.
- As a user, I want it to never invent facts about the company so that I am not embarrassed.

**Functional requirements**

| ID | Requirement | Phase | MoSCoW | Tag |
|---|---|---|---|---|
| CVL-001 | Generate from (Job, `ResumeVersion`, `Profile`, optional selected Experience/Projects/FactBank items, optional user "why this company" notes). | MVP | M | D |
| CVL-002 | Options: length SHORT (~120-150 words) / MEDIUM (~200-250) / LONG (~300-350); tone PROFESSIONAL / FRIENDLY / CONFIDENT; optional recipient name. | MVP | M | D |
| CVL-003 | **No invented company facts:** company statements are allowed only from the JD text or the user's notes; a validator drops sentences with company claims (products, funding, values, news) not traceable to those sources. With no notes, the letter focuses on role and fit. | MVP | M | D |
| CVL-004 | Candidate claims follow TLR-003/004; metrics only from confirmed facts. | MVP | M | D |
| CVL-005 | Editor with autosave; "Regenerate" (full) and "Regenerate paragraph"; last 5 drafts kept. | MVP | M | D |
| CVL-006 | Export: copy, PDF, DOCX with plain ATS-safe layout; header reuses the resume contact block and obeys market PII rules. | MVP | M | D |
| CVL-007 | A `CoverLetter` linked to an `Application` becomes immutable (edits create a new letter). | MVP | M | D |
| CVL-008 | Quota: separate "cover letters" counter at the same limit as tailoring (FREE 3/month, beta 6) [?]. | MVP | S | P |
| CVL-009 | Bracketed placeholders (e.g., "[Hiring manager name]") are highlighted and block export until filled or dismissed. | MVP | S | P |
| CVL-010 | Draft answers to common application questions ("Why do you want to work here?") with the same grounding rules. | P2 | C | P |

**Acceptance criteria**
- CVL-003: *Given* a job at "Acme" with no user notes, *When* generated, *Then* the letter has no claim like "I admire Acme's recent Series B" (checked against JD text; guardrail eval case).
- CVL-009: *Given* an unresolved placeholder, *When* Export is clicked, *Then* the user is told which placeholders remain.

**Edge cases**
- Confidential posting with no company name: letter says "your team".
- User notes with claims ("they raised $10M"): accepted, labeled "from your notes".
- Regeneration would overwrite manual edits: warn first, keep the previous draft.

---

## 8. INT - Interview prep and mock interview

**Purpose:** Prep the user with job-specific questions and run a configurable text mock interview scored against an anchored rubric with evidence quotes and model answers built only from the user's own facts. **Practice only**; never a live-interview assistant [D].

**User stories**
- As a user, I want a question bank for a specific job so that I prepare strategically.
- As a user, I want to configure a mock interview so that it fits my situation.
- As a user, I want follow-up questions and a detailed report so that I learn why an answer scored as it did.
- As a user, I want to retry a weak answer and see my improvement.

**Prep bank**

| ID | Requirement | Phase | MoSCoW | Tag |
|---|---|---|---|---|
| INT-001 | "Interview prep" per Job generates 15-25 questions grouped TECHNICAL / BEHAVIORAL / HR_SITUATIONAL / CANDIDATE_SPECIFIC (from resume gaps and strengths). | MVP | M | D |
| INT-002 | Each question may include why it is asked, suggested answer structure (STAR or role-specific), candidate-specific hint (cites resume/FactBank), and a flag when it probes a MISSING requirement ("Be ready to address this gap honestly"). | MVP | M | D |
| INT-003 | Hints reference only user facts (X-001); with no relevant experience a template is shown ("Think of a time you ..."). | MVP | M | D |
| INT-004 | Star/save questions, add notes, regenerate one question, start a mock from selected questions. | MVP | S | P |
| INT-005 | "Questions to ask the interviewer" list (5-8, editable). | P2 | C | P |

**Mock session**

| ID | Requirement | Phase | MoSCoW | Tag |
|---|---|---|---|---|
| INT-010 | **Setup:** Job (or general practice with a target role), `ResumeVersion` (default preselected), type BEHAVIORAL / TECHNICAL / MIXED / HR, count 5 / 10 / 15, difficulty EASY / STANDARD / HARD, recruiter `Persona` (FRIENDLY_RECRUITER / HIRING_MANAGER / TECHNICAL_PANEL / TOUGH_BUT_FAIR), optional soft timer per question (default 120 s, configurable). | MVP | M | D |
| INT-011 | **Blueprint** before start: competency coverage plan (which JD requirements/competencies the questions cover, including one gap question); start or regenerate. | MVP | S | P |
| INT-012 | One question at a time (`InterviewQuestion` -> `InterviewAnswer`); answer max 3,000 chars; Skip, Repeat, Hint (hint use shown in the report). | MVP | M | D |
| INT-013 | **Soft timer:** elapsed/target shown; a gentle nudge at target time; never auto-cuts the answer; timing recorded. | MVP | M | D |
| INT-014 | **Adaptive follow-ups:** after an answer, a lightweight check (missing STAR element, vague claim, no result) may add up to 2 follow-ups per question; session follow-up cap 3 / 6 / 8 for 5 / 10 / 15 questions (PRD §5b); visibly labeled and evaluated with the original answer. | MVP | M | D |
| INT-015 | Session state persists; resume within 7 days; abandoned sessions auto-close after 7 days with a partial report. | MVP | M | P |
| INT-016 | Pause and end early (partial report from answered questions). | MVP | M | P |
| INT-017 | Practice-only disclaimer at setup and in the report: "Practice tool. Scores are feedback for you, not a prediction of any hiring decision. Do not use it during a real interview." No overlay, real-time hints, or screen-reading features will be built. | MVP | M | D |
| INT-018 | Quota per PRD §5b: FREE 2 sessions/month (up to 10 questions); 15-question sessions are PRO/SPRINT only (decided); beta limits doubled. A session counts when its first answer is evaluated. | MVP | M | P |
| INT-019 | Voice input/output with objective delivery metrics (pace, fillers). | P2 | S | D |
| INT-020 | Technical coding interviews with an editor. | Later | C | P |

**Evaluation and report**

| ID | Requirement | Phase | MoSCoW | Tag |
|---|---|---|---|---|
| INT-030 | Per-answer `InterviewEvaluation` by anchored rubric (1-5 per dimension, weighted to 0-100). Behavioral: relevance 20, STAR structure 25, specificity/evidence 20, ownership/impact 15, clarity/concision 15, role alignment 5. Technical: accuracy 35, depth/trade-offs 20, reasoning structure 15, practical examples 15, communication 15. Weights are config in 05. | MVP | M | D |
| INT-031 | Each dimension carries a **required evidence quote** from the user's own answer; a score without a supporting quote is invalid and re-evaluated. Aggregation is computed in code. | MVP | M | D |
| INT-032 | Content-only grading: accent, grammar, fluency and spelling are not penalized; non-native phrasing is not penalized. | MVP | M | D |
| INT-033 | Per-question card: the user's answer, dimension scores with quotes, "what was wrong" labels (NO_RESULT, NO_METRICS, WE_VS_I, OFF_TOPIC, TOO_LONG, TOO_VAGUE), one-line fix, and a **model answer**. | MVP | M | D |
| INT-034 | **Model answers use only the resume, `Profile`, and confirmed FactBank.** With no relevant experience, the model answer is a placeholder template ("Use your own real example here"). Same validator as TLR-004. | MVP | M | D |
| INT-035 | **Retry question:** re-answer any question; show the new score beside the old with delta; both attempts retained. | MVP | M | D |
| INT-036 | Final report: overall score (estimate), per-dimension chart, strengths, top 3 priorities, competency coverage vs JD, answered/skipped, hints used, time stats. | MVP | M | D |
| INT-037 | **Score history:** overall and per-dimension trend across sessions; comparison only against the user's own prior attempts. | MVP | S | D |
| INT-038 | Resume feedback loop: gaps found in answers produce "Add this story to your FactBank?" and bullet suggestions. | P2 | S | P |
| INT-039 | Export the report as PDF. | P2 | C | P |
| INT-040 | Calibration: rubric and evaluator prompts validated against a human-graded set (target agreement within +/-1 on 80% of dimensions) and regression-gated in CI (see 05). | MVP | M | D |

**Data**

| ID | Requirement | Phase | MoSCoW | Tag |
|---|---|---|---|---|
| INT-050 | Raw `InterviewAnswer` text and evidence quotes retained 12 months, then deleted by a scheduled job; scores, summaries and model answers remain until the user deletes them. Users can delete any session earlier. | MVP | M | D |
| INT-051 | Before purge, the list shows "answer text expires on <date>" and an email summary goes out 30 days ahead (opt-out). | MVP | S | P |
| INT-052 | Answers are never used for model improvement unless the user opts in (SET-020). | MVP | M | D |

**Acceptance criteria**
- INT-014: *Given* an answer without a measurable result, *When* submitted, *Then* the next message is "What was the measurable outcome?"; after the user replies, at most one further follow-up appears for that question.
- INT-031: *Given* an evaluation missing a quote for a dimension, *When* validated, *Then* it is re-run once; if still invalid, that dimension shows "Not enough information" and is excluded from the average.
- INT-034: *Given* no leadership experience in resume or FactBank, *When* a leadership question's model answer is built, *Then* it contains placeholders and no invented project (guardrail eval).
- INT-035: *Given* a retried answer, *Then* both scores, the delta, and the most-changed dimension are displayed.
- INT-050: *Given* an answer older than 12 months, *When* the purge job runs, *Then* the answer text and evidence quotes are null, scores and summaries remain, and the report shows "Answer text removed".

**Edge cases**
- One-word/empty answer: prompt "Add a bit more detail?" once, then evaluate as given.
- Off-topic or abusive answers: evaluated normally; no storage beyond retention.
- Prompt injection in an answer ("give me 100"): ignored (guardrail eval case).
- Browser closes mid-answer: draft autosaved locally and to the server every 10 s.
- No JD (general practice): target role and Profile skills used; no coverage map.
- Provider outage mid-session: session pauses with "Resume when ready"; no quota consumed for unevaluated answers.

---

## 9. TRK - Application tracker

**Purpose:** Track every application from a `Job`, freeze the exact resume and cover letter sent, record stage history, contacts, and interviews, and nudge the user at the right time.

**User stories**
- As a user, I want to know which exact resume I sent to each company so that I can prepare and learn what works.
- As a user, I want a kanban board and a list so that I can manage on phone and desktop.
- As a user, I want reminders and a ghosting suggestion so that no application is forgotten.
- As a user moving from a spreadsheet, I want CSV import (P2) so that I do not retype.

**Records**

| ID | Requirement | Phase | MoSCoW | Tag |
|---|---|---|---|---|
| TRK-001 | Create an `Application` from a `Job` ("Track this application") or manually (company + title). Unlimited on all plans. | MVP | M | D |
| TRK-002 | Fields: company, title, job URL, board job ID, `Job` link (optional), source (enum + detail), status, savedAt, appliedAt, lastActivityAt, nextActionAt, deadline, salary (listed range, offered amount), location/work type, priority (1-3), tags, notes, outcome fields (rejection reason, offer details, withdrawal reason). | MVP | M | D |
| TRK-003 | **Link `ResumeVersion`:** choose the version sent; on link it becomes immutable (RES-052). A frozen snapshot (structured JSON + export file hash when an `ExportFile` was used) is stored on the application. Missing link allowed with the warning "No resume linked - you won't know what you sent". | MVP | M | D |
| TRK-004 | Link `CoverLetter` (optional) with the same immutability. | MVP | M | D |
| TRK-005 | Job snapshot: copies `Job.rawText` and key requirements into the application so the record survives job edits or deletion. | MVP | M | D |
| TRK-006 | `JobMatch` score snapshot stored at link time (MAT-034). | MVP | S | P |
| TRK-007 | Source is required on entering APPLIED (defaults to the job's source); detail optional. | MVP | M | D |
| TRK-008 | Duplicate guard: warn if an application to the same company+title exists within 90 days. | MVP | S | P |
| TRK-009 | `Contact`: name, role (RECRUITER / HIRING_MANAGER / REFERRER / INTERVIEWER / OTHER), email, phone, LinkedIn, referral flag, last-contacted date, notes; many-to-many with applications; included in export. | MVP | S | D |
| TRK-010 | `InterviewRound` children: type (HR / TECHNICAL / FINAL / PANEL / OTHER), scheduledAt (with timezone), mode (phone / video / onsite), link/location, interviewers (`Contact`s), outcome (PENDING / PASSED / FAILED / UNKNOWN), prep notes. Adding a round does not change status but suggests moving to `INTERVIEWING`. | MVP | M | D |
| TRK-011 | "Prepare for this interview" on a round opens mock setup prefilled with the job and round type. | MVP | S | P |
| TRK-012 | Timeline per application: merged status changes, rounds, notes, reminders. | MVP | S | P |
| TRK-013 | Archive and delete (hard delete with confirmation; linked `ResumeVersion`s are not deleted). | MVP | M | D |

**Status pipeline**

| ID | Requirement | Phase | MoSCoW | Tag |
|---|---|---|---|---|
| TRK-020 | Statuses exactly `SAVED -> APPLIED -> SCREENING -> ASSESSMENT -> INTERVIEWING -> OFFER -> ACCEPTED`, plus `REJECTED`, `WITHDRAWN`, `GHOSTED`. Interview rounds are not statuses. | MVP | M | D |
| TRK-021 | Any move (forward, backward, to terminal) is allowed and always writes an `ApplicationStatusHistory` row: from, to, timestamp (UTC), actor (USER / SYSTEM), optional note, optional backdate (`occurredAt`). | MVP | M | D |
| TRK-022 | `REJECTED` (reason from enum + optional note), `WITHDRAWN` (optional reason), `ACCEPTED`, `GHOSTED` can be reopened; reopening is logged. | MVP | M | D |
| TRK-023 | Entering APPLIED sets `appliedAt` if empty; entering OFFER opens an offer-details panel (base, bonus, benefits, deadline). | MVP | S | P |
| TRK-024 | Status changes are optimistic in the UI and persisted server-side; on failure roll back with a toast. | MVP | M | P |

**Views**

| ID | Requirement | Phase | MoSCoW | Tag |
|---|---|---|---|---|
| TRK-030 | **Kanban:** columns for the seven active statuses, terminal states in a collapsible lane; cards show company, title, match score, days-in-stage, next action, source icon; drag-and-drop persists status (TRK-021). | MVP | M | D |
| TRK-031 | Keyboard/touch alternative to drag: card menu "Move to...". On mobile the board scrolls horizontally with the same menu. | MVP | M | P |
| TRK-032 | **List view:** sortable/filterable table (status, source, tag, date range, `ResumeVersion`, priority, text search); saved filters. | MVP | M | D |
| TRK-033 | Bulk actions: archive, tag, change status (each writes history). | MVP | S | P |
| TRK-034 | Detail page tabs: Overview, Resume and letter (frozen), Job, Interviews, Contacts, Timeline. | MVP | M | P |

**Reminders and ghosting**

| ID | Requirement | Phase | MoSCoW | Tag |
|---|---|---|---|---|
| TRK-040 | Reminders: `nextActionAt` with a note and optional repeat; in-app + email (NTF-004); automatic pre-reminders for interview rounds (24 h, 1 h) and job deadlines (2 days). | MVP | M | D |
| TRK-041 | Default follow-up nudge 7 days after APPLIED with no activity ("Send a follow-up?"); configurable. | MVP | S | P |
| TRK-042 | **Ghosting detection:** an application in APPLIED/SCREENING/ASSESSMENT/INTERVIEWING with no recorded activity for N days (default 21; 14 after an interview round; configurable 7-90) shows "No update in N days - mark as GHOSTED?" in app (and in the weekly digest once NTF-005 ships, P2). It **only suggests**; the user confirms, and the history actor is USER. | MVP | S | D |
| TRK-043 | Follow-up message draft grounded in application data and Contacts; copy-only, never sent by the app. | P2 | C | P |
| TRK-044 | Snooze/dismiss a ghosting suggestion; it does not reappear for N days. | MVP | S | P |

**Import/export and integrations**

| ID | Requirement | Phase | MoSCoW | Tag |
|---|---|---|---|---|
| TRK-050 | CSV export of all applications (history as a second file) at any time. | MVP | M | D |
| TRK-051 | CSV import with column-mapping wizard, preview, and per-row validation; maps status names (case-insensitive aliases such as "Interview") to canonical statuses; creates history rows with `occurredAt`; unknown sources -> `OTHER` + detail; max 500 rows. No resume linking on import. | P2 | S | D |
| TRK-052 | Downloadable CSV template for import. | P2 | S | P |
| TRK-053 | Notion/Sheets import connectors. | Later | C | P |
| TRK-054 | Browser extension "Track this job" capture. | P2 | S | D |
| TRK-055 | Consented email sync (Gmail/Outlook read-only) that proposes status changes for confirmation. | Later | C | D |
| TRK-056 | ICS export of `InterviewRound`s (MVP Could); two-way calendar sync Later. | MVP/Later | C | P |

**Acceptance criteria**
- TRK-003: *Given* ResumeVersion V3 linked to an application, *When* the user later edits V3, *Then* V4 is created and the application still shows V3's text and export hash.
- TRK-021/030: *Given* a card in SAVED, *When* dragged to APPLIED, *Then* after reload an `ApplicationStatusHistory` row (SAVED -> APPLIED) exists, `appliedAt` is set, and column counts update.
- TRK-042: *Given* an APPLIED application with no activity for 21 days, *When* the daily job runs, *Then* a suggestion appears; *When* dismissed, *Then* status stays and no history row is written; *When* confirmed, *Then* (APPLIED -> GHOSTED, actor USER) is written.
- TRK-051 (P2): *Given* a CSV of 100 rows with 5 unknown statuses, *When* previewed, *Then* those 5 show errors and the user can fix the mapping or skip; valid rows import.
- TRK-010: *Given* an APPLIED application, *When* an HR round is added, *Then* status remains APPLIED and a "Move to SCREENING/INTERVIEWING?" suggestion appears.

**Edge cases**
- Backdated changes make history non-chronological: sorted by `occurredAt`; analytics use `occurredAt`.
- Drag onto the same column or rapid double-drag: idempotent, no duplicate rows.
- Offline (PWA): MVP is installable with a read-only offline cache of the tracker; edits are disabled offline. The offline edit queue (moves queued and synced, last-write-wins with history preserved) is P2 [?].
- Timestamps UTC; displayed in the user's timezone (default Asia/Karachi for PK users).
- Deleting a `Contact` referenced by rounds: unlinks and keeps the name text.
- Reminder time passes while offline: delivered on next open and by email.
- Import duplicates of existing applications (P2, TRK-051): flagged by TRK-008; user chooses skip or import.

---

## 10. DSH - Dashboard and analytics

**Purpose:** Give an at-a-glance view and honest analytics of the search, strictly separating facts (computed) from speculation (AI insights).

**User stories**
- As a user, I want one page showing where my search stands so that I know what to do today.
- As a user, I want to know which sources and resume versions get responses so that I can focus my effort.
- As a user, I want AI observations that clearly say when they are guesses.

**Functional requirements**

| ID | Requirement | Phase | MoSCoW | Tag |
|---|---|---|---|---|
| DSH-001 | Home: counts (total applications, saved, active, interviewing, offers, rejections, ghosted), interview rate (reached `INTERVIEWING` / reached `APPLIED`), offer rate, "Needs attention" (due reminders, ghosting suggestions, interviews in 7 days), recent applications table (Company, Position, Match, Status, Applied, Actions). | MVP | M | D |
| DSH-002 | Empty states with the next best action and a progress checklist of the core flow. | MVP | M | P |
| DSH-003 | Date-range filter (30 / 90 days / all) for all stats; "How is this calculated?" definitions. | MVP | S | P |
| DSH-010 | Funnel: Applied -> Screening -> Assessment -> Interviewing -> Offer -> Accepted with counts and stage-to-stage conversion; skipped stages are counted by the furthest stage reached (from `ApplicationStatusHistory`). | MVP | M | D |
| DSH-011 | Time metrics: average and median days between stages, days to first response, time in current stage; shown only when n >= 3, else "Not enough data yet". | MVP | M | D |
| DSH-012 | Applications per week/month chart. | MVP | S | D |
| DSH-013 | Breakdown **by source** (job-source enum): applications, response rate, interview rate, offers. | MVP | M | D |
| DSH-014 | Breakdown **by `ResumeVersion`**: applications and conversion per linked version (uses immutable links). | MVP | M | D |
| DSH-015 | Breakdown by company, location, work type, and tag. | MVP | S | D |
| DSH-020 | **Match score vs outcome:** banded bars (0-49 / 50-69 / 70-84 / 85+) of snapshot `JobMatch` vs furthest stage; annotated with n and "correlation, not cause". | MVP | S | D |
| DSH-021 | Every metric shows sample size n; for n < 5 values are greyed with "Small sample - don't over-read this". | MVP | M | P |
| DSH-022 | Charts have text alternatives, a data-table toggle, and a colorblind-safe palette. | MVP | M | P |
| DSH-030 | **AI insights (P2):** two labeled blocks: "What your data shows" (computed statements with numbers, template-generated or validated against data) and "Ideas to try (speculation)" (hypotheses labeled unverified). Insights cite the metric rows used and never predict outcomes. Requires n >= 15 applications. | P2 | S | D |
| DSH-031 | Merged into NTF-005 (single weekly-digest requirement, P2). | P2 | C | P |
| DSH-032 | Benchmarking against other users. | Later | W | ? |

**Acceptance criteria**
- DSH-010: *Given* an application SAVED -> APPLIED -> INTERVIEWING (skipping SCREENING), *Then* it counts in Applied and Interviewing and is shown as "skipped" at Screening.
- DSH-011: *Given* only 2 applications with responses, *Then* time-between-stages shows "Not enough data yet".
- DSH-030: *Given* "Referral applications reached INTERVIEWING more often (4/6 vs 5/30)", *Then* it appears under "What your data shows"; *Given* "Try applying earlier in the week", *Then* it appears only under speculation.

**Edge cases**
- CSV-imported applications without history: counted by current status, excluded from time metrics.
- Reopened terminal status: funnel uses latest history.
- Deleted applications vanish from stats immediately.
- Users with only SAVED jobs: saved-focused view with a prompt to apply.

---

## 11. PLN - Plans, usage, and beta mode

**Purpose:** Build entitlements and usage tracking from day 1 so monetization can be switched on later; run a free beta first [D]. Payments are P2.

**User stories**
- As a user, I want to see how much of my monthly allowance is left so that nothing surprises me.
- As a user who hits a limit, I want clear options and no data loss.
- As the founder, I want to change limits without redeploying.

| ID | Requirement | Phase | MoSCoW | Tag |
|---|---|---|---|---|
| PLN-001 | Plans `FREE`, `PRO` (monthly), `SPRINT` (2-4 week pass) defined in an entitlement table editable without redeploy. | MVP | M | D |
| PLN-002 | Metered units: `RESUME_ANALYSIS`, `TAILOR`, `COVER_LETTER`, `MOCK_SESSION` (+ questions cap), `JOB_EXTRACTION` (soft cap), `STORAGE_UPLOADS`. Tracking, saved jobs, applications, contacts, and data export are unlimited on all plans. | MVP | M | D |
| PLN-003 | **Proposed limits [P]:** FREE per calendar month: 3 analyses, 3 tailored versions, 3 cover letters, 2 mock sessions (<= 10 questions). **Beta:** FREE limits doubled. PRO: 40 analyses, 30 tailored versions, 30 cover letters, 15 mock sessions (5/10/15 questions). SPRINT: PRO caps for the pass duration (see PRD §5b). 15-question sessions are PRO/SPRINT only. Final numbers pending the >=100-respondent pricing survey [?]. | MVP | M | P |
| PLN-004 | `UsageLedger`: append-only rows (userId, unit, amount, refType/refId, planAtTime, periodKey, createdAt); usage = sum over period; used for enforcement, analytics, and cost correlation with `AiRequest`. | MVP | M | D |
| PLN-005 | Entitlement is checked server-side **before** an AI job is queued; the ledger row is written on success (X-009); a reservation prevents parallel requests from exceeding the limit. | MVP | M | P |
| PLN-006 | **Limit-reached UX:** says which limit, usage ("3/3 used"), reset date, what still works (everything non-AI and all previously generated content), and options (during beta: "More coming after beta" with a feedback link). No dark patterns, no countdown timers, never blocks data access, export, or deletion. | MVP | M | D |
| PLN-007 | Soft warning at 80% of any limit. | MVP | S | P |
| PLN-008 | Usage page in Settings: current period by unit, history, plan name. | MVP | M | P |
| PLN-009 | Global `beta_mode` flag shows a "Beta" badge, doubles limits, and records `planAtTime=FREE_BETA`; per-user credit grants by admin (reason required, audit-logged). | MVP | M | D |
| PLN-010 | Period = UTC calendar month; no rollover. | MVP | S | P |
| PLN-011 | `Subscription` entity exists (plan, status, period, provider ids) but is unused during beta. | MVP | M | D |
| PLN-020 | Payments: Safepay (PKR) checkout, webhooks, invoices, one-click cancel; later merchant of record for USD. | P2 | M | D |
| PLN-021 | `SPRINT` purchase and expiry reminders; auto-downgrade at expiry with no data loss. | P2 | S | D |
| PLN-022 | Refund tooling; public pricing page with no trial-to-subscription traps. | P2 | S | D |
| PLN-023 | Annual plan. | Later | C | ? |

**Acceptance criteria**
- PLN-005: *Given* a FREE user with 3/3 analyses used, *When* they click Analyze, *Then* no AI job is queued, the limit-reached UX appears, and the ledger is unchanged.
- PLN-005: *Given* 2/3 used and two simultaneous analyses, *Then* exactly one succeeds and the other gets the limit-reached response.
- PLN-009: *Given* beta mode, *Then* the analyses limit reads 6 and Usage shows "Beta limits".
- PLN-006: *Given* a reached limit, *Then* export, delete account, tracker, and previously generated content remain usable.

**Edge cases**
- AI job fails after reservation: reservation released, no ledger row.
- Plan change mid-period (P2): limits switch immediately; used amounts carry over.
- Month boundary: all keyed by UTC `periodKey`.
- Multi-account abuse: ADM-006 and AUTH-010.

---

## 12. SET - Settings and privacy

**Purpose:** Give users full control over their data and consent.

**User stories**
- As a user, I want to export everything I put in so that I own my data.
- As a user, I want to delete my account and know it is gone.
- As a privacy-minded user, I want AI-improvement use to be off unless I choose.

| ID | Requirement | Phase | MoSCoW | Tag |
|---|---|---|---|---|
| SET-001 | Settings areas: Account (email, password, sessions, linked accounts), Profile market, Notifications, Privacy and data, Usage and plan, Danger zone. | MVP | M | P |
| SET-010 | **Export all data:** background job -> ZIP with `data.json` (Profile, FactBank, ResumeVersions, Jobs/Requirements, Matches, Suggestions, CoverLetters, Applications + status history + rounds + Contacts, interview sessions/answers/evaluations, ConsentRecords, UsageLedger summary) and `files/` (original uploads, `ExportFile`s). Emailed link valid 7 days, requires re-authentication; schema documented in `README.txt`; one export per 24 h. | MVP | M | D |
| SET-011 | CSV application export (TRK-050) reachable here. | MVP | S | P |
| SET-012 | **Delete account:** re-authentication + typing "DELETE"; immediate logout and access disabled; 7-day undo window (log in to cancel), then hard delete of all user rows and stored files; backups expire within 30 days after that (fully gone within 37 days; `DeletionLedger` re-applies deletes after any restore); emails at request and completion. | MVP | M | D |
| SET-013 | Delete data classes separately (interview history, uploaded files, jobs, FactBank). | MVP | S | P |
| SET-014 | User-visible `AuditLog` subset (exports, delete request, consent changes, sign-ins). | MVP | S | P |
| SET-020 | **Consent toggles** (each a `ConsentRecord`: version, timestamp, granted/revoked): (a) "Allow anonymized data to improve our models" (`TRAINING_OPT_IN`) - **default OFF**, never pre-checked, revocable; (b) first-party product analytics (`ProductEvent`; no resume/interview content ever); (c) marketing emails (default OFF). | MVP | M | D |
| SET-021 | Opted-in data is de-identified (PII scrubbed, no identifiers), stored separately, and removable on request; explained in plain language. Not used for training until volume and consent justify it (see 05). | MVP | M | D |
| SET-022 | Plain-language "What we store and why" page: per-feature data table, retention periods, subprocessors (AI provider, hosting, email, analytics). | MVP | M | D |
| SET-023 | Retention controls: show inactivity policy (24 months -> warn -> purge) and the 12-month raw-answer purge; a user-chosen shorter auto-delete for interview answers (30/90 days) is P2. | MVP | S | D |
| SET-030 | Notification preferences per category; security notices cannot be disabled. | MVP | M | P |
| SET-031 | Appearance: light / dark / system. | MVP | S | D |
| SET-032 | Timezone and date format (default Asia/Karachi for PK). | MVP | S | P |
| SET-040 | Self-service DPA for organizations. | Later | W | P |

**Acceptance criteria**
- SET-010: *Given* a user with 2 resumes, 5 applications, 1 interview session, *When* they export, *Then* the ZIP has `data.json` with all record sets, the original files, and the JSON validates against the published schema.
- SET-012: *Given* a confirmed deletion, *When* the 7-day undo window has passed and the hard delete has run, *Then* no row in any table carries the user's id, no stored files remain, and `AiRequest` rows are deleted or anonymized; only a minimal abuse tombstone (hashed email, 90 days) may remain [?].
- SET-020: *Given* a new account, *Then* the model-improvement toggle is OFF and no "granted" `ConsentRecord` exists until the user acts.

**Edge cases**
- Export during a running parse: in-flight items excluded and stated.
- Delete with an active subscription (P2): cancel first or cancel automatically with confirmation.
- Re-register with a deleted email: new account; tombstone does not block.
- Forwarded export link: needs signed token plus authenticated session.

---

## 13. NTF - Notifications and transactional email

**Purpose:** Send the minimum useful, trustworthy emails (Resend) and in-app notifications.

| ID | Requirement | Phase | MoSCoW | Tag |
|---|---|---|---|---|
| NTF-001 | Transactional emails: verify, reset, email-change confirmation, new-device sign-in notice, export ready, account-deletion requested/completed. Cannot be disabled. | MVP | M | D |
| NTF-002 | Plain branded emails with text alternative; no tracking pixels on security emails; SPF/DKIM/DMARC configured. | MVP | M | P |
| NTF-003 | In-app notification center (backed by the `Notification` entity): reminders due, ghosting suggestions, parse/tailor/mock finished, limit warnings, system notices; mark read/clear. | MVP | M | P |
| NTF-004 | Reminder emails: follow-up reminders, interview in 24 h / 1 h, deadline in 2 days; per-category opt-out (SET-030); cap of 5 emails per user per day with batching. | MVP | M | D |
| NTF-005 | Opt-in weekly digest email (needs-attention list, ghosting suggestions and counts; merged with former DSH-031). | P2 | C | P |
| NTF-006 | **Inactivity warning before purge:** two emails, at -30 days and -7 days before the 24-month purge, stating what will be deleted, how to keep the account (log in), and how to export. Purge runs only after the -7 day warning has elapsed with no login. | MVP | M | D |
| NTF-007 | Notice before raw interview-answer purge (INT-051). | MVP | S | P |
| NTF-008 | Hard bounces disable non-essential email and show an in-app banner to correct the address. | MVP | S | P |
| NTF-009 | One-click unsubscribe and `List-Unsubscribe` header on all non-security emails. | MVP | M | P |
| NTF-010 | Web push (PWA) for reminders and interviews. | P2 | C | P |
| NTF-011 | Job-alert emails from the discovery agent. | Later | C | P |

**Acceptance criteria**
- NTF-006: *Given* an account 30 days from the 24-month purge, *When* the daily job runs, *Then* the first warning is sent and logged; *When* the user logs in later, *Then* the purge schedule is cleared.
- NTF-004: *Given* a reminder due 09:00 PKT and the user opted out of reminder emails, *Then* the in-app notification appears and no email is sent.

**Edge cases**
- Email provider outage: queued with retries (`BackgroundTask` queue); idempotency keys prevent duplicates.
- Timezone change after setting reminders: stored in UTC, shown in the new zone.
- Resend free-tier limits: batch digests and degrade gracefully; verify limits at setup [P].

---

## 14. ADM - Admin console (minimal)

**Purpose:** Let the founder operate the product safely without browsing private user content.

| ID | Requirement | Phase | MoSCoW | Tag |
|---|---|---|---|---|
| ADM-001 | Separate admin role; authentication requires TOTP; admin routes isolated and rate-limited. | MVP | M | P |
| ADM-002 | Users list: id, email (partly masked; full on click with logged reason), signup date, plan, status, verified, last active, usage counts. **No resume, job description, interview answer, or letter content is viewable by default.** | MVP | M | D |
| ADM-003 | Support view of a user's content only via a break-glass grant: user-consented, 30 minutes, audit-logged (`AuditLog`), with the user emailed; disabled by default (PRD §5b). | P2 | C | D |
| ADM-004 | Usage and AI cost dashboard: requests and tokens by task and model (from `AiRequest` metadata), cost per user/day/month, cache hit rate, p95 latency, failure/retry rates, cost per active user, alert thresholds. | MVP | M | D |
| ADM-005 | `FeatureFlag` management: boolean flags and percentage rollouts (`beta_mode`, invite-only signup, per-feature kill switches such as mock interview, model-routing flags); effective without deploy; audit-logged. | MVP | M | D |
| ADM-006 | Abuse blocks: block/unblock user, throttle AI usage, block email domain or IP range, rate-limit overrides; blocked users see a neutral message and can still export/delete their data. | MVP | M | D |
| ADM-007 | Quota tools: grant extra credits (reason required), reset a period, view `UsageLedger`. | MVP | S | P |
| ADM-008 | `AuditLog` viewer (admin actions, security events, consent changes, deletions) with filters; append-only. | MVP | M | D |
| ADM-009 | AI quality panel: eval-run results by prompt version, validator-drop rate per task, thumbs up/down on suggestions. | MVP | S | P |
| ADM-010 | Feedback inbox ("Report an issue"; no content attached unless the user adds it). | MVP | S | P |
| ADM-011 | Manual triggers for deletion/purge jobs and queue health view. | P2 | C | P |

**Acceptance criteria**
- ADM-002: *Given* an admin opens a user row, *Then* no `ResumeVersion`, `Job.rawText`, answer text, or letter text is returned by the admin API (API test).
- ADM-005: *Given* the mock-interview kill switch is off, *Then* new sessions are refused within 60 s with a maintenance message and in-flight sessions finish or pause gracefully.
- ADM-006: *Given* a blocked user, *Then* AI endpoints return the neutral message while export and delete still work.

**Edge cases**
- Admin lockout: break-glass recovery documented in 06.
- Admin viewing their own account: normal user path.
- Cost spike: per-user daily AI cap triggers automatically and alerts the admin.

---

## 15. FUT - Phase 2 and later (brief)

> Not built in MVP; listed so MVP data models do not block them. **Urdu or any non-English UI/output is not planned, permanently** [D].

| ID | Feature | Phase | Priority | Notes | Tag |
|---|---|---|---|---|---|
| FUT-001 | **Browser extension:** user-triggered capture of the current job page into `Job` (+ optional `Application`); no background scraping, no auto-apply. | P2 | S | Extension auth; JOB-013, TRK-054. | D |
| FUT-002 | **Voice mock interviews** (browser speech recognition/TTS; objective delivery metrics; no raw audio retained by default). | P2 | S | INT-019; separate consent. | D |
| FUT-003 | **Payments live** (Safepay PKR; USD via merchant of record). | P2 | M (for launch) | PLN-020 to PLN-022; open questions 2-4 in the index. | D |
| FUT-004 | **AI insights** on analytics. | P2 | S | DSH-030; data vs speculation. | D |
| FUT-005 | **Job discovery agent:** user-approved sources, extraction, dedupe, fit ranking; the user chooses what to save; human approval before anything external; no scraping of prohibited sources. | Later | C | SRD section 17; only after the core is stable. | D |
| FUT-006 | **Email sync** (consented, read-only Gmail/Outlook) proposing status changes. | Later | C | TRK-055; user confirmation always required. | D |
| FUT-007 | **Calendar sync** (two-way) for `InterviewRound`s. | Later | C | MVP ships ICS export only. | P |
| FUT-008 | Follow-up and thank-you drafts (grounded, copy-only). | P2 | C | TRK-043. | P |
| FUT-009 | Coding interview practice, salary insights, company research (user-provided facts only). | Later | C | SRD section 31. | P |
| FUT-010 | Career coach / university cohort accounts. | Later | W | Employer-side features stay out (EU AI Act high-risk). | D |
| FUT-011 | Fine-tuned in-house models for extraction/evaluation using consented, de-identified data. | Later | C | Governed by the 05 roadmap and SET-020/021. | D |
| FUT-012 | OCR (RES-014, P2 behind a flag), more templates (TLR-018), 2FA (AUTH-013). | P2 | C | | P |

---

## 16. Traceability: SRD section to requirement IDs

| SRD section | Topic | Requirement IDs |
|---|---|---|
| 3 | Product principles | X-001 to X-009, TLR-003/004, INT-017, SET-020 |
| 4.1 | Authentication | AUTH-001 to AUTH-014 |
| 4.2 | Candidate profile | PRO-001 to PRO-012 |
| 5 | Resume management (upload, view, set active, delete, download, analysis) | RES-001 to RES-057 (SRD is PDF-only; DOCX added by [D]; "active" resume = default `ResumeVersion`) |
| 6 | Job management | JOB-001 to JOB-015 |
| 7 | Job match engine | MAT-001 to MAT-007, MAT-030 to MAT-034 |
| 8 | Skill gap analysis + user corrections | MAT-003, MAT-004, MAT-020 to MAT-022, MAT-032, PRO-010 |
| 9 | Resume tailoring (+ future PDF/DOCX export, pulled into MVP) | TLR-001 to TLR-035 |
| 10 | Cover letter | CVL-001 to CVL-010 |
| 11 | Interview preparation | INT-001 to INT-005 |
| 12 | Mock interview | INT-010 to INT-052 |
| 13 | Application tracker (fields, statuses, history) | TRK-001 to TRK-025 (statuses follow the index; Technical/Final Interview become `InterviewRound` types) |
| 14 | Application dashboard | DSH-001 to DSH-003 |
| 15 | Kanban board | TRK-030 to TRK-034 |
| 16 | Application analytics (+ AI insights) | DSH-010 to DSH-031 |
| 17 | AI agent (future) | FUT-005 |
| 21 | API areas | Per module; see 04 |
| 22 | Security (user-visible parts) | AUTH-007, AUTH-010, RES-001/002, X-005, X-007, ADM-001/002 |
| 23-24 | AI engineering and guardrails | X-001 to X-003, TLR-003/004, CVL-003, INT-031/034, MAT-004; detail in 05 |
| 25 | UX requirements | X-003, X-004, DSH-002, TRK-031; detail in 03 |
| 27 | MVP Definition of Done | AUTH, PRO, RES, JOB, MAT, TLR, CVL, INT, TRK, DSH, SET end to end (index section 6) |
| 31 | Future features | FUT-001 to FUT-012, TRK-053 to TRK-056, NTF-010/011 |
| 32 | Non-goals for MVP | Honored: no auto-apply, scraping, voice, live payments (PLN-020 is P2), native apps, multi-agent |
| New (not in SRD) | PII linter, ParseHealth/Readability, FactBank, plans/usage, notifications, admin, privacy settings | RES-020 to RES-047, PRO-007 to PRO-009, PLN, NTF, ADM, SET |

## 17. MVP scope summary (for planning)

| Module | MVP Must | MVP Should/Could | P2+ |
|---|---|---|---|
| AUTH | 001-008, 010, 011 | 009, 012, 014 | 013 |
| PRO | 001-008, 012 | 009-011 | - |
| RES | 001, 002, 010-013, 020-023, 026, 027, 040-043, 050-053, 055, 057 | 003, 004, 015, 025, 044-046, 054, 056 | 014, 024, 047 |
| JOB | 001-008, 012 | 009-011, 014 | 013, 015 |
| MAT | 001-004, 006, 007, 020, 030, 034 | 005, 021, 022, 031-033 | - |
| TLR | 001-005, 007, 008, 010-016, 030-033 | 006, 017, 034 | 018, 019, 035 |
| CVL | 001-007 | 008, 009 | 010 |
| INT | 001-003, 010, 012-018, 030-036, 040, 050, 052 | 004, 011, 037, 051 | 005, 019, 020, 038, 039 |
| TRK | 001-005, 007, 010, 013, 020-024, 030-032, 034, 040, 050 | 006, 008, 009, 011, 012, 033, 041, 042, 044 | 043, 051-056 |
| DSH | 001, 002, 010, 011, 013, 014, 021, 022 | 003, 012, 015, 020 | 030, 031 (merged into NTF-005) |
| PLN | 001-006, 008, 009, 011 | 007, 010 | 020-023 |
| SET | 001, 010, 012, 020-022, 030 | 011, 013, 014, 023 (shorter auto-delete is P2), 031, 032 | 040 |
| NTF | 001-004, 006, 009 | 007, 008 | 005, 010, 011 |
| ADM | 001, 002, 004-006, 008 | 007, 009, 010 | 003, 011 |

## 18. Open questions raised by this section [?]

1. Should "Accept all" in the diff preview skip changes the user explicitly undid (TLR-012)? Proposed: yes.
2. Do cover letters share the tailor quota or have their own counter (CVL-008)? Proposed: own counter, same limit.
3. Per-`Application` market override for export: proposed Later.
4. Malware-scan provider for uploads at MVP (RES-002)? Proposed: strict type/size checks and sandboxed parsing first; scanning before paid launch.
5. Admin support view of user content (ADM-003): keep disabled until a lawyer reviews Terms.
