# 06 - Pakistan Market Research (as of 2026-10-20)

Legend: [V] = supported by a source found this session; [U] = unverified / background knowledge or weak source - confirm before relying. Web search was shallow (snippet-level); no official primary pages (Stripe, Paddle, FBR, SRB) were confirmed.

## 1. Job market and sources
| Item | Notes |
|---|---|
| Boards | Rozee.pk (largest local; RozeeGPT AI CV/interview assistant [V: webcatalog.io/en/apps/rozeegpt, third-party listing]), Mustakbil.com (free resume builder, "free forever" claim [V: mustakbil.com/jobseekers]), LinkedIn, Indeed PK, BrightSpyre, Glassdoor [U] |
| Government | NJP, PPSC/FPSC/SPSC/KPPSC, department sites + newspaper ads; paper/PDF forms asking father's name, CNIC, religion, domicile, photo [V: petroleum.gov.pk/SiteImage/Jobs/adv_form.pdf, health.punjab.gov.pk job form] |
| ATS usage | [U] Multinationals (Unilever, P&G, Nestle, Engro-type groups), big banks (HBL, UBL, MCB, Meezan), telcos (Jazz, PTCL, Zong), larger IT firms (Systems Ltd, NetSol, 10Pearls, Arbisoft) use ATS (Workday, SuccessFactors, Taleo, Greenhouse, Lever). Many SMEs: email/WhatsApp CVs and Rozee inbox. Validate via user interviews. |
| Hiring process | [U] Management-trainee programs: online aptitude + case + panel. Banks/govt: written tests (NTS/PTS/ETEA/OTS), then panel. IT: coding/take-home + technical + HR. Govt: CV screening, written test, interview, quota/domicile rules. |
| Freelancing/remote | Large: Pakistan is a top-ranked Upwork/Fiverr country [U: needs figure]; IT exports multi-billion USD/yr [U]. Freelancers need profile/proposal copy more than ATS CVs; remote international roles use global (no-photo) resumes. Payoneer is the standard payout rail [V: payoneer.com/resources/general-payments/online-payment-methods-in-pakistan/]. |

Personas: (a) local grad/mid-career (Rozee, banks, govt); (b) professionals targeting multinationals/Gulf; (c) freelancer/remote-international. Govt form-filling is a separate niche (low ATS relevance).

## 2. Resume conventions
| Field | Local norm | International/ATS | Advice |
|---|---|---|---|
| Photo | Common; forms demand passport photo [V: NICL/PIEAS forms] | Omit in US/UK/CA/AU (bias risk, ATS garbling); expected in Germany, some Gulf | Default off outside local mode |
| CNIC | Required on govt/some private forms [V] | Never include (identity-theft risk) | Never on CV; official forms only; warn |
| DOB / age | Common | Omit (age-discrimination laws) | Off for global |
| Marital status | Common | Omit | Off for global |
| Father's/husband's name | Common | Omit | Form-only field |
| Religion / domicile | On forms; domicile for quotas | Omit religion; state work authorization | Religion never on CV; domicile only in govt mode |
| References | "Available on request" or listed | Omit or "on request" | Off by default |
| Length | 1-2 pages [V, vendor resumly.ai] | US 1 page (<10y), UK 2, Germany tabular | Region templates |
Legal treatment of discrimination per country not verified. Vendor claim: modern local practice is to drop most of these from the CV and give them on the application form [V: resumly.ai/ai-resume-builder-pakistan, weak].

App recommendation: onboarding "Target market" setting (Pakistan-local / Pakistan-private-corporate / Gulf / US-Canada / UK-EU / Remote-global / Govt-form). It toggles template, sensitive-field defaults (stored privately, exported only if chosen), a PII lint (flags CNIC pattern 5-7-1 digits, DOB, religion, photo) with plain-language reasons, UK/US spelling, page-length rules. Mask CNIC/phone before sending text to LLMs.

