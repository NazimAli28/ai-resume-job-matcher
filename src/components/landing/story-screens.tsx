import { Check, FileText, Mic } from "lucide-react";
import type { ReactNode } from "react";
import { RingScore } from "@/components/ui/charts";
import { EstimateTag, MatchChip } from "@/components/ui/chip";
import { bandFor, Meter } from "@/components/ui/score";
import { initialState } from "@/demo/data";
import { SOURCE_LABEL } from "@/demo/labels";
import { STAGES } from "./demo-stages";
import { sampleInterview, sampleJob, sampleResume, suggestionById } from "./sample";

const match = initialState.matches.find((m) => m.jobId === sampleJob.id)!;
const suggestion = suggestionById("sg2");

/** App-window chrome around each story screen. */
export function DeviceFrame({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div className="card overflow-hidden">
      <div className="flex items-center gap-3 border-b border-rule bg-sunken/60 px-4 py-2.5">
        <span className="flex gap-1.5" aria-hidden>
          <span className="size-2.5 rounded-full bg-rule-strong" />
          <span className="size-2.5 rounded-full bg-rule-strong" />
          <span className="size-2.5 rounded-full bg-rule-strong" />
        </span>
        <span className="truncate rounded-full bg-surface px-3 py-0.5 text-[12px] font-semibold text-muted">{title}</span>
      </div>
      <div className="p-4 sm:p-5">{children}</div>
    </div>
  );
}

export function UploadScreen() {
  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center gap-3 rounded-2xl border border-dashed border-rule-strong bg-sunken/50 p-3">
        <span className="grid size-10 place-items-center rounded-xl bg-hl text-on-hl glow">
          <FileText className="size-5" aria-hidden />
        </span>
        <div className="min-w-0 flex-1">
          <p className="truncate font-semibold">{sampleResume.fileName}</p>
          <p className="text-[13px] text-muted">Text found on every page</p>
        </div>
        <Check className="size-5 text-hl-ink" strokeWidth={3} aria-hidden />
      </div>
      <ol className="flex flex-col gap-2 text-[14px]">
        {STAGES.map((s) => (
          <li key={s.key} className="flex items-center gap-2.5">
            <span className="grid size-5 place-items-center rounded-full bg-hl text-on-hl">
              <Check className="size-3" strokeWidth={3.5} aria-hidden />
            </span>
            {s.label}
          </li>
        ))}
      </ol>
      <div className="grid grid-cols-2 gap-3">
        {[
          { label: "Parse health", value: sampleResume.parseHealth },
          { label: "Readability", value: sampleResume.readability },
        ].map((s) => (
          <div key={s.label} className="flex items-center gap-3 rounded-2xl bg-sunken/60 p-3">
            <RingScore value={s.value} size={52} stroke={6} label={s.label} />
            <div className="leading-tight">
              <p className="text-[13px] font-semibold">{s.label}</p>
              <p className="text-[13px] font-semibold text-hl-ink">{bandFor(s.value).word}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export function JobScreen() {
  const band = bandFor(match.score);
  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="font-display text-lg font-bold leading-tight">{sampleJob.title}</p>
          <p className="text-[13px] text-muted">
            {sampleJob.company}, found on {SOURCE_LABEL[sampleJob.source]}
          </p>
        </div>
        <div className="text-right">
          <p className="flex items-baseline justify-end gap-2">
            <span className="font-display text-3xl font-bold tabular-nums">{match.score}</span>
            <span className="text-sm font-semibold text-hl-ink">{band.word}</span>
          </p>
          <EstimateTag />
        </div>
      </div>
      <Meter value={match.score} label={`Job match ${match.score} out of 100`} />
      <ul className="flex flex-col divide-y divide-rule rounded-2xl border border-rule">
        {sampleJob.requirements.slice(0, 7).map((r) => (
          <li key={r.id} className="flex items-center justify-between gap-3 px-3 py-1.5 text-[14px]">
            <span className="truncate font-semibold">{r.skill}</span>
            <MatchChip value={r.matchClass} />
          </li>
        ))}
      </ul>
    </div>
  );
}

export function FixScreen() {
  const ev = sampleInterview.evaluations.find((e) => e.questionId === "q3")!;
  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-col gap-2 rounded-2xl border border-rule p-3">
        <p className="text-[13px] text-muted line-through decoration-rule-strong">{suggestion.before}</p>
        <p className="text-[14px] font-semibold">
          <mark className="hl">{suggestion.after}</mark>
        </p>
        <div className="flex items-center gap-2">
          <span className="inline-flex h-8 items-center gap-1.5 rounded-lg bg-hl px-3 text-[13px] font-semibold text-on-hl">
            <Check className="size-3.5" strokeWidth={3} aria-hidden />
            Accepted
          </span>
          <span className="text-[12px] text-muted">Cites your own line</span>
        </div>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div className="flex flex-col gap-2 rounded-2xl bg-sunken/60 p-3">
          <p className="flex items-center gap-1.5 text-[13px] font-semibold">
            <Mic className="size-3.5" aria-hidden />
            Mock interview
          </p>
          <p className="flex items-baseline gap-1.5">
            <span className="font-display text-2xl font-bold tabular-nums">{sampleInterview.overall}</span>
            <span className="text-[13px] font-semibold text-hl-ink">{bandFor(sampleInterview.overall ?? 0).word}</span>
          </p>
          {ev.rubric.slice(0, 3).map((r) => (
            <div key={r.dimension} className="h-1.5 rounded-full bg-surface">
              <div className="h-full rounded-full bg-viz" style={{ width: `${(r.score / 5) * 100}%` }} />
            </div>
          ))}
        </div>
        <div className="flex flex-col gap-1.5 rounded-2xl bg-sunken/60 p-3">
          <p className="text-[13px] font-semibold">{sampleJob.company}</p>
          <p className="text-[12px] text-muted">Applied, follow up in 3 days</p>
          <span className="mt-auto inline-flex items-center gap-1 self-start rounded-full bg-hl-soft px-2 text-[12px] font-semibold leading-6 text-hl-ink">
            <FileText className="size-3" aria-hidden />
            Sent with {sampleResume.label}
          </span>
        </div>
      </div>
    </div>
  );
}
