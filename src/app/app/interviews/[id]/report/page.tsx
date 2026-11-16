import type { Metadata } from "next";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { DeleteSession, ModelAnswerBox, RetryBox } from "@/components/interview/interview-ui";
import { SectionCard } from "@/components/profile-real/section-card";
import { ButtonLink } from "@/components/ui/button";
import { RingScore } from "@/components/ui/charts";
import { requireUser } from "@/server/auth/user";
import { DIM_LABEL, type Dim, type DimResult } from "@/server/interview/core";
import { getSession, type Evaluation, type ModelAnswer } from "@/server/interview/service";

export const metadata: Metadata = { title: "Interview report" };
export const maxDuration = 120;

const LABELS: Record<string, string> = {
  MISSING_SITUATION: "No situation",
  MISSING_RESULT: "No result",
  NO_METRICS: "No numbers",
  WE_NOT_I: "“We”, not “I”",
  OFF_TOPIC: "Off topic",
  TOO_LONG: "Too long",
  TOO_SHORT: "Too short",
  VAGUE_CLAIMS: "Vague",
  NO_EXAMPLE: "No example",
  INACCURATE: "Inaccurate",
  MISSING_TRADEOFFS: "No trade-offs",
  UNSTRUCTURED: "Unstructured",
};

type Report = { answered: number; skipped: number; hintsUsed: number; followUps: number; totalSec: number; dims: { dim: Dim; avg: number; n: number; label: string }[]; priorities: string[]; strengths: string[]; coverage: { covered: string[]; total: number } | null; unscored: number };

function Dims({ dims }: { dims: DimResult[] }) {
  return (
    <ul className="flex flex-col gap-2">
      {dims.map((d) => (
        <li key={d.dim} className="flex flex-col gap-0.5 text-sm">
          <span className="flex justify-between gap-3">
            <span className="font-semibold">{DIM_LABEL[d.dim]}</span>
            <span className="tabular-nums">{d.score === null ? d.note ?? "Not scored" : `${d.score} / 5`}</span>
          </span>
          {d.quote && <span className="break-words text-[13px] text-muted">Based on: “{d.quote}”</span>}
        </li>
      ))}
    </ul>
  );
}

