"use client";
import { useSkipMotion } from "@/components/ui/motion";

import { Briefcase, FileText, Lock, MapPin, Settings2 } from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import { useState } from "react";
import { ButtonLink, Button } from "@/components/ui/button";
import { STATUS_LABEL, StatusChip } from "@/components/ui/chip";
import { Field, Input, Select } from "@/components/ui/field";
import { Dialog, Sheet } from "@/components/ui/overlay";
import { Tabs } from "@/components/ui/tabs";
import { bandFor } from "@/components/ui/score";
import { SOURCE_LABEL } from "@/demo/labels";
import { useDemo } from "@/demo/store";
import type { Application, ApplicationStatus } from "@/demo/types";
import { NextAction } from "./app-card";
import { Contacts, Notes, Rounds, Section, Tags, Timeline } from "./detail-parts";
import { ALL_STATUSES } from "./helpers";
import { InitialTile } from "./tile";
import { useMoveApplication } from "./use-move";

function Overview({ app }: { app: Application }) {
  const { dispatch } = useDemo();
  const move = useMoveApplication();
  const [salary, setSalary] = useState(app.salary ?? "");
  return (
    <Section title="Overview" icon={Settings2}>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Status" htmlFor="d-status">
          <Select id="d-status" value={app.status} onChange={(e) => move(app.id, e.target.value as ApplicationStatus)}>
            {ALL_STATUSES.map((s) => (
              <option key={s} value={s}>{STATUS_LABEL[s]}</option>
            ))}
          </Select>
        </Field>
        <Field label="Applied on" htmlFor="d-applied">
          <Input
            id="d-applied"
            type="date"
            value={app.appliedAt ?? ""}
            onChange={(e) => dispatch({ type: "UPDATE_APPLICATION", id: app.id, patch: { appliedAt: e.target.value || undefined } })}
          />
        </Field>
        <Field label="Salary" htmlFor="d-salary" hint="Offered or advertised.">
          <Input
            id="d-salary"
            value={salary}
            onChange={(e) => setSalary(e.target.value)}
            onBlur={() => salary !== (app.salary ?? "") && dispatch({ type: "UPDATE_APPLICATION", id: app.id, patch: { salary: salary.trim() || undefined } })}
            placeholder="PKR 200k"
          />
        </Field>
        <div className="flex flex-col gap-1.5">
          <span className="text-sm font-semibold">Source</span>
          <p className="flex min-h-11 flex-col justify-center">
            <span>{SOURCE_LABEL[app.source]}</span>
            {app.sourceDetail && <span className="text-sm text-muted">{app.sourceDetail}</span>}
          </p>
        </div>
      </div>
      {app.nextAction && <NextAction app={app} />}
      <Tags app={app} />
    </Section>
  );
}

function ResumeSent({ app }: { app: Application }) {
  const { resumeById } = useDemo();
  const r = resumeById(app.resumeVersionId);
  return (
    <Section title="Resume you sent" icon={FileText}>
      {r ? (
        <div className="flex flex-col gap-2">
          <p>
            <span className="font-semibold">{r.label}</span>, {r.name}
            <span className="block text-sm text-muted">File: {r.fileName}</span>
          </p>
          {r.state === "LOCKED" && (
            <p className="flex items-start gap-2 text-sm text-muted">
              <Lock className="mt-0.5 size-4 shrink-0" aria-hidden />
              Locked. This version can no longer change, so you can always see exactly what this employer received.
            </p>
          )}
          <div>
            <ButtonLink href={`/app/resumes/${r.id}`} size="sm">Open {r.label}</ButtonLink>
          </div>
        </div>
      ) : (
        <p className="text-muted">That resume version is no longer available.</p>
      )}
    </Section>
  );
}

