# 03 — UX Design

> Part of the [PRD](../PRD.md). Tags: **[D]** decided · **[P]** proposed (changeable) · **[?]** open. Glossary names (`ParseHealth`, `Readability`, `JobMatch`, `STRONG/PARTIAL/MISSING/UNKNOWN`, `PK_LOCAL/INTERNATIONAL`, application statuses) follow the PRD index. If this file contradicts the index, the index wins.

## 1. Design principles

| # | Principle | What it means in the UI |
|---|---|---|
| 1 | **Trust first** | Show evidence for every claim. Scores come with visible factors. Never invent. Privacy controls are one click away. |
| 2 | **Clarity over cleverness** | One primary action per screen. Plain English. Labels beat icons. |
| 3 | **Calm** | Neutral surfaces, one accent, generous whitespace, no confetti, no red walls. Problems are shown as a short prioritized list, not a wall of warnings. |
| 4 | **Honest AI labeling** | AI content is always marked and always editable. Scores are "estimates". Never "ATS score". No hiring-probability language. |
| 5 | **Low cognitive load** | Progressive disclosure: top 3 fixes first, "show all" second. Avoid generating text on every screen (SRD 25). Defaults are sensible. |
| 6 | **User in control** | Nothing is saved, sent, or applied without a click. Every change has undo. Destructive actions need confirmation. |
| 7 | **Fast to first value** | Upload to first score in under 2 minutes (see flow 4.1). Don't gate value behind long profile forms. |
| 8 | **Works where users are** | Mobile-first for tracking and interviews; desktop-optimized for resume editing. Low-bandwidth friendly. |

---

## 2. Design system [P]

Style target: calm professional SaaS (Linear/Notion) **[D]**, light + dark **[D]**, one accent color **[D]**. Built on Tailwind + shadcn/ui **[D]**. Tokens are CSS variables (shadcn convention) so theme switching is a class swap.

### 2.1 Color tokens

Accent is proposed as a restrained indigo-blue. Final brand color is tied to the brand name decision **[?]**.

| Token | Light | Dark | Use |
|---|---|---|---|
| `--background` | `#FFFFFF` | `#0E1013` | App canvas |
| `--surface` | `#F7F8FA` | `#15181D` | Sidebar, cards on canvas |
| `--surface-raised` | `#FFFFFF` | `#1B1F26` | Popovers, dialogs, sheets |
| `--border` | `#E4E7EC` | `#2A2F38` | Hairlines |
| `--foreground` | `#14171C` | `#ECEEF2` | Body text (contrast >= 15:1) |
| `--muted-foreground` | `#5B6472` | `#9AA3B2` | Secondary text (>= 4.5:1 on background) |
| `--accent` (primary) | `#3B55D9` | `#8FA3FF` | Primary buttons, links, focus ring |
| `--accent-foreground` | `#FFFFFF` | `#0E1013` | Text on accent |
| `--accent-soft` | `#EEF1FE` | `#1E2440` | Selected rows, AI-content tint |
| `--success` | `#1A7F4B` | `#4CC38A` | Saved, accepted, OFFER/ACCEPTED |
| `--warning` | `#9A5B00` | `#F0B35A` | Needs attention, limit nearly reached |
| `--danger` | `#C42B2B` | `#FF7B7B` | Errors, destructive actions |
| `--info` | `#0B6BA8` | `#6CB8EE` | Neutral notices, disclaimers |
| `--ai-tint` | `#F3F0FF` | `#231F3A` | Background of AI-generated blocks (with "AI" badge) |

Rules: text/background pairs >= 4.5:1 (3:1 for large text and UI boundaries). Status colors are always paired with an icon and a word. Dark mode is not a pure inversion: lower saturation, no pure black or pure white. Theme = system default with manual override in Settings (stored per user; `prefers-color-scheme` on first visit).

### 2.2 Score colors (colorblind-safe, never color alone)

Scores use a **blue-to-orange** sequence (safe for protan/deutan/tritan), never red-vs-green. Every score shows: number, band word, band icon shape, and a segmented bar with distinct fill patterns.

| Band | Range | Light / Dark color | Icon (shape) | Word | Bar pattern |
|---|---|---|---|---|---|
| Strong | 80–100 | `#0B5FA5` / `#6CB8EE` | filled circle-check | "Strong" | solid |
| Good | 60–79 | `#2B7A8C` / `#6FC3D2` | circle-dot | "Good" | solid, 80% opacity |
| Needs work | 40–59 | `#B26A00` / `#F0B35A` | triangle | "Needs work" | diagonal stripes |
| Low | 0–39 | `#B4410F` / `#FF9A6B` | diamond-alert | "Low" | dense dots |

Requirement classes use the same logic: `STRONG` (blue, check), `PARTIAL` (teal-amber, half-circle), `MISSING` (orange, dash-in-diamond), `UNKNOWN` (gray, question mark). Band boundaries are display-only; the numeric score and its factors come from code (see 05).

### 2.3 Typography

| Role | Font | Notes |
|---|---|---|
| UI + body | **Inter** (Google Fonts, variable, `display=swap`, subset latin) | Self-hosted via `next/font` to avoid third-party requests and layout shift |
| Mono (IDs, diffs, JSON) | **JetBrains Mono** (only where needed, lazy) | |
| Resume preview/export | Per-template: Inter, Source Serif 4, Calibri-compatible fallbacks | ATS-safe fonts only in exports |

| Token | Size / line-height | Weight | Use |
|---|---|---|---|
| `display` | 30/36 | 600 | Page hero numbers (score) |
| `h1` | 24/32 | 600 | Page title |
| `h2` | 18/28 | 600 | Section |
| `h3` | 16/24 | 600 | Card title |
| `body` | 15/24 (14/22 on dense tables) | 400 | Default |
| `small` | 13/20 | 400/500 | Metadata, helper text |
| `caption` | 12/16 | 500 | Badges, chips (never below 12px) |

Body text on mobile is >= 16px in inputs to prevent iOS zoom. Respect user font-size settings (use `rem`).

### 2.4 Spacing, radius, elevation, layout

| Item | Value |
|---|---|
| Spacing scale | 4px base: 4, 8, 12, 16, 24, 32, 48, 64 (Tailwind default) |
| Page gutters | 16px mobile, 24px tablet, 32px desktop. Content max-width 1200px; resume editor full-width |
| Radius | `sm` 6px (inputs, chips), `md` 8px (buttons, cards), `lg` 12px (dialogs, sheets), `full` (avatars, pills) |
| Elevation | Flat by default: 1px borders, not shadows. Shadow only for popover/dialog/drag: `0 8px 24px rgb(0 0 0 / .12)` light; dark uses a lighter border instead of a shadow |
| Breakpoints | `sm` 640, `md` 768, `lg` 1024, `xl` 1280. Mobile-first |
| Touch targets | >= 44x44 CSS px on mobile (WCAG 2.2 AA minimum is 24; we exceed it) |
| Density | Comfortable default; "compact" toggle for tracker/table views (post-MVP) |