## 3. Local competitors / tools
| Tool | What | Pricing |
|---|---|---|
| RozeeGPT / Rozee.pk | AI CV builder via chat, job-match, interview prep, alerts [V third-party listing] | Not found [U] |
| Mustakbil.com | Free resume builder + import [V] | Free |
| Kamayi (2019) human CV writing | Human-written | PKR 495 / 795 / 1,195 by experience [V: propakistani.pk/2019/10/03/kamayi-helps-make-your-cv-for-landing-your-dream-job/]; likely higher now |
| Fiverr CV gigs | ChatGPT-assisted [V: fiverr listing] | ~PKR 1,500-6,000 [U] |
| Global (Resume.io, Zety, Kickresume, Rezi, Jobscan, Teal, Careerflow) | Used by Pakistanis, USD-priced | ~$15-30/mo [U]; no PKR/local wallets |
| Resumly.ai PK page | Claims English/Urdu bullets [V, vendor] | not shown |
No dedicated Pakistani AI mock-interview startup found [U - search more]. Gap: ATS + tracker + interview in one, local payments, region templates, Urdu/Roman Urdu support.

## 4. Payments (Pakistan-based seller)
| Option | Status | Fees | Onboarding | Recurring |
|---|---|---|---|---|
| Stripe | Direct Pakistan merchant accounts NOT available per most sources (WorldFirst guide; Incorpuk Mar-2026); one blog claims otherwise [V mixed]. Workaround: foreign entity (Atlas/US/UK LLC) [U] | - | Foreign company | Yes |
| Paddle / Lemon Squeezy (MoR) | No source confirmed Pakistan seller/payout support [U - check Paddle/LS supported-countries docs]. LS is Stripe-owned; Jan 2026 "Stripe Managed Payments" update [V: dodopayments.com/blogs/paddle-vs-lemon-squeezy/] | ~5%+$0.50 [V third-party]; LS adds intl/subscription surcharges | Payout via bank/PayPal [U] | Yes |
| Safepay | Local, Stripe-backed investor [V: profit.pakistantoday.com.pk/?p=116833]. Fee incl. 15% SST; ~2.2% before tax, so ~2.5-2.9% [V: safepay.helpscoutdocs.com/article/131-safepay-fee-breakdown, undated] | ~2.5-3% | NTN / business bank; sole-prop acceptance [U] | Saved-card recurring via integrations [V weak: BillingServ] |
| PayFast (APPS) | Local gateway | n/a [U] | NTN, business account | Subscription features "less flexible" [V vendor blog xstak.com/blog/payfast-alternative] |
| JazzCash / Easypaisa | Wallet + card; merchant approval direct; JazzCash recurring claim [V weak: cartdna.com]. Consumer schedule: 3% card funding [V: mobilinkbank.com SOC Q1 2026; not merchant rates] | ~1.5-3% [U] | Business docs, NTN, bank; slow | Limited |
| Payoneer | USD receiving; incoming 1% (>=$100) / $1 below, withdrawal 2-3% [V conflicting: digitalpakistan.pk/payoneer-revises-fee-structure-for-pakistani-users/]. Payoneer+Stripe checkout announced 2025, rollout unconfirmed [V: profit.pakistantoday.com.pk/?p=209810] | see left | Individual/business | Not a subscription engine |

Recommendation: dual rail. PKR via Safepay (cards + wallets; sell one-time passes, manual-renew subscriptions). USD via an MoR if one accepts PK sellers, else foreign entity + Stripe, or Payoneer checkout. Gating task: write to Paddle/LS/Safepay/Payoneer support now. Prefer one-time passes over auto-recurring for PKR (local recurring weak, decline rates high [U]).

## 5. Pricing power (all [U] - judgment; validate with survey)
- Entry salaries ~PKR 50-100k/mo (grads), IT mid ~PKR 150-400k; small card-holding population; wallet/bank transfer common. Existing paid CV services run PKR 500-5,000.
- Suggested PKR: Free tier (1 resume, limited ATS scans); 2-4 week Job Search Pass PKR 999-1,499 (anchor 1,299); Pro monthly PKR 1,499-1,999, annual PKR 9,999-12,999; student/fresh-grad 40-50% off (pass ~PKR 599-799) via .edu.pk email or student ID; mock-interview add-on PKR 300-500/session.
- Global USD: Pro $12-19/mo, 2-week pass $9-15, annual ~$79-99, student 30-40% off. PPP pricing keyed to billing country (not IP only) to limit abuse. Revisit given PKR depreciation.
- AI interview minutes drive COGS: cap per pass.

