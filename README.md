# AI Resume & Job Matcher

Upload a resume, paste a job, and see honestly how you fit. Evidence-backed resume edits that never invent experience, configurable mock interviews with scored reports, and an application tracker that remembers which resume you sent.

> **Status:** in active development. The current build is a clickable prototype running on sample data in your browser; the real backend is being built phase by phase (see [the roadmap](docs/prd/08-roadmap-quality.md)).

## Principles
- **Never fabricate.** Suggestions cite your resume or facts you confirmed. A skill the job wants but you don't list becomes a question, never an edit.
- **Estimates, not "ATS scores."** Every score is computed in code from factors shown beside it.
- **Privacy first.** CNIC, phone, email and address are masked before any AI step. Export or delete your data any time.
- **Practice only.** The interview coach prepares you; it never assists during a real interview.

## Stack
Next.js (App Router, TypeScript strict) · Tailwind CSS · Supabase (Postgres, Auth, Storage; Singapore) · Claude (Anthropic) behind an `AiProvider` interface · Resend · Vercel.

## Development
```bash
npm install
cp .env.example .env.local   # fill in values; never commit them
npm run dev                  # http://localhost:3000
npm run lint && npm run typecheck && npm test
```

## Documentation
- Product spec: [docs/PRD.md](docs/PRD.md) and [docs/prd/](docs/prd/)
- Security and privacy design: [docs/prd/06-security-privacy.md](docs/prd/06-security-privacy.md)
- Reporting a vulnerability: [SECURITY.md](SECURITY.md)

## License
All rights reserved. The source is public for reference and review; no license is granted to reuse it.
