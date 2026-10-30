"use client";

import { ArrowLeft, Download, FileSearch, GitCompare, Lock, ScanText, Wand2 } from "lucide-react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useMemo, useState } from "react";
import { Button, ButtonLink } from "@/components/ui/button";
import { Segmented } from "@/components/ui/field";
import { EmptyState, PageHeader } from "@/components/ui/panel";
import { useToast } from "@/components/ui/toast";
import { useDemo } from "@/demo/store";
import type { ResumeFinding, TargetMarket } from "@/demo/types";
import { formatDate } from "@/lib/dates";
import { CompareDialog } from "./compare-dialog";
import { FindingsPanel, findingDomId } from "./findings-panel";
import { ParsedView, ResumeLines, buildAnchors, lineId } from "./resume-document";
import { ScoreHero } from "./scores";
import { PillTabs } from "./visual";

/** The photo finding's advice depends on the market being viewed. */
function forMarket(f: ResumeFinding, market: TargetMarket): ResumeFinding {
  if (f.ruleId !== "PII4" || market === "PK_LOCAL") return f;
  return {
    ...f,
    severity: "MEDIUM",
    title: "Remove your photo for international roles",
    why: "Many employers outside Pakistan prefer no photo, to reduce bias, and a photo can confuse automated parsing.",
    fix: "Remove the photo from versions you send to international employers. Keep a separate version with it for local roles that ask for one.",
  };
}

function scrollToId(id: string) {
  const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  document.getElementById(id)?.scrollIntoView({ block: "center", behavior: reduce ? "auto" : "smooth" });
}

