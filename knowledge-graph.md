# Knowledge Graph — Project Knowledge & State

> Living record of goals, decisions, structure, and status. Update it whenever something meaningful changes.
> Labels: **[V]** Verified / decided · **[P]** Proposed · **[?]** Open question
> Last updated: 2026-10-20

## Status
- **[V] 2026-10-31: Phase 3 (resume upload + deterministic analysis) shipped; awaiting the founder's real-resume test.**
  - Flow: `startUpload` (signed upload URL to the private `resumes` bucket; Vercel 4.5 MB body cap) → browser `uploadToSignedUrl` → `finishUpload` (download, sniff by magic bytes, extract, structure, rules, save ResumeVersion + ResumeAnalysis). Rejected files are deleted at once.
  - Files: `src/server/resume/{files,extract}/*` (Claude; dependency-free DOCX zip reader with bomb limits; PDF via unpdf 1.9.1 pinned). Structure + rules by a Sonnet agent (`structure.ts`, `contact.ts`, `items.ts`, `lexicon.ts`, `dates.ts`, `rules/*`, engine `rules@1.0.0`). UI by a Sonnet agent (`src/app/app/resumes/*`, `src/components/resumes-real/*`).
  - Bucket: private, 5 MB, PDF/DOCX MIME only, no storage policies. Created via `supabase/storage.sql` (outside Prisma, because the shadow DB lacks the storage schema).
  - DB trigger `resume_version_immutable` blocks content changes on locked versions. SENSITIVE_DATA consent at first upload. Quota of 6 analyses/month (beta), counted from uploads until UsageLedger arrives in Phase 8.
  - Tests: 96 unit + 5 e2e against real storage (upload, CNIC masked in findings, disguised file rejected and deleted, cross-account blocked, publishable key can't read the bucket, deleting the last version removes the file). CI green.
  - **Known gaps:** P11 (needs AI), P9 geometry, PII3 photo; PDF table/image detection not implemented; PII10 fires for every INTERNATIONAL resume without work-authorization text (noisy TIP); mixed-case non-dictionary headings not detected. Real-world PDFs (Canva, LaTeX, Word export) are not yet tested; that needs the founder's files.
- **[V] 2026-10-31: Phase 2 (profile + evidence bank) shipped; awaiting the founder's hands-on test.**
  - Migration `phase2_profile` adds Profile, Skill, Experience, Education, Project, Certification and FactBankItem (with `skillName`, `source` FactSource), all with RLS deny-all (verified).
  - `src/server/profile/{schemas,service}.ts`: every update/delete is `where {id,userId}`; per-user caps; CNIC rejected in all text; https-only URLs.
  - Actions in `src/app/app/profile/actions.ts` (write limit 60/min/user).
  - UI built by a Sonnet subagent: `src/app/app/{onboarding,profile}`, `src/components/profile-real/*` (~1,070 lines).
  - Tests: 24 pass, including the cross-account authZ test (`service.authz.test.ts`; runs against the real DB locally, skipped in CI, cleans up after itself).
  - CI green; live routes are gated (307 to login).
  - **Not browser-tested by Claude:** the pane has no signed-in session and Claude must not use the founder's Google account.
- **[V] 2026-10-31: Phase 1 live and verified end to end on https://airesumejobmatcher.vercel.app.**
  - The founder signed in with Google, passed the /consent step, and saw /app.
  - DB check: 1 User (verified, USER/FREE/beta); consents TERMS/PRIVACY at current versions, AGE_16_PLUS, MARKETING=false; IP stored as /24 only; AuditLog LOGIN method=google; 0 ErrorEvents.
  - Supabase: only the Google provider is on (Email provider off); OAuth scopes are email+profile. Google app is published (In production, no logo, so no brand review).
  - Vercel: all 8 env vars set; the duplicate project was deleted; the remaining project is renamed `ai-resume-job-matcher`.
  - **Deferred from Phase 1:** BackgroundTask worker + pg_cron tick (built in Phase 3 with the first async task; pg_cron needs the CRON_SECRET in Supabase Vault, which the founder pastes); Resend SMTP (needs a domain); 7-day idle / 30-day absolute session limits (verify Supabase free-plan settings, else enforce via `lastSeenAt`); Settings page and "sign out everywhere" (the latter is on /app).
- **[V] 2026-10-31: Live on Vercel.**
  - Project **`ai-resume-job-matcher-e5sg`** (founder import, team Nazim). Production URL **https://airesumejobmatcher.vercel.app**; the plain `ai-resume-job-matcher.vercel.app` is taken by someone else.
  - Served from sin1, with security headers verified by curl. `/app` → 307 to /login.
  - Env vars present: Supabase URL, publishable key, secret key, DIRECT_URL, CRON_SECRET, HASH_PEPPER. **Missing: DATABASE_URL and NEXT_PUBLIC_APP_URL** (founder to add).
  - A duplicate empty project `ai-resume-job-matcher` (domain `ai-resume-job-matcher-self.vercel.app`) was created by the connector despite its error. The founder should delete it so each push doesn't build twice.
- **[V] 2026-10-31: Phase 1 code complete, not yet live.** CI is green.
  - Demo moved to `/demo`. `/app` is the real signed-in area, gated by `src/proxy.ts` and `requireUser()`, which checks session, deleted/blocked state and current consent.
  - Auth (`src/app/(auth)/`): sign up, sign in, Google, forgot/reset, sign out local/global, `/consent`, `/check-email`. Helpers live in `src/server/auth/*`. HIBP k-anonymity breach check (fails open). Rate limits: signup 5/h/IP; login 20/15m/IP + 8/15m/email; reset 3/h/email.
  - Error log: `captureError` with PII scrub. Audit log: SIGNUP, LOGIN, LOGOUT(_ALL), PASSWORD_CHANGED.
  - Legal: beta Terms, Privacy and AI pages at `/legal/*`. Operator name and contact email are blank in `src/config/legal-entity.ts` until the founder confirms them.
  - Prisma 7.10.1 (pg adapter, client generated on postinstall, lazy `db` proxy). Migration `phase1_identity_platform` is applied; RLS is on for all 9 tables, and anon/authenticated have no privileges (verified by SQL).
  - Verified in the browser: /app redirects to /login; wrong login gives a generic error; the rate-limit row is written; signup validation (consent, breached password) works.
  - **Blocked:** Supabase default SMTP refuses non-team addresses (`email_address_invalid`), so real signup needs Resend + a verified domain. Vercel connector `create_git_project` returns malformed responses, so the founder imports the project via the dashboard.
  - `vercel.json` sets region sin1.
- **[V] 2026-10-30: Phase 0 mostly done.**
  - Public repo https://github.com/NazimAli28/ai-resume-job-matcher (main). CI (lint, typecheck with `next typegen`, Vitest, build, `npm audit --omit=dev --audit-level=high`) is green.
  - GitHub security: secret scanning + push protection, Dependabot alerts/fixes + weekly updates, private vulnerability reporting, and a ruleset on main (no deletion, no force-push). Open Dependabot alerts: 0.
  - Added: `src/config/brand.ts`, `src/server/env.ts` (Zod; names only in errors), `src/server/ai/provider/{types,mock}.ts`, `vitest.config.ts`, security headers in `next.config.ts` (full nonce CSP deferred to Phase 8), README, SECURITY.md (all rights reserved), `.gitattributes` (LF).
  - Deps: zod 4.6.7 (3.x had a high advisory), vitest 4.x, server-only.
  - Supabase project was **paused (free-tier idle)** and was restored 2026-10-30. Keep-alive is part of the backup job.
  - `.env.local` was created with **public** values only (URL, publishable key). It is git-ignored.
  - **Blocked on the founder:** (1) install the Vercel GitHub app for this repo (`create_git_project` returned "install the GitHub integration first"); (2) paste the DB password and the Supabase secret key.
  - Dependabot major-bump PRs 1–6 are left open for review. PRs 7–9 are superseded by the vitest 4 upgrade; closing them was blocked by the permission system, so the founder can close them.
  - Gotcha: `X-Frame-Options: DENY` also blocks same-origin iframe audits; use window resizing to test.
- **[V] 2026-10-30: Founder approved the full build (Phases 0–8) to production.** Work runs phase by phase with evidence at each gate. Keys are requested from the founder when a phase needs them; Claude never handles secret values (the founder pastes them into Vercel or `.env.local`).
- **[V] 2026-10-20:** **PRD v1.0 draft complete; awaiting founder review.** No code, no git repo, no tests yet.
  - Index + locked decisions + glossary + canonical constants: [docs/PRD.md](docs/PRD.md) (§3, §5, §5b).
  - Sections: [01 product](docs/prd/01-product.md) · [02 features](docs/prd/02-features.md) · [03 UX](docs/prd/03-ux-design.md) · [04 architecture](docs/prd/04-architecture.md) · [05 AI engine](docs/prd/05-ai-engine.md) · [06 security/privacy](docs/prd/06-security-privacy.md) · [07 legal](docs/prd/07-legal.md) · [08 roadmap/quality](docs/prd/08-roadmap-quality.md). About 5,500 lines total.
  - A cross-file consistency review was run (Sonnet agent, ~33 issues), and all were fixed by aligning to PRD §5b. A final grep sweep found no stale values. **Not a full line-by-line proofread.** Section files remain agent-written drafts.
- **[V] 2026-10-20:** 4 frontend design directions published as a Design canvas (private): https://claude.ai/artifact/9u9tMiAoPX4tKWHoAdcZ2A
  - Directions: A Calm Professional (light/dark toggle; matches the PRD 03 tokens) · B Midnight Focus (dark, dense, table view) · C Warm Editorial (guided "3 things today" feed) · D Bold Modern (high contrast, lime accent).
  - **[V] 2026-10-21 (founder):** likes A's design but rejects blue. Wants a neon accent that stands out in light and dark.
    - A now has a neon picker: lime (default), mint, cyan, magenta.
    - Rule: neon is used as a fill with near-black text in both modes. Accent text and links use a deeper shade in light mode and the neon itself in dark mode.
    - Light and dark versions are shown side by side.
    - The founder removed B/C/D from the canvas. The canvas now shows only A, as four rows (lime, mint, cyan, magenta), each light and dark. PRD 03 tokens (indigo #3B55D9) must be updated once a neon is picked.
  - All four show the same dashboard data. Only the desktop dashboard has been drawn so far; mobile and the other screens are pending. **[?] Founder to pick a direction.**
- **Next:** founder reads the PRD → answers the remaining open questions → **Phase 0 (Setup)** per [08 §2](docs/prd/08-roadmap-quality.md).

## Goals & Requirements
- **[V]** Base spec: the founder's SRD (`C:\Users\nazim\Downloads\AI_Job_Application_Copilot_SRD.md`), now superseded by docs/PRD.md. 02 §16 maps SRD sections to requirement IDs.
- **[V]** Core features:
  - Resume + JD → explainable scores and fixes (no fabrication). Two paths: (A) download the improved resume after a diff preview, (B) suggestions.
  - Tracker with an immutable `ResumeVersion` and source per application.
  - Configurable AI mock interview with a scored report and model answers.

## Decisions (all 2026-10-20; full table in [PRD §3](docs/PRD.md))
- **[V] Founder, 2026-10-31:** **Beta sign-in is Google-only** (option 2; no domain yet). Email/password code stays behind `FEATURES.EMAIL_PASSWORD_AUTH=false` (`src/config/features.ts`): actions refuse, and the forgot/reset pages redirect to /login. Turn it on after Resend + a verified domain. Facts verified in docs: since 2024-09-26 Supabase default SMTP only sends to org members (2/h); Resend without a domain only sends to the account owner. Legal operator: **founder's name** (exact spelling pending); contact email blank for now.
- **[V] Founder, 2026-10-30:**
  - **Name: "AI Resume & Job Matcher"**, stored in `src/config/brand.ts` with logo mark "RM". The public GitHub repo is `ai-resume-job-matcher`, since GitHub names can't contain spaces or "&".
  - **Repo is public.**
  - **Default accent: mint.** `DEFAULT_ACCENT` lives in the brand config and becomes an admin setting in Phase 8.
  - **"I'm learning this" = PARTIAL, weighted by the user's self-rating.**
  - **UNCLEAR requirements: Claude decided to keep them out of the score and list them separately**, which is the current app behavior.
  - **Sprint price: decide later**, based on measured AI cost.
- **[V] Founder decided:**
  - Goal: portfolio first, then SaaS.
  - Platform: web + PWA.
  - Market: Pakistan first, then global. English only, permanently.
  - Auth: email/password + Google.
  - AI: deterministic scripts + eval harness first; Claude behind `AiProvider`; fine-tune an own model later. In interviews, Haiku asks and Sonnet scores.
  - Resume output: paths A + B, with a highlighted-diff preview before download.
  - Jobs: paste JD + URL + source; extension in P2.
  - Mock interview: text MVP, voice P2; configurable 5/10/15 questions.
  - Retention: keep until the user deletes; 24-month inactivity purge; raw interview answers deleted at 12 months; 7-day deletion undo; optional delete-original toggle.
  - Resumes: religion off by default.
  - Pricing: freemium + Pro + Sprint pass; free beta first; survey ≥100 before pricing.
  - Infrastructure: Vercel Pro before public launch; Singapore region.
  - Design: calm professional, light + dark.
  - Analytics: minimal admin + private analytics.
  - Name: chosen before launch. Capacity: solo + agents, ~15–20 h/week.
- **[P] Claude proposed:**
  - Stack (founder delegated "best and free"): Next.js, Neon Postgres, Prisma, Better Auth, R2, Inngest, Tailwind/shadcn, Resend, Sentry, PostHog, Upstash. Free-tier limits verified on vendor pages 2026-10-20 (04 §2); PostHog limits are unverified.
  - All numbers in PRD §5b: plan limits, spend guards, upload limits, JobMatch weights, deletion and backup windows, and so on.
  - OCR is P2.
  - Status enum, glossary entities and enums.

## Research (agent reports, 2026-10-20; partly secondhand sources)
- [01 Resume/ATS competitors](docs/research/01-resume-ats-competitors.md) · [02 Mock interview](docs/research/02-mock-interview-competitors.md) · [03 Trackers](docs/research/03-application-tracker-competitors.md) · [04 Legal/privacy/security](docs/research/04-legal-privacy-security.md) · [05 ATS mechanics & tech](docs/research/05-ats-mechanics-and-tech.md) · [06 Pakistan market](docs/research/06-pakistan-market.md).
- Key facts: the "75% of resumes are auto-rejected" claim is unsupported. Stripe doesn't serve PK sellers (use Safepay). RozeeGPT is the only local AI competitor, and there is no local AI mock-interview tool. A candidate-side tool is likely not EU AI Act high-risk.

- **[V] 2026-10-21 (founder):** **5 platforms only**: GitHub, Vercel, Supabase, Anthropic, Resend.
  - Supabase replaces Neon, R2 and Better Auth.
  - In-house Postgres replacements: `BackgroundTask` queue (pg_cron tick) for Inngest, `ErrorEvent` for Sentry, `ProductEvent` for PostHog, `RateLimitBucket` for Upstash.
  - Backups and keep-alive run as a daily GitHub Actions job.
  - Updated: PRD.md §3/§5/§5b/§7, CLAUDE.md, 02/03/05/08. Rewrites of 04 (Opus) and 06/07 (Sonnet) in progress.

- **[V] 2026-10-21:** The Supabase connector is connected (org "NazimAli28's Org").
  - An existing project `ai-job-copilot` (ref `iiwvvsqwvxhusjvutziz`) is in **Tokyo ap-northeast-1** and is **paused**, created 2026-10-09.
  - **[?]** Pending founder decision: new Singapore project (recommended) vs reuse Tokyo.
  - Vercel connector not yet connected; `gh` and `vercel` CLIs not installed (git + Git Credential Manager present).
- **[V] 2026-10-21 (founder):** Working name **"AI Resume Writer"** (slug `ai-resume-writer`) until the brand is chosen.
  - Supabase: MCP `create_project` failed twice. The founder then created the project in the dashboard: **`ai-resume-writer`, ref `yeseefoftucoksxnfcln`, Singapore ap-southeast-1**, free plan.
    - Settings: Data API **off**, automatic RLS **on**, no GitHub integration. The DB password is in the founder's password manager only.
    - Status was COMING_UP at 2026-10-21.
- **[V] 2026-10-21 readiness check:**
  - Supabase `ai-resume-writer`: ACTIVE_HEALTHY, Postgres 17.11, Singapore. API URL `https://yeseefoftucoksxnfcln.supabase.co`.
    - Security advisors: 0 lints.
    - `ensure_rls` event trigger present (automatic RLS).
    - **pg_cron and pg_net are available on the Free plan** (verified; installed in Phase 0). `supabase_vault` and `pgcrypto` are installed.
    - 0 auth users. The `storage.buckets` table didn't exist yet (storage service still initializing on the new project); recheck when creating buckets.
  - GitHub: `gh` logged in as NazimAli28 (scopes: repo, workflow, read:org, gist). Git identity is set. Repo name `ai-resume-writer` is free.
  - Vercel: connector OK (team "Nazim").
  - Local: Node 24.21.0, npm 11.19.0, git 2.56.
  - Not yet created: Anthropic API key and Resend account. Neither is needed for Phase 0; Resend is needed in Phase 1 (auth emails) and Anthropic in Phase 3.
  - Vercel: create a fresh project; don't reuse the old `ai-job-application-copilot`, and never touch `for-mimi`.
  - Vercel connector connected (team "Nazim", `team_Lwa0NiINnuUKKTL0yp2dsnHY`); the Vercel CLI is not needed.
  - `gh` is installed (v2.102.0) but not logged in; the founder must open a new terminal and run `gh auth login`.
- **[P] 2026-10-21:** Main repo public (portfolio); backups and keep-alive in a separate private repo (`job-copilot-ops`).

- **[V] 2026-10-21 (founder):** Build a **frontend-first interactive prototype with demo data** plus an **AIDA landing page** before Phase 0's backend work. Phase 0 (repo/Vercel) is not started yet.
  - UI/UX research: [07](docs/research/07-ui-ux-patterns.md).
  - Brief for screen builders: [docs/frontend-brief.md](docs/frontend-brief.md).
  - Scaffold: Next.js 16.4.2, React 19.3, Tailwind v4, lucide-react, @dnd-kit, motion. `cacheComponents` is off for the prototype.
  - Design concept: the neon accent is a **highlighter** = "backed by evidence". Fonts: Bricolage Grotesque (display) + Atkinson Hyperlegible Next (body). Light/dark theme plus a switchable accent (lime, mint, cyan, magenta).
  - Shared foundation (written by Claude main):
    - `src/app/globals.css` tokens, `src/components/ui/*`, `src/components/app/app-shell.tsx`.
    - Demo layer: `src/demo/{types,data,store,labels}` (localStorage `arw-demo-v1`, Reset demo).
  - Demo "today" = 2026-10-21. Preview config: `.claude/launch.json` ("web", port 3000).
  - **[V] 2026-10-21: Prototype complete.** 142 TS/TSX files.
    - Routes: `/` (AIDA landing), `/app` (dashboard), `/app/onboarding`, `/app/resumes`, `/app/resumes/[id]`, `/app/jobs`, `/app/jobs/[id]` (+`/tailor`, `/cover-letter`), `/app/interviews` (+`/new`, `/[id]`, `/[id]/report`), `/app/applications`, `/app/profile`, `/app/settings`.
    - `tsc` and `eslint` pass with 0 errors (whole project).
    - **Browser-verified by Claude:**
      - Landing hero demo; dashboard; board "Move to" + toast/undo; resume report; interview report.
      - Job match; tailor flow (accept wording-only, answer the question, save v4, usage 1→2); new interview + adaptive follow-up.
      - Mobile 375px (landing, tracker); light + dark.
    - **Not browser-tested:** onboarding, cover letter, add-job sheet, profile, settings, drag-and-drop with the mouse, report retry.
    - Fixes during QA:
      - Button `ink` variant (Tailwind class conflicts can't be overridden via className).
      - Field width override.
      - Toast action contrast; Tabs stray scrollbar.
      - Breakdowns now average to the scores (92/74).
      - Seed match scores aligned to the jobs formula (j2 38, j3 75, j4 85, j5 80, j6 90, j7 52, j8 45, j9 97).
      - Storage key bumped to `arw-demo-v2`.
    - Scoring rules implemented: `src/components/jobs/lib/match.ts`.
  - **[V] 2026-10-21 (founder):** v1 UI rejected as "too simple". Wants an interactive, visually appealing AIDA landing page and a modern card-based app whose dashboard shows stat cards.
    - **v2 visual system** (brief §"v2 visual system"):
      - `.card` / `.card-hover` / `.ambient` / `glow` utility / `.shimmer` / `.draw`.
      - Chart kit `src/components/ui/charts.tsx` (Sparkline, RingScore, BarChart, Funnel), `stat-card.tsx`, `motion.tsx` (AnimatedNumber, Stagger/Item).
      - `--viz` chart token: neon fails 3:1 on white (lime 1.25:1, measured with the dataviz validator), so light mode uses deeper steps (#5B8C00 / #00975A / #008A9E / #C0179A), all validated ≥ 3:1. Dark mode uses the neon.
    - The shell was redesigned: floating sidebar, glass top bar, Ctrl+K command palette, usage ring, upcoming-interview prompt computed from state. Verified in the browser.
    - v2 agents: landing rebuild (Opus), dashboard rebuild (Opus), restyle resumes/onboarding/jobs (Sonnet), restyle interviews/tracker/profile/settings (Sonnet).
    - Dev server note: an orphan `next dev` may hold port 3000; reuse it.
    - **[V] 2026-10-22: v2 complete.** All 4 agents finished. `tsc` and `eslint` pass with 0 errors (whole project). No console errors on a clean load of `/`.
    - **[V] 2026-10-23: responsive pass** (founder report: sidebar cut off on a short laptop screen). The sidebar now scrolls, and the "upcoming round" card shows only when the screen is at least 760px tall (`tall:` custom variant in globals.css). Full-bleed bars match the main gutter. Sticky filter bars sit below the header (`top-[4.5rem]`). Mobile logo is compact. Dashboard stat cards go 1 → 2 → 3+2 (lg) → 5 (2xl). Interview cards no longer overflow on phones. Next dev badge moved to bottom-right. Overflow audit (9 app pages × 7 sizes, 360–1920 wide) finds 0 page-level horizontal scroll and 0 clipped text. tsc and eslint pass with 0 errors.
    - **[V] 2026-10-23: landing responsive pass.** Changes:
      - The hero headline is capped by screen height on laptops (`min(80px,11vh)`) so the buttons stay above the fold at 1280×600 and 1366×657.
      - The pinned "how it works" mock is scaled to 0.8 on screens shorter than 760px, and stops pinning below 560px tall.
      - The header "Try the demo" button now really hides on phones; it was always visible because the button's `inline-flex` beat `hidden`. Gotcha: hide buttons with a wrapper, not a `hidden` class on the button.
      - The logo no longer wraps, and the phone headline scales with `clamp`.
      - The dashboard-peek stat cards use a container query.

      Audit at 10 sizes (320–1920 wide): 0 sideways scroll, 0 clipped text. tsc and eslint pass with 0 errors.
      - Built: landing (hero tilt, swapping headline, marquee, scroll story, playground, scorer, bento, market toggle, pricing toggle, FAQ) and dashboard (greeting + momentum ring, next action, 5 StatCards, weekly bars with range control, funnel, sources, resume health, interview readiness, upcoming, recent).
      - Other screens restyled.
    - **[V] 2026-10-28: landing restructured to 6 sections** (founder: "too lengthy, needs more product details"; picked the product-led option). The order is now:
      1. Hero + trust strip.
      2. `how-it-works.tsx`: 3 step cards.
      3. `product-tabs.tsx`: Resume check / Job match / Interview coach / Tracker. Each tab shows what you give, what you get, good-to-know points, plan limits from PRD §5b, and a live demo.
      4. `trust.tsx`: the `evidence-loop.tsx` demo plus 5 commitments.
      5. Pricing.
      6. FAQ (now 8 questions, including evidence and downloads) + closing CTA.

      Founder emphasis: **the app never adds a skill from the job description; it asks, and a "yes" is saved as reusable evidence.** The nav and footer anchors were updated. Height at 1440×900: 7.6 screens. Audit at 9 sizes, with every tab opened and the evidence flow completed: 0 overflow. tsc and eslint pass with 0 errors.

      Now-unused files, kept until git exists and then to be deleted: scroll-story, story-screens, playground, demo-results, demo-stages, score-explainer, bento, bento-card, dashboard-peek, privacy-peek, practice-only, market-toggle, promises, live-number, resume-sheet (all verified unreferenced by the live page on 2026-10-28).
    - **[V] 2026-10-28: product-tab polish** (founder: "tracker congested, empty space on each tab"). Changes:
      - All details stack in the left column beside the demo, and the demo is vertically centered. At 1366 wide the column heights are now within 0–140px of each other (they were 300–600px apart).
      - `mini-tracker` columns follow its own width via a container query (2 across in the half panel, 4 in a full row).
      - `interview-peek` puts the rubric and the model answer behind a two-way switch, roughly halving its height.

      No overflow at 6 sizes with each tab open. tsc and eslint pass with 0 errors.
    - **[V] 2026-10-29: "Match a job" is now the primary action** (founder: "can't find where to pick a resume and paste a JD"). New file: `src/components/match/match-composer.tsx`.
      - The flow: (1) choose a saved resume version, or upload one inline (reuses `useAnalysisRun` / `ResumeSourcePicker`); (2) paste the JD, at least 200 chars, with "Use an example job"; the link and source are optional. The rules-based extraction then runs, then a confirm step (title, company, requirement count), then `ADD_JOB` with the chosen resume set as active, then the job page.
      - Entry points: the dashboard card under the greeting, the `/app/match` page, a "New match" button in the top bar (sm and up), a raised center "Match" button in the phone nav (Interviews moved into More), the Jobs page button (replaces the old `AddJobSheet`, now unused), and the Ctrl+K command.
      - Fixes found while testing: the confirm count now uses `toRequirements` (lines naming several skills split, as on the job page). The selection follows the default resume until the user picks one, because the store hydrates after the first render.

      Verified: the end-to-end flow in the browser (validation error, example job, 8 requirements found, the job page shows a fit estimate for the chosen v2). No overflow at 6 sizes on `/app` and `/app/match`. tsc and eslint pass with 0 errors.
    - QA fixes by Claude main:
      - `bento.tsx` needed "use client" (icons passed from a server component crashed the render).
      - `.card` and effects moved into `@layer components` so utilities can override them.
      - The before/after text slider spliced two sentences, so it was replaced with a toggle + tap-to-flip.
      - ThemeScript now uses next/script `beforeInteractive` in `<body>` (React 19 script warning).
      - Bar chart colors: real `--viz` + opacity instead of a muddy color-mix.
      - `useSkipMotion` (reduced motion or hidden at load) replaces `useReducedMotion` in 21 files.
      - `AnimatedNumber` shows the real value by default and counts up only in view.
      - StatCard fills its cell.
    - **QA limits:** the browser pane was hidden, so rAF was paused. Below-the-fold staggered sections could not be screenshotted; content was verified via the DOM. The founder should eyeball scrolling sections.
  - **[?] Open spec questions from the build:**
    1. "I'm learning this" override: implemented as MISSING with a Learning badge (PRD 05 §5.2) vs PRD 02 MAT-020 "PARTIAL at most".
    2. UNCLEAR requirements: excluded from the score in the app (jobs lib) but counted as half in the landing explainer; same result for j1, but the rule needs aligning.
    3. Landing Sprint price: PKR 999 / 2 weeks vs PRD 01 ~1,299.
  - **Requested store additions (not done):** `ADD_SUGGESTIONS` (persist locally generated suggestions), evidence id on overrides, consent fields on the user, and a ghosting-dismiss flag. Interview retry results aren't persisted.

## Rejected Alternatives
- Inngest, Sentry, PostHog, Neon, Cloudflare R2, Upstash, Better Auth (2026-10-21): too many platforms for the founder. Can be added back later (Sentry/PostHog in an afternoon) if scale needs it.
- Express + separate SPA (SRD): replaced by Next.js route handlers + Inngest for a solo, free-tier build; layering keeps it portable (04 ADR-01).
- Training our own model in the MVP: no data, fixed GPU cost; break-even ≈ 230k parses/month (05 §12).
- Server-side job URL scraping: ToS/legal risk.
- Live-interview copilot features: unethical; practice only.
- Employer-side screening: would make the product EU AI Act high-risk.
- Urdu UI: founder chose English only.
- Session replay on sensitive pages: privacy.

## Architecture & Components
- Spec only (no code): see [04](docs/prd/04-architecture.md) (Prisma schema draft, API, 18 Inngest functions) and [05](docs/prd/05-ai-engine.md) (rulebook, formulas, LLM tasks, eval harness).

## Key Files
| Path | Purpose |
|---|---|
| `CLAUDE.md` | AI operating instructions (always read first) |
| `knowledge-graph.md` | Project state (this file) |
| `docs/PRD.md` | PRD index, decisions, glossary, canonical constants (wins over section files) |
| `docs/prd/0X-*.md` | Detailed PRD sections |
| `docs/research/0X-*.md` | Research evidence |

## Commands / Testing
- None yet. Planned: Vitest, Playwright, `evals/` runner ([08 §5](docs/prd/08-roadmap-quality.md)).

## Open Questions / Risks
- **[V]** Brand name chosen (2026-10-30). **[?]** Still check the domain and trademark before the public launch.
- **[?]** Safepay onboarding (NTN/company); PK SaaS sales tax (tax adviser).
- **[?]** Paddle/Lemon Squeezy eligibility for PK sellers.
- **[?]** Lawyer review of 07 before paid launch (13 questions in 07 §10).
- **[?]** Phase 2 review: move the tracker earlier?
- **[?]** Fair-use caps for PRO exports/job matches (04 `PLAN_LIMITS`, [?]).
- **[?]** Daily backup job: Inngest cron vs GitHub Actions.
- **[?]** Eval thresholds: set after the first labeled baseline.
- **[?]** Remaining per-section open questions are listed at the end of each section file.
- **Risk:** 04's §13.5 cost table uses $0.05/analysis (conservative) vs $0.04 in PRD §5b.
- **Risk:** Inngest free tier (50K executions) is the first free-tier limit hit, at ≈1.2k MAU.
- **Risk:** Not under version control. Run `git init` in Phase 0.
