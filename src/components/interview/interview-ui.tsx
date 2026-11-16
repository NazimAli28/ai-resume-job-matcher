"use client";

import { Lightbulb, RotateCcw, SkipForward, Sparkles, Timer, Trash2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState, useTransition } from "react";
import { answerAction, createSessionAction, deleteSessionAction, finishAction, modelAnswerAction, prepAction, retryAction, skipAction } from "@/app/app/interviews/actions";
import { FormAlert } from "@/components/auth/auth-ui";
import { Button } from "@/components/ui/button";
import { Field, Input, Select, Textarea } from "@/components/ui/field";

type Opt = { id: string; label: string };

export function SetupForm({ jobs, versions, initialJob, plan }: { jobs: Opt[]; versions: Opt[]; initialJob: string | null; plan: string }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [error, setError] = useState("");
  const [c, setC] = useState({
    jobId: initialJob ?? jobs[0]?.id ?? "",
    targetRole: "",
    resumeVersionId: versions[0]?.id ?? "",
    type: "MIXED",
    count: 5,
    difficulty: "STANDARD",
    persona: "HIRING_MANAGER",
    timerSec: 120,
  });
  return (
    <form
      className="flex flex-col gap-4"
      onSubmit={(e) => {
        e.preventDefault();
        start(async () => {
          setError("");
          const r = await createSessionAction({ ...c, jobId: c.jobId || null, resumeVersionId: c.resumeVersionId || null, targetRole: c.jobId ? null : c.targetRole.trim() || null });
          if (r.ok) router.push(`/app/interviews/${r.id}`);
          else setError(r.error);
        });
      }}
    >
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Job" htmlFor="iv-job" hint="Questions follow this job's requirements.">
          <Select id="iv-job" value={c.jobId} onChange={(e) => setC({ ...c, jobId: e.target.value })}>
            {jobs.map((j) => <option key={j.id} value={j.id}>{j.label}</option>)}
            <option value="">No job: general practice</option>
          </Select>
        </Field>
        {!c.jobId && (
          <Field label="Role you're practicing for" htmlFor="iv-role">
            <Input id="iv-role" value={c.targetRole} maxLength={80} placeholder="e.g. Backend Developer" onChange={(e) => setC({ ...c, targetRole: e.target.value })} />
          </Field>
        )}
        <Field label="Resume" htmlFor="iv-resume" hint="Model answers use only what's on it and your confirmed facts.">
          <Select id="iv-resume" value={c.resumeVersionId} onChange={(e) => setC({ ...c, resumeVersionId: e.target.value })}>
            {versions.map((v) => <option key={v.id} value={v.id}>{v.label}</option>)}
            <option value="">No resume</option>
          </Select>
        </Field>
        <Field label="Type" htmlFor="iv-type">
          <Select id="iv-type" value={c.type} onChange={(e) => setC({ ...c, type: e.target.value })}>
            <option value="MIXED">Mixed</option>
            <option value="BEHAVIORAL">Behavioral</option>
            <option value="TECHNICAL">Technical</option>
            <option value="HR">HR</option>
          </Select>
        </Field>
        <Field label="Questions" htmlFor="iv-count">
          <Select id="iv-count" value={c.count} onChange={(e) => setC({ ...c, count: Number(e.target.value) })}>
            <option value={5}>5 (about 15 minutes)</option>
            <option value={10}>10 (about 30 minutes)</option>
            <option value={15} disabled={plan === "FREE"}>15 {plan === "FREE" ? "(paid plans)" : "(about 45 minutes)"}</option>
          </Select>
        </Field>
        <Field label="Difficulty" htmlFor="iv-diff">
          <Select id="iv-diff" value={c.difficulty} onChange={(e) => setC({ ...c, difficulty: e.target.value })}>
            <option value="EASY">Easy</option>
            <option value="STANDARD">Standard</option>
            <option value="HARD">Hard</option>
          </Select>
        </Field>
        <Field label="Interviewer" htmlFor="iv-persona" hint="Changes the wording only. Scoring is the same.">
          <Select id="iv-persona" value={c.persona} onChange={(e) => setC({ ...c, persona: e.target.value })}>
            <option value="FRIENDLY_RECRUITER">Friendly recruiter</option>
            <option value="HIRING_MANAGER">Hiring manager</option>
            <option value="TECHNICAL_PANEL">Technical panel</option>
            <option value="TOUGH_BUT_FAIR">Tough but fair</option>
          </Select>
        </Field>
        <Field label="Time per answer (a guide, never a cut-off)" htmlFor="iv-timer">
          <Select id="iv-timer" value={c.timerSec} onChange={(e) => setC({ ...c, timerSec: Number(e.target.value) })}>
            <option value={60}>1 minute</option>
            <option value={120}>2 minutes</option>
            <option value={180}>3 minutes</option>
            <option value={300}>5 minutes</option>
          </Select>
        </Field>
      </div>
      <Button type="submit" variant="primary" disabled={pending} className="w-fit">
        <Sparkles className="size-4" aria-hidden /> {pending ? "Preparing your questions… (up to a minute)" : "Start practice"}
      </Button>
      {error && <FormAlert>{error}</FormAlert>}
    </form>
  );
}

