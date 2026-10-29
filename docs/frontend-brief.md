# Frontend prototype brief (for screen-building agents)

Goal: an **interactive, clickable prototype with demo data** so the founder can judge flows, functionality and design before the backend exists. It will later become the real frontend, so write production-quality code.

## Read first (only these)
- `CLAUDE.md`: the Non-Negotiable Product Rules apply to UI copy and behavior.
- `docs/research/07-ui-ux-patterns.md`: patterns researched from competitors; follow its recommendations for your screens.
- `docs/prd/02-features.md`: only the module(s) for your screens (search by module ID: AUTH, PRO, RES, JOB, MAT, TLR, CVL, INT, TRK, DSH, SET).
- The shared code listed below (read; don't edit).

## Stack and shared code (READ-ONLY for you)
- Next.js 16 App Router, React 19, TypeScript strict, Tailwind v4 (tokens in `src/app/globals.css`), `lucide-react` icons, `@dnd-kit/*` (kanban), `motion` (landing only). **No other dependencies.**
- `src/demo/types.ts` (glossary-named types), `src/demo/data.ts` (sample data, "today" = 2026-10-21), `src/demo/labels.ts`, `src/demo/store.tsx` (`useDemo()` → `{ state, dispatch, jobById, resumeById, matchFor, activeResume, atLimit, ready }`, action list in the file).
- `src/components/ui/*`: Button/ButtonLink/IconButton, Chip/MatchChip/SeverityChip/StatusChip/EstimateTag, ScoreBand/Meter/bandFor, Panel/PageHeader/EmptyState, Field/Input/Textarea/Select/Segmented, Sheet/Dialog, Tabs, `useToast()`.
- `src/lib/cn.ts`, `src/lib/dates.ts` (TODAY, formatDate, relativeDay, daysBetween).
- The app shell (`src/components/app/app-shell.tsx`, `src/app/app/layout.tsx`) already provides nav, theme, accent and toasts.
- **Don't edit shared files.** If you need a helper, create it inside your own folders. If a shared change is truly needed, describe it in your final report instead.

## Design system (follow exactly)
- **Concept: the neon highlighter.** The accent (`--hl`, lime by default; the user can switch it) is a highlighter pen on a resume. Use the `.hl` class or `bg-hl` **only** for things backed by evidence or confirmed (evidence quotes, accepted edits, matched requirements, the current nav item, primary buttons). Never use it as decoration.
- Tokens: `bg-paper` (page), `bg-surface` (panels), `bg-sunken` (wells/tracks), `text-ink`, `text-muted`, `border-rule`/`border-rule-strong`, `bg-hl text-on-hl` (fill), `text-hl-ink` (accent text), `bg-hl-soft`, `text-warn bg-warn-soft` (missing/high severity), `text-partial bg-partial-soft`, `text-danger`. Light and dark both come from tokens; never hard-code colors.
- Type: `font-display` (Bricolage Grotesque) for headings, body is Atkinson Hyperlegible Next (default). **No all-caps labels, no tracked-out eyebrows, no monospace labels, no "→" appended to buttons/links, no middle-dot meta strings where a layout would be clearer.**
- Layout: reading-width columns; not everything in a card. Vary radius by hierarchy (`--radius-sm/md/lg`). No gradient washes, no generic soft shadows on every card.
- Motion: only in response to user actions (accepting an edit = `hl-sweep`; meter fill once). Respect reduced motion (already global).
- Scores: band word + number + `EstimateTag` + a breakdown the user can reproduce. Never "ATS score", never hiring probability.
- Copy: sentence case, plain verbs, buttons say exactly what happens ("Save as new version", not "Submit"). Errors and empty states say what to do next. Pakistan-friendly but global English.

## v2 visual system (2026-10-21). Founder feedback: v1 was "too simple". Make it modern, visual and interactive.
These override any "keep it quiet" guidance above. The highlighter meaning of the accent still holds for evidence, but the accent may now also glow on primary actions, active states, icons and charts.
- **Surfaces:** use `.card` (20px radius, layered shadow, top highlight) for content groups; add `.card-hover` to interactive cards (lift + accent glow). The page background is already `.ambient` (dot grid + soft accent glow) via the app shell. Vary density: hero/summary cards bigger and bolder, lists compact.
- **Accent glow:** the `glow` utility (also `hover:glow`) for icon chips, primary CTAs and active items; `text-glow` sparingly for one hero number.
- **Charts and numbers** (from `src/components/ui/charts.tsx`, `stat-card.tsx`, `motion.tsx`):
  - `StatCard` (icon chip, count-up value, delta pill, sparkline), `Sparkline`, `RingScore`, `BarChart`, `Funnel`, `AnimatedNumber`, `Stagger` + `Item` (staggered entrance).
  - Chart marks use `var(--viz)`: validated ≥ 3:1 on light and dark, because neon on white fails, so light mode uses a deeper step automatically. Text never takes the series color.
  - One series per chart unless a legend + direct labels are added. Every chart has an aria summary and hover/focus values.
- **Motion:** `motion` (`motion/react`) is allowed in the app too: staggered card entrances on page load, layout transitions (`layout`, `AnimatePresence`) for lists, filters, tabs and accordions, and spring hover/press on interactive cards. Keep durations 150–450 ms, never block input, and always honor `useReducedMotion`.
- **Iconography:** lucide icons inside rounded-xl chips (`bg-hl-soft text-hl-ink`, or `bg-hl text-on-hl glow` for emphasis) to give each card a visual anchor.
- **Visual richness without fake data:** skeleton shimmer (`.shimmer`) during simulated AI work; progress steppers; avatar/company initials tiles (colored from a neutral palette derived from the name hash, using tokens only); badges; empty states with an illustration-like icon composition.
- **Buttons** are rounded-xl. The primary glows on hover. Use the `ink` variant for a strong secondary action. Don't override button colors via className.
- **Mobile:** cards stack; the floating bottom nav is already in the shell (leave ~96px bottom padding).

## Behavior rules for the prototype
- Everything reads/writes the demo store via `useDemo()`/`dispatch`. Persisted to localStorage; the shell has "Reset demo".
- "AI" is **simulated**: short delays (600–1800 ms) with honest stage labels ("Reading your resume", "Checking the job's requirements"), then deterministic results from demo data or simple local logic. Never pretend a real file was parsed: when a user picks their own file, say the demo uses the sample resume.
- **Never fabricate** in generated text: only use facts from `state.profile` (experiences, projects, skills, factBank) and the resume. Where a number or fact is missing, output a visible `[placeholder]` or ask the user a question.
- Respect plan limits with `atLimit(key)` and `dispatch({type:"INCREMENT_USAGE"})`; show a friendly limit-reached state.
- Client components (`"use client"`). Dynamic routes read params via `useParams()`. Any component that uses `useSearchParams()` must be wrapped in `<Suspense>`.
- Accessibility: real buttons/links/labels, visible focus, keyboard alternatives for drag-and-drop, `aria-live` for streaming text, works at 360px width, touch targets ≥ 44px.

## Definition of done for your part
1. `npx tsc --noEmit` passes (whole project).
2. `npx eslint <your folders>` passes with no errors.
3. Don't run `next dev` or `next build` (other agents work in parallel). The coordinator will run and screenshot the app.
4. Final report: routes and files you created, the interactions implemented, anything simulated, shared changes you'd request, and known gaps.
