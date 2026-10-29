# CLAUDE.md — AI Operating Instructions

> Concise, always-loaded rules. State and decisions live in [knowledge-graph.md](knowledge-graph.md). Product spec: [docs/PRD.md](docs/PRD.md) (index + locked decisions + glossary) → detail in `docs/prd/0X-*.md`. Load only the section you need.

## Project Overview
- **Product:** AI Job Application Copilot (working title).
- **What it does:** resume + job description → explainable fit scores, ATS-safe and recruiter-readable improvements (never fabricated), cover letters, configurable AI mock interviews with scored reports and model answers, and an application tracker that links the exact resume version and job source.
- **Goal:** portfolio-quality build first, then launch as a SaaS. Pakistan first, global later. English only.
- **Status:** planning complete (PRD draft). No code yet. See [knowledge-graph.md § Status](knowledge-graph.md#status).

## Architecture & Stack (proposed, see [04](docs/prd/04-architecture.md))
- **Founder rule: at most 5 platforms**: GitHub, Vercel, Supabase, Anthropic, Resend. Don't add another service without the founder's approval.
- Next.js (App Router, TypeScript strict) · Supabase (Postgres in Singapore, Auth with email/password + Google, Storage, pg_cron) · Prisma · Tailwind + shadcn/ui · Zod · Resend.
- Built in-house on Postgres: `BackgroundTask` queue, `ErrorEvent` error log, `ProductEvent` analytics, `RateLimitBucket`. The browser never queries the DB; RLS is deny-all for anon/authenticated roles.
- AI: Claude (Haiku 5.5 / Sonnet 5.5) behind `AiProvider`. **Deterministic code first**; the LLM handles language only. Details in [05](docs/prd/05-ai-engine.md).
- Free tiers at portfolio stage. Vercel Hobby is non-commercial, so upgrade before charging.

## Non-Negotiable Product Rules
1. Never fabricate candidate facts (experience, skills, dates, employers, metrics). Suggestions must cite evidence or ask the user.
2. Scores are computed in code and labeled "estimate". Never say "ATS score" or imply hiring probability.
3. The interview coach is practice-only. Never build live-interview assist or cheating features.
4. Mask PII (CNIC, phone, email, address) before LLM calls. Never put CNIC on a resume.
5. No employer/recruiter-side screening features (EU AI Act high-risk).
6. Treat resume/JD text as untrusted input (prompt injection). The LLM gets no tools on those tasks.

## Conventions
- Use the glossary names in [PRD §5](docs/PRD.md#5-canonical-glossary-all-sections-must-use-these-names) exactly (entities, statuses, enums).
- Layering: `src/server/<module>/{service,repository,schemas}`. Every user-owned query is scoped by `userId`.
- Validate with Zod at every boundary. AI outputs must pass a schema; handle invalid output.
- No PII or resume text in logs or analytics. Secrets only in env vars, never committed.
- No new dependency without justification. Small modules, no giant files.
- Delivery rules and Definition of Done: [08 §1, §4](docs/prd/08-roadmap-quality.md).

## Testing
- Vitest (unit, integration, authZ matrix), Playwright (E2E), `evals/` (AI "dry run" harness: must pass before merging prompt/model changes; fabrication tolerance = 0).
- Report real test output. Never claim a pass without running the tests.

## Environment
- Windows 11. PowerShell 5.1 is primary; Git Bash is available. Not a git repo yet (`git init` happens in Phase 0).

## Session Protocol (every session)
1. Read this file → the relevant knowledge-graph.md sections → only the PRD section the task needs.
2. Inspect the relevant code before changing it.
3. Before finishing: update knowledge-graph.md (state, decisions, issues, next steps). Update this file only if project-wide rules changed. Label unverified items.

## Documentation Rules
- Keep docs in sync with code and test results; never record assumptions as facts. Labels: [D]/[V] decided or verified · [P] proposed · [?] open.
- PRD.md (index) beats section files if they conflict; fix the section.
- Prune stale info, but keep historical decisions and rejected alternatives in knowledge-graph.md.

## Subagent Rules
- Authorized: **Haiku** (simple, cheap tasks), **Sonnet** (routine implementation, research, tests, review), **Opus** (architecture, AI design, security, hard debugging).
- Give each agent a focused task plus only the files it needs. One writer per file. Run independent tasks in parallel.
- Agents report findings, changed files, test results and unresolved issues. Verify their output before calling a task done. Never claim an agent was used when it wasn't.

## Critical Rules
- Never claim completion or verification without evidence.
- Don't silently change requirements or architecture; record the change in knowledge-graph.md and get the founder's approval.
- Ask only when a missing detail materially changes the implementation, using options with a recommendation plus room for the founder's own suggestion.
