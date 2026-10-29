"use client";

import { Download, Handshake, LayoutGrid, List, MessageSquareReply, Plus, Search, Send, Trophy } from "lucide-react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input, Select } from "@/components/ui/field";
import { Item, Stagger } from "@/components/ui/motion";
import { EmptyState, PageHeader } from "@/components/ui/panel";
import { StatCard } from "@/components/ui/stat-card";
import { useToast } from "@/components/ui/toast";
import { cn } from "@/lib/cn";
import { SOURCE_LABEL } from "@/demo/labels";
import { useDemo } from "@/demo/store";
import type { JobSource } from "@/demo/types";
import { AddApplicationDialog } from "./add-dialog";
import { Board } from "./board";
import { applicationsToCsv, downloadFile } from "./csv";
import { trackerStats } from "./helpers";
import { DetailSheet } from "./detail-sheet";
import { ListView } from "./list-view";
import { StageList } from "./stage-list";
import { useMoveApplication } from "./use-move";
import { useStoredString } from "./use-stored-state";

export function Tracker() {
  const { state } = useDemo();
  const toast = useToast();
  const move = useMoveApplication();
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();
  const openId = params.get("open");

  const [view, setView] = useStoredString("arw-tracker-view", "board");
  const [source, setSource] = useState<JobSource | "">("");
  const [tag, setTag] = useState("");
  const [query, setQuery] = useState("");
  const [adding, setAdding] = useState(false);

  const tags = useMemo(() => [...new Set(state.applications.flatMap((a) => a.tags))].sort(), [state.applications]);
  const usedSources = useMemo(() => [...new Set(state.applications.map((a) => a.source))], [state.applications]);
  const apps = useMemo(() => {
    const q = query.trim().toLowerCase();
    return state.applications.filter(
      (a) =>
        (!source || a.source === source) &&
        (!tag || a.tags.includes(tag)) &&
        (!q || `${a.company} ${a.title}`.toLowerCase().includes(q)),
    );
  }, [state.applications, source, tag, query]);
  const stats = useMemo(() => trackerStats(state.applications), [state.applications]);
  const filtered = Boolean(source || tag || query.trim());

  const open = (id: string) => router.replace(`${pathname}?open=${encodeURIComponent(id)}`, { scroll: false });
  const close = () => router.replace(pathname, { scroll: false });

  const exportCsv = () => {
    downloadFile("applications.csv", applicationsToCsv(state.applications, state.resumes), "text/csv;charset=utf-8");
    toast(`Exported ${state.applications.length} applications`);
  };

  return (
    <>
      <PageHeader
        title="Applications"
        description="Every application, with the exact resume version and job source you used."
        actions={
          <>
            <Button onClick={exportCsv} disabled={state.applications.length === 0}>
              <Download className="size-4" aria-hidden /> Export CSV
            </Button>
            <Button variant="primary" onClick={() => setAdding(true)}>
              <Plus className="size-4" aria-hidden /> Add application
            </Button>
          </>
        }
      />

      {state.applications.length === 0 ? (
        <EmptyState
          title="No applications yet"
          body="Add a job you saved, or enter one by hand. We keep the resume version you send with it."
          action={<Button variant="primary" onClick={() => setAdding(true)}>Add application</Button>}
        />
      ) : (
        <div className="flex flex-col gap-5">
          <Stagger className="grid grid-cols-2 gap-3 lg:grid-cols-4">
            <Item><StatCard icon={Send} label="Active" value={stats.active} footnote="Applied and still open" emphasis /></Item>
            <Item><StatCard icon={Handshake} label="Interviewing" value={stats.interviewing} footnote="In an interview stage" /></Item>
            <Item><StatCard icon={Trophy} label="Offers" value={stats.offers} footnote="Offer or accepted" /></Item>
            <Item>
              <StatCard
                icon={MessageSquareReply}
                label="Response rate"
                value={stats.responseRate}
                suffix="%"
                footnote={`${stats.responded} of ${stats.sent} sent got a reply`}
              />
            </Item>
          </Stagger>
          <div className="flex flex-wrap items-center gap-2">
            <div className="relative min-w-48 flex-1 sm:max-w-xs">
              <Search className="pointer-events-none absolute left-3 top-3.5 size-4 text-muted" aria-hidden />
              <Input aria-label="Search company or role" placeholder="Search company or role" value={query} onChange={(e) => setQuery(e.target.value)} className="pl-9" />
            </div>
            <Select aria-label="Filter by source" value={source} onChange={(e) => setSource(e.target.value as JobSource | "")} className="w-auto">
              <option value="">All sources</option>
              {usedSources.map((s) => (
                <option key={s} value={s}>{SOURCE_LABEL[s]}</option>
              ))}
            </Select>
            <Select aria-label="Filter by tag" value={tag} onChange={(e) => setTag(e.target.value)} className="w-auto">
              <option value="">All tags</option>
              {tags.map((t) => (
                <option key={t} value={t}>{t}</option>
              ))}
            </Select>
            {filtered && (
              <Button variant="ghost" onClick={() => { setSource(""); setTag(""); setQuery(""); }}>Clear filters</Button>
            )}
            <div role="group" aria-label="View" className="ml-auto flex rounded-xl border border-rule bg-surface p-0.5">
              {([["board", "Board", LayoutGrid], ["list", "List", List]] as const).map(([v, label, Icon]) => (
                <button
                  key={v}
                  type="button"
                  aria-pressed={view === v}
                  onClick={() => setView(v)}
                  className={cn(
                    "flex min-h-10 items-center gap-1.5 rounded-lg px-3 text-sm font-semibold transition-colors",
                    view === v ? "bg-hl text-on-hl" : "text-muted hover:text-ink",
                  )}
                >
                  <Icon className="size-4" aria-hidden /> {label}
                </button>
              ))}
            </div>
          </div>

          {apps.length === 0 ? (
            <EmptyState title="Nothing matches" body="Try a different search or clear the filters." action={<Button onClick={() => { setSource(""); setTag(""); setQuery(""); }}>Clear filters</Button>} />
          ) : view === "list" ? (
            <ListView apps={apps} onOpen={open} />
          ) : (
            <>
              <div className="hidden md:block">
                <Board apps={apps} onOpen={open} onMove={move} />
              </div>
              <div className="md:hidden">
                <StageList apps={apps} onOpen={open} onMove={move} />
              </div>
            </>
          )}
        </div>
      )}

      <AddApplicationDialog open={adding} onClose={() => setAdding(false)} onCreated={open} />
      <DetailSheet id={openId} onClose={close} />
    </>
  );
}
