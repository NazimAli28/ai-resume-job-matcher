# 08 — Roadmap, Definition of Done, Testing, Risks

> Part of the [PRD](../PRD.md). Decisions and glossary live there. Capacity assumption **[D]**: solo founder + AI agents, ~15–20 h/week.
> Labels: **[D]** decided · **[P]** proposed · **[?]** open

## 1. Delivery rules (apply to every phase)
- One phase at a time. Before coding a phase, write a short plan, which is approved, then implement (SRD §37).
- Each feature is a small vertical slice: schema → service → API → UI → tests → docs.
- Nothing merges unless lint, typecheck, unit, integration and **eval gate** are green.
- At the end of each phase, report what was built, files changed, tests run with real output, known issues, and the next task. Update `knowledge-graph.md`.
- No new dependency without a one-line justification in the PR.

## 2. Phase plan (MVP ≈ 14 weeks) [P]
| Phase | Weeks | Scope | Exit criteria |
|---|---|---|---|
| **0. Setup** | 1 | `git init` + GitHub repo, Next.js + TS strict, ESLint/Prettier, Tailwind + shadcn, Supabase project (Singapore) + Prisma (local Supabase via CLI for dev/test), `ErrorEvent` logging, env validation (Zod), GitHub Actions CI, `evals/` skeleton, `AiProvider` interface stub | CI green on an empty app; preview deploy on Vercel |
| **1. Foundation** | 2–3 | Supabase Auth (email/password + verification + reset, Google), sessions, app shell + nav (desktop + mobile), light/dark, Settings skeleton, legal page placeholders, signup consent → `ConsentRecord`, rate limiting (`RateLimitBucket`), `BackgroundTask` queue + pg_cron tick, Resend as auth SMTP | Auth integration tests + authZ test harness pass; E2E signup/login |
| **2. Profile** | 3–4 | Onboarding (target market, target roles), Profile CRUD (Experience, Education, Skill, Project, Certification), `FactBankItem` | CRUD + ownership tests; onboarding E2E |
| **3. Resume** | 4–6 | Upload (signed Supabase Storage URL, magic bytes, size), two-pass parsing → `ResumeVersion`, deterministic `ParseHealth` + `Readability` rules, PII/market linter (CNIC), analysis report UI, versions list; **golden set v0** (≥ 30 resumes incl. Pakistani CVs, synthetic or consented) | Extraction F1 baseline recorded; rule unit tests; parse divergence flag works; file-security tests |
| **4. Jobs + Match** | 6–7 | Paste JD + URL + source, Haiku extraction → `JobRequirement`, skill normalization + alias dictionary, `JobMatch` formula in code, STRONG/PARTIAL/MISSING/UNKNOWN UI with evidence + user overrides | Match-class accuracy vs labeled set ≥ target; formula unit tests incl. hard-gap cap |
| **5. Tailor + Cover letter** | 8–9 | Path B suggestions (evidence-linked, "question to you"); Path A tailored `ResumeVersion` → highlighted-diff preview → undo/accept all → PDF/DOCX export (1–2 ATS-safe templates) with round-trip re-parse lint; fabrication checker; cover letter | **Fabrication rate = 0** on the guardrail suite; exported files re-parse with ParseHealth ≥ source |
| **6. Tracker + Dashboard** | 9–10 | `Application` from Job with immutable `ResumeVersion` link, source, statuses + `ApplicationStatusHistory`, `InterviewRound`, `Contact`, notes/tags, kanban (with keyboard alternative) + list, in-app reminders + due-follow-up emails (`Notification`), ghosting suggestion, CSV export, dashboard counts and funnel, read-only offline tracker cache (PWA) | Status-history integrity tests; kanban E2E; immutability test (edit creates new version) |
| **7. Mock Interview** | 11–12 | Blueprint from JD + resume, configurable session (type, 5/10/15 questions, difficulty), streaming questions, ≤ 2 adaptive follow-ups, two-pass evaluation with rubric + evidence quotes, model answer from own resume/FactBank, report + retry delta, practice-only notice | Rubric agreement with human-graded calibration set ≥ target; model-answer fabrication = 0 |
| **8. Hardening + Beta** | 13–14 | Data export (JSON + files), account deletion (≤ 30 days), purge jobs (24-month inactive, 12-month interview answers), minimal admin (usage, AI cost, flags, blocks, audit log, error log), `ProductEvent` funnel, plans/`UsageLedger` limits (beta mode), legal docs v1, security review, accessibility (axe) and Lighthouse passes, load smoke test | Beta launch checklist (§6) fully ticked |

