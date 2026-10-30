"use client";
import { useSkipMotion } from "@/components/ui/motion";

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { motion } from "motion/react";
import { Check, ChevronDown, Send, SkipForward } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Chip } from "@/components/ui/chip";
import { Textarea } from "@/components/ui/field";
import { Dialog } from "@/components/ui/overlay";
import { EmptyState } from "@/components/ui/panel";
import { PERSONA_LABEL } from "@/demo/labels";
import { useDemo } from "@/demo/store";
import type { InterviewAnswer, InterviewSession, Persona } from "@/demo/types";
import { cn } from "@/lib/cn";
import { FOLLOW_UP_CAP, SOFT_TARGET_SECONDS } from "./bank";
import { formatClock, PersonaTile, TypingDots } from "./parts";
import { evaluateSession, followUpLines, NO_ANSWER, nextFollowUp, wordCount } from "./scoring";

const LEAD: Record<Persona, { first: string; next: string }> = {
  FRIENDLY_RECRUITER: { first: "Thanks for making time. Let's start.", next: "Thanks. Next question." },
  HIRING_MANAGER: { first: "Let's begin.", next: "Let's move on." },
  TECHNICAL_PANEL: { first: "We'll start with the basics.", next: "Next." },
  TOUGH_BUT_FAIR: { first: "Let's begin. I'll push if you're vague.", next: "Okay. Next one, be specific." },
};

const STAGES = ["Reading your answers", "Scoring against the rubric", "Writing model answers from your resume"];

const ENTER = { duration: 0.3, ease: [0.2, 0.7, 0.2, 1] as const };

