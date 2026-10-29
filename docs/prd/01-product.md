# 01 — Product: Problem, Vision, Personas, Market, Pricing, Metrics

> Part of the [PRD](../PRD.md). The index wins on any conflict. Labels: **[D]** decided · **[P]** proposed · **[?]** open.
> Evidence lives in [`../research/`](../research/) (cited by file number, e.g. R01 = `01-resume-ats-competitors.md`). **Competitor prices are mostly secondhand and unverified (R01, R02, R03 caveats); re-check before any pricing decision.**
> Glossary names (`ParseHealth`, `JobMatch`, `FactBankItem`, `ResumeVersion`, `PK_LOCAL`, `FREE/PRO/SPRINT`, ...) are as defined in PRD.md section 5.

---

## 1. Problem statement

### 1.1 The job seeker's problem
Job seekers run a fragmented, anxious, low-feedback process:

| Pain | Evidence |
|---|---|
| Resume, tailoring, interview prep and tracking live in 4+ separate tools (or a spreadsheet) | R01 gap "Fragmented workflow"; R03 section 2 (most users start in Sheets/Notion/Trello) |
| Scores from existing tools are opaque and inconsistent; users suspect low scores are an upsell tactic | R01 gap "Score distrust" (secondhand; Reddit not directly readable) |
| Tools nudge users to stuff keywords or claim skills they lack; none advertises anti-fabrication guardrails | R01 matrix row "Anti-fabrication guardrails advertised": N for all but a LinkedIn warning |
| Real fixes are paywalled; billing dark patterns (trial-to-recurring, hard cancel, refused refunds) | R01 sections 4 and 6 (Zety, Resume.io, Resume Worded); R02 section 3 (Final Round AI) |
| Interview practice is generic, scores are ambiguous, no model answers rooted in the user's real experience | R02 sections 2-3 |
| Nobody can answer "which resume did I send to that company, and which source converts?" | R03 gaps 1-2: no competitor clearly freezes the sent file or offers source/version funnels |
| In Pakistan: global tools are USD-priced with no local payment rails, no regional conventions (photo, CNIC, father's name), no PKR pricing | R06 sections 2-4 |

### 1.2 The ATS myths (we state the facts, not the folklore)
The market is fueled by fear of "the ATS". Our product and marketing must be honest about what is true (R05 A3; R01 gaps):

| Myth | What the evidence says | Product consequence |
|---|---|---|
| "75% of resumes are rejected by ATS before a human sees them" | Traced to a 2012 marketing claim from a defunct vendor, no methodology ever published (R05 A3). **Unsupported.** | Never use the claim. Say so in help content. |
| "ATS auto-rejects you on a keyword score" | A small, vendor-funded survey of 25 recruiters: 23 said their system does not auto-reject on formatting/content; 2 had configured keyword-threshold rejection (R05 A3, confidence medium). Treat as directional, not proof. | `JobMatch` is a "fit estimate", never "your chance of passing the ATS". |
| "Format tricks beat the ATS" (white text, stuffing, PDF vs DOCX folklore) | Not supported; white-text stuffing is detectable and unethical (R05 myth row M1). | We enforce only real parse-failure causes (columns, tables, headers/footers, images), never myths. |
| "A 75-80% match score is the passing line" | Jobscan-style targets are tool conventions, not hiring thresholds (R01 Jobscan profile). | No pass/fail threshold language anywhere. |

**What is real** (R05 A3): (1) knockout/screening questions (work authorization, licence, location, years of experience) can auto-reject when an employer configures them; (2) a poorly parsed or keyword-poor resume gets *found less and ranked lower* in recruiter search, a soft rejection by invisibility; (3) application volume and recruiter attention are the main filters. Hence our two-axis scoring (section 4) and a "knockout risk" warning for hard-requirement gaps.

### 1.3 Problem we solve (one sentence)
Job seekers get black-box scores, fabrication-prone AI, generic practice, and no memory of what they sent; we give them an **honest, explainable, evidence-grounded workflow** in one place, priced fairly for emerging markets.

---

## 2. Vision, value proposition, positioning

### 2.1 Vision [P]
Be the job seeker's trustworthy co-pilot for the entire application cycle: know your fit, improve your resume without lying, practice, and track what you sent and what worked.

### 2.2 Value proposition (from SRD 1.2, refined) [P]
> **Understand your fit. Build honest applications. Practice smarter. Track everything.**

### 2.3 Positioning statement [P]
*For job seekers in Pakistan (and later globally) who feel lost between black-box ATS scanners, generic AI resume writers and spreadsheets,* **the product is an honest job-application copilot** *that scores your resume transparently, improves it using only facts you confirm, coaches you with job-specific mock interviews, and remembers exactly which resume you sent where. Unlike Jobscan, Teal or Rezi, it never invents experience, never claims to "beat the ATS", and never helps you cheat in a live interview.*

### 2.4 The "honest copilot" angle [D, from principles]
Honesty is the brand, not a footnote. Concretely:

| Promise | Mechanism | Where specified |
|---|---|---|
| We never invent your experience | Evidence-linked suggestions; anything unsupported is a question to you ("Do you have a number for this?") | principle 1; 02, 05 |
| Scores are explainable and labeled "estimate" | Computed in code from visible factors; the LLM explains, never decides the number | principle 3; 05 |
| We don't sell fear | No "beat the ATS", no "guaranteed interviews", no unsupported statistics | principle 4 |
| Practice only | No live-interview overlay, no screen-share evasion | principle 5 |
| You own your data | Export and delete self-serve; no training on your data without opt-in | principle 6; 06 |
| Fair billing | No trial trap, one-click cancel, public prices | section 5 |

Marketing copy rule: every claim on the website must be traceable to a product behavior or a cited source; keep a `claims-register` (list of public claims and their evidence) in the repo [P].

---

## 3. Personas

Persona details are [P] hypotheses built from R06 section 1 (personas a-c) and SRD section 2. **Validate with 8-10 user interviews and the pricing survey before launch [?].**

### 3.1 Ayesha, local candidate (Rozee/banks/mid-size firms) — market `PK_LOCAL`
| | |
|---|---|
| Profile | 22-30, 0-5 years' experience, applying via Rozee.pk, LinkedIn, email/WhatsApp, banks, local companies; mostly phone, desktop for CV edits |
| Goals | A clean CV that "looks professional", get callbacks, know what employers want, not embarrass herself in interviews |
| Pains | Unsure whether to include photo/DOB/father's name/CNIC (R06 section 2); USD tools too expensive, no local payment; generic templates; no feedback after applying |
| Jobs-to-be-done | Fix my CV in an evening; tailor it to a posting without lying; practice common HR/behavioral questions; remember what I applied to |
| Notes | Willing to pay only small PKR amounts (R06 section 5, all unverified); may pay by wallet/bank, not international card [?]. Free tier must be genuinely useful. |

### 3.2 Bilal, MNC / Gulf-bound professional — market `INTERNATIONAL`
| | |
|---|---|
| Profile | 27-40, 4-12 years' experience, targeting multinationals, large banks/telcos, Gulf employers that use enterprise ATS (R06 section 1, ATS usage is [U]) |
| Goals | Pass resume parsing, match senior-role requirements, present measurable impact, prepare for structured panel interviews |
| Pains | Local CV conventions (photo, DOB, marital status) hurt in international applications; hard to know which of many versions he sent; unclear knockout questions (years, work authorization) |
| Jobs-to-be-done | Convert a local CV into an international-format one; check `ParseHealth`; tailor per job while keeping a record of each `ResumeVersion`; rehearse tough panel questions |
| Notes | Highest willingness to pay; likely a SPRINT buyer (2-4 week focused push). |

### 3.3 Hamza, fresh graduate / student
| | |
|---|---|
| Profile | 21-24, final-year or recent graduate, thin experience, applying to management-trainee programs, internships, junior IT roles |
| Goals | First credible resume from limited material (projects, coursework, societies), first interview confidence |
| Pains | Doesn't know what counts as "experience"; tempted to inflate; MT programs use aptitude + case + panel (R06, [U]); cannot afford subscriptions |
| Jobs-to-be-done | Turn projects/FYP/society roles into strong bullets using only true facts; get a gap-honest view of what he lacks; practice behavioral and HR questions |
| Notes | Student discount (section 5.3); a university channel (section 6). Needs the `FactBankItem` flow to be easy: "Tell us what you did" prompts. |

### 3.4 Sana, freelancer / remote seeker
| | |
|---|---|
| Profile | 24-38, Upwork/Fiverr or remote-international applicant (R06 section 1: freelancing is large; figures [U]); payout via Payoneer |
| Goals | Land remote contracts or full-time international roles; stand out beyond a cheap CV gig |
| Pains | Global no-photo resume conventions unfamiliar; needs proposals and cover letters more than ATS CVs; English-fluency anxiety; inconsistent tracking across platforms |
| Jobs-to-be-done | Build a remote-ready resume (`INTERNATIONAL`); write grounded cover letters; practice interviews with foreign interviewers; track leads and sources |
| Notes | Proposal writing is **out of scope for MVP** [P]; cover letters cover the overlap. May pay in USD. |

### 3.5 Imran, career switcher
| | |
|---|---|
| Profile | 28-42, moving domain (e.g., teaching to data analytics, banking to product) |
| Goals | Reframe transferable experience honestly; know which requirements are genuine gaps; decide whether to apply |
| Pains | Tools reward keyword stuffing; no honest guidance when a required skill is truly missing (R01 gap "Honest gap guidance") |
| Jobs-to-be-done | See `STRONG/PARTIAL/MISSING/UNKNOWN` per requirement with reasons; mark "learning" or add evidence; get adjacent-experience phrasing without invention; rehearse the "why are you switching?" question |
| Notes | Core beneficiary of the requirement coverage map with user overrides (confirm / reject / learning / add-evidence). |

### 3.6 Persona priority [P]
MVP optimizes for **Ayesha, Hamza and Bilal** (largest reachable Pakistani base); Sana and Imran are served by the same features without dedicated work.

---

## 4. Competitive landscape

All prices **reported, unverified** unless marked official (R01-R03 caveats). RozeeGPT and Mustakbil data are thin (R06).

### 4.1 Summary table

| Competitor | Core | Score approach | Tracker | Interview practice | Price (reported) | Notable weakness (per research) |
|---|---|---|---|---|---|---|
| **Jobscan** | ATS scan, JD match, LinkedIn tips | Keyword/phrase overlap + format; strict matching; ATS-specific tips | Kanban + extension | N | free ~5 scans/mo; ~$50/mo (rep.) | Keyword-only; price; "score chasing" (R01) |
| **Teal** | Builder + tracker + extension | Keyword comparison; formula not public; free shows 5 keywords | Strong | Voice coach (R02) | Teal+ ~$29/mo (rep.) | Premium price; paywalled keywords; manual upkeep (R01, R03) |
| **Rezi** | ATS-focused builder, Rezi Score | Proprietary rubric; "oversold" per one review | N | AI interview (limited) | Free; Pro $29/mo; Lifetime $149 (**official**, R01) | Opaque score; no tracker |
| **Resume Worded** | Resume/LinkedIn scoring | Rubric: impact, brevity, style | N | N | ~$49/mo (rep.) | Billing/cancellation complaints; hidden price (R01) |
| **Enhancv** | Design-forward builder | Content health + ATS checker | N | N | ~$20-29/mo (conflicting) | Paywalled fixes; generic AI; template-vs-ATS tension (R01) |
| **Huntr** | Tracker-first + tailoring | Basic match | Strong; free 100 jobs (**official**, R03) | N | Pro $40/mo (**official**) | Expensive; no job discovery (R03) |
| **Simplify** | Autofill + Simplify+ | Match indicator | List | N | $19.99/wk, $39.99/mo (**official**, R01) | Auto-apply without review in Autopilot; manual submit otherwise (R01, R03) |
| **Final Round AI** | Mock + live copilot | Ambiguous scoring | N | Voice/video + **live stealth copilot** | ~$25-150/mo (conflicting) | Billing/refund complaints; ethics (R02) |
| **Yoodli** | Speech/roleplay coach | Counted delivery metrics | N | Voice/video; no JD+resume model answers | free / ~$8 / ~$20 (unverified) | Stiff personas, thin scenarios (R02) |
| **Google Interview Warmup** | Free practice, 5 field questions | No score; word/keyword insights | N | Voice/typed | Free | Not tailored to JD/resume; no model answers (R02) |
| **RozeeGPT** | Local AI CV builder, job match, interview prep | Unknown | Via Rozee | Yes (reported) | Not found [U] | Thin evidence; tied to one board (R06) |
| **Mustakbil** | Local job board + free resume builder | Unknown | N | N | Free ("free forever" claim) | Builder only; no analysis (R06) |

### 4.2 Where we win (differentiators tied to research gaps)

| # | Differentiator | Research gap it answers | Competitor status (per research) |
|---|---|---|---|
| 1 | **Evidence-linked suggestions + `FactBankItem`**: every rewrite cites the resume line or confirmed fact; the rest are questions | Fabrication / keyword stuffing; generic AI voice (R01 gaps; suggestions 1, 5) | No competitor advertises this (R01 matrix) |
| 2 | **Two-axis scores**: `ParseHealth` (deterministic) and `JobMatch` (hybrid, in code), plus `Readability`; sub-scores and method shown, all labeled "estimate" | Score distrust; no one separates parse risk from relevance (R01 gap, suggestion 2) | Opaque or single-number scores |
| 3 | **Requirement coverage map** (`STRONG/PARTIAL/MISSING/UNKNOWN`) with honest next steps and user overrides | Lexical-only matching; no honest gap guidance (R01 gaps, suggestions 3-4) | Keyword lists |
| 4 | **Frozen `ResumeVersion` per application** (immutable once linked) | No competitor clearly freezes the file sent (R03 gap 1) | Link only, or tailored AI versions |
| 5 | **Source and version analytics** (funnel by `Job source` and by `ResumeVersion`) | Funnel by source/version not clearly offered (R03 gap 2) | Basic stats only |
| 6 | **Ghosting detection + follow-up nudges** (suggest `GHOSTED`, draft follow-up) | Stale-application detection looks thin (R03 gap 3, suggestion 4) | Plain reminders |
| 7 | **JD + resume-grounded mock interviews** with anchored rubric, evidence quotes, and **model answers built from the user's own resume** (placeholders where no fact exists) | Generic questions; ambiguous feedback; no personal model answers (R02 section 2 gap, suggestions 1-3) | Google/Yoodli generic; some JD tailoring elsewhere |
| 8 | **Practice-only ethics**: no live copilot, no stealth overlay; stated in marketing and Terms | Trust/ethics concern around stealth tools (R02 section 8) | Final Round, Sidekick, Verve, LockedIn sell live assistance |
| 9 | **`PK_LOCAL` / `INTERNATIONAL` market mode** with PII lint (photo, DOB, father's name warnings; CNIC never on a resume) | No tool handles Pakistani conventions (R06 sections 2-3) | Global tools ignore; RozeeGPT unknown |
| 10 | **Fair pricing**: real free tier, short SPRINT pass, PKR pricing, no trial trap, one-click cancel, public price page | Dark-pattern billing; paywalled fixes; USD-only (R01 section 6, R02 section 3, R06 section 5) | Zety/Resume.io trial traps; Final Round refusals |
| 11 | **One workflow**: resume to job to interview to tracker in one app, with interview gaps feeding resume suggestions | Fragmentation (R01 gap; R02 suggestion 7) | Teal/Huntr bundle some, at $29-40/mo |

### 4.3 Honest competitive caveats
- Competitor depth in some areas is unknown (R01 open items); we do not claim "nobody does X" publicly unless verified at launch time.
- Large incumbents (Jobscan, Teal, LinkedIn) can copy features. Our durable edges are trust, local fit, price, and the integrated frozen-version/analytics data model, not any single feature.
- Evidence for local competitors (RozeeGPT, Mustakbil) is thin [U]. Do a hands-on teardown before launch [?].
- We deliberately do **not** compete on: designer templates (Enhancv/Kickresume), auto-apply (Simplify, Jobright), live interview copilots, LinkedIn profile optimization (phase 2+ at best).

---

## 5. Pricing and packaging

Plans, as in the PRD glossary: `FREE`, `PRO` (monthly), `SPRINT` (2-4 week pass). Enforced via `UsageLedger` and entitlement checks from day 1 [D]. **All numbers below are [P]; validate with a survey of at least 100 respondents (decided, [D]) before billing goes live. Canonical limits and spend guards are in PRD.md section 5b.** Competitor and market figures are unverified (see sources above).

### 5.1 Limits per plan [P]

| Entitlement | FREE | PRO | SPRINT | Beta (all users) |
|---|---|---|---|---|
| Resume analyses (`ParseHealth`/`Readability`) | 3 / month | 40 / month | PRO caps for the pass duration | FREE limits x2 [D] |
| Tailored `ResumeVersion`s + `JobMatch` | 3 / month | 30 / month | PRO caps for the pass duration | x2 |
| Mock interviews | 2 / month, up to 10 questions each | 15 / month (5/10/15 questions) | PRO caps for the pass duration (15-question sessions PRO/SPRINT only) | x2 |
| Cover letters | 3 / month | 30 / month | PRO caps for the pass duration | x2 |
| Application tracking | Unlimited [D from PRD] | Unlimited | Unlimited | Unlimited |
| Export (PDF/DOCX), data export, delete | Always free; ATS-safe PDF/DOCX included [P] | Same | Same | Same |
| Follow-up drafts, ghosting nudges | Yes | Yes | Yes | Yes |
| Priority AI model tier | Standard | Standard | Standard | Standard |

Notes:
- Limits are canonical in PRD.md section 5b [P]; failed AI calls do not consume quota. Re-derive from measured AI cost per action once `AiRequest` data exists (see section 7 cost metric). Spend guards (per-user monthly ceiling FREE $0.75 / SPRINT $4 / PRO $6, daily caps, global beta cap $10/day) are in PRD.md section 5b and 06.
- Fixes are **not paywalled**: FREE shows the actionable fix for each `ParseHealth` finding, directly answering the "paywalled fixes" complaint (R01 section 6) [P]. The paid lever is volume (analyses, versions, interviews), not honesty or basic export.
- The tracker is never limited, because it is the retention anchor and has near-zero AI cost [P].

### 5.2 Price proposals [P] (validate by survey)

| Plan | PKR | USD (later, via merchant of record) | Basis |
|---|---|---|---|
| FREE | 0 | 0 | |
| SPRINT (2-4 week pass) | 1,299 (range 999-1,499) | $9-15 (anchor $12) | R06 section 5 [U]; fits the 1-3 month search cycle (R01 section 6) |
| PRO monthly | 1,499-1,999 | $12-19 | R06 section 5 [U]; below the $20-30 mid-cluster and $50 Jobscan anchor (R01 section 6) |
| PRO annual | 9,999-12,999 | ~$79-99 | R06 section 5 [U]; annual is absent at Huntr/Teal (R03 gap 8) |
| Mock-interview add-on (packs) | 300-500 per session [?] | n/a | R06 section 5 [U]; only if COGS demand it |

PKR figures are judgment calls (R06 marks them [U]); revisit given PKR depreciation. USD billing waits on an open question: whether Paddle/Lemon Squeezy accept Pakistan-based sellers (PRD open question 4; R06 section 4).

### 5.3 Student and regional pricing [P]
- Student/fresh-grad discount 40-50% via `.edu.pk` email or student ID check (R06 section 5, [U]); SPRINT for students about PKR 599-799.
- Global PPP pricing keyed to billing country, not IP only (R06).
- University bulk codes later (Rezi has an edu plan, R01 section 6).

### 5.4 Billing principles [D/P]
1. **No trial traps.** No card required for FREE; no "$1 trial that auto-converts" (R01 section 6) [P].
2. **SPRINT is a one-time pass that does not auto-renew**; PRO renews only with a prominent, plain-language notice and a reminder email before renewal [P].
3. **One-click cancel** in settings, effective at period end, no phone call or chat gate [P].
4. **Public price page**; price shown before account creation (contrast Resume Worded, R01) [P].
5. **Refund policy**: written, simple (proposed 7 days on first PRO/SPRINT purchase if usage is low) [?] -> legal review (07).
6. PKR payments through Safepay (cards + wallets) after local onboarding; recurring PKR is weak/uncertain, so lean on one-time passes first (R06 section 4) [P]. Needs NTN/entity and a Pakistani tax adviser (PRD open questions 3-4).
7. Never charge for deleting or exporting data.

### 5.5 Beta plan [D: free beta first; details P]
| Item | Plan |
|---|---|
| Duration | 6-10 weeks after MVP [?] |
| Access | Invite codes / waitlist; target 50-150 users across personas 3.1-3.3 [?] |
| Billing | Off; plans and entitlements already live; FREE limits doubled [D] |
| Learn | Activation funnel, eval quality, suggestion acceptance, AI cost per active user, pricing survey, testimonials |
| Exit criteria | Section 7 targets met for activation and AI quality; fabrication-flag rate 0 in eval; no open P0 security/privacy issues (see 06, 08) |
| Founding users | Offer beta users a SPRINT-equivalent or discounted first PRO period [?]; no promises of lifetime access |

---

## 6. Go-to-market

### 6.1 Pakistan first [P]
Constraints: solo founder, ~15-20 h/week [D]; zero ad budget assumed; PWA/mobile-first; WhatsApp-shareable (R06 section 6).

| Channel | Tactic | Notes |
|---|---|---|
| Universities | Free "CV clinic" sessions for final-year students; partner with career offices; student pricing | Persona 3.3; cheapest trust-builder; measure signups per session |
| Career societies and student clubs | Workshops ("Fix your CV honestly in 30 minutes"), ambassador codes | Cheap, repeatable |
| LinkedIn content | Founder-led posts: ATS myth-busting, before/after anonymized CV fixes (with consent), CNIC/photo/DOB do's and don'ts for `PK_LOCAL` vs `INTERNATIONAL` | Plays to the honest-copilot brand; every statistic must be sourced |
| Job fairs and hiring events | Booth/QR code, free CV checks | Event calendars unverified [?] |
| WhatsApp groups, Facebook job groups, Reddit r/pakistan-style communities | Helpful answers, not spam; follow each community's rules | Low cost |
| SEO/blog | Guides: Pakistani CV format, mock interview Q&A, "does ATS reject you?" | Long-term; keep claims evidence-linked |
| Freelancer communities | Remote-ready resume and cover-letter guides | Persona 3.4 |
| Referrals | "Invite a friend, both get extra analyses" | Capped to prevent abuse [P] |

Not now: paid ads, influencer sponsorships, employer/recruiter sales (employer-side features are out of scope; see PRD section 7).

### 6.2 Later: global [P]
- Switch on USD billing via a merchant of record once seller eligibility is confirmed (PRD open question 4).
- Product Hunt / Indie Hackers launch; comparison pages ("honest alternative to Jobscan") with verified, dated competitor facts only.
- Positioning for international users: transparent scoring, privacy, fair pricing, practice-only ethics.
- B2B2C pilots (universities, bootcamps) after PRO is stable (Rezi's edu plan is a precedent, R01).

### 6.3 Trust assets to build before launch [P]
Public "How scoring works" page, "What we do with your data" page, `claims-register`, a visible changelog, and an eval-results summary (pass rates, no private data).

---

## 7. Success metrics / KPIs

Targets are **[P] hypotheses** with no baseline data; set final targets after the beta. No industry benchmarks are cited because none were found in the research.

### 7.1 North star [P]
**Weekly active job seekers who complete a tailored application** (= in one week, a user links a frozen `ResumeVersion` to an `Application` for a specific `Job`). It captures value across analysis, tailoring and tracking, and cannot be gamed by browsing.

### 7.2 Activation, engagement and retention

| Metric | Definition | Initial target [P] |
|---|---|---|
| Activation | % of new users who upload a resume and see `ParseHealth`/`Readability` within first session | 60% |
| Aha moment | % who get a `JobMatch` for a pasted job in first 3 days | 40% |
| Tailored application | % who create an `Application` with a linked `ResumeVersion` within 14 days | 25% |
| Mock interview adoption | % of activated users who complete a session within 30 days | 25% |
| W4 retention | % of activated users with any meaningful action in week 4 | 25% (job seeking is episodic; churn on getting hired is expected) |
| Tracker stickiness | Median tracked applications per active user per month | track, no target yet |
| Free-to-paid (after billing live) | % of activated users purchasing SPRINT/PRO | 3-5% [?] |
| Time to first value | Minutes from signup to first `ParseHealth` | under 5 |

### 7.3 AI quality (see 05 for the eval harness)

| Metric | Definition | Target |
|---|---|---|
| Eval pass rate | % of `EvalCase`s passing on every prompt/model change (CI gate) | >= 95% overall; 100% on guardrail cases [P] |
| Suggestion acceptance rate | accepted / (accepted + rejected) `Suggestion`s | track; healthy band 40-70% [?]; very high may signal rubber-stamping, very low signals irrelevance |
| **Fabrication-flag rate** | Outputs where a claim has no evidence in profile/`FactBank`/resume | **0 in eval and production (hard target)** [D from principle 1]; any production flag is a P0 incident |
| Schema-validation failure rate | AI outputs failing Zod validation before retry | below 2% [?] |
| Score stability | `JobMatch`/`ParseHealth` recomputation on identical input differs | 0 for deterministic parts |
| Interview rubric agreement | Model vs human-graded calibration set within +-1 on >= 80% (per R02 section 4) | >= 80% |
| User-reported wrong/unsafe output | "Report this suggestion" rate | track; review all |

### 7.4 Economics and trust

| Metric | Definition | Target |
|---|---|---|
| AI cost per active user (monthly) | Sum of `AiRequest` cost / MAU | set after beta; must be well below SPRINT/PRO revenue per user [?]. Pre-beta estimates: analysis about $0.04, tailored version about $0.05, interview about $0.09 / $0.17 / $0.25 for 5/10/15 questions ([05](05-ai-engine.md) section 11) |
| Gross margin on paid plans | Revenue less AI, infra, payment fees (Safepay ~2.5-3% per R06, unverified) | >= 70% [?] |
| NPS | Survey after first completed application and after day 30 | >= 40 beta [?] |
| Support load | Tickets per 100 active users | track |
| Billing complaints | Refund disputes / chargebacks | ~0 (brand promise) |
| Data requests | Export/delete completed within SLA | 100% (see 06) |
| Prompt-injection / abuse blocks | Admin dashboard counts | track |

### 7.5 Portfolio-stage metrics [D from SRD]
The primary goal is portfolio quality and real engineering skill (SRD section 35): coverage of tests, E2E for the core flow, eval harness running in CI, a deployed demo with seeded data. Tracked in 08.

---

## 8. Brand-name ideas [?]

Status: the brand name is still open (PRD.md section 8, question 1).

Working title: "AI Job Application Copilot" [D]. Brand chosen before launch [D]. Ideas are unvetted; **check domain availability (.com/.pk), social handles, trademark (Pakistan IPO, USPTO/EUIPO) and meaning in Urdu/Hindi/Arabic before choosing.** The word "copilot" is heavily used by large vendors; avoid it in the brand name [P].

| # | Name | Rationale |
|---|---|---|
| 1 | **Honest CV** | Says the promise; easy to say; narrow (resume only) |
| 2 | **Sach** (Urdu: truth) | Short, memorable, ties to honesty; check for existing "Sach" brands |
| 3 | **Hirely** | Familiar suffix pattern; likely taken or crowded |
| 4 | **ApplyTrue** | Combines action and honesty |
| 5 | **Kamyab** (Urdu: successful) | Local resonance; may limit global appeal and is likely used by others |
| 6 | **Rozgar** (Urdu: livelihood/employment) | Strong local meaning; close to "Rozee"; trademark risk |

Shortlist rule: pick two that pass domain + trademark checks, test with 5-10 target users, then decide.

---

## 9. Non-goals

Aligned with PRD section 7 plus product-level decisions.

| Non-goal | Why |
|---|---|
| Auto-apply or browser automation | Principle 2 (user control); ToS risk (R03 section 6); not our trust position |
| Live-interview copilot, overlay, screen-share evasion, capturing real interviews | Principle 5; ethics (R02 section 8) |
| Scraping job boards | ToS/legal risk (R03 section 6); user-initiated paste/URL/source picker only [D] |
| Employer/recruiter-side tools (ranking candidates, screening) | Would make the product EU AI Act high-risk (PRD section 7) |
| Claiming to "beat the ATS", guaranteeing interviews, predicting hiring probability | Principle 4; myths in section 1.2 |
| Designer-template marketplace | Not our wedge; ATS-safe layouts only (R01 gap on templates) |
| Voice/video interviews in MVP | Phase 2 (R02 section 6); text only now [D] |
| Native mobile apps | Responsive web + PWA [D] |
| Urdu UI or non-English resume output | English only, permanently [D]. Note: R06 suggests Roman Urdu tolerance in interviews; treat as a conversation-quality test, not a UI feature [?] |
| Government-form filling (CNIC/religion/domicile forms) | Separate niche with low ATS relevance (R06 section 1); CNIC never placed on a resume [D] |
| LinkedIn profile optimization, proposal writing for freelancers | Possible later; not MVP [P] |
| Teams, universities, B2B dashboards, multi-agent job discovery | Later [PRD section 7] |
| Training our own model on user data without explicit opt-in | Principle 6 [D] |
| Full CRM (beyond lightweight `Contact` linking) | Tracker stays lightweight (R01 suggestion 12) |
| Email inbox sync auto-changing statuses | Considered later with consent and user confirmation only (R03 gap 4) [?] |

---

## 10. Open questions for this section [?]
1. Final PKR prices (and any limit changes) after the survey; survey size is decided at >=100 respondents.
2. Whether PKR recurring subscriptions are viable via Safepay or only one-time passes (R06 section 4).
3. Verified live prices of Jobscan, Teal, Resume Worded, Enhancv, Kickresume, Careerflow, Yoodli (R01/R02 open items).
4. RozeeGPT pricing, features, and whether Rozee.pk could become a competitor or partner (R06 open item 3).
5. Student verification method that is cheap and not abusable.
6. Targets in section 7 are placeholders until beta data exists.