## 6. Tech/UX context
- 194M cellular connections (75.9% of pop.), 117M internet users (45.6%) end-2025 [V: datareportal.com/reports/digital-2026-pakistan]; smartphones 71.6% of devices [V: phoneworld.com.pk/pakistan-smartphone-usage-71-percent-economic-survey-2026/]; ~79.5% of connections broadband-capable [V, GSMA via DataReportal].
- Mobile-first browsing; CV editing/PDF export often desktop for professionals [U]. Build mobile-first responsive; PWA (installable, offline drafts, flaky connection/load-shedding resilience) is a strong fit; avoid heavy video; record voice locally and upload async.
- Language: CVs and job search overwhelmingly English; Urdu/Roman Urdu for conversation/WhatsApp [U]. Offer Urdu/Roman Urdu UI hints, interviews tolerant of code-switching; resume output English. Test Roman Urdu LLM quality. WhatsApp share and small PDFs are high value.

## 7. Legal quick check (not legal advice)
| Topic | Status |
|---|---|
| PECA 2016 + 2025 amendment | NA passed PECA (Amendment) Bill Jan 2025: Social Media Protection and Regulatory Authority, tribunal, "fake news" offence (up to 3 yrs / Rs2m) [V: arynews.tv/peca-amendment-bill-2025-passed-from-national-assembly/; amnesty.org/en/latest/news/2025/01/pakistan-authorities-pass-bill-with-sweeping-controls-on-social-media/]. Final enactment not confirmed in my searches [U]. Relevance low for a non-social app: keep takedown/complaint contact, avoid AI-fabricated credentials. |
| PTA | Telecom/internet regulator; VPN/throttling disruptions have occurred [U]; PWA/offline helps. |
| Data protection | No enacted comprehensive law as of May 2026 (Chambers 2026: practiceguides.chambers.com/practice-guides/data-protection-privacy-2026/pakistan). PDP Bill cabinet-approved but delayed; a weak site mentions a "PDP Act 2026" debate (May 2026) - unverified [V mixed]. Drafts reportedly had cross-border transfer limits/critical-data localisation [U]. No confirmed localization requirement for this app; SBP payment-data rules apply to licensed PSPs [U]. Plan GDPR-grade practice (consent, deletion, minimisation, encryption). |
| Consumer protection | Provincial consumer protection acts [U]; show clear pricing, refund policy, contact info. |
| Tax | Services taxed provincially (SRB Sindh, PRA Punjab, KPRA, BRA), roughly 13-16%, with reduced IT rates in some provinces [V weak: trykintsugi.com/sales-tax-guides/apac/pakistan; sources conflict on non-resident registration]. Domestic SaaS sales likely need provincial registration [U]. Service exports: zero-rated / concessional income tax if proceeds via banking channels, PSEB registration [U]. Need NTN and entity choice (sole prop / SMC-Pvt Ltd). Hire a Pakistani tax adviser. Foreign MoR handles consumer VAT/GST abroad. |

## Open items before launch
1. Paddle/LS/Polar/Dodo supported-seller list for Pakistan. 2. Safepay merchant fees, sole-proprietor onboarding, subscription API. 3. RozeeGPT pricing. 4. Provincial SaaS tax registration, PSEB. 5. Final PECA 2025 and PDP bill status. 6. WTP survey (n>=100 grads).

## Sources
- https://datareportal.com/reports/digital-2026-pakistan
- https://www.phoneworld.com.pk/pakistan-smartphone-usage-71-percent-economic-survey-2026/
- https://practiceguides.chambers.com/practice-guides/data-protection-privacy-2026/pakistan
- https://arynews.tv/peca-amendment-bill-2025-passed-from-national-assembly/
- https://www.amnesty.org/en/latest/news/2025/01/pakistan-authorities-pass-bill-with-sweeping-controls-on-social-media/
- https://safepay.helpscoutdocs.com/article/131-safepay-fee-breakdown
- https://profit.pakistantoday.com.pk/?p=116833
- https://profit.pakistantoday.com.pk/?p=209810
- https://incorpuk.com/blog/open-stripe-account-in-pakistan/
- https://www.worldfirst.com/sasia/blog/business-banking-insights/stripe-guide-south-asia/
- https://dodopayments.com/blogs/paddle-vs-lemon-squeezy/
- https://mobilinkbank.com/assets/documents/SOC_Q1_2026.pdf
- https://digitalpakistan.pk/payoneer-revises-fee-structure-for-pakistani-users/
- https://www.mustakbil.com/jobseekers
- https://propakistani.pk/2019/10/03/kamayi-helps-make-your-cv-for-landing-your-dream-job/
- https://trykintsugi.com/sales-tax-guides/apac/pakistan
- https://www.resumly.ai/ai-resume-builder-pakistan
- https://petroleum.gov.pk/SiteImage/Jobs/adv_form.pdf