**Why this order:** it follows the SRD's order, with deterministic foundations (parsing, rules, matching) before generative features. That way the eval harness has ground truth before any tailoring prompt exists.
**Possible swap [?]:** the tracker (Phase 6) uses no AI and could move to after Phase 2 for an earlier usable product. Decide at the Phase 2 review.

**Buffer:** the plan has no slack. Expect +20–30% (→ 17–18 weeks) for a part-time solo build.

## 3. Post-MVP roadmap
| Phase | Theme | Items |
|---|---|---|
| **P2 (months 4–6)** | Monetize + convenience | Safepay PKR billing (Sprint pass first, then Pro), browser extension (user-triggered capture from LinkedIn/Rozee pages only), voice mock interview (batch STT + TTS first), AI insights on analytics (data vs speculation labeled), TOTP MFA for users, PWA offline edit queue, web push + weekly digest, CSV import, scanned-PDF OCR (flagged), per-user RLS policies, malware scanning, shorter user-chosen interview auto-delete |
| **P3 (months 6–12)** | Global + scale | INTERNATIONAL market polish, merchant of record for USD, own-model stage 1–2 (consented data → distilled extraction model), streaming STT, interview personas library, email/calendar sync, pentest, DPIA refresh |
| **Later** | Expansion | Job-discovery agent (human approval required), university/coach plans (candidate-side only; avoid employer screening), SOC 2 Type I |

## 4. Definition of Done (per feature)
- [ ] Acceptance criteria from [02](02-features.md) met and demoed.
- [ ] Every user-owned query scoped by `userId`; authZ test proves another user gets 404.
- [ ] Inputs validated with Zod at the boundary; errors use the standard envelope.
- [ ] AI outputs schema-validated; invalid output handled (retry → graceful error).
- [ ] Eval suite for the touched AI task passes thresholds; no regression versus the last baseline.
- [ ] Unit + integration tests added; E2E updated if the core flow changed.
- [ ] Empty, loading, error and limit-reached states implemented; keyboard accessible; works at 360 px width.
- [ ] No PII in logs or analytics events (checked).
- [ ] `knowledge-graph.md` updated; ADR added if architecture changed.

## 5. Testing strategy
| Layer | Tool [P] | What | Gate |
|---|---|---|---|
| Unit | Vitest | Rules (P*/R*), match formula, normalization, PII masking, diff/fabrication checker, entitlement math | PR |
| Integration | Vitest + local Supabase (CLI, Docker) | Route handlers/services with a real DB, ownership, status history, UsageLedger | PR |
| AuthZ matrix | Vitest | Every endpoint × {owner, other user, anonymous, admin} | PR |
| AI contract | Vitest + recorded fixtures | Schema validation, malformed-output handling, retries, timeouts; LLM mocked | PR |
| **AI evals ("dry run")** | `evals/` runner (custom TS script) | Golden sets per task: extraction F1, match-class accuracy, fabrication rate (= 0), rubric agreement, schema-valid rate, cost/latency. Compares script vs LLM output to promote stable patterns into code | PR (small set) + nightly (full) + before any model/prompt change |
| Security | Vitest + custom corpus | Prompt-injection corpus (hidden text, "ignore previous…"), malicious/oversized files, XSS in AI output, rate limits | PR |
| E2E | Playwright | Core flow from PRD §6 DoD; kanban move; export/delete account | Main branch + pre-release |
| Accessibility | axe (Playwright) | Key screens, WCAG 2.2 AA | Pre-release |
| Performance | Lighthouse CI | Budgets from [03](03-ux-design.md) | Pre-release |

