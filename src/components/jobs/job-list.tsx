"use client";

import { AnimatePresence, motion } from "motion/react";
import { Briefcase, Building2, Gauge, Home, LayoutGrid, List, MapPin, Plus, Search, Sparkles, Target, TriangleAlert } from "lucide-react";
import Link from "next/link";
import { useMemo, useState } from "react";
import { Button, ButtonLink } from "@/components/ui/button";
import { RingScore } from "@/components/ui/charts";
import { Chip, StatusChip } from "@/components/ui/chip";
import { Field, Input, Select } from "@/components/ui/field";
import { Item, Stagger, useSkipMotion } from "@/components/ui/motion";
import { EmptyState, PageHeader } from "@/components/ui/panel";
import { StatCard } from "@/components/ui/stat-card";
import { bandFor } from "@/components/ui/score";
import { CompanyTile, IconChip, IconComposition } from "@/components/resumes/visual";
import { SOURCE_LABEL } from "@/demo/labels";
import { useDemo } from "@/demo/store";
import type { Application, Job, JobSource } from "@/demo/types";
import { cn } from "@/lib/cn";
import { formatDate } from "@/lib/dates";
import { liveMatch } from "./lib/match";

type View = "grid" | "list";
interface Row {
  job: Job;
  score: number;
  app?: Application;
}

const MODE_ICON = { Remote: Home, Hybrid: Building2, "On-site": Building2 } as const;

function JobCard({ row, view }: { row: Row; view: View }) {
  const { job, score, app } = row;
  const band = bandFor(score);
  const ModeIcon = MODE_ICON[job.workMode];
  const list = view === "list";

  return (
    <article className={cn("card card-hover relative flex h-full gap-4 p-4 sm:p-5", list ? "flex-row items-center" : "flex-col", job.archived && "opacity-70")}>
      <div className={cn("flex min-w-0 gap-3", list ? "flex-1 items-center" : "items-start justify-between")}>
        <div className="flex min-w-0 flex-1 items-start gap-3">
          <CompanyTile name={job.company} />
          <div className="min-w-0">
            <Link href={`/app/jobs/${job.id}`} className="font-display text-[17px] font-bold leading-snug after:absolute after:inset-0 after:rounded-[20px] hover:underline">
              {job.title}
            </Link>
            <p className="truncate text-sm text-muted">{job.company}</p>
            <div className="mt-2 flex flex-wrap items-center gap-1.5">
              <Chip className="bg-sunken text-ink">
                <MapPin className="size-3.5" aria-hidden />
                {job.location}
              </Chip>
              <Chip className="bg-sunken text-ink">
                <ModeIcon className="size-3.5" aria-hidden />
                {job.workMode}
              </Chip>
              <Chip className="border border-rule text-muted">{SOURCE_LABEL[job.source]}</Chip>
              {job.archived && <Chip className="border border-rule text-muted">Archived</Chip>}
            </div>
          </div>
        </div>
        <div className="flex shrink-0 flex-col items-center gap-0.5 text-center">
          <RingScore value={score} size={list ? 60 : 64} stroke={6} label={`Fit estimate for ${job.title}`} />
          <span className="sr-only">Fit estimate: {band.word}</span>
          <span aria-hidden className={cn("text-xs font-semibold", band.tone === "low" ? "text-warn" : "text-hl-ink")}>
            {band.word}
          </span>
        </div>
      </div>
      <div className={cn("flex items-center justify-between gap-2 text-sm text-muted", list ? "hidden shrink-0 flex-col items-end sm:flex" : "mt-auto border-t border-rule pt-3")}>
        <span>Added {formatDate(job.addedAt)}</span>
        {app ? (
          <span className="flex items-center gap-1.5">
            <Chip className="bg-hl-soft text-hl-ink">Tracked</Chip>
            <StatusChip value={app.status} />
          </span>
        ) : (
          <span className="text-xs">Not tracked yet</span>
        )}
      </div>
    </article>
  );
}

