# 07 — Legal Documents (outlines + key clauses)

> **Part of:** [PRD.md](../PRD.md) (the index wins on any conflict) · **Version:** 1.0 draft · **Date:** 2026-10-20 · **Revised:** 2026-10-21 (5-platform architecture: GitHub, Vercel, Supabase, Anthropic, Resend; see [PRD.md](../PRD.md) §3)
> **Sources:** [research/04-legal-privacy-security.md](../research/04-legal-privacy-security.md) §2–4, [research/06-pakistan-market.md](../research/06-pakistan-market.md) §4 and §7, [06-security-privacy.md](06-security-privacy.md).
> **Labels:** **[D]** founder decision · **[P]** Claude proposal · **[?]** open question · **[VERIFY]** unverified fact · **[LAWYER]** counsel must decide.

> ## ⚠ NEEDS LAWYER REVIEW — NOT LEGAL TEXT
> Everything below is a **plain-English outline and set of key clauses** for a lawyer to turn into final documents. It is **not legal advice** and must **not** be published as-is. Before paid launch, counsel in Pakistan (and, if EU/UK/US users are targeted, counsel familiar with GDPR/UK GDPR and US consumer law) must review the Terms, Privacy Policy, AI Disclaimer and Refund Policy (PRD open question 5). Points marked **[LAWYER]** or **[VERIFY]** are especially uncertain.

---

## 0. Document set

| Document | URL [P] | Needed at | Version tracked in `ConsentRecord`? |
|---|---|---|---|
| Terms of Service | `/legal/terms` | Free beta | Yes (`TERMS`) |
| Privacy Policy | `/legal/privacy` | Free beta | Yes (`PRIVACY`) |
| AI Disclaimer & Transparency Notice | `/legal/ai` | Free beta | No (referenced by ToS) |
| Acceptable Use Policy | `/legal/acceptable-use` | Free beta | No (incorporated in ToS) |
| Cookie Policy | `/legal/cookies` | Free beta | Analytics opt-out recorded (`ANALYTICS_COOKIES`); no consent banner choice needed for essential cookies |
| Refund & Cancellation Policy | `/legal/refunds` | Paid launch | Acknowledged at checkout |
| Subprocessor list | `/legal/subprocessors` | Free beta | No (change log on page) |
| Security & disclosure page | `/security` + `/.well-known/security.txt` | Free beta | No |

All documents: effective date, version number, short "What changed" summary, archive of previous versions at `/legal/<doc>/history` [P].

---

## 1. Terms of Service (outline)

