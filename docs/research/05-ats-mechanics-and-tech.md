# 05 - ATS Mechanics, Recruiter Readability, and Technical Approach

Date: 2026-10-20. Confidence tags: [H] primary/official source, [M] multiple consistent secondary sources, [L] single/secondary blog or my own background knowledge (verify before relying on it).
Research note: vendor-specific parser internals (Workday, Lever, iCIMS, Taleo, SmartRecruiters, Ashby) are NOT publicly documented in detail. Per-vendor behavior below is [L]/[M]; the plan is to rely on conservative vendor-agnostic rules and verify with real test uploads.

---------------------------------------------------------------
## PART A - ATS and RECRUITER READABILITY

### A1. How ATS parsing works (generally)
Pipeline: file -> text extraction (PDF text layer / DOCX XML) -> section segmentation (heading dictionary) -> entity extraction (name, contact, employers, titles, dates, education, skills) -> fill candidate profile fields. The original file is always stored and shown to recruiters; a failed parse leaves fields empty / just attaches the file (Greenhouse support: https://support.greenhouse.io/hc/en-us/articles/200989175-Unsuccessful-resume-parse [M, cited via secondary]).

| Vendor | What is known | Conf. |
|---|---|---|
| Greenhouse | Parser autofills profile; failed parse just attaches file; docs reportedly list columns, tables, headers/footers as failure causes; ~2.5 MB limit reported. Has rules-based Auto-Reject on application-question answers (Plus/Pro tiers), not on resume text. | M |
| Lever | No public parser docs found. Has AI match features; surveys say many recruiters ignore match scores. | L |
| Workday | Parser/skills features product-internal; ranking sits in add-ons (HiredScore, acquired by Workday). Mobley v. Workday (N.D. Cal. 3:23-cv-00770) is live: June 2026 ruling let claims proceed; Workday can be treated as an "agent" of employers. Legal risk pushes vendors toward human-in-the-loop. | M |
| iCIMS, Taleo, SmartRecruiters, Ashby | No authoritative public parser docs found. Taleo is oldest/most brittle (folk wisdom: plain single-column). Ashby/SmartRecruiters use modern AI parsers, more tolerant. | L |

Sources: https://enhancv.com/blog/how-does-greenhouse-work/ ; https://www.akingump.com/en/insights/ai-law-and-regulation-tracker/court-allows-discrimination-claims-against-ai-hiring-tool-to-proceed-or-mobley-v-workday-inc ; https://www.shrm.org/in/topics-tools/news/technology/workday-ai-lawsuit-wake-up-call-hr

### A2. What actually breaks parsing

| Element | Effect | Severity | Check |
|---|---|---|---|
| Multi-column layouts | Reading order guessed wrong; sidebar skills/dates interleave into experience | High on old parsers, low-med on modern | D: x-coordinate block clustering (pdfjs/PyMuPDF) |
| Tables / text boxes | Separate objects; content dropped or detached from role | High | D: DOCX w:tbl / w:txbxContent; PDF rect/grid detection |
| Contact info in header/footer | Often skipped -> missing name/email | High | D: DOCX header parts; PDF text in top/bottom ~6% margin |
| Images, icons, skill bars, scanned PDFs | No text layer / unparsed | Critical | D: chars per page vs page images |
| Non-standard headings | Section not recognized | Med-High | D: heading dictionary + AI suggestion |
| Odd fonts, non-embedded fonts, LaTeX ligature/encoding quirks | Garbled or split text | Med | D: U+FFFD, letter-spacing artifacts |
| Inconsistent/missing dates | Tenure mis-computed | Med | D: regex |
| Oversize (>~2.5 MB) / password-protected | Parse fail | Med | D |
| PDF vs DOCX | Both fine on modern ATS if text-based. DOCX historically safest for old systems; PDF safer for layout. No universal winner. | - | Follow the posting; default text-based PDF, offer DOCX |

Sources (secondary but consistent): https://jobshinobi.com/blog/should-you-use-columns-in-an-ats-resume ; https://jobshinobi.com/blog/should-you-use-tables-in-an-ats-resume ; https://www.dbta.com/Columns/Emerging-Technologies/Resumes-Data-Parsing-and-How-Candidates-Get-Noticed-in-Database-Driven-Hiring-176075.aspx . Caution: much online ATS advice is SEO content from resume-tool vendors with an incentive to exaggerate; prefer WARN over ERR where evidence is soft.

### A3. Do ATS auto-reject by keyword score? (the "75%" claim)
- "75% of resumes are rejected by ATS before a human sees them": a blog traces it to a 2012 marketing claim from Preptel (defunct), no methodology ever published [L: https://blog.theinterviewguys.com/?p=1967]. Verdict: unsupported, treat as myth.
- Enhancv interviews with 25 US recruiters/HR: 92% said their system does not auto-reject on formatting/content; 2 of 25 (8%) configured keyword-threshold rejection. Small, vendor-funded sample; dating inconsistent across coverage [M]. https://betanews.com/2025/11/10/study-debunks-viral-claim-that-ai-filters-out-most-job-applicants/ ; https://itbrief.co.uk/story/study-reveals-ats-rarely-auto-rejects-cvs-debunks-75-myth
- Same coverage: 56% of recruiters turn off/ignore AI match scores; 36% use only as a guide [M].
- What IS real: knockout/screening questions (work authorization, licence, location, years of experience) can auto-reject (Greenhouse Auto-Reject on question answers). Resume-text rejection exists only if an employer configures it.
- Real "filters": application volume, recruiter attention, and database search. A resume that parses badly or lacks the posting terms is not found or ranks low: soft rejection by invisibility, not formal auto-reject.
- Product positioning: do NOT promise "beat the ATS robot". Say: make it parse correctly, be findable by recruiter search, read well in ~7 seconds. Label any score "readability and match estimate", never "ATS score".

### A4. How recruiters search/filter
- Knockout/screening questions at apply time: deterministic, real [M].
- Boolean/keyword search over parsed text (e.g. "product manager" AND (SQL OR Looker)); exact phrases, so exact job titles and spelled-out + acronym forms matter [L/industry practice].
- Filters on parsed fields (location, last title, years, education): need correct parsing [L].
- Ranking/match add-ons: advisory; many recruiters ignore [M].
- Human triage of top results; volume is the main rejector [M]. https://emexmag.com/myth-busted-the-ats-isnt-rejecting-your-candidates-overwhelmed-recruiters-are/

### A5. Recruiter reading studies
- Ladders 2018 eye-tracking: average initial screen 7.4 s (about 6 s in 2012); two stages (timed real screening, then eye-tracking of selected resumes); clear labeled sections, bold titles, bullets did well; clutter, multiple columns, long sentences did poorly; attention goes to name, current title/company, previous title/company, dates, education. https://www.hrdive.com/news/eye-tracking-study-shows-recruiters-look-at-resumes-for-7-seconds/541582 ; report PDF: https://csuglobal.edu/sites/default/files/blog-files/theladders-eyetracking-studyc2.pdf [M]
- Critique: 7.4 s is the keep/discard first pass, not total read time; small sample; "6 seconds" is overquoted (https://www.ere.net/is-the-6-second-resume-scan-a-myth/). Ignore untraceable secondary stats ("2.3x fixation for quantified bullets", "73% rejected over formatting") [L].
- Implication: top third of page 1 carries name, target title, recent role + dates; scannable bullets. "1 page" is a convention, not a researched law.

### A6. RULEBOOK (implementable)
D = deterministic, AI = LLM check. ERR = likely parse failure, WARN, TIP. Evidence: F = fact/consistent, C = convention, M = myth.

| ID | Rule | Type | Sev | Ev. |
|---|---|---|---|---|
| P1 | Text layer exists (>=200 chars/page; not image-only) | D | ERR | F |
| P2 | Name/email/phone in body, not header/footer/image | D | ERR | F |
| P3 | No tables/text boxes holding content | D | WARN | F |
| P4 | Single-column reading order (column detection; compare two extractors) | D | WARN | F |
| P5 | Standard headings (Experience, Education, Skills, Summary, Projects, Certifications); synonym map; flag creative headings | D+AI | WARN | F |
| P6 | Fonts embedded; text extracts to clean Unicode | D | WARN | F |
| P7 | PDF (text-based) or DOCX, <2.5 MB, no password | D | ERR | F |
| P8 | Consistent dates; each role has title+employer+dates | D | WARN | F |
| P9 | No info in icons/graphics/skill bars | D+AI | WARN | F/C |
| P10 | Standard bullet glyphs | D | TIP | C |
| R1 | Title+employer+dates visible in top half of page 1 | D | TIP | C |
| R2 | Bullets start with action verb, <=2 lines, contain outcome | AI | TIP | C |
| R3 | Quantified impact in about 40%+ of bullets (heuristic, not research-derived) | D+AI | TIP | C |
| R4 | Length: 1 page under 10 yrs, <=2 otherwise | D | TIP | C |
| R5 | Buzzwords, first-person, dense paragraphs | AI | TIP | C |
| R6 | Tense/spelling consistency | AI | TIP | C |
| R7 | Spelled-out + acronym on first use for key skills/titles | D+AI | TIP | C |
| K1 | JD hard requirements (degree, licence, years, location, work authorization) present; warn on knockout risk | D+AI | WARN | F |
| K2 | JD must-have skills covered with evidence in experience | hybrid (B2) | WARN | C |
| M1 | DO NOT ENFORCE (myths): "PDF always rejected", "must be .docx", "need 75%+ keyword match", "white-text keyword stuffing works" (detectable, unethical), "only Arial", "photo auto-rejects" | - | - | M |
| M2 | Never claim an "ATS score" predicts hiring odds; no vendor publishes one | - | - | M |

Honesty rule for generation: never fabricate experience; tailoring only rephrases/reorders user-supplied facts; surface gaps instead of inventing skills.

---------------------------------------------------------------
## PART B - TECHNICAL APPROACH

### B1. Resume parsing / text extraction

| Option | Lang | Layout/columns | OCR | Pros | Cons |
|---|---|---|---|---|---|
| unpdf (pdf.js wrapper) | TS | Raster order, no column logic | No | No native deps, serverless/edge OK | Same limits as pdf.js |
| pdf-parse | TS | Basic | No | Simple | Stale wrapper |
| pdfjs-dist | TS | Text items with x/y/font: enables our own column, header/footer, font checks | No | Best raw material for deterministic checks | More code |
| mammoth | TS | DOCX -> HTML/text; weak on tables, ignores headers/footers | n/a | Clean text | Not a validator: inspect raw DOCX XML (JSZip + XML parser) for P2/P3 |
| Apache Tika | Java server | Basic | via Tesseract | Many formats | Heavy JVM sidecar |
| PyMuPDF / PyMuPDF4LLM | Python | Good blocks/bboxes, reading order, markdown | plugin | Fast, fonts/images/bboxes | AGPL (commercial license needed for SaaS) |
| Docling (IBM) | Python | Best open-source layout analysis | built-in | MIT, accurate | Heavy models, slow cold start |
| LLM vision (Claude/GPT with PDF/images) | API | Reads like a human; columns, scans | yes | One call does OCR+layout+structure | Cost/latency; it is NOT an ATS simulator (it "repairs" what real parsers miss) |

Sources: https://www.pkgpulse.com/guides/unpdf-vs-pdf-parse-vs-pdfjs-dist-pdf-2026 ; https://unstract.com/blog/evaluating-python-pdf-to-text-libraries/ ; https://themenonlab.blog/blog/best-open-source-pdf-to-markdown-tools-2026 [M/L: blog benchmarks; no authoritative multi-column benchmark found. Run our own on ~30 real resumes.]

Recommendation (TS-only, solo-friendly):
1. Two-pass design: (a) "ATS-simulator" extraction = pdfjs/unpdf raster-order text + DOCX XML inspection, feeding deterministic checks and a "what an ATS likely sees" preview; (b) "semantic" extraction = cheap LLM (PDF/image input) -> structured JSON. Large divergence between (a) and (b) = parse-risk flag. This is a differentiator and avoids a Python service.
2. Scanned PDFs: detect via P1; fall back to LLM vision OCR (no Tesseract infra) and tell the user an ATS would see nothing.
3. Add a Python sidecar (PyMuPDF/Docling) only if TS column detection proves insufficient; mind PyMuPDF AGPL.

### B2. Keyword/skill matching - hybrid design

| Approach | Pros | Cons |
|---|---|---|
| Deterministic (taxonomy + aliases + regex) | Explainable, cheap, repeatable, mirrors recruiter boolean search | Misses paraphrase/implicit skills |
| Embeddings | Semantic similarity | Opaque; false positives (Java vs JavaScript); weak at must-have logic |
| LLM judge | Understands context/evidence | Non-deterministic, cost, injectable |

Taxonomies (from background knowledge, verify licences) [L]: ESCO https://esco.ec.europa.eu (open, multilingual, alt labels); O*NET https://www.onetcenter.org/database.html (US occupations, technology skills); Lightcast Open Skills https://lightcast.io/open-skills (largest, check terms).

Recommended explainable 0-100 Match Score:
1. LLM (cheap tier) extracts JD -> {must-haves, nice-to-haves, titles, years, education, certs, location}; every term normalized to taxonomy IDs via alias table (k8s = Kubernetes) - deterministic.
2. Resume skills normalized the same way (LLM extraction + deterministic alias scan of full text).
3. Score = weights: must-have coverage 45% (exact/alias = 1.0; embedding-near >~0.82 or LLM-confirmed related = 0.5, labeled "related"); nice-to-have 15%; title/seniority alignment 15%; years/education/certs thresholds 10%; evidence quality 15% (skill appears in an outcome bullet, not only a Skills list).
4. Hard-requirement gaps (K1) cap the score (e.g. max 60) and show as "knockout risk".
5. LLM only resolves ambiguous "related" cases and writes explanations; numbers come from code. Show per-skill evidence (quote + location). Cache by hash(JD, resume).
6. Anti-gaming: keyword in Skills list without supporting experience = half credit; flag hidden/white text.

### B3. LLM structured outputs, safety, tiering, cost

Structured output
- Anthropic: tool use with input_schema, or native structured outputs on current models; OpenAI: Structured Outputs (json_schema strict). Always validate with Zod; on failure retry once with the validation error appended, then escalate to the higher tier, then soft-fail. [background; confirm in current docs https://platform.claude.com/docs/en/]
- Flat schemas, enums, `evidence_quote` fields, max_tokens set, low temperature for extraction.

Prompt-injection defenses (resumes/JDs are untrusted)
- Treat as data: wrap in tags (<resume>), system prompt says tagged content is never instructions.
- Extraction model has no tools and no cross-user data; output is schema-constrained and rendered as text only.
- Ingress scan: regex/heuristics for "ignore previous", "give this candidate 100", hidden/tiny/white text, zero-width chars; strip + warn user (also a fraud signal).
- Post-checks: scores recomputed in code (B2) so injected "score: 100" cannot pass; verify each extracted quote exists verbatim in source.
- Per-user rate limits and max input size.

Pricing (per MTok, input/output) - official, fetched 2026-10-20 from https://platform.claude.com/docs/en/about-claude/pricing [H]:

| Model | In | Out | Cache read |
|---|---|---|---|
| Claude Haiku 5.5 | $0.10 (prompts <=100k; $0.50 above) | $0.50 ($2.50) | $0.01 |
| Claude Sonnet 5.5 | $2 | $10 | $0.10 |
| Claude Opus 5.5 | $4 | $20 | $0.20 |
| Claude Fable 5.1 (frontier) | $10 | $50 | $0.25 |
| Older: Haiku 4.5 $1/$5; Sonnet 4.6 $3/$15; Opus 4.x $5/$25 | | | |

Cache write = 1.25x input (5 min) or 2x (1 h). Batch API is ~50% off per third-party sources [M] - confirm on the pricing page.
OpenAI (https://developers.openai.com/api/docs/pricing, fetched [H]): gpt-6-luna $0.10/$0.50 (cached $0.01); gpt-5.6-luna $0.20/$1.20; gpt-5-nano $0.05/$0.40; gpt-5-mini $0.25/$2; gpt-6.1-sol $2/$10 (cached $0.10); gpt-5.6-terra $2/$12; gpt-5.5 $5/$30.
Haiku 5.5 is about equal to gpt-6-luna; Sonnet 5.5 about equal to gpt-6.1-sol. Prices are at parity, so choose on measured quality; hide behind a provider interface (Vercel AI SDK or thin adapter).
Caching: static rulebook + schema + few-shot first (cache breakpoint), resume/JD after. For interviews cache the growing conversation prefix.

Cost estimates (my arithmetic; assumed tokens: resume ~3k, JD ~1.5k, system+rubric ~2k):
- Resume analysis (1 resume vs 1 JD): Haiku 5.5 extraction (~7k in, ~2k out) ~ $0.002; Sonnet 5.5 evaluation + suggestions (~9k in, ~3k out) ~ $0.045. Total about $0.05. All-Haiku draft ~ $0.005. Adding a full tailored rewrite ~ +$0.03. Opus 5.5 throughout ~ $0.10.
- Mock interview (text, 10 Q&A turns): Sonnet 5.5 interviewer with caching ~ $0.04, final rubric evaluation (12k in, 2k out) ~ $0.045; total about $0.09. Haiku interviewer + Sonnet evaluator ~ $0.05.
- Voice (STT/TTS) NOT researched; likely dominates cost. Research before offering voice.
- At ~$0.05-0.10 per session, a $10-15/mo plan with fair-use caps has >90% gross margin on LLM cost. Free tier: 1-2 Haiku analyses, rate-limited.

### B4. Resume generation / export

| Option | ATS-safety | Fit | Verdict |
|---|---|---|---|
| docx (npm) | Excellent: real text, headings, bullets, no tables | Pure TS, editable by user | PRIMARY for DOCX |
| @react-pdf/renderer | Good: real text layer, embedded fonts | Pure TS, serverless-capable, React templates | PRIMARY for PDF |
| Typst (CLI or WASM) | Excellent typography, clean text | Needs binary/WASM, new template language | v2 polish option |
| LaTeX | Good but ligature/encoding quirks; heavy toolchain | Hard to host | Avoid |
| Headless Chrome (Playwright) | Good with simple HTML/CSS; high fidelity | Heavy on serverless (container/worker), slow cold start | Only if HTML/CSS templates wanted; run in a worker |

Template approach: ONE canonical JSON resume schema (JSON Resume-compatible) -> multiple renderers -> 3-5 ATS-safe single-column templates (no tables/columns/icons/images, standard headings, 10-11 pt common fonts, real bullets, contact in body, PDF title/author metadata). Run our own linter (A6) on every export (round trip: generate -> extract with pdfjs -> compare to source). Optional "design-forward" variant clearly labeled not ATS-safe.

### B5. Stack comparison

| | (a) React+Vite SPA + Express + Postgres/Prisma | (b) Next.js full-stack + Postgres | (c) Supabase (auth+db+storage+RLS) |
|---|---|---|---|
| Solo-dev fit | Two deploy units, own auth/CORS/uploads | One repo, one deploy, server actions/route handlers | Fastest to auth/storage; pairs with (a) or (b) |
| SEO/marketing | Weak (SPA) unless separate site | Strong (SSR/SSG); matters for resume-SaaS acquisition | Depends on front end |
| Long jobs (LLM/PDF) | Persistent server handles easily | Serverless timeouts -> need queue/streaming | Edge functions limited; use queue |
| Auth | Roll your own (security burden) | Auth.js / Better Auth / Clerk | Built-in + RLS authorization |
| Portfolio value | Shows full-stack breadth (matches SRD) | Most standard/hireable in 2026 | BaaS skill, less backend depth shown |
| Risks | Reinventing auth/upload | Vercel limits/cost at scale | RLS misconfig; coupling (still plain Postgres) |

Recommendation [judgment, L]: (b) Next.js (App Router, TypeScript) + Postgres + Prisma (or Drizzle), using Supabase only as managed Postgres + Storage (or Supabase Auth if you want zero auth code; Better Auth/Auth.js to avoid coupling). One codebase, SSR for SEO pages, preview deploys, strong portfolio signal. Heavy work (parsing, LLM chains, PDF render) goes to background jobs. If the founder's SRD requires Express, the defensible variant is Next.js front end + separate Node worker/API on Railway/Fly.

Hosting
| Host | Notes |
|---|---|
| Vercel | Best Next.js DX; function duration/pricing limits; pair with a queue for long tasks |
| Railway / Render | Simple long-running Node workers, Postgres, cron; predictable cost |
| Fly.io | Containers, good for Chromium/Typst workers; more ops |
| AWS | Most control/cheapest at scale; too much ops for MVP (later: ECS/Lambda/S3) |
Recommendation: Vercel (web) + Railway or Fly (worker) + Supabase/Neon (Postgres) + Supabase Storage or Cloudflare R2. Free-tier limits not researched; check at signup.

Background queues
| Option | Needs | Fit |
|---|---|---|
| BullMQ | Redis + long-lived worker | Mature; extra infra |
| pg-boss | Only Postgres | No extra infra, transactional enqueue; needs long-lived worker |
| Inngest | Managed; runs on your serverless endpoints | Best serverless DX, step functions + retries; free ~50k step runs/mo |
| Trigger.dev | Managed or self-host (Apache-2.0) | Long compute (AI/media) without timeouts; free tier with $5 usage |

Sources: https://upstash.com/blog/serverless-background-jobs-and-message-queues-every-major-option-in-2026 ; https://automationatlas.io/guides/trigger-dev-vs-inngest-2026-comparison/ ; https://pkgpulse.com/guides/best-nodejs-background-job-libraries-2026 [M; pg-boss claims are my background knowledge]
Recommendation: on Vercel use Inngest (or Trigger.dev) for the multi-step pipeline (extract -> score -> rewrite) with SSE/polling for progress. With a Railway/Fly worker use pg-boss (no Redis). Skip BullMQ unless Redis is needed anyway.

### B6. MVP architecture (summary)
Next.js + TS + Zod; Postgres + Prisma; object storage for uploads (type/size limits, malware scan); upload -> job -> [deterministic lint via pdfjs/DOCX XML + Haiku extraction + diff] -> JD parse -> hybrid score -> Sonnet suggestions -> versioned JSON resume -> export via react-pdf/docx -> re-lint output. Mock interview: Haiku/Sonnet turns with cached rubric, final schema-bound Sonnet evaluation. Provider-abstracted; all LLM output Zod-validated; scores computed in code; injection scanner at ingress.

### Open items to verify before build
1. Lever/iCIMS/Taleo/SmartRecruiters/Ashby parser behavior: test with real uploads on public career pages and compare parsed fields; no public docs found.
2. Lightcast Open Skills / ESCO licence terms for SaaS use.
3. Structured-output feature details on the exact chosen models; Batch discount confirmation.
4. Voice (STT/TTS) pricing and latency.
5. Privacy/legal: resumes are PII (GDPR/CCPA, retention, no training on user data); NYC Local Law 144 and EU AI Act treat hiring AI as high-risk - candidate-side tools are lower risk, recruiter-side features would not be (not researched here; verify).