### 2.5 Iconography
**lucide-react** only, 1.5px stroke, 16/20px. Icons never carry meaning alone; pair with a label or `aria-label`. Domain icons: `file-text` (resume), `briefcase` (job), `target` (match), `mic` is **not** used in MVP (voice is phase 2), `message-square` (interview), `kanban`, `sparkles` reserved **only** for AI-generated content marker.

### 2.6 Motion rules
- Purposeful only: state change, progress, spatial continuity. 120–200ms ease-out; max 300ms.
- No auto-playing animation, parallax, confetti, or count-up numbers on scores (scores appear instantly; the bar may fill once in 300ms).
- Streaming text appears token-by-token but is allowed to be skipped ("Show full").
- `prefers-reduced-motion`: disable all transforms/fades except opacity swaps under 100ms; replace skeleton shimmer with static placeholder.
- Skeletons for loading lists/cards (same layout as final content to avoid CLS).

### 2.7 shadcn/ui component inventory

| Group | Components |
|---|---|
| Layout/nav | `sidebar`, `sheet` (mobile drawer, filters), `tabs`, `breadcrumb`, `separator`, `scroll-area`, `resizable` (editor panes), custom `bottom-nav` |
| Input | `button`, `input`, `textarea`, `select`, `combobox` (command), `checkbox`, `radio-group`, `switch`, `slider` (difficulty), `calendar` + `popover` (dates), `form` (react-hook-form + Zod), `toggle-group` (target market) |
| Feedback | `toast` (sonner), `alert`, `alert-dialog` (destructive confirm), `dialog`, `progress`, `skeleton`, `tooltip`, `badge`, `empty-state` (custom) |
| Data | `table`, `card`, `accordion`, `collapsible`, `dropdown-menu`, `context-menu`, `data-table` (TanStack), `chart` (Recharts, dashboard only) |
| Domain (custom, built on the above) | `ScoreRing`, `ScoreBar`, `FactorList`, `RequirementRow`, `EvidenceChip`, `QuestionChip`, `AiBadge`, `DiffView` (+`ChangeCard`), `KanbanBoard` (dnd-kit), `StatusPill`, `StepProgress`, `UsageMeter`, `ChatBubble`, `RubricCard`, `Disclaimer` |

Drag and drop: **dnd-kit** (keyboard + touch sensors built in).

---

## 3. Information architecture

### 3.1 Primary navigation [D: items from brief; P: order]

| Item | Purpose | Notes |
|---|---|---|
| Dashboard | Next best action, pipeline stats, upcoming interviews | Landing after login |
| Resumes | Uploads, versions, analysis, tailor, export | "Resume" in SRD; plural because of versions |
| Jobs | Saved jobs, match results, requirements | |
| Applications | Kanban + list, rounds, notes, follow-ups | |
| Interviews | Mock sessions, reports, history | Practice only |
| Profile | Facts, skills, experience, education, projects, fact bank | Evidence source for AI |
| Settings | Account, target market, theme, plan and usage, privacy, export/delete | |

SRD's "Analytics" is folded into Dashboard for MVP (no separate nav item) **[P]**.

### 3.2 Layout shells
- **Desktop (>= 1024):** left sidebar (240px, collapsible to 64px icons), top bar with page title, global "Add job" button, usage meter, avatar menu.
- **Tablet (768–1023):** collapsed icon sidebar.
- **Mobile (< 768):** bottom nav with 5 slots: **Home** (Dashboard), **Jobs**, **Applications**, **Interviews**, **More** (Resumes, Profile, Settings in a sheet). Floating "+" on Jobs and Applications. Resume editing on mobile is read/review plus light text edits; full editing is encouraged on desktop (a gentle note, not a block) **[P]**.

### 3.3 Sitemap and routes

```
/                          Marketing landing (public)
/pricing, /legal/*         Public (terms, privacy, ai-disclaimer, cookies)
/login /register /verify-email /forgot-password /reset-password
/onboarding                Market -> upload -> first score
/app                       (authenticated shell)
 ├─ /app/dashboard
 ├─ /app/resumes                       list + upload
 │   ├─ /app/resumes/[id]              version overview
 │   ├─ /app/resumes/[id]/analysis     ParseHealth + Readability
 │   ├─ /app/resumes/[id]/edit         editor (Path B)
 │   └─ /app/resumes/[id]/versions     history, compare
 ├─ /app/jobs                          list + filters
 │   ├─ /app/jobs/new                  paste JD / URL / source
 │   ├─ /app/jobs/[id]                 job detail + requirements
 │   ├─ /app/jobs/[id]/match           JobMatch
 │   ├─ /app/jobs/[id]/tailor          choose path A or B
 │   ├─ /app/jobs/[id]/tailor/preview  diff preview (A) and download
 │   ├─ /app/jobs/[id]/suggestions     list (B)
 │   └─ /app/jobs/[id]/cover-letter
 ├─ /app/applications                  kanban / list toggle
 │   └─ /app/applications/[id]         detail: timeline, rounds, notes, contacts, resume sent
 ├─ /app/interviews                    history + start
 │   ├─ /app/interviews/new            configure
 │   ├─ /app/interviews/[id]           live session
 │   └─ /app/interviews/[id]/report
 ├─ /app/profile                       (tabs: Overview, Experience, Education, Skills, Projects, Fact bank)
 └─ /app/settings                      (account, preferences, plan, privacy, data)
/admin                                  Minimal admin (role-gated)
```

---

## 4. Key flows

Legend: **U** user, **S** system. Time targets are for the happy path.