| # | Section | Key clauses in plain English | Tag |
|---|---|---|---|
| 1 | Who we are and acceptance | Identifies the operator (legal name, address, contact email). By creating an account you agree to these Terms, the Privacy Policy, the AI Disclaimer and the AUP | [LAWYER] entity not yet chosen |
| 2 | Eligibility | You must be **at least 16** (18 in jurisdictions that require it, e.g. India if we launch there). You must be able to form a binding contract or have a guardian's permission where local law requires it. One person per account | P |
| 3 | Your account | Keep your password safe; you are responsible for activity on your account; tell us about unauthorized use at security@. We may require email verification before AI features. No shared or resold accounts | P |
| 4 | The service | Describes features: resume analysis (ParseHealth, Readability, JobMatch estimates), tailoring and suggestions, cover letters, **practice** mock interviews, application tracker, export. Features may change; beta features are provided "as available" | P |
| 5 | Your content and our licence | **You own** your resume, profile, job descriptions you paste and your answers. You give us a **limited, non-exclusive, worldwide, royalty-free licence** to store, process, transmit (including to our AI providers and other subprocessors) and display your content **only to provide, secure and support the service for you**. The licence ends when you delete the content or your account, except for backups (aged out within ~37 days) and what law requires us to keep. **No use for training AI models unless you opt in separately** | P |
| 6 | AI output | Outputs are generated with AI and **may be wrong, incomplete or biased**. You must review everything before using it. To the extent we have any rights in outputs, we assign them to you; we cannot guarantee outputs are unique or protectable by copyright [VERIFY copyright status of AI output] | P |
| 7 | No guarantee of outcomes | We do not guarantee interviews, job offers, or passing any employer's applicant tracking system. Scores are **estimates**, not ATS scores or hiring predictions. Not career, legal, immigration or financial advice | P |
| 8 | Your responsibilities: accuracy and truthfulness | You are solely responsible for the accuracy and truthfulness of anything you send to employers. Do not add experience, degrees, employers, dates, metrics or references you cannot back up. We design our AI to never invent facts, but it can make mistakes, so check every statement | D (principle 1) |
| 9 | Acceptable use | You agree to the AUP (§4 of this doc), which includes the AI provider's usage policies passed down to you | P |
| 10 | Intellectual property in the service | We (and our licensors) own the app, design, templates, scoring methods and prompts. You get a personal, non-transferable right to use the service. Feedback you send may be used freely | P |
| 11 | Free tier, beta and fair use | Free and beta plans have usage limits that may change. Paid plans have fair-use caps. We may throttle or suspend usage that looks automated or abusive | P |
| 12 | Plans, billing, auto-renewal, cancellation (paid launch) | Prices shown before purchase, including taxes where applicable. **PRO** renews monthly until cancelled; **SPRINT** passes are one-time and do not auto-renew [P]. Clear statement of renewal date and amount at checkout; reminder email before renewal; **cancel online in Settings in a few clicks**; cancellation stops the next renewal and access continues to the end of the paid period. Payments processed by Safepay (PKR) or a merchant of record (USD), whose own terms may apply. Refunds per the Refund Policy | D (plans) / P |
| 13 | Price changes | At least 30 days' notice for price changes to an active subscription; you can cancel before the change applies | P |
| 14 | Suspension and termination | You may delete your account anytime (Settings). We may suspend or terminate for breach of the Terms/AUP, fraud, legal requirement or risk to others, with notice where reasonable. On termination we give a reasonable export window unless prohibited (e.g. fraud), then delete per the Privacy Policy | P |
| 15 | Inactive accounts | Accounts with no login for **24 months** are deleted after two warning emails (30 days and 7 days before deletion) | D |
| 16 | Third-party services | Google sign-in, payment providers and job sites you link to have their own terms. Job URLs you save are stored as text; we do not access those sites for you | P |
| 17 | Disclaimers | Service provided "as is" and "as available" to the extent law allows. Nothing removes rights consumers have under mandatory local law | [LAWYER] |
| 18 | Limitation of liability | Our total liability is capped at the greater of (a) the fees you paid us in the 12 months before the claim or (b) a small fixed sum (e.g. PKR 10,000 / USD 50) [P]. No liability for indirect or consequential losses, lost job opportunities or outcomes of employer decisions. **Carve-outs:** death or personal injury caused by negligence, fraud, and anything that cannot be limited by law (EU/UK consumers keep statutory rights) | [LAWYER] |
| 19 | Indemnity | You cover our losses from your misuse (e.g. fabricated credentials, uploading others' data). Limited or excluded for consumers where law requires | [LAWYER] |
| 20 | Governing law | **Laws of Pakistan** for now [?]; courts of [city, e.g. Lahore/Karachi/Islamabad] [?]. EU/UK consumers keep the protection of their home country's mandatory law and courts (Rome I Art. 6) | [?] [LAWYER] |
| 21 | Dispute resolution | First contact support@ and try to resolve informally within 30 days. Then courts as above. **No arbitration or class-action waiver at MVP** [P] (adds complexity and mass-arbitration risk; revisit if US users grow) | P [LAWYER] |
| 22 | Changes to these Terms | Material changes: notice by email and in-app at least 14–30 days before they take effect; continued use after the date means acceptance; if you disagree, delete your account. Non-material changes (typos, clarity) take effect on posting | P |
| 23 | General | Entire agreement, severability, no waiver, assignment (we may assign in a merger/sale with notice), notices by email, language: English controls | P |
| 24 | Contact | support@, privacy@, security@, postal address | P |

### 1.1 Plain-language summary box (top of the Terms) [P]
- You must be 16 or older.
- Your resume and data are yours. We use them only to run the service for you.
- AI helps write and explain. It can be wrong, so check everything before sending it to an employer.
- Scores are estimates, not ATS scores. We can't promise interviews or jobs.
- Don't fake credentials, impersonate anyone, or use this in a real interview.
- You can export or delete everything anytime. Inactive accounts are deleted after 24 months.
- Paid plans (later): cancel online anytime; see the Refund Policy.

### 1.2 Sample clause wording (for counsel to refine)

> **Licence (§5):** "You keep all rights in Your Content. You give us permission to host, copy, process, transmit and display Your Content only as needed to provide, secure and support the Service for you, including by sending it to our subprocessors listed at /legal/subprocessors. We will not use Your Content to train artificial-intelligence models unless you turn on 'Help improve the product' in Settings."

> **Truthfulness (§8):** "You are solely responsible for the content of any resume, cover letter or other material you submit to a third party. You must not use the Service to create or submit false or misleading information about your identity, education, employment, skills or achievements."

> **No guarantee (§7):** "Scores, suggestions and feedback are estimates for your own use. They are not produced by, endorsed by or representative of any employer or applicant tracking system, and we do not guarantee any interview, offer or other outcome."

---

## 2. Privacy Policy (outline)

### 2.1 Structure

| # | Section | Content |
|---|---|---|
| 1 | Who we are (controller) | Legal entity name, registered address, contact privacy@. EU/UK representative if appointed [LAWYER]. No DPO required at MVP; name a privacy contact |
| 2 | Summary box | 6–8 plain bullets: what we collect, that AI (Anthropic) processes your content, we don't sell data, we don't train on your data without opt-in, how to export/delete |
| 3 | Data we collect | Account (email, name, Google profile basics); profile and resume content (may include sensitive data you choose to include); job descriptions; applications, notes and contacts you add; interview questions, answers and feedback; usage and device data (first-party product events recorded on our own servers, no third-party analytics, no session replay); essential cookies only; support messages; payment status (not card numbers) later |
| 4 | Sensitive data | Resumes may include health, religion, ethnicity, photo, DOB. We ask your explicit consent at upload, nudge you to remove what's not needed, never infer these traits, and never send DOB, religion, father's name or CNIC to the AI. **CNIC should never be on a resume** and we flag it |
| 5 | Sources | You; Google (if you sign in with Google); payment providers (later) |
| 6 | Purposes and lawful bases | Table §2.2 |
| 7 | How AI processing works | §2.3 |
| 8 | Sharing and subprocessors | Only with subprocessors acting on our instructions (link to list), when law requires, to protect rights and safety, or in a business transfer with notice. **We do not sell or "share" personal information for cross-context advertising.** No data given to employers or recruiters |
| 9 | International transfers | Your data is **stored** in Singapore (Supabase: database, sign-in data and file storage) and our application servers (Vercel functions) run in Singapore. Vercel is a US company and requests pass through its global network. Masked content sent for AI features is processed in the **USA** by Anthropic. Transactional email is sent through Resend (data region: [VERIFY at setup]). Encrypted nightly database backups are held by GitHub in the **USA** (encrypted before upload; GitHub does not hold the key). Safeguards: EU Standard Contractual Clauses / UK Addendum, and EU–US Data Privacy Framework where the vendor is certified [VERIFY each vendor]. Access from Pakistan by our team is limited and logged |
| 10 | Retention | Table §2.4 |
| 11 | Your rights | Access, export (portability), correction, deletion, restriction, objection, withdraw consent, complain to a regulator (EU authority / ICO). US state rights (know, delete, correct, opt out of sale/sharing/targeted ads (we don't do these), limit sensitive data use, appeal). Self-serve in Settings; otherwise privacy@; response within 30 days (GDPR allows +2 months for complex cases); we verify identity via your signed-in session; authorized agents (CA). We honour Global Privacy Control signals |
| 12 | Security | High level: encryption in transit and at rest, access controls, PII masking before AI, no admin access to content by default, incident response with 72 h regulator notification where required. Link to `/security` |
| 13 | Children | Not for under-16s; we delete accounts we learn belong to under-16s |
| 14 | Cookies | Summary + link to Cookie Policy: only essential sign-in cookies; no analytics, advertising or third-party cookies |
| 15 | Automated processing | Scores are calculated by code from visible factors; they help you, not an employer, and are not used to make decisions about you with legal or similar effects (GDPR Art. 22 not triggered) [LAWYER]. Plain explanation of how JobMatch works |
| 16 | Changes | Effective date, version, how we notify of material changes (email + in-app) |
| 17 | Contact and complaints | privacy@; complaints acknowledged within 30 days (UK DUAA) [VERIFY] |

### 2.2 Purposes and lawful bases (GDPR table)

| Purpose | Data | Lawful basis (Art. 6) | Special-category condition (Art. 9) |
|---|---|---|---|
| Create and run your account | Account data | Contract 6(1)(b) | — |
| Resume analysis, tailoring, cover letters, mock interviews, tracker, exports | Profile, resume, JD, answers, tracker | Contract 6(1)(b) | **Explicit consent 9(2)(a)** for any sensitive data you include [LAWYER] |
| Sending content to our AI provider to deliver a feature you request | Masked resume/JD/answers | Contract 6(1)(b) | Explicit consent 9(2)(a) |
| Security, fraud and abuse prevention, rate limiting, quotas, error diagnostics | IP (hashed/truncated), device, usage, scrubbed error records, account | Legitimate interests 6(1)(f) (LIA on file) | — |
| Transactional emails (verification, resets, inactivity warnings, export links) | Email | Contract 6(1)(b) | — |
| Product analytics (first-party, server-side, no cookies) | Pseudonymous usage events (allow-listed properties, no content) | **Legitimate interests** 6(1)(f), with an opt-out in Settings and Global Privacy Control honoured **[P][LAWYER]** (fallback: opt-in consent 6(1)(a)) | — |
| Aggregated, de-identified product metrics | Aggregates | Legitimate interests 6(1)(f) | — |
| Marketing emails | Email | Consent 6(1)(a) | — |
| Improving or fine-tuning AI models with your content | De-identified content | **Separate opt-in consent** 6(1)(a), default off | Explicit consent 9(2)(a) |
| Billing, tax and accounting (later) | Billing records | Legal obligation 6(1)(c) | — |
| Legal claims and compliance | Relevant records | Legitimate interests 6(1)(f) / legal obligation | 9(2)(f) where needed |

### 2.3 LLM processing disclosure (proposed wording)

> "Our AI features are powered by **Anthropic, PBC (USA)**, which processes your content as our service provider (processor). When you ask for an analysis, a tailored resume, a cover letter or interview feedback, we send the relevant text to Anthropic **only to produce that result**. Before sending, we remove or replace your email, phone number, address and personal links, and we never send your CNIC, date of birth, religion or father's name. **Anthropic does not use this data to train its models** under our commercial agreement. Anthropic deletes these inputs and outputs **within 30 days**, except that content flagged by its automated safety systems for possible policy violations may be kept for up to 2 years. We do not use Anthropic's file storage. We do not use your content to train any model unless you opt in."

Must stay accurate: re-check Anthropic's retention page and DPA before each policy version [VERIFY].

### 2.4 Retention (as shown to users)

| Data | Kept |
|---|---|
| Your account and content | Until you delete it or your account |
| Inactive accounts | Deleted after 24 months without login, after two warning emails (30 days and 7 days before deletion) |
| Raw mock-interview answers and evidence quotes | Deleted 12 months after the interview (scores and summary stay until you delete them) |
| Deleted accounts | Deleted after a 7-day undo window; removed from backups within 30 days after that |
| Security logs | 12 months |
| Product usage events (pseudonymous) | 13 months |
| Error records (scrubbed) | 90 days |
| Background-task records (IDs and status only) | 30 days after completion |
| Database backups (encrypted) | 30 days |
| Consent records | Account life + up to 6 years as proof [LAWYER] |
| Billing records | As tax law requires [VERIFY] |
| AI provider copies | Up to 30 days (up to 2 years if flagged) |

### 2.5 US "notice at collection" block (add when CCPA or state thresholds are near) [P]

| Category (CCPA) | Examples | Purpose | Sold/shared? | Retention |
|---|---|---|---|---|
| Identifiers | Email, name, account ID | Account, security | No | Account life |
| Professional / employment info | Resume content, applications | Provide service | No | Until you delete |
| Education info | Degrees, schools | Provide service | No | Until you delete |
| Sensitive PI (if you include it) | Health, religion, immigration status | Provide service only (no inference) | No | Until you delete |
| Internet activity | Usage events (first-party, pseudonymous; opt-out in Settings) | Analytics | No | 13 months |
| Inferences | **None about protected traits**; only job-fit estimates you see | Provide service | No | Until you delete |

### 2.6 What the Privacy Policy must never say
- "We never store your data" or "Your data never leaves our servers" (false: subprocessors and AI provider retention).
- "Fully GDPR compliant" or "certified" without a certification.
- "Anonymous" for pseudonymous analytics IDs.

---

## 3. AI Disclaimer and Transparency Notice

### 3.1 Standalone page (`/legal/ai`) key statements

1. **You are using AI.** Parts of this service use artificial intelligence (Anthropic's Claude models). Our deterministic code does parsing, checks and scoring; AI writes explanations, suggestions, cover letters and interview questions and feedback.
2. **Scores are estimates, not ATS scores.** ParseHealth, Readability and JobMatch are calculated by our code from factors we show you. They are **estimates** to help you improve. They are not the score any employer's applicant tracking system gives, and they do not predict whether you will be shortlisted or hired.
3. **AI can be wrong.** Outputs may be inaccurate, incomplete or biased. Review everything before you use it.
4. **We never knowingly invent facts, and you must check.** Our AI is instructed to use only facts from your resume and profile. Anything new is shown to you as a question. You are responsible for the truth of everything you send to an employer.
5. **Practice only.** The mock interviewer is an AI, not a human recruiter and not any employer. Feedback is for practice and does not reflect how a real employer will evaluate you. Do not use this service during a real interview.
6. **Not professional advice.** Not career-counselling, legal, immigration, visa or financial advice.
7. **Your data and AI.** Link to Privacy Policy §LLM processing.
8. **We don't serve employers.** We do not rank, screen or sell candidates to employers.

### 3.2 EU AI Act Art. 50 in-product wording proposal [LAWYER]

| Place | Obligation | Proposed wording / mechanism |
|---|---|---|
| Mock interview screen (persistent header label) | Art. 50(1): people must know they interact with AI | "**AI interviewer** — you're practising with an AI, not a real person." Shown at session start (modal acknowledgment once) and as a persistent badge. Voice phase: spoken disclosure at start |
| Generated cover letter / tailored text panels | Transparency + 50(2) marking of synthetic text | Badge "**AI-generated draft — review before sending**" |
| Suggestions and diff preview | Same | "AI suggestion" label on each suggestion; new claims highlighted "Confirm this is true" |
| Score cards | Honesty (principle 3) | "Estimate · not an ATS score" next to each score with a "How this is calculated" link |
| Exported PDF/DOCX (machine-readable) | 50(2) machine-readable marking | Document metadata: `Producer`/custom property `ai-assisted=true; generator=<product>; date=…` (DOCX core/custom properties; PDF XMP). **No visible watermark** on the resume (users submit it to employers; visible marking not required for assistive edits) [LAWYER: confirm "assistive editing" exception for resume edits and whether cover letters need more; follow the Commission's Code of Practice on marking when final] |
| Footer of AI pages | General | "Powered by AI. [How we use AI]" |

### 3.3 Short in-product notices (copy proposals)

| Context | Copy |
|---|---|
| Score tooltip | "This is an estimate calculated from the factors below. It isn't the score any employer's system gives you and doesn't predict hiring." |
| New claim in a suggestion | "This wasn't in your resume. Only keep it if it's true. Do you have a number for this?" |
| Cover letter export | "AI-assisted draft. Read it fully and make it yours before sending." |
| Interview report | "Practice feedback from an AI. Real interviewers may judge differently." |
| Model answer | "Built only from your own resume. Adapt it in your own words; don't memorize it." |
| PK_LOCAL sensitive field | "Photo, date of birth and father's name are common in Pakistan but not required by most private employers. Remove them for international roles." |
| CNIC detected | "We found what looks like a CNIC number. Never put your CNIC on a resume; give it only on official forms." |

### 3.4 Non-high-risk positioning (summary for the classification memo)
Candidate-side tool used by individuals for their own job search; not used by or for employers to recruit, select or evaluate people (Annex III point 4). No employer/recruiter features [D]. Fallback: Art. 6(3) narrow procedural / improving prior human work, with documentation. **Re-assess before any feature that shares user data or scores with third parties.** [LAWYER]

---

## 4. Acceptable Use Policy (outline)

You must **not** use the service to:

| # | Prohibited | Example | Enforcement |
|---|---|---|---|
| 1 | **Fabricate credentials** | Adding degrees, employers, titles, dates, certifications, metrics or references that are not true; producing fake resumes for employment fraud | Content removal, suspension, termination |
| 2 | **Impersonate** anyone | Building a resume in another person's name to apply as them; fake identities | Termination; report where required by law |
| 3 | **Cheat in live interviews** | Using the mock interviewer, or its outputs, in real time during a real interview or assessment; proxy interviewing | Termination |
| 4 | **Upload others' data without consent** | Uploading a friend's or candidate's resume without their permission; adding contacts' details beyond what you need | Removal; suspension |
| 5 | Scrape, automate or resell | Bots, scripts or bulk access; reselling outputs or access; using the service as a general-purpose AI chatbot | Rate limits; suspension |
| 6 | **Abuse the free tier** | Multiple accounts, disposable emails, sharing accounts to bypass limits | Account merge/closure |
| 7 | Attack the service | Prompt-injection or jailbreak attempts, extracting system prompts, probing other users' data, malware in uploads, circumventing rate limits, load testing without permission (good-faith security research follows `/security`) | Termination; legal action |
| 8 | Illegal or harmful content | Hate, harassment, sexual content, discriminatory content, content that breaks Pakistani law (PECA) or the law where you live | Removal; termination |
| 9 | Break AI provider policies | Uses prohibited by Anthropic's Usage Policy (flowed down) | Termination |
| 10 | Mislead employers about AI use where they forbid it | Submitting AI-assisted material where an employer explicitly prohibits it is your responsibility | User responsibility (warning in AI Disclaimer) |

Reporting: abuse@ (or support@). We may investigate, remove content, suspend, terminate and cooperate with lawful requests.

---

## 5. Cookie Policy and banner behaviour

### 5.1 Cookie Policy outline
1. What cookies and similar technologies (localStorage) are.
2. Table of what we use (below), with provider, purpose, duration.
3. **We use only essential cookies.** No analytics cookies, no advertising or cross-site tracking cookies, no third-party cookies, no session replay.
4. How product usage is counted: first-party events recorded on our own servers, with no cookie or device identifier. How to opt out (Settings → Privacy) and that we honour Global Privacy Control as an opt-out.

| Name / type | Provider | Category | Purpose | Duration [VERIFY at build] |
|---|---|---|---|---|
| `sb-<project-ref>-auth-token` (possibly chunked `.0`, `.1`; set by `@supabase/ssr`; exact name and `__Host-` option [VERIFY]) | Us (via Supabase Auth) | Strictly necessary | Keeps you signed in | Up to 30 days (7-day idle / 30-day absolute) |
| `sb-<project-ref>-auth-token-code-verifier` | Us (via Supabase Auth) | Strictly necessary | Security during Google sign-in (PKCE) | Minutes [VERIFY] |
| `notice` (cookie or localStorage) | Us | Strictly necessary | Remembers that you dismissed the essential-cookie notice | 12 months |
| `theme` (localStorage) | Us | Strictly necessary / preference | Light or dark mode | Until cleared |

### 5.2 Banner behaviour [P]
- A **minimal, essential-only notice** on first visit worldwide (GDPR-grade default, including Pakistan): "We use only essential cookies to keep you signed in. We count product usage on our own servers without cookies; you can opt out in Settings." One "Got it" button and a link to the Cookie Policy. No consent choice is needed for strictly necessary cookies [LAWYER confirm]. No cookie wall.
- No non-essential script, cookie or storage exists to gate, so nothing waits on the notice.
- **Analytics opt-out toggle** in Settings → Privacy (footer link "Privacy settings" for signed-out visitors) for first-party `ProductEvent` analytics. Default: on, under legitimate interests **[P][LAWYER]**; if counsel requires consent, switch to an opt-in toggle, default off.
- GPC signal (`Sec-GPC`) = automatic opt-out; Settings shows a short note instead of asking.
- Choice saved as `ConsentRecord(ANALYTICS_COOKIES, granted, version)` (type name kept; it now means the first-party analytics preference). Signed-out visitors: funnel steps are counted with no identifier and no IP [P].
- Withdraw or re-enable anytime from Settings; opting out stops new `ProductEvent` rows for that user.


---

## 6. Refund & Cancellation Policy (paid launch)

> Free beta has no payments. This policy launches with Safepay (PKR) and later a merchant of record (USD). Exact terms [LAWYER] + tax adviser.

| Topic | Proposed rule | Tag |
|---|---|---|
| SPRINT pass (PKR, one-time, 2–4 weeks) | No auto-renewal. **Full refund within 3 days of purchase if fewer than N AI actions used** (e.g. 1 analysis, 0 interviews) [P]; otherwise no refund except for service failure | P |
| PRO monthly (PKR via Safepay) | If local recurring is weak, sell as manual renewal (pay each month) [P]. Where auto-renew is used: renewal date and amount shown at checkout; reminder email 3–7 days before renewal; cancel online in Settings; cancellation effective at period end; no partial-month refunds except where law requires | P |
| PRO monthly (USD via merchant of record) | MoR's checkout and refund rules apply alongside ours; MoR is the seller of record and handles VAT/GST | P [VERIFY MoR Pakistan seller support] |
| First-subscription goodwill | Full refund on request within 7 days of first PRO charge if usage is under fair threshold | P |
| Service failure | Pro-rata credit or refund if a paid feature is unavailable for an extended period (e.g. > 72 h) | P |
| Plan downgrade | Takes effect at period end; data kept (only limits change) | P |
| Chargebacks | Contact us first; fraudulent chargebacks may lead to suspension | P |
| **EU/UK 14-day right of withdrawal** (when EU/UK consumers can pay) | At checkout: checkbox "I want access to start now and I understand I lose my 14-day right to withdraw once the service has been fully provided / digital content supplied", or pro-rata refund for services used during the 14 days. Stored as `ConsentRecord(EU_WITHDRAWAL_WAIVER)`. Confirmation email repeats it | [LAWYER] later |
| US auto-renewal laws | Clear disclosure, affirmative consent, easy online cancel, renewal reminders (ROSCA, California ARL and others) | [LAWYER] later |
| Taxes | Prices in PKR shown inclusive or exclusive of provincial sales tax per adviser [?] | [?] |
| How to request | Settings → Billing → "Request refund", or support@ with order ID; reply within 5 business days; refund to the original payment method (timing depends on Safepay/bank) | P |

---

## 7. Subprocessor list template

Published at `/legal/subprocessors` with a "last updated" date and email/RSS notice of changes at least 14 days before adding a new subprocessor [P].

| Subprocessor | Purpose | Data processed | Location [VERIFY regions at setup] | Transfer safeguard | DPA status |
|---|---|---|---|---|---|
| Vercel Inc. | App hosting, serverless functions (including our task worker), logs | All request data in transit; PII-free logs | USA (+ edge network); functions run in Singapore [D]. Hosting plan: Vercel Hobby is acceptable only for the private invite-only, non-commercial beta; Vercel Pro before public launch | DPF / SCCs | [VERIFY] |
| Supabase, Inc. (infrastructure: AWS) | Postgres database (accounts, content, and our own task queue, error log, product-event and rate-limit tables), authentication (email, password hash, sessions, Google identity), file storage (uploads, exports), scheduled triggers | All stored account and content data; resume files and exports | Singapore (AWS) [D]; EU region later if needed | SCCs / DPF | [VERIFY DPA availability on the free plan] |
| **Anthropic, PBC** | AI text generation and analysis | Masked resume, job description, interview text | USA | DPF + SCCs (DPA in Commercial Terms) | Accept before launch |
| Resend (Plus Five Five, Inc.) | Transactional email (including sign-in emails sent through Supabase Auth) and the daily operational digest | Email address, name, email content (links only) | Region chosen at setup; USA by default [VERIFY] | SCCs / DPF | [VERIFY] |
| GitHub, Inc. (Microsoft) | Source code, CI, and nightly **encrypted** database backups (30-day artifacts) | Ciphertext only; we hold the key [P]; no plaintext personal data | USA | DPF / SCCs | [VERIFY]; listed for transparency [LAWYER: whether it counts as a processor of ciphertext] |
| Google LLC | Sign-in with Google (independent controller for its own account data) | OAuth identity | USA | DPF / SCCs | Listed for transparency |
| Safepay (Pvt) Ltd *(later)* | PKR payments | Name, email, payment details (held by Safepay) | Pakistan | N/A (domestic) / contract | Later |
| Merchant of record *(later, TBD)* | USD payments, tax | Billing details | TBD | TBD | Later |

**Not subprocessors (by design):** no third-party analytics, error tracking, session replay, CAPTCHA, queue or cache vendors. Product analytics, the error log, the job queue and rate limiting run in our own tables on Supabase. DNS/registrar: [?] (Vercel DNS or the registrar; add here if it handles end-user traffic metadata).

**DPA checklist (file dated copies in the compliance folder) [P]:**
- [ ] Anthropic Commercial Terms + DPA (SCCs)
- [ ] Supabase DPA (check self-serve availability and sub-processor list, which includes AWS)
- [ ] Vercel DPA
- [ ] Resend DPA (confirm data region and log retention)
- [ ] GitHub DPA (Customer Agreement data-protection terms)
- [ ] Later: Safepay contract, merchant of record DPA

*Internal change note (2026-10-21, not for publication):* earlier drafts listed Neon, Cloudflare (R2, Turnstile, DNS), Inngest, Sentry, PostHog and Upstash. They were removed by the 5-platform decision (PRD §3). If any is added back later, update this table, the Privacy Policy transfer section and the Cookie Policy before it goes live.

---

## 8. Marketing claims: do / don't

| ❌ Don't say | ✅ Say instead | Why |
|---|---|---|
| "Beat the ATS" / "ATS-proof" | "Check that machines can read your resume (ParseHealth estimate)" | Unsubstantiated; ATS vary [D principle 4] |
| "ATS score" / "your ATS score is 87" | "JobMatch estimate: 87 — based on skills and requirement overlap" | No universal ATS score [D] |
| "Guaranteed interviews" / "get hired faster" | "Helps you tailor your resume to each job" | FTC §5 deception; no guarantee |
| "3x more callbacks" / "95% success rate" | Only claims backed by a documented study we can show | Needs competent and reliable evidence |
| "75% of resumes are rejected by ATS" | Don't cite it | Myth with no reliable source [D] |
| "Recruiter-approved" / "used by Google recruiters" | Real, permissioned quotes only | Endorsement rules |
| "Undetectable AI" / "passes AI detectors" | Don't market detector evasion | Deception, platform bans |
| "Your data is never stored" | "We don't train on your data. Our AI provider deletes it within 30 days." | Must match real retention |
| "AI career coach that knows what employers want" | "AI-powered practice and feedback" | Overclaiming |
| "Use it in your real interview" / "interview copilot" | "Practise with an AI interviewer" | Practice-only [D] |
| Fake or AI-written testimonials, paid reviews without disclosure | Real reviews with consent; disclose incentives | FTC Consumer Reviews and Testimonials Rule |
| "Free forever" (if limits may change) | "Free plan with monthly limits" | Accuracy |
| "Bank-grade security" / "100% secure" | "Encrypted in transit and at rest; you can export or delete anytime" | Unverifiable |

Review gate: every landing page, app-store text, social ad and email campaign is checked against this list before publishing [P].

---

## 9. Where documents appear and when consent is captured

| Moment | UI element | What is captured | ConsentRecord |
|---|---|---|---|
| Marketing site | Footer links to all `/legal/*` pages and `/security` | — | — |
| First visit | Minimal essential-cookies notice (informational; no choice needed) | Acknowledgment (UI only) | — |
| Signup (email or Google) | **Required, unticked** checkbox: "I am 16 or older and agree to the [Terms] and [Privacy Policy]." Links to AI Disclaimer and AUP under it. Separate optional unticked box: "Send me product tips and offers" | Age + terms acceptance; marketing opt-in | `AGE_16_PLUS`, `TERMS` (version), `PRIVACY` (version), `MARKETING_EMAIL` |
| Google OAuth | Same checkbox shown on the post-OAuth "Finish setup" screen **before** the account is created [P] | Same | Same |
| First resume upload | Notice + required checkbox for sensitive data; link to "what we send to AI" | Explicit consent (Art. 9) | `SENSITIVE_DATA` |
| First AI use | One-time info card: "AI drafts can be wrong. Scores are estimates, not ATS scores." | Acknowledgment (UI only) | — [P] |
| Mock interview start | Modal "You're practising with an AI interviewer. Practice only." + persistent badge | Acknowledgment | — |
| AI output panels, exports | "AI-generated — review before sending" badges; export metadata | — | — |
| Settings → Privacy | Toggles: **analytics opt-out** (first-party `ProductEvent`), marketing emails, **training opt-in** (default off), export, delete account | Changes | Corresponding types (`ANALYTICS_COOKIES` records the analytics preference) |
| Record menu | "Share with support" (time-boxed) | Consent for break-glass access | `SUPPORT_ACCESS` |
| Checkout (later) | Price, renewal terms, refund link, EU withdrawal waiver checkbox | Waiver, terms of sale | `EU_WITHDRAWAL_WAIVER` |
| Material policy change | In-app banner + email; on next login, a blocking "We've updated our Terms/Privacy" screen with Accept (or Delete account / Export) | New version acceptance | `TERMS` / `PRIVACY` new version |

Rules: `ConsentRecord` stores type, **document version**, granted, timestamp, truncated IP, user-agent hash, source [P]. Legal document versions live in the repo (`/content/legal/<doc>/<version>.md`) so the exact accepted text can be reproduced [P].

---

## 10. Questions for the lawyer and tax adviser

### Lawyer (Pakistan + international privacy)
1. **Entity:** operate as a Pakistani sole proprietor, SMC-Pvt Ltd, or a foreign entity (US/UK)? Who is the controller named in the Privacy Policy?
2. **Governing law and venue:** is Pakistan law with [city] courts appropriate for global consumers? How do we handle EU/UK mandatory consumer protections? Should US users get arbitration terms later?
3. **Liability cap and disclaimers:** enforceable under Pakistani consumer protection acts (provincial) and for EU/UK consumers?
4. **GDPR/UK GDPR applicability** while marketing mainly in Pakistan: do we need an Art. 27 EU representative and a UK representative at free beta if we accept (but don't target) EU/UK users?
5. **Special-category data:** is the upload checkbox valid explicit consent under Art. 9(2)(a)? Is it acceptable that consent is required to upload?
6. **EU AI Act:** confirm non-high-risk classification memo, whether Art. 6(3) registration applies, and whether resume edits fall under the Art. 50(2) "assistive editing" exception while cover letters need machine-readable marking.
7. **Pakistan PDP Bill / PECA:** current status of the PDP Bill and any data-localization rules for "critical personal data"; PECA 2025 amendment obligations (complaint contact, takedown) for a non-social app.
8. **Transfers:** is founder/contractor access from Pakistan to EU users' data a restricted transfer requiring SCCs?
9. **Consent record retention:** how long to keep proof of consent after account deletion?
10. **Copyright in AI output:** wording for assigning output rights to users.
11. **Refunds and withdrawal:** EU/UK 14-day withdrawal waiver wording; Pakistani consumer refund expectations; auto-renewal disclosures for PKR subscriptions.
12. **DSA:** do we have any obligations as a hosting service if no public sharing exists?
13. **Washington MHMDA / US state sensitive-data laws** if resumes contain health data.
14. **First-party analytics basis:** is legitimate interests with an opt-out (and GPC honoured) enough for cookie-less, server-side `ProductEvent` analytics in the EU/UK, or is consent required? Does ePrivacy Art. 5(3) apply when nothing is stored on or read from the device? Is an essential-only notice sufficient?
15. **Singapore hosting and sub-processor chain:** wording of the transfer disclosure (Supabase Singapore on AWS, Vercel functions Singapore, Anthropic US, Resend region, GitHub US encrypted backups) and whether encrypted backups held by GitHub need to be listed as a subprocessor.

### Tax adviser (Pakistan)
1. NTN, entity registration and documents needed for **Safepay** merchant onboarding (sole proprietor acceptable?) (PRD open question 3).
2. **Provincial sales tax on services** (SRB, PRA, KPRA, BRA): which province applies to online SaaS sold nationwide, rate (~13–16% [VERIFY]), reduced IT rates, and whether prices must be shown tax-inclusive.
3. Income tax on **USD receipts via a merchant of record**: export-of-services treatment, PSEB registration benefits, banking-channel requirements.
4. Can a Pakistan-based seller use **Paddle / Lemon Squeezy / other MoR**? (PRD open question 4) Payout routes (bank, Payoneer).
5. Billing record retention period required by Pakistani law.
6. Invoicing requirements (e.g. FBR/provincial e-invoicing) for consumer digital sales.