export function JobList() {
  const { state } = useDemo();
  const reduce = useSkipMotion();
  const [query, setQuery] = useState("");
  const [source, setSource] = useState<JobSource | "ALL">("ALL");
  const [showArchived, setShowArchived] = useState(false);
  const [view, setView] = useState<View>("grid");

  const all = useMemo<Row[]>(
    () => state.jobs.map((j) => ({ job: j, score: liveMatch(state, j).now.score, app: state.applications.find((a) => a.jobId === j.id) })),
    [state],
  );

  const rows = useMemo(() => {
    const q = query.trim().toLowerCase();
    return all
      .filter(({ job: j }) => showArchived || !j.archived)
      .filter(({ job: j }) => source === "ALL" || j.source === source)
      .filter(({ job: j }) => !q || `${j.title} ${j.company} ${j.location}`.toLowerCase().includes(q))
      .sort((a, b) => b.job.addedAt.localeCompare(a.job.addedAt));
  }, [all, query, source, showArchived]);

  // Summary strip: computed over the jobs you haven't archived.
  const stats = useMemo(() => {
    const live = all.filter((r) => !r.job.archived);
    const tracked = live.filter((r) => r.app).length;
    const avg = live.length ? Math.round(live.reduce((s, r) => s + r.score, 0) / live.length) : 0;
    const strong = live.filter((r) => r.score >= 80).length;
    const missing = new Map<string, number>();
    for (const { job } of live) {
      const reqs = liveMatch(state, job).now.reqs;
      new Set(reqs.filter((q) => q.cls === "MISSING").map((q) => q.skill)).forEach((s) => missing.set(s, (missing.get(s) ?? 0) + 1));
    }
    const top = [...missing.entries()].sort((a, b) => b[1] - a[1])[0];
    return { total: live.length, tracked, avg, strong, top };
  }, [all, state]);

  const archivedCount = state.jobs.filter((j) => j.archived).length;
  const filtered = query.trim() !== "" || source !== "ALL";

  return (
    <div className="mx-auto max-w-5xl">
      <PageHeader
        title="Jobs"
        description="Every job you've saved, with a fit estimate for your active resume."
        actions={
          <ButtonLink href="/app/match" variant="primary">
            <Plus className="size-4" aria-hidden />
            Match a new job
          </ButtonLink>
        }
      />

      {state.jobs.length > 0 && (
        <Stagger className="grid grid-cols-2 gap-3 pb-6 lg:grid-cols-4 lg:gap-4">
          <Item>
            <StatCard icon={Briefcase} label="Tracked jobs" value={stats.tracked} emphasis footnote={`of ${stats.total} saved`} />
          </Item>
          <Item>
            <StatCard icon={Gauge} label="Average fit" value={stats.avg} footnote="Estimate, your active resume" />
          </Item>
          <Item>
            <StatCard icon={Target} label="Strong fits" value={stats.strong} footnote="Fit of 80 or more" />
          </Item>
          <Item>
            <div className="card card-hover flex h-full flex-col p-5">
              <IconChip icon={TriangleAlert} className="bg-warn-soft text-warn" />
              <span className="mt-4 text-sm font-semibold text-muted">Most often missing</span>
              <span className="font-display text-2xl font-bold leading-tight">{stats.top ? stats.top[0] : "Nothing"}</span>
              <p className="mt-1 text-xs text-muted">
                {stats.top ? `Missing in ${stats.top[1]} ${stats.top[1] === 1 ? "job" : "jobs"}` : "No missing must-haves right now"}
              </p>
            </div>
          </Item>
        </Stagger>
      )}

      <div className="flex flex-col gap-3 pb-5 sm:flex-row sm:items-end">
        <Field label="Search" htmlFor="job-search" className="sm:flex-1">
          <div className="relative">
            <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted" aria-hidden />
            <Input id="job-search" type="search" value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Title, company or city" className="pl-9" />
          </div>
        </Field>
        <Field label="Source" htmlFor="job-source" className="sm:w-56">
          <Select id="job-source" value={source} onChange={(e) => setSource(e.target.value as JobSource | "ALL")}>
            <option value="ALL">All sources</option>
            {(Object.keys(SOURCE_LABEL) as JobSource[]).map((s) => (
              <option key={s} value={s}>{SOURCE_LABEL[s]}</option>
            ))}
          </Select>
        </Field>
        <div className="flex items-center justify-between gap-3 sm:justify-start">
          <label className="flex min-h-11 cursor-pointer items-center gap-2 text-sm">
            <input type="checkbox" className="size-4 accent-[var(--hl-ink)]" checked={showArchived} onChange={(e) => setShowArchived(e.target.checked)} />
            Show archived{archivedCount ? ` (${archivedCount})` : ""}
          </label>
          <div role="group" aria-label="Layout" className="inline-flex gap-1 rounded-xl border border-rule bg-sunken p-1">
            {([
              ["grid", "Grid view", LayoutGrid],
              ["list", "List view", List],
            ] as const).map(([v, label, Icon]) => (
              <button
                key={v}
                type="button"
                aria-pressed={view === v}
                aria-label={label}
                onClick={() => setView(v)}
                className={cn("grid size-9 place-items-center rounded-lg transition-colors", view === v ? "bg-hl text-on-hl glow" : "text-muted hover:text-ink")}
              >
                <Icon className="size-4" aria-hidden />
              </button>
            ))}
          </div>
        </div>
      </div>

      {rows.length === 0 ? (
        filtered ? (
          <EmptyState title="No jobs match these filters" body="Try a different search or pick “All sources”." action={<Button onClick={() => { setQuery(""); setSource("ALL"); }}>Clear filters</Button>} />
        ) : (
          <EmptyState
            icon={<IconComposition icon={Briefcase} />}
            title="No jobs yet"
            body="Paste a job description to see how well your resume fits it, and what to improve."
            action={<ButtonLink href="/app/match" variant="primary"><Sparkles className="size-4" aria-hidden />Match your first job</ButtonLink>}
          />
        )
      ) : (
        <ul className={cn("grid gap-4", view === "grid" ? "md:grid-cols-2" : "grid-cols-1")}>
          <AnimatePresence initial={false}>
            {rows.map((r, i) => (
              <motion.li
                key={r.job.id}
                layout={reduce ? false : "position"}
                initial={reduce ? false : { opacity: 0, y: 14 }}
                animate={{ opacity: 1, y: 0 }}
                exit={reduce ? undefined : { opacity: 0, scale: 0.96 }}
                transition={{ duration: 0.35, delay: Math.min(i, 8) * 0.04, ease: [0.2, 0.7, 0.2, 1] }}
              >
                <JobCard row={r} view={view} />
              </motion.li>
            ))}
          </AnimatePresence>
        </ul>
      )}
      <p className="pt-4 text-sm text-muted">Fit numbers are estimates to guide your preparation, not a hiring prediction.</p>

    </div>
  );
}