### 4.1 Onboarding: first score in under 2 minutes [D target]
1. U lands on `/register`; signs up with email/password or Google. S sends verification email (non-blocking: user can continue while unverified, with limited actions until verified **[P]**).
2. S shows `/onboarding` step 1 of 3: **"Where are you applying?"** Two large cards: *Pakistan (local jobs)* = `PK_LOCAL`, *International / remote* = `INTERNATIONAL`. One sentence each on what changes (e.g. "We'll allow a photo and personal details, with a warning" vs "We'll keep your resume to international norms"). Changeable later. Default none; Continue disabled until chosen.
3. Step 2 of 3: **Upload resume** (drag/drop, file picker, camera/files on mobile). PDF or DOCX, max 5 MB and 6 pages (warn above 2.5 MB; PRD §5b) **[P]**. Skip link: "Start without a resume" (goes to Profile) **[P]**. Privacy line under the dropzone: "We read your resume to analyze it. You can delete it anytime."
4. S: upload progress, then **AI-progress** checklist: "Reading your file" -> "Finding sections" -> "Checking how machines read it" -> "Checking how easy it is to scan". Deterministic checks land first (seconds); AI notes stream afterward.
5. Step 3 of 3: **Your first results.** `ParseHealth` and `Readability` estimates with top 3 fixes. Prompt: "Review what we found" (parsed sections shown for correction: low-confidence fields highlighted).
6. Primary CTA: **"Add a job to see how you match"**; secondary: "Go to dashboard". Onboarding is marked complete; profile is seeded from the parsed resume (user confirms facts later).
- Failure paths: unreadable/scanned PDF -> the scanned-PDF message "This file looks like a scan. Export a text PDF or upload DOCX" + options (upload DOCX / try another PDF). OCR is P2 behind a flag, not in MVP (PRD §3). Password-protected -> ask for unprotected file. Over 5 MB or 6 pages -> rejected with the limit; above 2.5 MB -> warning (PRD §5b). Limit reached -> show plan state.

### 4.2 Resume analysis
1. U opens a resume (`/analysis`) or uploads a new one.
2. S shows `ParseHealth` and `Readability` side by side, each with factor breakdown (collapsed after top 3).
3. U taps a fix -> deep-links to the exact line in the editor, or "Fix automatically" for deterministic ones (e.g. remove table layout in export). AI notes (impact wording, vague bullets) are marked AI.
4. U edits -> S re-scores deterministic parts instantly (client/server), AI notes on demand ("Re-check").
5. Market banner: for `PK_LOCAL` shows photo/DOB/father's-name guidance as a warning-level note, never an error; **CNIC is always flagged and never exported**.

### 4.3 Add job -> match
1. U taps **Add job** (global). Dialog/page: paste job description (required), job URL (optional, stored as a link only; we never scrape **[D]**), source picker (`LINKEDIN`, `ROZEE_PK`, ... plus free text), company, title (prefilled by AI extraction, editable).
2. S extracts requirements (Haiku) with progress: "Reading the job" -> "Finding requirements". Shows editable requirements list (user can delete/add/mark must-have vs nice-to-have).
3. U picks which resume version to match (defaults to latest) and taps **Check my match**.
4. S computes `JobMatch` in code; shows score estimate, factor breakdown, requirement table with `STRONG/PARTIAL/MISSING/UNKNOWN` and evidence per row.
5. U can correct a row: confirm / reject / mark "learning" / **add evidence** (free text that becomes a `FactBankItem` candidate). Score updates immediately.
6. CTA: **Improve my resume for this job** (flow 4.4) or **Save job** only.

