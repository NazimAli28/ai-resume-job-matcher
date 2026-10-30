"use client";

import { Check, Copy, Download, PenLine, RotateCcw, Save, SlidersHorizontal } from "lucide-react";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { PageHeader } from "@/components/ui/panel";
import { IconComposition, Paper } from "@/components/resumes/visual";
import { useToast } from "@/components/ui/toast";
import { useDemo } from "@/demo/store";
import type { Job } from "@/demo/types";
import { TODAY } from "@/lib/dates";
import { BackLink } from "../back-link";
import { JobNotFound, Loading } from "../job-not-found";
import { copyText, downloadText, slug } from "../lib/browser";
import { placeholdersIn, wordCount, writeLetter } from "../lib/cover-letter";
import type { EffectiveRequirement } from "../lib/match";
import { useJob } from "../use-job";
import { LetterOptions, type Options } from "./letter-options";

export function CoverLetterView() {
  const { ready, job, match } = useJob();
  if (!ready) return <Loading />;
  if (!job || !match) return <JobNotFound />;
  return <Writer key={job.id} job={job} reqs={match.now.reqs} />;
}

type Phase = "idle" | "streaming" | "done";

function Writer({ job, reqs }: { job: Job; reqs: EffectiveRequirement[] }) {
  const { state, dispatch, atLimit } = useDemo();
  const toast = useToast();
  const { profile, user } = state;
  const [opts, setOpts] = useState<Options>({
    length: "MEDIUM",
    tone: "PROFESSIONAL",
    experienceIds: profile.experiences.slice(0, 1).map((e) => e.id),
    projectIds: profile.projects.slice(0, 1).map((p) => p.id),
  });
  const [phase, setPhase] = useState<Phase>("idle");
  const [shown, setShown] = useState("");
  const [body, setBody] = useState("");
  const [savedId, setSavedId] = useState<string>();
  const timer = useRef<ReturnType<typeof setInterval>>(undefined);

  useEffect(() => () => clearInterval(timer.current), []);

  const write = () => {
    clearInterval(timer.current);
    const text = writeLetter({
      user,
      profile,
      job,
      reqs,
      experiences: profile.experiences.filter((e) => opts.experienceIds.includes(e.id)),
      projects: profile.projects.filter((p) => opts.projectIds.includes(p.id)),
      length: opts.length,
      tone: opts.tone,
    });
    // Stream word by word (keeps whitespace so paragraphs survive).
    const tokens = text.split(/(\s+)/);
    let i = 0;
    setSavedId(undefined);
    setShown("");
    setPhase("streaming");
    timer.current = setInterval(() => {
      i += 2;
      setShown(tokens.slice(0, i).join(""));
      if (i >= tokens.length) {
        clearInterval(timer.current);
        setBody(text);
        setPhase("done");
      }
    }, 28);
  };

  const save = () => {
    if (atLimit("coverLetters")) return;
    const id = `cl${Date.now()}`;
    dispatch({ type: "ADD_COVER_LETTER", letter: { id, jobId: job.id, length: opts.length, tone: opts.tone, body, createdAt: `${TODAY}${new Date().toISOString().slice(10)}` } });
    dispatch({ type: "INCREMENT_USAGE", key: "coverLetters" });
    setSavedId(id);
    toast("Cover letter saved");
  };

  const placeholders = placeholdersIn(body);
  const limited = atLimit("coverLetters");

  return (
    <div className="mx-auto max-w-6xl">
      <PageHeader
        back={<BackLink href={`/demo/jobs/${job.id}`} label="Back to the match" />}
        title={`Cover letter for ${job.company}`}
        description={`${job.title}. Built only from your profile and resume, plus the job's title and company.`}
      />
      <div className="grid gap-6 lg:grid-cols-[20rem_minmax(0,1fr)] lg:items-start">
        <div className="card flex flex-col gap-6 p-5 lg:sticky lg:top-6">
          <div className="flex items-center gap-3">
            <span className="grid size-10 place-items-center rounded-xl bg-hl-soft text-hl-ink">
              <SlidersHorizontal className="size-5" aria-hidden />
            </span>
            <h2 className="font-display text-lg font-bold">Options</h2>
          </div>
          <LetterOptions value={opts} onChange={setOpts} experiences={profile.experiences} projects={profile.projects} />
          <Button variant="primary" size="lg" onClick={write} disabled={phase === "streaming"}>
            {phase === "idle" ? <PenLine className="size-4" aria-hidden /> : <RotateCcw className="size-4" aria-hidden />}
            {phase === "idle" ? "Write cover letter" : "Regenerate"}
          </Button>
          {phase === "done" && <p className="-mt-4 text-xs text-muted">Regenerating replaces your edits in the box.</p>}
          <p className="text-sm text-muted">We never invent facts about the company. Anything about them is left as a [placeholder] for you to fill in.</p>
        </div>

        <section aria-labelledby="letter-heading" className="flex min-w-0 flex-col gap-3">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h2 id="letter-heading" className="font-display text-xl font-bold">Your letter</h2>
            {phase === "done" && (
              <div className="flex flex-wrap items-center gap-2 rounded-2xl border border-rule bg-surface/80 p-1.5 backdrop-blur-md">
                <span className="px-2 text-sm text-muted tabular-nums">{wordCount(body)} words</span>
                <Button size="sm" onClick={async () => toast((await copyText(body)) ? "Letter copied" : "Couldn't copy. Select the text and copy it by hand.")}>
                  <Copy className="size-4" aria-hidden />
                  Copy
                </Button>
                <Button size="sm" onClick={() => downloadText(`${slug(user.name)}_${slug(job.company)}_cover_letter.txt`, body)}>
                  <Download className="size-4" aria-hidden />
                  Download .txt
                </Button>
                {savedId ? (
                  <span className="inline-flex min-h-9 items-center gap-1 px-2 text-sm font-semibold text-hl-ink">
                    <Check className="size-4" aria-hidden />
                    Saved
                  </span>
                ) : (
                  <Button size="sm" variant="primary" onClick={save} disabled={limited || !body.trim()}>
                    <Save className="size-4" aria-hidden />
                    Save
                  </Button>
                )}
              </div>
            )}
          </div>

          {phase === "idle" && (
            <div className="flex flex-col items-center gap-4 rounded-[20px] border-2 border-dashed border-rule-strong px-6 py-14 text-center text-muted">
              <IconComposition icon={PenLine} />
              Pick a length and tone, then select “Write cover letter”.
            </div>
          )}
          {phase === "streaming" && (
            <Paper>
              <div aria-live="polite" aria-busy="true" className="min-h-96 whitespace-pre-wrap leading-relaxed">
                <span className="sr-only">Writing your letter from your profile. </span>
                <span className="caret">{shown}</span>
              </div>
            </Paper>
          )}
          {phase === "done" && (
            <>
              <Paper className="p-0! sm:p-0!">
                <label htmlFor="letter-body" className="sr-only">Cover letter text (editable)</label>
                <textarea
                  id="letter-body"
                  value={body}
                  onChange={(e) => { setBody(e.target.value); setSavedId(undefined); }}
                  className="block min-h-[30rem] w-full resize-y rounded-md bg-transparent px-5 py-7 leading-relaxed text-ink focus:outline-none focus-visible:outline-2 focus-visible:outline-hl-ink sm:px-10 sm:py-11"
                />
              </Paper>
              <p className="text-sm text-muted">Edit freely; it&apos;s your letter.</p>
              {placeholders.length > 0 && (
                <div className="rounded-xl bg-warn-soft px-3 py-2 text-sm text-warn" role="status">
                  Fill these in before you send it: {placeholders.join(", ")}
                </div>
              )}
              {limited && !savedId && (
                <p className="text-sm">
                  You&apos;ve used all {state.limits.coverLetters} cover letters on your plan this month. You can still copy or download this one.{" "}
                  <Link href="/demo/settings" className="font-semibold text-hl-ink underline underline-offset-4">See your plan</Link>
                </p>
              )}
            </>
          )}
        </section>
      </div>
    </div>
  );
}
