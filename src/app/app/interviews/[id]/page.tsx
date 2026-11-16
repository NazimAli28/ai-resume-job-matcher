import type { Metadata } from "next";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { DeleteSession, FinishButton, QuestionRunner } from "@/components/interview/interview-ui";
import { requireUser } from "@/server/auth/user";
import { currentQuestion, getSession } from "@/server/interview/service";

export const metadata: Metadata = { title: "Practice interview" };
// Each answer gets a quick check; finishing scores every answer.
export const maxDuration = 120;

function hintFor(kind: string, keyPoints: string[]): string {
  const points = keyPoints.slice(0, 2).join("; ");
  if (kind === "JD_TECHNICAL") return `Explain the idea plainly, then give a short example from your own work. A strong answer covers: ${points || "how it works, when you'd use it, and a trade-off"}.`;
  if (kind === "MOTIVATION") return "Say what draws you to this role, and connect it to something you've actually done. Keep company facts to what you know is true.";
  if (kind === "GAP") return "Be honest about what you haven't done yet, then show how you'd close the gap: something related you've done and how you'd learn.";
  return `Try STAR: the situation, your task, what you did yourself, and the result (with a number if you have one). A strong answer covers: ${points || "your own actions and the outcome"}.`;
}

export default async function InterviewPage({ params }: { params: Promise<{ id: string }> }) {
  const user = await requireUser();
  const { id } = await params;
  if (!/^[0-9a-f-]{36}$/i.test(id)) notFound();
  const s = await getSession(user.id, id);
  if (!s) notFound();
  if (s.status === "COMPLETED") redirect(`/app/interviews/${s.id}/report`);

  const mains = s.questions.filter((q) => !q.parentId);
  const q = currentQuestion(s);
  const mainIndex = q ? mains.findIndex((m) => m.id === (q.parentId ?? q.id)) : mains.length;
  const answered = mains.filter((m) => m.answers.length).length;
  const coverage = (s.blueprint as { coverage?: { covered: string[]; total: number } }).coverage;

  return (
    <div className="mx-auto flex w-full max-w-3xl flex-col gap-6">
      <div className="flex flex-col gap-2">
        <Link href="/app/interviews" className="inline-flex min-h-11 items-center text-sm font-semibold text-muted hover:text-ink">Pause and go back</Link>
        <h1 className="break-words font-display text-2xl font-bold leading-tight">{s.job ? `Practice: ${s.job.title}` : `Practice: ${s.targetRole ?? "general"}`}</h1>
        <p className="text-sm text-muted">Practice only. Your answers are saved as you go, so you can come back within 7 days.</p>
        {coverage && coverage.total > 0 && answered === 0 && (
          <p className="text-sm">This session covers {coverage.covered.length} of the job&apos;s {coverage.total} must-haves{coverage.covered.length ? `: ${coverage.covered.slice(0, 6).join(", ")}` : ""}.</p>
        )}
        <div className="h-2 rounded-full bg-sunken" role="progressbar" aria-label="Progress" aria-valuemin={0} aria-valuemax={mains.length} aria-valuenow={answered}>
          <span className="block h-2 rounded-full" style={{ width: `${(answered / mains.length) * 100}%`, background: "var(--viz)" }} />
        </div>
        <p className="text-[13px] text-muted">Question {Math.min(mainIndex + 1, mains.length)} of {mains.length}</p>
      </div>

      <section className="card flex flex-col gap-4 p-6" aria-label="Current question">
        {q ? (
          <QuestionRunner key={q.id} sessionId={s.id} question={{ id: q.id, text: q.text }} hint={hintFor(q.kind, (q.keyPoints as string[]) ?? [])} timerSec={s.timerSec} isFollowUp={!!q.parentId} />
        ) : (
          <div className="flex flex-col gap-3">
            <p className="font-display text-xl font-bold">That&apos;s every question.</p>
            <p className="text-sm text-muted">We&apos;ll now score each answer against the rubric. Every score quotes your own words.</p>
            <FinishButton sessionId={s.id} label="See my report" variant="primary" />
          </div>
        )}
      </section>

      {q && answered > 0 && <FinishButton sessionId={s.id} label="End now and see a report for what I've answered" variant="ghost" />}
      <DeleteSession sessionId={s.id} />
    </div>
  );
}