function Bubble({ who, persona, children, followUp }: { who: "them" | "you"; persona: Persona; children: React.ReactNode; followUp?: boolean }) {
  const reduce = useSkipMotion();
  return (
    <motion.div
      initial={reduce ? false : { opacity: 0, y: 12, scale: 0.98 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={ENTER}
      className={cn("flex items-end gap-2.5", who === "you" && "flex-row-reverse")}
    >
      {who === "them" && <PersonaTile persona={persona} size={32} className="rounded-xl" />}
      <div className={cn("flex min-w-0 max-w-[85%] flex-col gap-1", who === "you" && "items-end")}>
        <div className="flex items-center gap-2 text-xs text-muted">
          <span>{who === "you" ? "You" : "Interviewer"}</span>
          {followUp && <Chip className="border border-rule py-0 text-xs text-muted">Follow-up</Chip>}
        </div>
        <p
          className={cn(
            "whitespace-pre-wrap px-4 py-3",
            who === "you"
              ? "rounded-2xl rounded-br-md bg-hl-soft text-ink"
              : "card rounded-2xl rounded-bl-md",
          )}
        >
          {children}
        </p>
      </div>
    </motion.div>
  );
}

/** Circular timer ring that fills toward the soft target, then turns to the "partial" tone when over. */
function TimerRing({ elapsed, over }: { elapsed: number; over: boolean }) {
  const size = 56;
  const stroke = 5;
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const pct = Math.min(1, elapsed / SOFT_TARGET_SECONDS);
  return (
    <div role="timer" className="relative grid shrink-0 place-items-center" style={{ width: size, height: size }}>
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className="-rotate-90" aria-hidden>
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="var(--sunken)" strokeWidth={stroke} />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke={over ? "var(--partial)" : "var(--viz)"}
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={`${c * pct} ${c}`}
          className="transition-[stroke-dasharray] duration-1000 ease-linear"
        />
      </svg>
      <span className={cn("absolute text-xs font-bold tabular-nums", over && "text-partial")}>{formatClock(elapsed)}</span>
      <span className="sr-only">
        {formatClock(elapsed)} of about {formatClock(SOFT_TARGET_SECONDS)}
        {over ? ". Over the target." : ""}
      </span>
    </div>
  );
}

function Turn({
  prompt, lead, why, followUp, initialSeconds, persona, personaName, onSubmit, onSkip,
}: {
  prompt: string;
  lead?: string;
  why?: string;
  followUp: boolean;
  initialSeconds: number;
  persona: Persona;
  personaName: string;
  onSubmit: (text: string, seconds: number) => void;
  onSkip: () => void;
}) {
  const reduce = useSkipMotion();
  const [typing, setTyping] = useState(true);
  const [text, setText] = useState("");
  const [elapsed, setElapsed] = useState(initialSeconds);
  const [whyOpen, setWhyOpen] = useState(false);
  const area = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    const t = setTimeout(() => setTyping(false), 800);
    return () => clearTimeout(t);
  }, []);
  useEffect(() => {
    if (typing) return;
    area.current?.focus();
    const i = setInterval(() => setElapsed((e) => e + 1), 1000);
    return () => clearInterval(i);
  }, [typing]);

  const words = wordCount(text);
  const over = elapsed > SOFT_TARGET_SECONDS;

  return (
    <div className="flex flex-col gap-4">
      <div aria-live="polite" className="flex items-end gap-2.5">
        <PersonaTile persona={persona} size={32} className="rounded-xl" />
        <div className="flex min-w-0 max-w-[85%] flex-col gap-1">
          <div className="flex items-center gap-2 text-xs text-muted">
            <span>{personaName}</span>
            {followUp && <Chip className="border border-rule py-0 text-xs text-muted">Follow-up</Chip>}
          </div>
          {typing ? (
            <p className="card flex w-fit items-center gap-3 rounded-2xl rounded-bl-md px-4 py-3.5 text-muted">
              <TypingDots />
              <span className="sr-only">{personaName} is typing</span>
            </p>
          ) : (
            <motion.p
              initial={reduce ? false : { opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={ENTER}
              className="card rounded-2xl rounded-bl-md px-4 py-3 text-lg"
            >
              {lead && <span className="block pb-1 text-sm text-muted">{lead}</span>}
              {prompt}
            </motion.p>
          )}
        </div>
      </div>

      {!typing && why && (
        <div className="pl-11">
          <button
            type="button"
            aria-expanded={whyOpen}
            onClick={() => setWhyOpen((o) => !o)}
            className="inline-flex min-h-11 items-center gap-1 text-sm font-semibold text-muted hover:text-ink"
          >
            <ChevronDown className={cn("size-4 transition-transform", whyOpen && "rotate-180")} aria-hidden />
            Why they ask this
          </button>
          {whyOpen && <p className="max-w-xl rounded-xl bg-sunken px-3 py-2 text-sm text-muted">{why}</p>}
        </div>
      )}

      {!typing && (
        <motion.form
          initial={reduce ? false : { opacity: 0, y: 14 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ ...ENTER, delay: 0.05 }}
          className="card flex flex-col gap-3 p-4"
          onSubmit={(e) => {
            e.preventDefault();
            if (text.trim()) onSubmit(text.trim(), elapsed);
          }}
        >
          <label htmlFor="iv-answer" className="sr-only">Your answer</label>
          <Textarea
            id="iv-answer"
            ref={area}
            value={text}
            maxLength={3000}
            onChange={(e) => setText(e.target.value)}
            placeholder="Type your answer as you would say it. Use a real example from your own experience."
            className="min-h-40 border-0 bg-sunken"
          />
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <TimerRing elapsed={elapsed} over={over} />
              <div className="flex flex-col text-sm">
                <span className="font-semibold tabular-nums">{words} {words === 1 ? "word" : "words"}</span>
                <span className={cn("text-muted", over && "font-semibold text-partial")}>
                  {over ? "Over the target, wrap up when ready. Nothing is cut off." : `Target about ${formatClock(SOFT_TARGET_SECONDS)}`}
                </span>
              </div>
            </div>
            <div className="flex flex-wrap gap-2">
              <Button onClick={onSkip}>
                <SkipForward className="size-4" aria-hidden /> {followUp ? "Nothing to add" : "Skip question"}
              </Button>
              <Button type="submit" variant="primary" disabled={!text.trim()}>
                <Send className="size-4" aria-hidden /> Submit answer
              </Button>
            </div>
          </div>
        </motion.form>
      )}
    </div>
  );
}

function Scoring({ session, onDone }: { session: InterviewSession; onDone: () => void }) {
  const [stage, setStage] = useState(0);
  const done = useRef(onDone);
  useEffect(() => {
    done.current = onDone;
  });
  useEffect(() => {
    const ids = [
      setTimeout(() => setStage(1), 1000),
      setTimeout(() => setStage(2), 2100),
      setTimeout(() => setStage(3), 3300),
      setTimeout(() => done.current(), 3800),
    ];
    return () => ids.forEach(clearTimeout);
  }, []);
  return (
    <div className="mx-auto flex max-w-md flex-col gap-5 py-12" role="status" aria-live="polite">
      <div className="flex flex-col items-center gap-3 text-center">
        <span className="grid size-16 place-items-center rounded-2xl bg-hl text-on-hl glow">
          <TypingDots className="[&>span]:bg-on-hl" />
        </span>
        <h1 className="text-2xl font-bold">Scoring your {session.answers.filter((a) => a.answer.trim()).length} answers</h1>
      </div>
      <ol className="card flex flex-col gap-1 p-4">
        {STAGES.map((label, i) => {
          const complete = i < stage;
          const active = i === stage;
          return (
            <li key={label} className="flex flex-col gap-2 py-2">
              <div className={cn("flex items-center gap-3", i > stage && "text-muted")}>
                <span
                  className={cn(
                    "grid size-7 shrink-0 place-items-center rounded-full text-xs font-bold",
                    complete ? "bg-hl text-on-hl" : active ? "bg-hl-soft text-hl-ink glow" : "bg-sunken text-muted",
                  )}
                  aria-hidden
                >
                  {complete ? <Check className="size-4" strokeWidth={3} /> : i + 1}
                </span>
                <span className={cn(active && "font-semibold")}>{label}</span>
              </div>
              {active && <div className="shimmer ml-10 h-2 rounded-full" aria-hidden />}
            </li>
          );
        })}
      </ol>
      <p className="text-center text-sm text-muted">Demo scoring runs on your device with simple rules and gives estimates, not a verdict.</p>
    </div>
  );
}

export function SessionRunner() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const { state, dispatch, ready, jobById } = useDemo();
  const session = state.interviews.find((s) => s.id === id);
  const [finishing, setFinishing] = useState(false);
  const [endOpen, setEndOpen] = useState(false);

  const completed = session?.status === "COMPLETED";
  useEffect(() => {
    if (completed) router.replace(`/demo/interviews/${id}/report`);
  }, [completed, id, router]);

  if (!session) {
    return ready ? (
      <EmptyState title="We couldn't find that interview" body="It may have been reset with the demo data." action={<Link href="/demo/interviews" className="font-semibold underline">Back to mock interviews</Link>} />
    ) : (
      <p className="py-16 text-center text-muted" role="status">Loading your interview</p>
    );
  }
  if (completed) return <p className="py-16 text-center text-muted" role="status">Opening your report</p>;

  const job = jobById(session.jobId);
  const total = session.questions.length;
  const answers = session.answers;
  const last = answers[answers.length - 1];
  const lines = followUpLines(last);
  const pending = !!last && lines.question.length > lines.answer.length;
  const idx = pending ? answers.length - 1 : answers.length;
  const sessionAsked = answers.reduce((n, a) => n + followUpLines(a).question.length, 0);
  const cap = FOLLOW_UP_CAP[session.questionCount];
  const persona = PERSONA_LABEL[session.persona].name;

  const save = (next: InterviewAnswer[]) => dispatch({ type: "SAVE_INTERVIEW", session: { ...session, answers: next } });

  const finish = () => {
    if (!job) return;
    if (!answers.some((a) => a.answer.trim())) {
      dispatch({ type: "SAVE_INTERVIEW", session: { ...session, status: "ABANDONED" } });
      router.push("/demo/interviews");
      return;
    }
    const { evaluations, overall } = evaluateSession(session, job, state.profile);
    dispatch({ type: "SAVE_INTERVIEW", session: { ...session, status: "COMPLETED", evaluations, overall } });
    router.push(`/demo/interviews/${session.id}/report`);
  };

  if (finishing || idx >= total) {
    return <Scoring session={session} onDone={finish} />;
  }

  const q = session.questions[idx];
  const submit = (text: string, seconds: number) => {
    const company = job?.company ?? "this company";
    if (!pending) {
      const fu = nextFollowUp({ question: q, mainAnswer: text, followAnswers: [], asked: 0, sessionAsked, cap, persona: session.persona, company });
      const a: InterviewAnswer = { questionId: q.id, answer: text, seconds, ...(fu ? { followUp: { question: fu, answer: "" } } : {}) };
      save([...answers, a]);
    } else {
      const followAnswers = [...lines.answer, text];
      const fu = nextFollowUp({ question: q, mainAnswer: last.answer, followAnswers, asked: lines.question.length, sessionAsked, cap, persona: session.persona, company });
      const updated: InterviewAnswer = {
        ...last,
        seconds: Math.max(last.seconds, seconds),
        followUp: { question: fu ? `${last.followUp!.question}\n${fu}` : last.followUp!.question, answer: followAnswers.join("\n") },
      };
      save([...answers.slice(0, -1), updated]);
    }
  };
  const skip = () => {
    if (pending) submit(NO_ANSWER, 0);
    else save([...answers, { questionId: q.id, answer: "", seconds: 0 }]);
  };

  const activePrompt = pending ? lines.question[lines.answer.length] : q.text;
  const lead = !pending ? (idx === 0 ? LEAD[session.persona].first : LEAD[session.persona].next) : undefined;

  return (
    <div className="mx-auto flex min-h-[calc(100dvh-9rem)] max-w-2xl flex-col gap-5">
      <header className="card flex flex-col gap-3 p-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-3">
            <PersonaTile persona={session.persona} size={40} />
            <div className="flex flex-col">
              <h1 className="text-lg font-bold leading-tight">
                Question {idx + 1} of {total}
              </h1>
              {job && <span className="text-sm text-muted">{job.title} at {job.company}</span>}
            </div>
          </div>
          <Button size="sm" variant="ghost" onClick={() => setEndOpen(true)}>End interview</Button>
        </div>
        <ol
          className="flex items-center"
          role="progressbar"
          aria-label="Interview progress"
          aria-valuemin={0}
          aria-valuemax={total}
          aria-valuenow={idx}
        >
          {session.questions.map((x, i) => (
            <li key={x.id} className={cn("flex items-center", i < total - 1 && "flex-1")}>
              <span
                className={cn(
                  "grid shrink-0 place-items-center rounded-full text-[11px] font-bold transition-colors", total > 10 ? "size-5 text-[10px]" : "size-6",
                  i < idx ? "bg-hl text-on-hl" : i === idx ? "bg-hl-soft text-hl-ink glow" : "bg-sunken text-muted",
                )}
                aria-hidden
              >
                {i < idx ? <Check className="size-3.5" strokeWidth={3} /> : i + 1}
              </span>
              {i < total - 1 && <span aria-hidden className={cn("h-0.5 flex-1 rounded-full transition-colors", total > 10 ? "mx-px" : "mx-1", i < idx ? "bg-hl" : "bg-sunken")} />}
            </li>
          ))}
        </ol>
        <p className="text-sm text-muted">Practice only. Answers save as you go. No scores until the end.</p>
      </header>

      <div className="flex flex-1 flex-col gap-4">
        {pending && (
          <>
            <Bubble who="them" persona={session.persona}>{q.text}</Bubble>
            <Bubble who="you" persona={session.persona}>{last.answer}</Bubble>
            {lines.answer.map((a, i) => (
              <div key={i} className="flex flex-col gap-4">
                <Bubble who="them" persona={session.persona} followUp>{lines.question[i]}</Bubble>
                <Bubble who="you" persona={session.persona}>{a}</Bubble>
              </div>
            ))}
          </>
        )}
        <Turn
          key={`${q.id}-${pending ? lines.answer.length : "main"}`}
          prompt={activePrompt}
          lead={lead}
          why={pending ? undefined : q.whyAsked}
          followUp={pending}
          initialSeconds={pending ? last.seconds : 0}
          persona={session.persona}
          personaName={persona}
          onSubmit={submit}
          onSkip={skip}
        />
      </div>

      <Dialog
        open={endOpen}
        onClose={() => setEndOpen(false)}
        title="End this interview?"
        footer={
          <>
            <Button onClick={() => setEndOpen(false)}>Keep going</Button>
            <Button
              variant="primary"
              onClick={() => {
                setEndOpen(false);
                setFinishing(true);
              }}
            >
              End and score what I answered
            </Button>
          </>
        }
      >
        <p>
          You have answered {answers.filter((a) => a.answer.trim()).length} of {total} questions. We will score the answers you gave and
          list the rest as skipped. If you answered none, the session is closed without a report.
        </p>
      </Dialog>
    </div>
  );
}
