# AI Resume Job Matcher

Upload a resume, paste a job, and see honestly how you fit. Evidence-backed resume edits that never invent experience, configurable mock interviews with scored reports, and an application tracker that remembers which resume you sent.

> **Status:** live beta, built phase by phase: profile and evidence bank, resume upload and analysis, job matching, application tracker, settings with data export and account deletion. AI-written cover letters and mock interviews come next.

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

## Security
- Reporting a vulnerability: [SECURITY.md](SECURITY.md)

## License
All rights reserved. The source is public for reference and review; no license is granted to reuse it.
