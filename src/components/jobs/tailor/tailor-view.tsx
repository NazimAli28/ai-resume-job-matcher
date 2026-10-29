"use client";

import { useState } from "react";
import { EmptyState, PageHeader } from "@/components/ui/panel";
import { useToast } from "@/components/ui/toast";
import { useDemo } from "@/demo/store";
import type { Job, ResumeVersion } from "@/demo/types";
import { TODAY } from "@/lib/dates";
import { PillTabs } from "@/components/resumes/visual";
import { FileText, ListChecks } from "lucide-react";
import { BackLink } from "../back-link";
import { JobNotFound, Loading } from "../job-not-found";
import { slug } from "../lib/browser";
import type { EffectiveRequirement } from "../lib/match";
import { applyEdits, needsAnswer, nextLabel, resumeAsText } from "../lib/tailor";
import { useJob } from "../use-job";
import { ChangeRail } from "./change-rail";
import { DownloadDialog } from "./download-dialog";
import { ResumeDiff } from "./resume-diff";
import { SuggestionList } from "./suggestion-list";
import { useSuggestions } from "./use-suggestions";

type Mode = "improved" | "suggestions";

export function TailorView() {
  const { ready, job, match } = useJob();
  if (!ready) return <Loading />;
  if (!job || !match) return <JobNotFound />;
  return <Workspace key={job.id} job={job} reqs={match.now.reqs} />;
}

function Workspace({ job, reqs }: { job: Job; reqs: EffectiveRequirement[] }) {
  const { state, dispatch, activeResume, resumeById, atLimit } = useDemo();
  const toast = useToast();
  // Pin the source version: saving a new version makes it active, but this page keeps showing its source.
  const [sourceId] = useState(activeResume.id);
  const resume = resumeById(sourceId) ?? activeResume;
  const api = useSuggestions(job, reqs, resume);
  const [mode, setMode] = useState<Mode>("improved");
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [savedId, setSavedId] = useState<string>();
  const [downloading, setDownloading] = useState(false);
  const saved = savedId ? resumeById(savedId) : undefined;
  const setAnswer = (id: string, v: string) => setAnswers((a) => ({ ...a, [id]: v }));

  const sections = saved?.sections ?? applyEdits(resume, api.list);
  const hadCnic = resume.sections.some((s) => s.lines.some((l) => /\bCNIC\b/i.test(l)));

  const acceptSafe = () => {
    const n = api.acceptAllSafe();
    toast(n ? `Accepted ${n} wording-only ${n === 1 ? "change" : "changes"}` : "No wording-only changes left");
  };

  const save = () => {
    if (atLimit("tailored")) return;
    const lines = sections.flatMap((s) => s.lines);
    const label = nextLabel(state.resumes);
    const version: ResumeVersion = {
      ...resume,
      id: `rv${Date.now()}`,
      label,
      name: `Tailored for ${job.company}`,
      fileName: `${slug(state.user.name)}_${slug(job.company)}_${label}.pdf`,
      createdAt: `${TODAY}${new Date().toISOString().slice(10)}`,
      origin: "TAILORED",
      tailoredForJobId: job.id,
      state: "DRAFT",
      sections,
      // Keep only findings whose evidence is still in the new text.
      findings: resume.findings.filter((f) => !f.evidence || f.evidence.text === f.evidence.section || lines.some((l) => l.includes(f.evidence!.text))),
    };
    dispatch({ type: "ADD_RESUME", version });
    dispatch({ type: "INCREMENT_USAGE", key: "tailored" });
    setSavedId(version.id);
    toast(`Saved ${label}: Tailored for ${job.company}. It's now your active resume.`);
  };

  const pendingQuestions = api.list.filter((s) => s.status === "PENDING" && needsAnswer(s)).length;

  return (
    <div className="mx-auto max-w-6xl">
      <PageHeader
        back={<BackLink href={`/app/jobs/${job.id}`} label="Back to the match" />}
        title={`Tailor your resume for ${job.company}`}
        description={`${job.title}. Every change is based on your own resume or answers; nothing is added unless you accept it.`}
      />
      {!api.isSeeded && api.list.length > 0 && (
        <p className="-mt-2 pb-4 text-sm text-muted">These suggestions were made in your browser from this job&apos;s partial and missing requirements.</p>
      )}

      {api.list.length === 0 ? (
        <EmptyState title="Nothing to change for this job" body="Your resume already covers what we can check here. Review the match report for anything unclear." />
      ) : (
        <div className="flex flex-col gap-5">
          <PillTabs<Mode>
            label="How do you want to tailor?"
            value={mode}
            onChange={setMode}
            panelId="tailor-panel"
            options={[
              { value: "improved", label: "Improved resume", icon: <FileText className="size-4" aria-hidden /> },
              { value: "suggestions", label: "Suggestions only", icon: <ListChecks className="size-4" aria-hidden /> },
            ]}
          />
          <div id="tailor-panel" role="tabpanel">
          {mode === "improved" ? (
            <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_18rem]">
              <div className="order-2 lg:order-1">
                <p className="pb-3 text-sm text-muted">
                  Showing {resume.label}: {resume.name}. Review each change on the page, then save it as a new version.
                </p>
                <ResumeDiff resume={resume} api={api} answers={answers} setAnswer={setAnswer} />
              </div>
              <div className="order-1 lg:order-2">
                <ChangeRail
                  api={api}
                  onAcceptSafe={acceptSafe}
                  onSave={save}
                  onDownload={() => setDownloading(true)}
                  saved={saved}
                  limitReached={atLimit("tailored")}
                  limit={state.limits.tailored}
                />
              </div>
            </div>
          ) : (
            <div className="max-w-3xl">
              <SuggestionList api={api} answers={answers} setAnswer={setAnswer} />
            </div>
          )}
          </div>
        </div>
      )}

      <DownloadDialog
        open={downloading}
        onClose={() => setDownloading(false)}
        fileBase={`${slug(state.user.name)}_${slug(job.company)}_tailored`}
        text={resumeAsText(sections)}
        pendingQuestions={pendingQuestions}
        hadCnic={hadCnic}
      />
    </div>
  );
}