**Test data rule:** only synthetic or explicitly consented, anonymized resumes in the repo. Never real user data.

## 6. Beta launch checklist
- [ ] All MVP DoD flows pass E2E on production-like preview.
- [ ] Legal v1 published: Terms, Privacy Policy, AI Disclaimer, AUP, Cookies ([07](07-legal.md)); consent captured at signup.
- [ ] Data export + account deletion + purge jobs verified end to end.
- [ ] Anthropic spend limit set; app-level budget guard and kill switch tested.
- [ ] Rate limits and free/beta quotas enforced; abuse block works.
- [ ] Error digest email works, uptime check, GitHub Actions backup + restore tested once, Supabase keep-alive running.
- [ ] Security checklist from [06](06-security-privacy.md) MVP column complete.
- [ ] Marketing copy reviewed against the claims do/don't list.
- [ ] Feedback channel + willingness-to-pay survey live (target ≥100 respondents before pricing goes live).
- [ ] Upgrade to Vercel Pro **before** any public announcement (the private invite beta can stay on Hobby).

## 7. Risk register
| # | Risk | Likelihood | Impact | Mitigation |
|---|---|---|---|---|
| 1 | AI fabricates experience/metrics | Med | High (trust, legal) | FactBank, evidence links, fabrication checker, eval gate at 0 tolerance, user approval of diffs |
| 2 | Prompt injection via resume/JD | Med | Med | Untrusted wrapping, no tools, schema validation, hidden-text scan, injection test corpus |
| 3 | LLM cost runaway / free-tier abuse | Med | High | Quotas, UsageLedger, `RateLimitBucket` rate limits, vendor spend cap, kill switch, signup verification |
| 4 | Free-tier limits change or Vercel Hobby non-commercial clause | High (over time) | Med | Thresholds and upgrade path in [04](04-architecture.md); budget ~$20–45/mo at paid launch |
| 5 | Scope creep (solo) | High | High | Strict phase gates, out-of-scope list, P2 backlog |
| 6 | Parsing fails on Pakistani CV layouts (photos, tables, two columns) | Med | Med | PK CVs (≥40%) in the golden set from Phase 3, divergence flag, clear scanned-PDF message (OCR in P2) |
| 7 | Score misread as hiring probability | Med | Med | "Estimate" labeling, factor breakdown, disclaimer, no "ATS score" wording |
| 8 | Payments blocked (Stripe unavailable in PK; MoR eligibility unknown) | Med | Med | Free beta; Safepay for PKR; verify Paddle/Lemon Squeezy early |
| 9 | Data breach of resumes | Low | High | Encryption, authZ tests, minimal admin access, PII-free logs, incident plan |
| 10 | Competitor (RozeeGPT) bundles similar features | Med | Med | Differentiators: honesty, mock-interview depth, resume-version tracking |
| 11 | Free Supabase project pauses after 7 idle days, so the live demo breaks | High | Med | The daily GitHub Actions backup job also pings the app; upgrade to Supabase Pro (~$25/mo) at public launch |
| 12 | The in-house task queue drops or duplicates work | Med | Med | `FOR UPDATE SKIP LOCKED` claims, idempotency keys, stale-lock reclaim, FAILED tasks visible in admin, queue integration tests |

## 8. Open questions (rolled up)
See [PRD §8](../PRD.md#8-open-questions-). Phase-specific:
1. Phase 2 review: move the tracker earlier? (§2)
2. ~~Phase 3: OCR in MVP?~~ Resolved: P2 behind a flag (PRD §3).
3. Phase 5: which 2 export templates (one classic, one modern single-column)?
4. Phase 7: target numbers for rubric agreement and match-class accuracy, to set after the first labeled set exists (don't invent thresholds before measuring a baseline).