### 4.4 Path A: improved resume (preview -> diff -> download) [D]
1. From match: **Download improved resume**. Choose template (ATS-safe list) and output format default (PDF; DOCX alternative).
2. S generates changes with streaming progress ("Finding where your experience fits this job", "Rewriting bullets using only what's in your resume"). Missing metrics become **question chips**, not made-up numbers.
3. S shows **Diff Preview** (screen 5.5): each change is a card with before/after, reason, evidence chip, and **Accept / Reject / Edit**. Default state of each change = accepted-pending (highlighted) so "Accept all" is one tap, but nothing is final until the user clicks **Create version**.
4. U resolves questions inline (answer -> bullet regenerates with the user's number; "Skip" leaves the original line).
5. U taps **Create version & download**: S creates new `ResumeVersion` (named e.g. "Tailored: Acme - Backend Engineer"), renders PDF/DOCX, runs `ParseHealth` on the output, shows result and download buttons. Undo remains available until linked to an application, after which the version is immutable and further edits create a new version.
6. Prompt: "Track this application" -> pre-fills create-application with this version.

### 4.5 Path B: suggestions [D]
1. From match: **Get suggestions only**. S lists prioritized `Suggestion`s grouped by section (Summary, Experience, Skills, Projects), each with severity, reason, evidence chip.
2. U opens the editor (split view: resume left, suggestions right on desktop; stacked on mobile). Each suggestion: **Apply to my resume** (inserts into editor, undoable), **Copy**, **Dismiss**, **Ask for another version** (regenerate).
3. Users who edit in their own file can **Export suggestions** (copy all, or a checklist PDF) **[P]**.

### 4.6 Mock interview session and report [D]
1. U goes **Interviews -> Start practice**. Config screen: linked job (optional, recommended) or role/free text, resume version, type (HR, technical, behavioral, mixed), length (5/10/15 questions), difficulty (Easy/Standard/Hard), recruiter persona (Friendly recruiter / Hiring manager / Technical panel / Tough but fair), optional soft timer (default 120 s). 15 questions is PRO/SPRINT only. The **practice-only notice** shows here (see 6.9).
2. S generates the question set (progress: "Preparing questions based on your resume and the job"). Session starts; one question at a time.
3. U types an answer (autosave draft; character counter soft-limit 3,000), submits. S may ask up to 2 **adaptive follow-ups** per question (session cap 3/6/8, PRD §5b). U can **Skip**, **Pause** (resume later), or **End early**.
4. After the last question S shows "Building your report" (AI-progress; typically 10–30s; user may leave and be notified).
5. Report (screen 5.6): overall estimate, rubric per question with evidence quotes, strengths, improvements, model answers built from the user's resume. U can **Retry this question** (new answer, compare), **Save a model answer to notes**.
6. Raw answers and evidence quotes are deleted after 12 months (PRD §5b); scores and the report summary persist.

### 4.7 Create application and Kanban move [D]
1. From a job or **+ New application**: job (existing or quick-add), `Application` status (default `SAVED`; `APPLIED` if user marks applied now with date), source (prefilled from the job), **resume version used** (required to move to `APPLIED`; picks exact `ResumeVersion`), cover letter used (optional), salary, deadline, notes.
2. On first link to a version, S shows a one-line note: "This resume version is now locked to this application. Edits will create a new version." (explains immutability).
3. On Kanban, U drags a card to a new column (or uses the **Move to...** menu on touch/keyboard). S writes `ApplicationStatusHistory`. Moves to `INTERVIEWING` prompt "Add a round?" (adds `InterviewRound`: type, date, interviewer). Moves to `REJECTED`/`WITHDRAWN`/`GHOSTED` ask an optional reason and offer "Add a note". Undo toast for 8 seconds on every move.
4. `OFFER` offers "Practice a negotiation conversation" **[?]** (post-MVP idea; not built in MVP).

### 4.8 Data export / delete [D]
1. **Settings -> Privacy & data.** Sections: What we store (plain-English list), AI use and training consent (default off), Export, Delete.
2. **Export:** "Download my data" -> S queues job, emails a link when ready (or in-app download). ZIP: JSON + original files + exported resumes. Shows expected time.
3. **Delete resume/interview/job:** item-level delete from its page, with `alert-dialog` stating what is removed and that linked applications keep a "resume deleted" placeholder.
4. **Delete account:** requires re-authentication (password or Google), type `DELETE`, explains the 7-day undo window **[D]**, then hard delete (backups expire within 30 days after that). Confirmation email. A "Cancel deletion" link (or simply logging in) works during the 7-day undo window.
5. Inactivity warning email at month 23 ahead of the 24-month purge.

---

## 5. Screen specs

Common states for every data screen: **Empty** (what this is + one primary action), **Loading** (skeleton matching layout), **AI-progress** (named steps, estimated time, cancel/leave-and-notify), **Error** (what happened, what to do, retry; never a raw error), **Limit reached** (usage meter, what resets when, "Upgrade" shown only when billing is live; during free beta "You've hit today's beta limit, resets {date}").

Screen list: 5.1 Dashboard, 5.2 Resume Analysis, 5.3 Job Add, 5.4 Job Match, 5.5 Tailor Diff Preview, 5.6 Mock Interview (live), 5.7 Interview Report, 5.8 Kanban, then 5.9–5.14 in compact form.

### 5.1 Dashboard
**Purpose:** answer "what should I do next?" and show progress at a glance.

```
Desktop
┌────────┬──────────────────────────────────────────────────────────────┐
│ Logo   │ Dashboard                          [+ Add job]  (usage) (av) │
│        ├──────────────────────────────────────────────────────────────┤
│ ▣ Dash │ ┌─ Next best action ─────────────────────────────────────┐   │
│ ▢ Resu │ │ ✦ Add a job to see how you match.        [Add a job]   │   │
│ ▢ Jobs │ └────────────────────────────────────────────────────────┘   │
│ ▢ Appl │ ┌ Applied ┐ ┌ In progress ┐ ┌ Interviews ┐ ┌ Offers ┐       │
│ ▢ Intv │ │   12    │ │      5      │ │     2      │ │   1    │       │
│ ▢ Prof │ └─────────┘ └─────────────┘ └────────────┘ └────────┘       │
│ ▢ Sett │ ┌─ Upcoming ───────────────┐ ┌─ Resume health ────────────┐  │
│        │ │ Thu 10:00 Acme · Technical│ │ ParseHealth  92 ● Strong  │  │
│        │ │ Follow up: Beta Ltd (3d)  │ │ Readability  71 ◐ Good    │  │
│        │ └──────────────────────────┘ │ [Open analysis]            │  │
│        │ ┌─ Pipeline (by status) ───┐ └────────────────────────────┘  │
│        │ │ ▮▮▮▮▮ SAVED  ▮▮▮ APPLIED..│ ┌─ Sources: what's working ──┐  │
│        │ └──────────────────────────┘ │ ROZEE_PK 6 · LINKEDIN 4    │  │
│        │                              └────────────────────────────┘  │
└────────┴──────────────────────────────────────────────────────────────┘
```
**Components:** `Card`, stat tiles, `UsageMeter`, list of upcoming rounds/follow-ups, source breakdown (bar, text labels), next-best-action card (rule-based, not LLM).
**States:** Empty (new user): single hero "Upload your resume" or "Add your first job" checklist (3 steps with progress). Loading: tile skeletons. Error: per-card retry. Limit: usage meter turns warning.
**Mobile:** single column; stat tiles as 2x2 grid; next-best-action first; bottom nav. Source stats require >= 5 applications before showing (avoid misleading tiny samples); shown as "n=" counts, no causal claims.

### 5.2 Resume Analysis
**Purpose:** show `ParseHealth` and `Readability` estimates with prioritized, fixable issues.

```
┌ Resume: Ali_Khan_CV.pdf  (v3)  [Tailor for a job] [Edit] [Download] ┐
├──────────────────────────────────────────────────────────────────────┤
│ ┌─ ParseHealth (estimate) ──┐ ┌─ Readability (estimate) ──────────┐  │
│ │ 92 ● Strong   ▓▓▓▓▓▓▓▓▓░  │ │ 71 ◐ Good   ▓▓▓▓▓▓▓░░░            │  │
│ │ Machines can read this    │ │ Mostly easy to scan in ~7 sec     │  │
│ │ Based on 8 checks ▸       │ │ Based on 6 checks ▸  ✦ AI notes   │  │
│ └───────────────────────────┘ └───────────────────────────────────┘  │
│ Top fixes (3 of 7)                                   [Show all]      │
│ ▲ Skills section is in a table; some readers may skip it  [Fix]      │
│ ◆ 4 bullets have no numbers or results     [Review bullets]          │
│ ● Contact details found: email, phone                                │
├────────────────────────────┬─────────────────────────────────────────┤
│ How we read your resume    │ Preview (what a parser sees)            │
│ Summary ✓  Experience ✓    │  Name: Ali Khan                         │
│ Education ✓  Skills ⚠ low  │  Experience: 3 roles ...  [Correct ▸]   │
│ confidence                 │                                         │
├────────────────────────────┴─────────────────────────────────────────┤
│ ⓘ Estimates, not guarantees. Employers use many different systems.   │
└──────────────────────────────────────────────────────────────────────┘
```
**Components:** `ScoreRing`/`ScoreBar`, `FactorList`, fix rows with severity icon, parsed-sections panel with confidence markers, `AiBadge` on AI notes, `Disclaimer`.
**States:** Empty (no resume): upload dropzone. Loading: skeleton + step progress. AI-progress: deterministic first, "AI notes are still loading" inline. Error: parse failure with alternatives. Limit: "3 of 3 analyses used this month".
**Mobile:** scores stack; factor lists become accordions; parsed preview behind a tab; fixes open the editor in a full-screen sheet.

### 5.3 Add Job
**Purpose:** capture a job fast. Form (single column, max-width 640): JD textarea (large, paste-first), URL, source (`Select` + free text), company, title, location, deadline, "Remember this resume version" select. AI extraction preview appears under the textarea after paste.
**States:** Empty form; AI-progress "Reading the job"; error "We couldn't find requirements. Paste more of the description." Limit: none (tracking is unlimited).
**Mobile:** paste is the first field; URL/source collapsed under "More details". Share-target (PWA) so users can share a job link/text from other apps into the app **[P]**.

### 5.4 Job Match

```
┌ Backend Engineer · Acme   Source: ROZEE_PK   Resume: v3 ▾  [Re-check] ┐
├───────────────────────────────────────────────────────────────────────┤
│ ┌─ JobMatch (estimate) ──────────┐  Why this score                     │
│ │      68  ◐ Good                │  Required skills      ▓▓▓▓▓▓░░ 62%  │
│ │  Not a hiring prediction       │  Experience level     ▓▓▓▓▓▓▓░ 75%  │
│ └────────────────────────────────┘  Keywords in context  ▓▓▓▓▓░░░ 55%  │
│                                     Education/other     ▓▓▓▓▓▓▓▓ 90%  │
├───────────────────────────────────────────────────────────────────────┤
│ Requirements (14)   Filter: [All ▾]  [Must-have ▾]                    │
│ ● STRONG   Python, 3+ yrs   “Backend Dev, Beta Ltd (2021–24)” [chip]  │
│ ◐ PARTIAL  AWS             Mentioned in 1 project; no depth  [Add ▸]  │
│ ◆ MISSING  Kubernetes      Not found in your profile  [I have this]   │
│                                              [Learning] [Reject]      │
│ ? UNKNOWN  “Fast-paced env.” We can't measure this                    │
├───────────────────────────────────────────────────────────────────────┤
│ [Improve my resume for this job]   [Save job]   [Practice interview]  │
│ ⓘ Estimate based on your resume vs. this description. Not a prediction│
└───────────────────────────────────────────────────────────────────────┘
```
**Components:** `ScoreRing`, `FactorList`, `RequirementRow` with class badge + `EvidenceChip` + override menu, filters, CTA group.
**States:** Loading skeleton; AI-progress only for explanations (the number is instant); error; limit (match checks count against analyses if applicable **[?]**).
**Mobile:** score on top, factors collapsed, requirement rows as cards with swipe-free override menu (`...`); sticky bottom CTA "Improve my resume".

### 5.5 Tailor Diff Preview (Path A)

```
┌ Tailor for Backend Engineer · Acme      4 of 9 changes accepted ──────┐
│ [Accept all] [Reject all]    View: (•) Side-by-side ( ) Inline        │
├───────────────────────────────────┬───────────────────────────────────┤
│ ORIGINAL                          │ IMPROVED                          │
│ Experience · Beta Ltd             │                                   │
│ - Worked on APIs for the app      │ + ✦ Built REST APIs in Python     │
│                                   │   serving the mobile app          │
│                                   │   Why: matches “REST APIs” (JD)   │
│                                   │   From: Experience at Beta Ltd    │
│                                   │   [Accept] [Reject] [Edit] [↻]    │
│                                   │ ❓ How many users did it serve?   │
│                                   │   [ 50,000        ] [Add] [Skip]  │
│ Skills                            │ + Python, REST, PostgreSQL        │
│ - Python, SQL                     │   (no new skills added — only     │
│                                   │    reordered)                     │
├───────────────────────────────────┴───────────────────────────────────┤
│ Template: Clean ▾  Format: PDF ▾   [Preview full page]                │
│ ⚠ AI-assisted: review every line before you send it.                  │
│            [Cancel]                [Create version & download]        │
└───────────────────────────────────────────────────────────────────────┘
```
**Components:** `DiffView` with `ChangeCard`, `EvidenceChip`, `QuestionChip`, `AiBadge`, undo toast, template/format selects, `Disclaimer`.
**Rules:** removed text red-tinted **with strikethrough**, added text blue-tinted **with underline/plus sign** (not color alone). Changes that add any claim without evidence are impossible; they appear only as question chips. Keyboard: `j/k` move between changes, `a` accept, `r` reject, `e` edit, `z` undo **[P]**.
**States:** AI-progress (streaming change cards appear as they finish); error with partial results kept; limit ("You've used your 3 tailored versions this month").
**Mobile:** inline (not side-by-side) view only; each change is a card; sticky bar with progress and "Create version". Download happens via share sheet/file save.

### 5.6 Mock Interview (live session)

```
┌ Mock interview · Backend Engineer · Question 3 of 10 ▓▓▓░░░░░░░ ────┐
│ ⓘ Practice only — not for use during real interviews.   [Pause][End]│
├─────────────────────────────────────────────────────────────────────┤
│  ┌──────────────────────────────────────────────────────────────┐   │
│  │ ✦ Interviewer (AI)                                           │   │
│  │ Tell me about a time you improved the performance of a       │   │
│  │ system you owned.                       Type: Behavioral     │   │
│  └──────────────────────────────────────────────────────────────┘   │
│                       ┌──────────────────────────────────────────┐  │
│                       │ You: At Beta Ltd I noticed our API...    │  │
│                       └──────────────────────────────────────────┘  │
│  ┌──────────────────────────────────────────────────────────────┐   │
│  │ ✦ Follow-up: What was the measurable result?                 │   │
│  └──────────────────────────────────────────────────────────────┘   │
│  ┌──────────────────────────────────────────────────────────────┐   │
│  │ Your answer…                                    1,204 / 2,000 │   │
│  └──────────────────────────────────────────────────────────────┘   │
│  Tip: Situation → Action → Result.        [Skip]       [Submit ▸]   │
└─────────────────────────────────────────────────────────────────────┘
```
**Components:** `ChatBubble` (AI bubbles carry `AiBadge`), `StepProgress`, autosaving `textarea`, hint toggle, pause/end controls.
**States:** AI-progress "Interviewer is reading your answer" (typing indicator, max ~10s then retry); error keeps the typed draft; draft saved locally and on server; limit reached blocks start not an in-progress session.
**Mobile:** full-screen focus mode, no nav bar during session, answer box pinned above keyboard, notice collapsed to an info icon after first view. Text only in MVP; microphone UI absent.

### 5.7 Interview Report

```
┌ Report · Backend Engineer · 10 questions · 18 min ───────────────────┐
│ Overall (estimate)  74  ◐ Good        ✦ AI-generated evaluation      │
│ Strengths: clear structure · relevant examples                       │
│ Work on:   quantify results · shorter openings                       │
├─────────────────────────────────────────────────────────────────────┤
│ Rubric (avg)  Relevance ▓▓▓▓▓▓▓▓░ 4/5   Structure ▓▓▓▓▓▓░░░ 3/5      │
│               Specificity ▓▓▓░░ 2/5     Impact  ▓▓▓▓░ 3/5            │
├─────────────────────────────────────────────────────────────────────┤
│ Q3 “Tell me about a time you improved performance…”     Score 3/5   │
│  Your answer:  “…we fixed the slow queries” ← quote used as evidence │
│  Why this score: No result was stated.                               │
│  Model answer (built from your resume) ✦   [Copy] [Edit in notes]    │
│   “At Beta Ltd I reduced … [❓ add your number: ____ ]”              │
│  [Retry this question]                                               │
│ ▸ Q4 …   ▸ Q5 …                                                      │
├─────────────────────────────────────────────────────────────────────┤
│ [Practice again]  [Delete this session]    ⓘ Practice feedback only. │
└─────────────────────────────────────────────────────────────────────┘
```
**Components:** `RubricCard`, `ScoreBar`, accordion per question, `EvidenceChip` that highlights the quoted answer text, `QuestionChip` inside model answers (placeholders, never invented numbers), retry flow.
**States:** report-building progress with "notify me"; partial report if some evaluations fail (with retry per question); error; empty history list ("No practice sessions yet").
**Mobile:** accordions collapsed by default; rubric as 2x2; retry opens full-screen answer box.

### 5.8 Kanban (Applications)

```
┌ Applications   [Board | List]   Filter ▾  Source ▾   [+ New] ────────┐
├────────┬─────────┬───────────┬───────────┬────────────┬──────────────┤
│SAVED 4 │APPLIED 6│SCREENING 2│ASSESSMENT │INTERVIEWING│ OFFER 1 ...  │
│┌──────┐│┌───────┐│┌─────────┐│           │┌──────────┐│┌────────────┐│
││Acme  │││Beta   │││Gamma    ││           ││Delta     │││Epsilon     ││
││BE Eng│││Data An│││QA Lead  ││           ││Round 2 Th││││OFFER       ││
││ROZEE │││LINKEDI│││v3 · 5d  ││           ││10:00 ⚑   │││v4          ││
│└──────┘│└───────┘│└─────────┘│           │└──────────┘│└────────────┘│
└────────┴─────────┴───────────┴───────────┴────────────┴──────────────┘
 Terminal: REJECTED · WITHDRAWN · GHOSTED shown in a collapsible "Closed" row/lane
 Card: company, role, source, resume version, days in stage, next date, follow-up flag
 ⋮ menu on every card: Move to…, Open, Add note, Add round, Copy link
```
**Components:** `KanbanBoard` (dnd-kit; pointer, touch, keyboard sensors), `StatusPill`, card with `...` menu, list/table toggle, filters sheet.
**States:** Empty: "Your pipeline is empty. Add the first job you're applying to." with Add button. Loading: column skeletons. Error: retry + offline banner (offline the tracker is read-only in MVP; the edit queue is P2, see 9). Limit: none (unlimited tracking).
**Mobile:** board becomes a **stage selector** (horizontally scrollable status chips with counts, one column shown at a time); drag replaced by **Move to...** bottom sheet (also works on desktop keyboard). Long-press-drag is optional enhancement, not the only method.

### 5.9 Application Detail
Header (company, role, `StatusPill` with change menu), timeline from `ApplicationStatusHistory`, rounds (`InterviewRound`: type, date, notes, "Practice for this round" -> pre-configured mock), the **exact resume version sent** (read-only, link to view/download), cover letter, contacts, notes, follow-up reminder. Empty sections show one-line prompts. Mobile: tabs (Overview, Timeline, Rounds, Notes).

### 5.10 Resume Editor (Path B)
Desktop: three panes (section outline | editor | suggestions/preview), `resizable`. Rich-text limited to plain bullets, bold, links (ATS-safe). Autosave drafts, version label, undo/redo, "Compare to previous version". Mobile: outline as sheet, editor full-width, suggestions in a bottom sheet; banner "Editing is easier on a larger screen" (dismissible).

### 5.11 Profile / Fact Bank
Tabs: Overview, Experience, Education, Skills, Projects, Fact bank. Fact bank lists user-confirmed facts and metrics (`FactBankItem`) with source ("added from tailoring question on {date}"). These are the only evidence AI may cite beyond the resume. Inline edit, delete, "Used in N suggestions". Empty: "Facts you confirm here help us write accurate suggestions."

### 5.12 Cover Letter
Inputs: job, resume version, tone (Professional / Friendly / Concise), optional notes. Output in an editable rich-text area with `AiBadge`, evidence chips for claims, question chips for gaps, **Regenerate** (with optional instruction), Copy, Download PDF/DOCX. Limit state shows monthly usage. Mobile: output first, controls in a sheet.

### 5.13 Settings
Sections (left list desktop; list -> detail on mobile): Account (email, password, Google link), Preferences (target market `PK_LOCAL`/`INTERNATIONAL`, theme, notification emails), Plan & usage (current `FREE`/beta limits, `UsageMeter`, history), AI & privacy (training consent off by default, what's sent to AI, PII masking explainer), Data (export, delete), Sessions (active devices, sign out everywhere).

### 5.14 Auth screens
Login, register, forgot/reset, verify. Single card, email/password + "Continue with Google". Password rules shown inline (length-based guidance, no arbitrary complexity theater), show/hide toggle, `autocomplete` attributes, paste allowed, generic errors for enumeration safety ("Email or password is incorrect"), rate-limit message with retry time. Legal links in footer; consent checkbox for Terms/Privacy on register (consent recorded in `ConsentRecord`).

---

## 6. AI UX patterns

### 6.1 Labeling AI content
- Every AI-generated block carries an `AiBadge` (sparkles icon + "AI" text) and sits on `--ai-tint`. Deterministic results (ParseHealth checks, JobMatch numbers) are **not** badged as AI: they get a "Calculated from your resume" caption instead, to keep the distinction honest.
- Badge tooltip: "Written by AI from your resume. Check it before you use it."
- Exports contain no AI watermark (the user owns the document); the app labels only inside the app.

### 6.2 Evidence chips
Chip format: `from: Experience at Beta Ltd` (tap to jump to and highlight the source line in the resume/fact bank). Rules: every rewritten bullet and model answer has >= 1 chip; no chip = it must be a question chip or the change is blocked by guardrails (05). On mobile, chips truncate to `Beta Ltd ▸` and open a sheet showing the source text.

### 6.3 Question-to-you chips
When a strong bullet needs a fact we don't have (numbers, scope, tools), the UI shows an amber-outlined chip: `? How many users? [Add number]`. Inline input; answering creates a `FactBankItem` (with confirmation "Save to my profile?" default on) and regenerates only that bullet. "Skip" keeps the original wording. We never fill placeholder numbers like "X%" into exports; unresolved placeholders block export of that line with a clear message.

### 6.4 Accept / reject / undo / regenerate
| Action | Behavior |
|---|---|
| Accept | Marks change accepted; no destructive effect until "Create version" |
| Reject | Reverts to original text for that change |
| Edit | Inline edit; edited text is user-authored (badge removed after edit) |
| Undo | 8s toast + `Ctrl/Cmd+Z` history per session; unlimited undo until version is created |
| Regenerate | Per item (↻), optional instruction field ("shorter", "more formal"); shows remaining quota; previous result kept as "Previous" for 1 step |
| Compare | Hold "Show original" |

### 6.5 Streaming and progress
- Streaming for long text (cover letters, reports, follow-ups) with a stop button. Structured results (diff cards, requirements) stream **per completed item**, never half-rendered JSON.
- Progress is **named steps** with real state (not fake bars). After 10s show "Still working... you can leave; we'll notify you". Hard timeout at 90s -> error with retry and no quota charged.
- Failed AI calls never consume quota **[P]**.

### 6.6 Confidence and estimate language
| Do | Don't |
|---|---|
| "Estimated JobMatch: 68" | "You have a 68% chance" |
| "We're fairly sure / not sure about this section" (parser confidence) | "Perfect parse" |
| "Looks like a strong match on required skills" | "You will get an interview" |
| "Couldn't tell from your resume" (`UNKNOWN`) | Guessing |
Low-confidence parsed fields are highlighted with a "Check this" marker, not hidden.

### 6.7 Never "ATS score"
Allowed names: `ParseHealth` ("Can machines read it?"), `Readability` ("Is it easy to scan?"), `JobMatch` ("How well you fit this job"). Banned strings (lint-checked in copy files): "ATS score", "beat the ATS", "guaranteed", "pass the ATS", "hiring chance". Marketing and UI avoid implying all employers use the same system.

### 6.8 Disclaimer placement
| Where | Text (short form) | Style |
|---|---|---|
| Under every score | "Estimate based on your resume. Not a prediction of hiring decisions." | caption, `info` icon |
| Diff preview footer | "AI-assisted. Review every line before sending." | persistent, non-dismissable |
| Cover letter / model answers | `AiBadge` + "Check facts before using." | inline |
| Onboarding step 3 and Settings | Full AI disclaimer link -> `/legal/ai-disclaimer` | link |
| Never | Pop-up modals for disclaimers, repeated banners on every page | |

### 6.9 Practice-only interview notice
Shown (a) on interview config screen as an `info` alert, (b) at session start for first three sessions, then as a persistent small header line, (c) on the report. Text: "This is practice. Don't use it during a real interview." The product has no live overlay, no audio capture of real calls, and no "answer helper" for real calls **[D]**.

---

## 7. Microcopy and tone

**Voice:** a supportive, honest mentor. Plain English (reading level ~Grade 8), short sentences, active verbs, no hype, no jargon ("ATS", "NLP", "tokens" are avoided in UI; "applicant tracking systems" explained once in a help tooltip). Pakistan-friendly without being local-only: neutral English, examples that include Rozee.pk and LinkedIn, PKR formatting for salaries when `PK_LOCAL` (e.g. "PKR 150,000/month"), date format `DD Mon YYYY`, no slang or idioms that don't travel. Respectful of job-search stress: never blame, never scold.

| Situation | Do say | Don't say |
|---|---|---|
| First score | "Here's where your resume stands. You have a good base. Three quick fixes will help." | "Your resume is bad." |
| Low match | "This job asks for a few things we couldn't find. Here's how to close the gap, or skip it." | "You're not qualified." |
| Missing metric | "Add a number if you have one. Even a rough one is fine, as long as it's true." | "Quantify your achievements!" |
| AI limit | "You've used your 3 free analyses this month. They reset on 1 Nov." | "Upgrade now!" |
| Error | "We couldn't read that file. Try a DOCX or a different PDF." | "Error 500" |
| Destructive | "Delete this resume? Applications that used it keep a note, but the file will be gone. This can't be undone." | "Are you sure?" |
| Empty tracker | "Nothing here yet. Add a job you're thinking about applying to." | "No data." |
| Success | "Saved." / "Version created. Your original is untouched." | "Awesome!!!" |
| Rejection logged | "Logged. Rejections are part of the process. Want to note what you learned?" | (celebratory or clinical tone) |
| Interview report | "You gave one strong example. Next time, say what the result was." | "You failed." |
| AI wrote it | "Suggested by AI from your Beta Ltd experience." | "Optimized by AI!" |

Conventions: sentence case everywhere; buttons are verbs ("Create version", not "Submit"); one exclamation mark per month, not per screen; numbers use digits; dates in the user's locale with unambiguous month names; no emoji in UI chrome (allowed in none of the system copy); error copy always includes a next step.

---

## 8. Accessibility checklist (WCAG 2.2 AA) [D target]

| Area | Requirement | How |
|---|---|---|
| Contrast (1.4.3, 1.4.11) | Text >= 4.5:1; UI components/focus >= 3:1 in both themes | Tokens in 2.1 tested in CI (axe + contrast script) |
| Not color alone (1.4.1) | Scores, statuses, diffs, requirement classes use icon + text + pattern | See 2.2, 5.5 |
| Keyboard (2.1.1) | Every function reachable by keyboard, logical tab order, no traps, visible skip-to-content link | |
| Focus (2.4.7, 2.4.11, 2.4.13) | 2px accent focus ring with 2px offset; focus not obscured by sticky bars/bottom nav (use `scroll-padding`) | |
| Drag-and-drop (2.5.7) | Kanban has non-drag alternative: **Move to...** menu on every card, plus keyboard drag (Space to lift, arrows to move, Space to drop, Esc to cancel) via dnd-kit sensors, announced through `aria-live` ("Moved Acme to Applied, position 2 of 6") | |
| Target size (2.5.8) | >= 24x24 minimum; 44x44 on touch | |
| Reflow/zoom (1.4.10, 1.4.4) | Works at 320 CSS px and 200% zoom, no horizontal scroll (except Kanban desktop board and tables with scroll containers) | |
| Reduced motion (2.3.3) | `prefers-reduced-motion` honored; no flashing | See 2.6 |
| Screen-reader scores | `ScoreRing` renders `role="img"` with `aria-label="JobMatch estimate: 68 out of 100, Good. Based on 5 factors."`; factor bars use `<meter>`/`aria-valuenow`; visible text duplicates, never only graphic | |
| Forms (3.3.x) | Visible labels, `aria-describedby` errors, error summary on submit with focus move, `autocomplete` tokens, no placeholder-as-label, accessible auth (3.3.8: no cognitive-test CAPTCHA; paste allowed) | |
| Dynamic content | `aria-live="polite"` for AI progress and toasts; `assertive` only for errors; streaming text region updates throttled so it doesn't flood the SR; "Skip streaming" button | |
| Dialogs | Focus trap, return focus, `Esc` closes, destructive dialogs default focus on Cancel | Radix/shadcn defaults |
| Diff view | Added/removed marked with visually hidden text "Added:" / "Removed:"; accept/reject buttons labeled with the change context | |
| Language/structure | `lang="en"`, one `h1` per page, landmarks (`nav`, `main`, `aside`), table headers scoped | |
| Consistent help (3.2.6) | Help/contact link in same place on every page | |
| Authentication | Supports password managers; Google OAuth; no timeouts that lose work (autosave) | |
| Testing | axe in CI (Playwright), manual keyboard pass per release, VoiceOver/TalkBack spot check on 5 core flows, 200% zoom pass | |

---

## 9. PWA [D: installable PWA; P: details]

| Topic | Spec |
|---|---|
| Installability | Web app manifest (name, short_name, icons 192/512 + maskable, `display: standalone`, theme/background colors for light and dark, `start_url=/app/dashboard`). Custom install prompt shown after 2nd visit or first application created, dismissible, never on resume pages. iOS: "Add to Home Screen" help text. |
| Service worker | Workbox via `serwist`/`next-pwa` successor **[?]**; precache the app shell and static assets (hashed). Versioned; "Update available, reload" toast, no silent reloads while editing. |
| Offline: supported (MVP) | **Read-only** cache of the **tracker** (Kanban/list, application detail). Everything else needs a connection in MVP. Offline banner: "You're offline. You can view your tracker; editing needs a connection." |
| Offline: queued (P2, not in MVP) | Offline edit queue and drafts sync: application status moves, notes, edits to drafts, profile edits are written to IndexedDB and replayed via a sync queue (Background Sync where available, otherwise on reconnect/focus). Conflict rule: last-write-wins per field, with a version check; conflicting resume-text edits keep both and ask the user. Queue size/age shown in Settings. |
| Offline: not supported (MVP: also edits, profile, resume drafts) | AI actions (analysis, match, tailor, interview, cover letter), upload, export, billing. These controls are disabled with an explanation, not hidden. A started interview with a saved draft answer keeps the draft locally (P2: submits when online). |
| Caching rules | Cache only: static assets (cache-first), public pages (stale-while-revalidate), fonts. **API responses and anything containing user data are never stored in the Cache Storage/shared HTTP caches**: responses carry `Cache-Control: private, no-store`; the SW doesn't intercept `/api/*` for caching. Offline data lives in IndexedDB under the user's origin and is **encrypted at rest with a per-session key held in memory/`CryptoKey` non-extractable** where feasible **[?]**, otherwise limited to the minimum fields (company, role, status, dates, notes), never full resume text or interview answers. |
| Logout / delete | Logout clears IndexedDB stores, Cache Storage entries for authenticated routes, queued mutations (after warning if unsynced edits exist: "You have 3 changes that haven't synced. Sign out and lose them?"), and unregisters push subscriptions. Account deletion triggers the same. Shared-device mode: "Don't keep me signed in" option shortens session and disables offline user-data storage. |
| Share target | `share_target` for job links/text -> opens Add Job prefilled **[P]** |
| Push/notifications | Web push is P2. MVP uses in-app reminders plus email (Resend) for due follow-ups and report-ready notices. |
| Low-bandwidth | See section 10.2. |
| Updates | Skew protection: API versioned; SW update prompt on contract change. |

---

## 10. Performance and low-bandwidth

### 10.1 Budgets [P]
Reference device: mid-range Android (e.g. Snapdragon 6-series, 4 GB RAM), Chrome, throttled 4G (1.6 Mbps down, 150 ms RTT), measured in CI (Lighthouse CI/WebPageTest) and RUM (web-vitals -> our `ProductEvent` table, no PII).

| Metric | Target (p75) |
|---|---|
| LCP | **< 2.5 s** on 4G mid-range Android; < 1.8 s desktop |
| INP | < 200 ms (drag, typing, accept/reject) |
| CLS | < 0.1 (skeletons match final layout) |
| TTFB | < 600 ms (Vercel edge/region choice; Singapore region for DB and functions, PRD §3) |
| JS per route (gzip) | Initial app shell <= 170 KB; any route chunk <= 100 KB; marketing page <= 90 KB JS |
| Total transfer first visit (app route) | <= 600 KB excluding user files |
| Fonts | Inter variable subset <= 40 KB, `font-display: swap`, preloaded |
| Images | AVIF/WebP, lazy, explicit dimensions; no hero video |
| Upload to first deterministic result | <= 15 s for a 2-page resume |
| Onboarding first score | <= 2 min end-to-end (user time included), system part <= 20 s |
| Heavy libs | PDF render/preview, charts, dnd-kit, rich-text loaded dynamically only on routes that need them |
| Accessibility score (Lighthouse) | >= 95; Best practices >= 95 |

### 10.2 Low-bandwidth and resilience
- Server Components and streaming HTML by default; client JS only for interactivity. Avoid client-side fetch waterfalls (parallel/preloaded data).
- Optimistic UI for status moves, notes; idempotent retries with request IDs.
- Upload: client-side size/type check, resumable or chunked upload for flaky connections, clear progress, retry without restarting; compress nothing server-side that the user must re-download.
- AI jobs run in the background (`BackgroundTask` queue): the user can close the tab on a bad connection and return to results; job status polling with backoff, or SSE with auto-reconnect.
- "Data saver" respect: honor `Save-Data` header (skip non-essential prefetch, images).
- Pagination/virtualization for lists > 50 items; Kanban columns lazy-load beyond 25 cards.
- No third-party analytics or error scripts at all; errors and events are recorded server-side in our own tables, with no session replay **[D]**.
- Graceful offline/slow states: skeletons, "taking longer than usual" after 8s, retry buttons.
- Measure on real devices before each phase release; budgets enforced in CI (fail the build on regression > 10%).

---

## 11. Open questions for this section [?]
1. Final accent color and brand (tied to name decision).
2. ~~Scanned-PDF OCR in MVP?~~ Closed (PRD §3): not in MVP; scanned PDFs get the "export a text PDF or upload DOCX" message; LLM-vision OCR is P2 behind a flag.
3. Is the match check counted against the 3 analyses/month, or is it free and only AI tailoring counted? (Pricing decision in 01.)
4. Encrypted IndexedDB vs minimal-fields-only for the read-only tracker cache (MVP); the offline edit queue is P2 (PRD §7, closed).
5. Service worker library choice for current Next.js version at build time.
6. "Negotiation practice" on OFFER (post-MVP idea only).
7. Whether Analytics stays folded into Dashboard or gets its own page after 50+ applications.