export default async function ReportPage({ params }: { params: Promise<{ id: string }> }) {
  const user = await requireUser();
  const { id } = await params;
  if (!/^[0-9a-f-]{36}$/i.test(id)) notFound();
  const s = await getSession(user.id, id);
  if (!s) notFound();
  if (s.status !== "COMPLETED") redirect(`/app/interviews/${s.id}`);
  const r = s.report as unknown as Report;
  const mains = s.questions.filter((q) => !q.parentId);

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-2">
        <Link href="/app/interviews" className="inline-flex min-h-11 items-center text-sm font-semibold text-muted hover:text-ink">Back to interviews</Link>
        <h1 className="break-words font-display text-[32px] font-bold leading-tight">Your report</h1>
        <p className="text-sm text-muted">Practice tool. Scores are feedback for you, not a prediction of any hiring decision. Grammar, accent and spelling never affect them.</p>
      </div>

      <section className="card flex flex-wrap items-center gap-6 p-6" aria-label="Overall">
        {s.overall !== null ? <RingScore value={s.overall} label="Overall (estimate)" sublabel="estimate" /> : <p className="font-semibold">Not scored yet</p>}
        <div className="flex min-w-0 flex-1 flex-col gap-1 text-sm">
          <p>{r.answered} answered, {r.skipped} skipped, {r.followUps} follow-up{r.followUps === 1 ? "" : "s"}, {r.hintsUsed} hint{r.hintsUsed === 1 ? "" : "s"} used, {Math.round(r.totalSec / 60)} minutes.</p>
          {r.strengths.length > 0 && <p><span className="font-semibold">Strengths:</span> {r.strengths.join(", ")}</p>}
          {r.priorities.length > 0 && <p><span className="font-semibold">Work on next:</span> {r.priorities.join(", ")}</p>}
          {r.coverage && r.coverage.total > 0 && <p className="text-muted">Covered {r.coverage.covered.length} of the job&apos;s {r.coverage.total} must-haves.</p>}
          {r.unscored > 0 && <p className="text-warn">{r.unscored} answer{r.unscored === 1 ? " wasn't" : "s weren't"} fully scored because the AI was unavailable. Try “See my report” again later.</p>}
        </div>
        <ButtonLink href={s.job ? `/app/interviews/new?job=${s.job.id}` : "/app/interviews/new"}>Practice again</ButtonLink>
      </section>

      {r.dims.length > 0 && (
        <SectionCard id="dims" title="By skill" intro="Average across your answers, 1 to 5.">
          <ul className="flex flex-col gap-3">
            {r.dims.map((d) => (
              <li key={d.dim} className="flex flex-col gap-1 text-sm">
                <span className="flex justify-between gap-3"><span className="font-semibold">{d.label}</span><span className="tabular-nums">{d.avg}</span></span>
                <span className="h-2 rounded-full bg-sunken" aria-hidden><span className="block h-2 rounded-full" style={{ width: `${(d.avg / 5) * 100}%`, background: "var(--viz)" }} /></span>
              </li>
            ))}
          </ul>
        </SectionCard>
      )}

      {mains.map((q, i) => {
        const attempts = q.answers.filter((a) => !a.skipped);
        const first = attempts[0];
        const latest = attempts[attempts.length - 1];
        const ev = latest?.evaluation as unknown as Evaluation | null;
        const followUps = s.questions.filter((f) => f.parentId === q.id);
        const delta = attempts.length > 1 && first?.score != null && latest?.score != null ? latest.score - first.score : null;
        return (
          <SectionCard key={q.id} id={`q-${q.id}`} title={`Question ${i + 1}`} intro={q.text}>
            {!first ? (
              <p className="text-sm text-muted">Skipped.</p>
            ) : (
              <div className="flex flex-col gap-4">
                <div className="flex flex-wrap items-center gap-2 text-sm">
                  <span className="font-semibold tabular-nums">{latest.score !== null ? `${latest.score} / 100 (estimate)` : "Not scored"}</span>
                  {delta !== null && <span className="rounded-full bg-sunken px-2 py-0.5 font-semibold tabular-nums">{delta >= 0 ? "+" : ""}{delta} vs your first try</span>}
                  {ev?.labels.map((l) => <span key={l} className="rounded-full bg-warn-soft px-2 py-0.5 text-[13px] font-semibold text-warn">{LABELS[l] ?? l}</span>)}
                </div>
                <details className="text-sm">
                  <summary className="min-h-11 cursor-pointer font-semibold">Your answer{attempts.length > 1 ? ` (attempt ${attempts.length})` : ""}</summary>
                  <p className="mt-1 whitespace-pre-wrap break-words">{latest.text ?? "Answer text removed after 12 months."}</p>
                  {attempts.length === 1 && followUps.map((f) => f.answers[0]?.text && (
                    <p key={f.id} className="mt-2 whitespace-pre-wrap break-words"><span className="font-semibold">Follow-up: {f.text}</span><br />{f.answers[0].text}</p>
                  ))}
                </details>
                {ev && <Dims dims={ev.dims} />}
                {ev?.whatWentWrong && <p className="text-sm"><span className="font-semibold">What to improve: </span>{ev.whatWentWrong}</p>}
                {ev?.oneLineFix && <p className="text-sm"><span className="font-semibold">Next time: </span>{ev.oneLineFix}</p>}
                <ModelAnswerBox sessionId={s.id} questionId={q.id} initial={(first.modelAnswer as unknown as ModelAnswer | null) ?? null} />
                <RetryBox sessionId={s.id} questionId={q.id} />
              </div>
            )}
          </SectionCard>
        );
      })}
      <DeleteSession sessionId={s.id} />
    </div>
  );
}