export function ReportPage() {
  const params = useParams<{ id: string }>();
  const { state, dispatch, resumeById, ready } = useDemo();
  const toast = useToast();
  const resume = resumeById(params.id);

  const [market, setMarket] = useState<TargetMarket | null>(null);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [tab, setTab] = useState<"resume" | "parsed">("resume");
  const [compareOpen, setCompareOpen] = useState(false);
  const [otherId, setOtherId] = useState<string | null>(null);

  const viewMarket = market ?? state.user.targetMarket;
  const findings = useMemo(
    () => (resume ? resume.findings.map((f) => forMarket(f, viewMarket)) : []),
    [resume, viewMarket],
  );
  const anchors = useMemo(() => (resume ? buildAnchors(resume.sections, findings) : new Map()), [resume, findings]);

  if (!resume) {
    return (
      <div className="mx-auto max-w-3xl">
        <EmptyState
          title={ready ? "We can't find that resume" : "Loading resume"}
          body="It may have been removed, or the link is wrong. Your versions are listed on the Resumes page."
          action={<ButtonLink href="/demo/resumes">Go to resumes</ButtonLink>}
        />
      </div>
    );
  }

  const others = state.resumes
    .filter((r) => r.id !== resume.id)
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  const older = others.find((r) => r.createdAt < resume.createdAt) ?? others[0];
  const otherSel = others.find((o) => o.id === otherId) ?? older;
  const appCount = state.applications.filter((a) => a.resumeVersionId === resume.id).length;
  const fixed = resume.findings.filter((f) => f.resolved).length;

  const fromList = (id: string) => {
    setActiveId(id);
    setTab("resume");
    const a = anchors.get(id);
    // Wait a frame so the Resume tab is mounted before scrolling.
    if (a) requestAnimationFrame(() => scrollToId(lineId(a.key)));
  };
  const fromDoc = (id: string) => {
    setActiveId(id);
    scrollToId(findingDomId(id));
  };

  return (
    <div className="flex flex-col">
      <PageHeader
        back={
          <Link href="/demo/resumes" className="inline-flex min-h-11 w-fit items-center gap-1.5 text-sm text-muted hover:text-ink">
            <ArrowLeft className="size-4" aria-hidden />
            All resumes
          </Link>
        }
        title={`${resume.label} ${resume.name}`}
        description={
          <>
            {resume.fileName}, added {formatDate(resume.createdAt)}.
            {appCount > 0 && (
              <span className="inline-flex items-center gap-1 pl-1.5 font-semibold text-ink">
                <Lock className="size-3.5" aria-hidden />
                Locked: sent with {appCount} {appCount === 1 ? "application" : "applications"}
              </span>
            )}
          </>
        }
        actions={
          <>
            <ButtonLink href="/demo/jobs" variant="primary">
              <Wand2 className="size-4" aria-hidden />
              Tailor for a job
            </ButtonLink>
            <Button onClick={() => toast("The demo has no original file to download. The real app returns the file you uploaded.")}>
              <Download className="size-4" aria-hidden />
              Download original
            </Button>
            <Button disabled={!older} onClick={() => setCompareOpen(true)}>
              <GitCompare className="size-4" aria-hidden />
              {older ? `Compare with ${older.label}` : "Nothing to compare"}
            </Button>
          </>
        }
      />

      <section aria-labelledby="scores-h" className="card mb-8 flex flex-col gap-6 p-5 sm:p-7">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 id="scores-h" className="font-display text-xl font-bold">
            Scores
          </h2>
          <p className="rounded-full bg-hl-soft px-3 py-1 text-sm font-bold text-hl-ink" aria-live="polite">
            {fixed} of {resume.findings.length} fixed
          </p>
        </div>
        <ScoreHero resume={resume} />
        <p className="border-t border-rule pt-4 text-sm text-muted">
          {resume.state === "LOCKED"
            ? "This version is locked, so its text stays as you sent it. Marking a finding fixed only tracks your to-do list. Scores update when you save a new version."
            : "Marking a finding fixed tracks your to-do list. Scores update when you save a new version."}
        </p>
      </section>

      <div className="grid gap-8 lg:grid-cols-2 lg:items-start">
        <div className="flex min-w-0 flex-col gap-8">

          <section className="flex flex-col gap-4" aria-labelledby="findings-h">
            <h2 id="findings-h" className="text-lg font-bold">
              Findings
            </h2>
            <Segmented
              legend="Target market for advice"
              name="view-market"
              value={viewMarket}
              onChange={setMarket}
              options={[
                { value: "PK_LOCAL", label: "Jobs in Pakistan" },
                { value: "INTERNATIONAL", label: "International" },
              ]}
            />
            {market && market !== state.user.targetMarket && (
              <p className="flex flex-wrap items-center gap-x-3 text-sm text-muted">
                Preview only. Your saved market is {state.user.targetMarket === "PK_LOCAL" ? "Jobs in Pakistan" : "International"}.
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => {
                    dispatch({ type: "SET_TARGET_MARKET", market: viewMarket });
                    setMarket(null);
                    toast("Target market saved.");
                  }}
                >
                  Save as my target market
                </Button>
              </p>
            )}
            <FindingsPanel
              findings={findings}
              activeId={activeId}
              onSelect={fromList}
              onToggle={(id, resolved) => dispatch({ type: "RESOLVE_FINDING", resumeId: resume.id, findingId: id, resolved })}
            />
          </section>

        </div>

        <aside
          aria-label="Your resume as a system reads it"
          className="flex min-w-0 flex-col gap-4 lg:sticky lg:top-4 lg:max-h-[calc(100vh-2rem)] lg:overflow-y-auto lg:pr-1"
        >
          <h2 className="font-display text-xl font-bold">Your resume as a system reads it</h2>
          <PillTabs
            label="Resume view"
            value={tab}
            onChange={setTab}
            panelId="resume-panel"
            options={[
              { value: "resume", label: "Resume", icon: <FileSearch className="size-4" aria-hidden /> },
              { value: "parsed", label: "What the parser extracted", icon: <ScanText className="size-4" aria-hidden /> },
            ]}
          />
          <div id="resume-panel" role="tabpanel">
            {tab === "resume" ? (
              <div className="flex flex-col gap-3">
                <p className="text-sm text-muted">
                  Dots in the margin mark lines with a finding. Select a finding to see its evidence highlighted here.
                </p>
                <ResumeLines
                  sections={resume.sections}
                  findings={findings}
                  anchors={anchors}
                  activeId={activeId}
                  onPick={fromDoc}
                />
              </div>
            ) : (
              <ParsedView sections={resume.sections} />
            )}
          </div>
        </aside>
      </div>


      <CompareDialog
        open={compareOpen}
        onClose={() => setCompareOpen(false)}
        current={resume}
        others={others}
        otherId={otherSel?.id ?? ""}
        onOtherChange={setOtherId}
      />
    </div>
  );
}