function useElapsed(key: string) {
  const [sec, setSec] = useState(0);
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setSec(0);
    const t = setInterval(() => setSec((s) => s + 1), 1000);
    return () => clearInterval(t);
  }, [key]);
  return sec;
}

const fmt = (s: number) => `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;

export function QuestionRunner({ sessionId, question, hint, timerSec, isFollowUp }: { sessionId: string; question: { id: string; text: string }; hint: string; timerSec: number; isFollowUp: boolean }) {
  const router = useRouter();
  const storageKey = `iv-draft-${question.id}`;
  const [text, setText] = useState("");
  const [showHint, setShowHint] = useState(false);
  const [pending, start] = useTransition();
  const [error, setError] = useState("");
  const [confirmShort, setConfirmShort] = useState(false);
  const elapsed = useElapsed(question.id);
  const ref = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    // A closed tab mid-answer keeps the draft on this device.
    try {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setText(localStorage.getItem(storageKey) ?? "");
    } catch {}
    ref.current?.focus();
  }, [storageKey]);

  const submit = () => {
    const words = text.trim().split(/\s+/).filter(Boolean).length;
    if (words < 8 && !confirmShort) {
      setConfirmShort(true);
      return;
    }
    start(async () => {
      setError("");
      const r = await answerAction(sessionId, question.id, text, elapsed, showHint);
      if (r.ok) {
        try { localStorage.removeItem(storageKey); } catch {}
        setText("");
        setConfirmShort(false);
        router.refresh();
      } else setError(r.error);
    });
  };

  return (
    <div className="flex flex-col gap-4">
      <p className="font-display text-xl font-bold leading-snug" aria-live="polite">
        {isFollowUp && <span className="mr-2 rounded-full bg-sunken px-2 py-0.5 align-middle text-xs font-semibold">Follow-up</span>}
        {question.text}
      </p>
      <p className={`inline-flex items-center gap-1.5 text-sm ${elapsed >= timerSec ? "font-semibold text-warn" : "text-muted"}`}>
        <Timer className="size-4" aria-hidden /> {fmt(elapsed)} of about {fmt(timerSec)}
        {elapsed >= timerSec && <span>: time to wrap up, but take what you need.</span>}
      </p>
      <Field label="Your answer" htmlFor="iv-answer" hint={`${text.length}/3000 characters. Grammar and accent never affect your score.`}>
        <Textarea
          ref={ref}
          id="iv-answer"
          value={text}
          maxLength={3000}
          className="min-h-48"
          onChange={(e) => {
            setText(e.target.value);
            setConfirmShort(false);
            try { localStorage.setItem(storageKey, e.target.value); } catch {}
          }}
        />
      </Field>
      {showHint && <p className="rounded-xl bg-hl-soft/60 px-4 py-3 text-sm">{hint}</p>}
      {confirmShort && <p className="rounded-xl bg-warn-soft px-4 py-3 text-sm text-warn">That&apos;s quite short. Add a bit more detail? Or submit it as it is.</p>}
      {error && <FormAlert>{error}</FormAlert>}
      <div className="flex flex-wrap gap-2">
        <Button variant="primary" disabled={pending || !text.trim()} onClick={submit}>{pending ? "Saving…" : confirmShort ? "Submit anyway" : "Submit answer"}</Button>
        {!showHint && <Button variant="ghost" onClick={() => setShowHint(true)}><Lightbulb className="size-4" aria-hidden /> Hint</Button>}
        <Button variant="ghost" disabled={pending} onClick={() => start(async () => { const r = await skipAction(sessionId, question.id); if (r.ok) router.refresh(); else setError(r.error); })}>
          <SkipForward className="size-4" aria-hidden /> Skip
        </Button>
      </div>
    </div>
  );
}

export function FinishButton({ sessionId, label, variant = "secondary" }: { sessionId: string; label: string; variant?: "primary" | "secondary" | "ghost" }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [error, setError] = useState("");
  return (
    <div className="flex flex-col gap-2">
      <Button variant={variant} disabled={pending} className="w-fit" onClick={() => start(async () => { setError(""); const r = await finishAction(sessionId); if (r.ok) router.push(`/app/interviews/${sessionId}/report`); else setError(r.error); })}>
        {pending ? "Scoring your answers… (up to a minute)" : label}
      </Button>
      {error && <FormAlert>{error}</FormAlert>}
    </div>
  );
}

type Model = { sentences: { text: string; isPlaceholder: boolean; basedOn: string[] }[]; groundedness: string };

export function ModelAnswerBox({ sessionId, questionId, initial }: { sessionId: string; questionId: string; initial: Model | null }) {
  const [m, setM] = useState<Model | null>(initial);
  const [pending, start] = useTransition();
  const [error, setError] = useState("");
  if (!m)
    return (
      <div className="flex flex-col gap-2">
        <Button size="sm" disabled={pending} className="w-fit" onClick={() => start(async () => { setError(""); const r = await modelAnswerAction(sessionId, questionId); if (r.ok) setM(r.data); else setError(r.error); })}>
          {pending ? "Writing it from your resume…" : "Show a model answer"}
        </Button>
        {error && <FormAlert>{error}</FormAlert>}
      </div>
    );
  return (
    <div className="flex flex-col gap-2 rounded-xl border border-rule p-4">
      <p className="text-sm font-semibold">Model answer, from your own experience</p>
      <p className="text-[15px] leading-relaxed">
        {m.sentences.map((s, i) => <span key={i} className={s.isPlaceholder ? "rounded bg-warn-soft px-1 text-warn" : ""}>{s.text} </span>)}
      </p>
      {m.groundedness !== "GROUNDED" && <p className="text-[13px] text-muted">Highlighted parts are a structure to fill with a real example. Your resume didn&apos;t have a matching one, and we never invent one.</p>}
    </div>
  );
}

export function RetryBox({ sessionId, questionId }: { sessionId: string; questionId: string }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [text, setText] = useState("");
  const [pending, start] = useTransition();
  const [error, setError] = useState("");
  if (!open) return <Button size="sm" variant="ghost" className="w-fit" onClick={() => setOpen(true)}><RotateCcw className="size-4" aria-hidden /> Try this question again</Button>;
  return (
    <form className="flex flex-col gap-2" onSubmit={(e) => { e.preventDefault(); start(async () => { setError(""); const r = await retryAction(sessionId, questionId, text); if (r.ok) { setOpen(false); setText(""); router.refresh(); } else setError(r.error); }); }}>
      <Field label="Your new answer" htmlFor={`retry-${questionId}`}>
        <Textarea id={`retry-${questionId}`} value={text} maxLength={3000} className="min-h-32" onChange={(e) => setText(e.target.value)} />
      </Field>
      <div className="flex gap-2">
        <Button size="sm" type="submit" variant="primary" disabled={pending || !text.trim()}>{pending ? "Scoring…" : "Score it"}</Button>
        <Button size="sm" variant="ghost" onClick={() => setOpen(false)}>Cancel</Button>
      </div>
      {error && <FormAlert>{error}</FormAlert>}
    </form>
  );
}

export function DeleteSession({ sessionId }: { sessionId: string }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [confirming, setConfirming] = useState(false);
  const [error, setError] = useState("");
  return (
    <div className="flex flex-col gap-2">
      {confirming ? (
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-sm">Delete this session and all its answers?</span>
          <Button size="sm" variant="danger" disabled={pending} onClick={() => start(async () => { const r = await deleteSessionAction(sessionId); if (r.ok) router.push("/app/interviews"); else setError(r.error); })}>Delete</Button>
          <Button size="sm" variant="ghost" onClick={() => setConfirming(false)}>Keep it</Button>
        </div>
      ) : (
        <Button size="sm" variant="ghost" className="w-fit" onClick={() => setConfirming(true)}><Trash2 className="size-4" aria-hidden /> Delete session</Button>
      )}
      {error && <FormAlert>{error}</FormAlert>}
    </div>
  );
}

export function PrepButton({ jobId, versionId, again }: { jobId: string; versionId: string | null; again: boolean }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [error, setError] = useState("");
  return (
    <div className="flex flex-col gap-2">
      <Button variant={again ? "secondary" : "primary"} className="w-fit" disabled={pending} onClick={() => start(async () => { setError(""); const r = await prepAction(jobId, versionId); if (r.ok) router.refresh(); else setError(r.error); })}>
        <Sparkles className="size-4" aria-hidden /> {pending ? "Preparing questions… (up to a minute)" : again ? "Refresh the questions" : "Prepare likely questions"}
      </Button>
      {error && <FormAlert>{error}</FormAlert>}
    </div>
  );
}
