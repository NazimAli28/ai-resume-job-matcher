# 07 - UI/UX Patterns Research (2026-10-21)

Scope: competitor UI/UX and landing pages, mapped to buildable patterns for our app. Fits CLAUDE.md rules: scores are "estimates" computed in code, no fabrication, no fake testimonials, practice-only interviews.

**Method and limits.** Sources were WebFetch of live landing pages (text extraction only, no screenshots, so visual details such as exact layout, color and motion are not observed unless stated), vendor help docs, and review/blog pages. Many review sources are competitor blogs with a commercial stake (flagged "[biased]"). Items marked [UNVERIFIED] were not confirmed from a primary source. Landing pages change often; re-check before copying anything. Several fetches were blocked (tealhq.com returned 403; Simplify page returned little).

---
## 1. Per-screen patterns

### 1.1 Dashboard
| Aspect | What top apps do |
|---|---|
| Teal / Huntr / Simplify | Tracker-centric: the board is the home. Teal free tier = unlimited tracking, Chrome extension, basic builder; match scorer and full keyword list are Teal+ (https://www.loopcv.pro/directory/huntr/ , https://blog.loopcv.pro/teal-hq-review/ , https://simplify.jobs/c/Teal-HQ) |
| Jobscan | Scan History list: reopen past reports, change application status from a dropdown, "Track" button pushes a scan into Job Tracker (https://www.jobscan.co/jobscan-tutorial) |
| Careerflow | Tool-suite grid (resume, fit analyzer, autofill, tracker, LinkedIn, mock interview) (https://www.careerflow.ai) |

**Complaints:** feature sprawl (Careerflow lists 12 tools); free-tier caps surface as walls (Huntr 40 jobs [biased source], Teal top-5 keywords).
**Recommend:** a "Next best action" dashboard, not a tool grid. Top row = one primary card computed from state ("Tailor your resume to <saved job>", "Prepare for interview on <date>", "Upload your first resume"). Below: (a) active applications strip (counts per stage, nearest follow-up/interview), (b) latest resume with its estimate summary and delta since last version, (c) recent interview sessions with score trend. Empty states always show one CTA plus sample data link. Everything links to the exact resume version and job source (our differentiator, per CLAUDE.md).

### 1.2 Resume analysis report
| App | Pattern |
|---|---|
| Rezi | Gauge (e.g. 58 "Needs improvement") plus 5 sub-scores (Content, Format, Optimization, Best Practices, Application Ready) over 23 audits; Rezi itself says it is "not an ATS score" (https://www.rezi.ai/rezi-docs/the-rezi-score-explained). Landing page shows 95, 47% and 58 without explaining relationships (confusing). |
| Resume Worded | Score out of 100 with flagged weak lines; animated score climb 42 to 93 as proof (https://resumeworded.com) |
| Jobscan | Sections: Searchability, Skills, Recruiter tips, Formatting (formatting only for uploaded files) (https://www.jobscan.co/jobscan-tutorial) |

**Love:** line-level flags tied to a fix; "what was parsed" transparency. **Hate:** opaque numbers that "look more precise than they are" (https://www.visualcv.com/blog/why-job-seekers-say-ats-scores-feel-misleading-or-ats-score-distrust-on-reddit/ [biased]); one headline number with sub-scores that do not reconcile.
**Recommend:** two-pane layout. Left: summary header (band label, not a number, e.g. "Strong / Good / Needs work" with an "estimate" chip) plus 4 category rows (Parsing and ATS-safety, Readability, Content strength, Impact/quantification), each with pass/warn/fail counts and expand. Right: the resume rendered as the parser saw it, with inline highlights; clicking a finding scrolls to and highlights the exact line. Each finding card = Severity, What we saw (quoted evidence), Why it matters (one sentence), Fix (inline action or "ask me" prompt for facts we cannot invent). Include a "What the parser extracted" tab (contact, sections, dates) so users see the raw parse.

### 1.3 Job match report
| App | Pattern |
|---|---|
| Jobscan | Match rate with hard skills weighted highest, then education (only if JD requires), job title, soft skills; click a skill to see where it appears in resume and JD; "Report" link removes a bad skill and rescans; recommends 75%+; detects employer ATS from URL (https://www.jobscan.co/jobscan-tutorial) |
| Teal Matching Mode | Keywords grouped hard/soft/emphasis; per keyword: highlight, present/missing, dismiss; JD tab lets you trim text (e.g., benefits) before analysis; score = keyword coverage and updates live as you edit; no auto-insert (https://tealhq.helpscoutdocs.com/article/21-using-matching-mode; docs dated 2023-24 so UI may have changed) |

**Love:** live-updating score while editing; ability to dismiss junk keywords. **Hate:** keyword stuffing incentive; paywalled keyword lists; Teal "AI adds keywords rather than writing custom resumes" (Simplify/ResumeCoach summaries, https://www.resumecoach.com/reviews/tealhq-resume-builder-review/).
**Recommend:** Requirements-matrix, not a keyword list. Parse JD into must-have / nice-to-have requirements; rows = requirement, status chip (Covered / Partially / Missing / Unclear), evidence snippet from the resume with line link, and an action ("Add evidence" or "Not true for me - skip"). Top: band + counts ("7 of 9 must-haves covered"). JD pane allows trimming/deselecting sections and dismissing items (recompute instantly in code). Never offer "add keyword" without an evidence prompt (Rule 1).

### 1.4 Tailoring / diff editor
| App | Pattern |
|---|---|
| Jobscan AI Optimize (Premium) | Left panel with score and skills; click missing skill jumps to target section; accept/reject suggestions one click; Edit Mode with 3 phrase suggestions per skill; Compare Mode side-by-side original vs optimized with both match rates (https://www.jobscan.co/jobscan-tutorial) |
| Resume Worded | AutoFix on flagged lines, before/after score 54 to 92 shown on landing page [marketing claim] |
| Enhancv | Inline AI assistant editing; paste job ad tailoring (https://enhancv.com) |

**Recommend:** per-bullet inline diff (word-level, red strike/green add) in a single column on the resume itself, with a sticky right rail listing changes grouped by section. Each change card: Accept / Reject / Edit, a "Why" line, and evidence badge ("Based on your line 12" or "Needs your input: how many users?"). Suggestions lacking evidence render as a question with an input, not as text. Bulk "Accept all safe changes" (wording-only) separate from "Review changes needing facts." Version created on save, with named label, linked to the job. Undo stack and keyboard: J/K next change, A accept, R reject, E edit.

### 1.5 Interview session
| App | Pattern |
|---|---|
| Google Interview Warmup | Pick field (Data Analytics, UX, IT Support, etc.), question categories (background, situational, technical), voice or typed answer, live transcript; Insights = job-related terms, most-used words (3+ uses, tap for alternatives), talking points; explicitly does not grade; no audio retained; transcript copy/download (https://grow.google/interview-warmup , https://9to5google.com/2022/05/17/google-interview-warmup/ - 2022 launch coverage, may have changed) |
| Final Round AI | Goal editor (role, JD, resume) -> live or practice -> "debrief" with what worked / fix / readiness, saved to history, "Re-drill" weak spots; Pro-only for practice and debriefs; has live copilot "stealth" features we must NOT copy (https://www.finalroundai.com) |
| Yoodli | Roleplay video call UI with timer and controls; scored on named criteria; follow-up "Coach" generated practice (https://yoodli.ai) |

**Complaints:** Final Round sessions auto-stop at 60 min (Trustpilot); paywalled practice; ethics/cheating positioning.
**Recommend:** calm one-question-at-a-time screen. Layout: question card (large type) + timer + a progress dots row; answer area toggles voice/text; live transcript for voice; "Think time" countdown (optional, 30s) before recording; controls: Retry, Skip, Finish. Never show scoring mid-answer. Configurable setup step (role, level, mix of behavioral/technical, count, difficulty) before start. Autosave each answer so refresh/mobile interruptions do not lose a session. Stay practice-only (Rule 3): no screen overlay, no "stealth".

### 1.6 Interview report
Yoodli shows example feedback cards with a positive headline, one "To work on" item, and a "Scored on" criteria list (https://yoodli.ai). Google keeps to descriptive insights rather than grades. Final Round gives a plain-language debrief.
**Recommend:** report in three tiers. (1) Summary: overall band + strongest/weakest competency (e.g., Structure, Specificity, Relevance, Delivery). (2) Per-question accordion: your answer (transcript with highlighted filler/vague phrases), rubric scores per criterion as 1-5 steps with a one-line justification quoting your own words, a model answer built ONLY from facts in the resume (flag placeholders needing user data), and a "Re-practice this question" button. (3) Trends across sessions (small multiples, not a single line). Score delivery metrics (fillers, pace) as descriptive numbers with typical ranges, not grades. Exportable/printable.

### 1.7 Kanban tracker
Huntr: drag-and-drop board, one-click save from job pages (Chrome clipper), auto-log on apply, interview tracker, private notes, map view, keyword extraction from saved jobs (https://huntr.co). Teal: pipeline view, excitement rating, notes, contacts, reminders (https://simplify.jobs/c/Teal-HQ). Jobscan: status dropdown in scan history.
**Love:** one-click capture; board simplicity. **Hate:** caps and price on free tier; autofill flakiness on custom forms [biased]; no verified mobile complaints found [UNVERIFIED: check App Store/Play reviews].
**Recommend:** columns Saved / Applied / Interviewing / Offer / Rejected (use glossary names from PRD §5). Card = company+role, resume-version chip, fit estimate band, next date, source link icon. Card drawer (not a modal page) with tabs: Overview, Resume used, Job post snapshot, Interviews, Notes, Timeline. Add a list/table view toggle (dense, sortable, keyboard-friendly) alongside the board. Drag with keyboard alternative (menu "Move to..."). Stale-card nudge ("Applied 14 days ago - follow up?") computed deterministically.

### 1.8 Onboarding - see section 2.

---
## 2. Onboarding
Observed: Resume Worded and Rezi put an upload widget directly under the hero, then gate the full report behind sign-up (https://resumeworded.com , https://www.rezi.ai). Teal Matching Mode requires a bookmarked job first (extra friction) (Teal help doc above). Jobscan routes everything through its scanner.

**Recommended flow (target < 90s to first value):**
1. Landing demo or "Try with sample resume" -> anonymous scan result teaser (no signup). Signup prompt appears when user wants to save or see the tailoring.
2. Step 1 (after signup): upload resume (PDF/DOCX) or paste text. Show parse progress with real stage labels ("Reading sections... Extracting dates...").
3. Step 2: instant analysis report (value moment #1, deterministic and fast, no LLM wait).
4. Step 3 (skippable): "Paste a job description or URL" -> match report (value moment #2).
5. Step 4: one-click "Tailor to this job" (preview diff, not auto-applied).
6. Goal question (2 taps: role target, seniority) only after value #1, used to prefill interview setup.
**Tricks:** sample data everywhere; progress checklist on dashboard (4 items) rather than a modal tour; save-job extension/bookmarklet prompt only after first saved job; never ask for CNIC/phone at onboarding; show "what we mask before AI" privacy note at upload (Rule 4); persist anonymous scan via short-lived token so signup does not lose the result.

---
## 3. Score visualization that builds trust
Evidence of distrust: VisualCV [biased] on false precision; Rezi's own landing page mixes 58, 95 and 47% with no reconciliation; Rezi concedes its score is "not an ATS score."

**Rules for us (consistent with Rule 2):**
- Label every score "Estimate"; tooltip: what it measures, what it does not (not hiring probability, not a specific ATS).
- Use bands + coarse steps (e.g., Weak / Fair / Good / Strong, or 5-segment meter) as the headline; show the numeric value only in detail (round to 5, no decimals). Avoid "62.18%"-style precision.
- Always decompose: headline = visible sum of 3-5 named components, each with its own count ("6 of 8 must-haves"). The headline must be reproducible from the breakdown on screen.
- Every deduction links to evidence (line, quote, requirement). No evidence, no finding.
- Show confidence/uncertainty where parsing is shaky ("We could not read your dates reliably").
- Show delta vs previous version ("+1 band since v2") with the changes that caused it; this rewards honest edits, not stuffing.
- Cap keyword influence (Jobscan weights hard skills highest and says do not chase every missing item) and show "does not affect score" items separately (Jobscan "Predicted skills" pattern).
- Let users dispute: "Not relevant" / "I do not have this" (Jobscan "Report" link, Teal dismiss); recompute locally.
- Changelog link "How we calculate" (public, plain English).
- Charts: segmented bar or dot-scale over radial gauges with 0-100 needles; use accessible color + icon + text (never color alone).

---
## 4. Competitor landing pages

### 4.1 Observed (live fetch, text only)
| Site | Hero | Demo / interactive | Social proof | Pricing | CTA |
|---|---|---|---|---|---|
| Jobscan (https://www.jobscan.co) | "Optimize your resume for the exact ATS"; subtext on ATS detection | Tabbed product carousel; scanner anchored from hero | Logo row "hired by Apple, Meta, Google..." [implies employment, weak evidence], "3x more callbacks" [unsourced] | Not on homepage (nav only) | "Scan Your Resume For Free" repeated in nav, hero, feature blocks |
| Rezi (https://www.rezi.ai) | "Ranked #1 AI Resume Builder by Forbes", "4.5M job seekers" | Inline "Score resume" upload right under hero; static sample resume + score panel | 4.7 rating, Trustpilot (250), wall of love, unsourced "62.18% interview rate vs ~3%" | 3 tiers on page: Free / Pro $29/mo / Lifetime $149, 30-day money-back | "Try for free" nav/hero/pricing/footer |
| Resume Worded (https://resumeworded.com) | "Improve your resume and LinkedIn profile", "5x more interviews" | Upload box immediately after hero; animated score demo; before/after cards (54->92, 27->85, 42->93) | "As seen on" press strip, 11 testimonials | None on page | Single signup modal reused |
| Enhancv (https://enhancv.com) | "Land more interviews..." two CTAs: Build / Get Resume Score | Template picker with "Start with this template" | 5,363 reviews, stats, certified-writer badges | Not on homepage; 7-day full access note in FAQ | CTA repeated top, after reviews, bottom |
| Teal | Not fetched (403) | - | - | Free tier + Teal+ per review sources | - |
| Huntr (https://huntr.co) | "Less Hassle, More Interviews", "Sign Up for Free" | Static screenshots per feature | 500k+ users, logos, one named testimonial | Not on page | CTA top + per-feature links |
| Careerflow (https://www.careerflow.ai) | "Land your dream job. Without the stress." | Static screenshots (95% score) | Logos, stats, 6 named testimonials | Weekly/Monthly/Quarterly/Yearly toggle, 3 tiers; prices hard to reconcile (anti-pattern) | Sign up free + LinkedIn scan CTA |
| Final Round AI (https://www.finalroundai.com) | "Ace Your Interview with #1 AI Interview Assistant" | 3-step how-it-works with screenshots; "What they see / What you see" | 10M users, 4.9 PH, SOC 2 badges labeled "In progress" | 2 tiers: Free / Pro $25 mo, no trial | Download / See plans |
| Yoodli (https://yoodli.ai) | "The AI Platform for Human Skills" (B2B pivot), rotating outcomes | Tabbed product visuals; example feedback cards | Logos, outcome stats, 6 named quotes, SOC 2 | Not on page | Get a demo / Try free |
| Linear (https://linear.app) | "The product development system for teams and agents" | Animated product states ("Working...", status change) [inferred from text] | 3 named customer quotes, "40,000 teams" | None | Sparse CTA; closing band |
| Notion (https://www.notion.com) | "Where teams and agents think together" | Hero media with Play; mega-menu | Logo wall, 3 testimonials, stats | Nav link | Hero primary + secondary, none after |
| Vercel (https://vercel.com) | "Agentic Infrastructure", 2 CTAs | Customer stories with feature lists | 3 customer claims | None | Deploy now repeated |

**Patterns worth taking:** (1) upload widget directly under hero (Rezi, Resume Worded); (2) concrete numeric before/after proofs; (3) product shown in context, not stock imagery; (4) one CTA verb repeated consistently; (5) how-it-works as 3 steps (Final Round); (6) pricing reachable without a sales call, ideally on-page (Rezi) and with plain tier limits.
**Patterns to avoid:** unsourced uplift stats ("5x", "62.18%") - conflicts with our honesty rules; logo rows implying hiring outcomes; unreconcilable score figures; price toggles with 4 cadences; "100% undetectable" claims (Final Round); badges "In progress" next to trust claims.
**No fake testimonials:** use (a) real beta-user quotes with consent once available, (b) before-launch substitutes: "what we do with your data" facts, product-process proof (open scoring methodology, sample reports), build-in-public notes, or a labeled "Example output (sample data)" caption on every demo.

### 4.2 AIDA mapping for our landing page
| Stage | Section | Content |
|---|---|---|
| Attention | Hero | Headline built on outcome + honesty (e.g., "Know exactly why a job fits - and fix your resume without inventing a thing" - placeholder). Primary CTA "Check my resume free"; secondary "Try with a sample resume". Interactive demo (E1) beside the headline. |
| Interest | How it works + Proof by demonstration | 3-step strip (Upload -> See evidence-backed findings -> Tailor and track). E2 before/after slider and E3 evidence explorer. A "How we score" panel (transparent, with the "estimate" principle). |
| Desire | Differentiators | Resume-version-linked tracker (E5 mini board), mock interview report preview (E4), "never fabricates" guarantee with example of a suggestion that asks a question instead of inventing a metric. Privacy block: masking PII before AI. |
| Action | Pricing + FAQ + closing CTA | Short on-page pricing (Free vs Pro, plain limits), FAQ (is the score an ATS score? what AI sees?), repeat the same CTA verb; sticky mobile CTA bar. |

**Interactive elements (3-5):**
- **E1. Drop-a-resume live demo.** Drag area plus "use sample" chip. Runs the deterministic analyzer client- or server-side (no LLM), streams stage labels, then reveals band + 4 category rows with 2-3 real findings; rest blurred behind "Save full report - free account". Never persist without consent; do not store text (Rule/PII).
- **E2. Before/after bullet slider.** Draggable divider over one weak bullet vs improved version; improved version shows an evidence chip ("from your line 4") and a second example where the tool asks "How many?" instead of inventing a number. All sample data labeled.
- **E3. Match explorer.** Sample JD on left; hover a requirement and the matching resume line highlights on right with Covered/Missing chips; toggle "Dismiss" to show the estimate recompute.
- **E4. Interview report peek.** Tabs for 3 sample questions; click a question to expand rubric scores, quoted evidence from transcript, model answer. Clearly "sample session."
- **E5. Mini kanban.** Draggable 3-card board where moving a card changes status and shows the linked resume version chip. Touch-friendly.

---
## 5. Micro-interactions and motion (premium, not gimmicky)
- Score/band changes: 300-500 ms ease-out count/segment fill once; reduce to instant under `prefers-reduced-motion`.
- Diff accept: 150 ms green flash on inserted text, then settle; reject fades out. No confetti on edits; reserve one small celebratory moment for first application sent or first completed interview.
- Streaming text for AI suggestions with skeleton lines, never spinners over long waits; show honest stage labels ("Masking personal details", "Checking against your resume").
- Optimistic UI on kanban drag (card snaps immediately, rollback toast on failure); drop-zone highlight; spring physics subtle (Linear-like crispness, https://linear.app).
- Highlight-link: hover finding highlights line (and vice versa), scroll-into-view with a brief outline pulse.
- Command palette (Cmd/Ctrl+K) for power actions; keyboard shortcuts in the diff editor.
- Recording indicator: soft pulsing dot plus live waveform; countdown ring for think time.
- Skeletons matching final layout; no layout shift.
- Landing page scroll: one pinned product-in-context section at most; no parallax. Linear/Notion/Vercel lean on product visuals, short statements and restrained CTAs (observation from text only; visuals [UNVERIFIED]).
- Accessibility: all motion has non-motion equivalents; focus rings preserved; contrast AA.

---
## 6. Mobile patterns
**Tracker (mobile):**
- Default to a single column list grouped by stage with sticky stage chips (horizontal scroll tabs), not side-scrolling columns. Swipe a card for quick actions (move stage, snooze, archive) with a visible non-gesture alternative (overflow menu).
- Board view optional: horizontal snap-scroll columns, long-press to drag.
- Bottom sheet for card details; bottom nav (Home, Resumes, Jobs, Interviews). Quick-add via share-sheet/PWA share target: paste job URL -> Saved. [PWA share target support varies on iOS - UNVERIFIED]
- Notification-free design initially; follow-up reminders via Resend email (founder rule: max 5 platforms).

**Interview (mobile):**
- Full-screen question, large record button thumb-reachable at bottom; typed-answer fallback always available (voice permission denied, noisy places).
- Persist audio/text answer chunks continuously to survive tab suspension/screen lock; "Resume session" banner on return. Warn that iOS Safari may stop recording in background [UNVERIFIED, test].
- Report on mobile: summary card first, per-question accordion, sticky "Re-practice" button; avoid dense tables.
- Google Warmup supports Chrome on Android and Safari on iOS (https://grow.google/interview-warmup / 9to5google) - confirms browser-based mobile voice practice is viable.

---
## 7. Decision summary and open items
- Adopt: requirement-matrix match report; evidence-linked findings; inline word diff with evidence/ask-user cards; board + list toggle with card drawer; one-question-at-a-time interview with 3-tier report; band-first estimate scores; try-before-signup landing demo.
- Reject: single large numeric "ATS score"; unsourced uplift claims; stealth/live-interview features; multi-cadence pricing toggles; keyword-count-as-fit.
- Open [?]: Teal's current (2026) UI could not be fetched (403) - verify with a hands-on free account or help-center screenshots; Resume Worded/Rezi user complaints (Reddit/Trustpilot) not directly retrieved; mobile app reviews for Huntr/Teal/Simplify not retrieved; visual/motion details of Linear/Notion/Vercel need screenshots (text-only extraction).