function JobSnapshot({ app }: { app: Application }) {
  const { jobById, matchFor } = useDemo();
  const job = jobById(app.jobId);
  const m = matchFor(app.jobId);
  if (!job) {
    return (
      <Section title="Job snapshot" icon={Briefcase}>
        <p className="text-muted">You added this one by hand, so there is no saved job description. Save the job to see how your resume matches it.</p>
        <div><ButtonLink href="/app/jobs" size="sm">Go to Jobs</ButtonLink></div>
      </Section>
    );
  }
  const must = job.requirements.filter((r) => r.type === "MUST_HAVE");
  const covered = must.filter((r) => (r.override === "REJECT" ? false : r.matchClass === "STRONG" || r.override === "CONFIRM")).length;
  return (
    <Section title="Job snapshot" icon={Briefcase}>
      <p className="flex items-center gap-1.5">
        <MapPin className="size-4 text-muted" aria-hidden />
        {job.location}, {job.workMode}
        {job.salary && <span className="text-muted">, {job.salary}</span>}
      </p>
      <p className="text-muted">
        {covered} of {must.length} must-haves clearly covered by your resume.
        {m && ` Overall: ${bandFor(m.score).word} match (estimate).`}
      </p>
      <ul className="list-disc pl-5 text-[15px]">
        {must.slice(0, 4).map((r) => (
          <li key={r.id}>{r.text}</li>
        ))}
      </ul>
      <div><ButtonLink href={`/app/jobs/${job.id}`} size="sm">Open job details</ButtonLink></div>
    </Section>
  );
}

export function DetailSheet({ id, onClose }: { id: string | null; onClose: () => void }) {
  const { state, jobById } = useDemo();
  const move = useMoveApplication();
  const reduce = useSkipMotion();
  const [tab, setTab] = useState<"overview" | "people" | "history">("overview");
  const [confirmWithdraw, setConfirmWithdraw] = useState(false);
  const app = id ? state.applications.find((a) => a.id === id) : undefined;
  const open = Boolean(app);
  return (
    <>
      <Sheet open={open} onClose={onClose} title={app ? `${app.company}, ${app.title}` : "Application"} wide>
        {app && (
          <div key={app.id} className="flex flex-col gap-6">
            <div className="card relative flex flex-wrap items-center gap-4 overflow-hidden p-4">
              <div aria-hidden className="pointer-events-none absolute -right-10 -top-14 size-40 rounded-full bg-hl opacity-20 blur-3xl" />
              <InitialTile name={app.company} size={56} className="relative" />
              <div className="relative flex min-w-0 flex-1 flex-col gap-1">
                <span className="truncate font-display text-xl font-bold">{app.company}</span>
                <span className="truncate text-muted">{app.title}</span>
              </div>
              <StatusChip value={app.status} />
            </div>
            <Tabs
              label="Application sections"
              value={tab}
              onChange={setTab}
              tabs={[
                { value: "overview", label: "Overview" },
                { value: "people", label: "Rounds and contacts" },
                { value: "history", label: "Notes and history" },
              ]}
            >
              <AnimatePresence mode="wait" initial={false}>
                <motion.div
                  key={tab}
                  initial={reduce ? false : { opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.18 }}
                  className="flex flex-col gap-4"
                >
                  {tab === "overview" && (
                    <>
                      <Overview app={app} />
                      <ResumeSent app={app} />
                      <JobSnapshot app={app} />
                    </>
                  )}
                  {tab === "people" && (
                    <>
                      <Rounds app={app} />
                      <Contacts app={app} />
                    </>
                  )}
                  {tab === "history" && (
                    <>
                      <Notes app={app} />
                      <Timeline app={app} />
                    </>
                  )}
                </motion.div>
              </AnimatePresence>
            </Tabs>
            <Section title="Actions" icon={Settings2}>
              <div className="flex flex-wrap gap-2">
                {jobById(app.jobId) && (
                  <ButtonLink href={`/app/interviews/new?job=${app.jobId}`} variant="primary">Practice for this job</ButtonLink>
                )}
                {app.status !== "WITHDRAWN" && (
                  <Button variant="danger" onClick={() => setConfirmWithdraw(true)}>Withdraw application</Button>
                )}
              </div>
            </Section>
          </div>
        )}
      </Sheet>
      <Dialog
        open={confirmWithdraw && Boolean(app)}
        onClose={() => setConfirmWithdraw(false)}
        title="Withdraw this application?"
        footer={
          <>
            <Button onClick={() => setConfirmWithdraw(false)}>Keep it</Button>
            <Button
              variant="danger"
              onClick={() => {
                if (app) move(app.id, "WITHDRAWN");
                setConfirmWithdraw(false);
              }}
            >
              Mark as withdrawn
            </Button>
          </>
        }
      >
        <p>
          This moves {app?.company} to Closed as withdrawn. It does not contact the employer, and you can undo it right after.
        </p>
      </Dialog>
    </>
  );
}
