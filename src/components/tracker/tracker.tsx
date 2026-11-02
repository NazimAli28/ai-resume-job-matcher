"use client";

import { DndContext, DragOverlay, KeyboardSensor, PointerSensor, useDraggable, useDroppable, useSensor, useSensors, type DragEndEvent } from "@dnd-kit/core";
import { AlertTriangle, CalendarClock, GripVertical, Search } from "lucide-react";
import Link from "next/link";
import { useMemo, useOptimistic, useState, useTransition } from "react";
import { moveApplicationAction, undoMoveAction } from "@/app/app/applications/actions";
import { StatusChip } from "@/components/ui/chip";
import { Input, Select } from "@/components/ui/field";
import { useToast } from "@/components/ui/toast";
import { cn } from "@/lib/cn";
import { CLOSED, PIPELINE, rank, STATUS_LABELS, STATUSES, type Status } from "@/server/tracker/constants";

export interface TrackerCard {
  id: string;
  company: string;
  title: string;
  status: Status;
  source: string;
  sourceLabel: string;
  matchScore: number | null;
  resumeLabel: string | null;
  daysInStage: number;
  appliedOn: string | null;
  appliedSort: number;
  nextAction: string | null;
  overdue: boolean;
}

const STAGE_HINT = (days: number) => (days === 0 ? "Today" : `${days} day${days === 1 ? "" : "s"} here`);

function MoveTo({ card, onMove }: { card: TrackerCard; onMove: (c: TrackerCard, to: Status) => void }) {
  return (
    <label className="flex items-center gap-2 text-[13px] text-muted">
      <span className="shrink-0">Move to</span>
      <Select
        aria-label={`Move ${card.company} to another stage`}
        className="h-11 min-w-0 flex-1 text-sm text-ink"
        value={card.status}
        onChange={(e) => onMove(card, e.target.value as Status)}
      >
        {STATUSES.map((s) => (
          <option key={s} value={s}>
            {STATUS_LABELS[s]}
          </option>
        ))}
      </Select>
    </label>
  );
}

function CardBody({ card, onMove, handle }: { card: TrackerCard; onMove?: (c: TrackerCard, to: Status) => void; handle?: React.ReactNode }) {
  const sent = rank(card.status) >= rank("APPLIED");
  return (
    <div className="card flex flex-col gap-2 p-3">
      <div className="flex items-start justify-between gap-1">
        <Link href={`/app/applications/${card.id}`} className="flex min-h-11 min-w-0 flex-col justify-center hover:underline">
          <span className="break-words text-sm font-bold">{card.company}</span>
          <span className="break-words text-[13px] text-muted">{card.title}</span>
        </Link>
        {handle}
      </div>
      <p className="flex flex-wrap gap-x-2 text-[13px] text-muted">
        <span>{card.sourceLabel}</span>
        <span>{STAGE_HINT(card.daysInStage)}</span>
        {card.matchScore !== null && <span className="tabular-nums">{card.matchScore} fit estimate</span>}
      </p>
      {card.resumeLabel ? (
        <p className="break-words text-[13px] text-muted">Sent: {card.resumeLabel}</p>
      ) : (
        sent && (
          <p className="flex items-center gap-1 text-[13px] font-semibold text-warn">
            <AlertTriangle className="size-3.5 shrink-0" aria-hidden /> No resume linked
          </p>
        )
      )}
      {card.nextAction && (
        <p className={cn("flex items-center gap-1 text-[13px]", card.overdue ? "font-semibold text-warn" : "text-muted")}>
          <CalendarClock className="size-3.5 shrink-0" aria-hidden />
          <span className="min-w-0 break-words">{card.nextAction}</span>
        </p>
      )}
      {onMove && <MoveTo card={card} onMove={onMove} />}
    </div>
  );
}

function DraggableCard({ card, onMove }: { card: TrackerCard; onMove: (c: TrackerCard, to: Status) => void }) {
  const { attributes, listeners, setNodeRef, setActivatorNodeRef, isDragging } = useDraggable({ id: card.id });
  return (
    <li ref={setNodeRef} className={cn(isDragging && "opacity-30")}>
      <CardBody
        card={card}
        onMove={onMove}
        handle={
          <button
            type="button"
            ref={setActivatorNodeRef}
            {...attributes}
            {...listeners}
            aria-label={`Drag ${card.company}. Space to pick up, arrow keys to move, space to drop.`}
            className="-mr-1 grid size-11 shrink-0 cursor-grab touch-none place-items-center rounded-xl text-muted hover:bg-sunken hover:text-ink"
          >
            <GripVertical className="size-5" aria-hidden />
          </button>
        }
      />
    </li>
  );
}

function Column({ status, cards, onMove, compact }: { status: Status; cards: TrackerCard[]; onMove: (c: TrackerCard, to: Status) => void; compact?: boolean }) {
  const { setNodeRef, isOver } = useDroppable({ id: status });
  return (
    <section
      ref={setNodeRef}
      aria-label={`${STATUS_LABELS[status]}, ${cards.length} applications`}
      className={cn("flex flex-col gap-2 rounded-2xl border p-2.5 transition-colors", compact ? "" : "w-64 shrink-0", isOver ? "border-hl-ink bg-hl-soft" : "border-rule bg-sunken/60")}
    >
      <h2 className="flex items-center justify-between px-1 text-sm font-bold">
        {STATUS_LABELS[status]}
        <span className="rounded-full bg-surface px-2 text-[13px] tabular-nums">{cards.length}</span>
      </h2>
      {cards.length === 0 && !compact && <p className="rounded-xl border border-dashed border-rule-strong px-2 py-4 text-center text-[13px] text-muted">Drop a card here.</p>}
      <ul className="flex flex-col gap-2">
        {cards.map((c) => (
          <DraggableCard key={c.id} card={c} onMove={onMove} />
        ))}
      </ul>
    </section>
  );
}

function Board({ cards, onMove }: { cards: TrackerCard[]; onMove: (c: TrackerCard, to: Status) => void }) {
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 6 } }), useSensor(KeyboardSensor));
  const [activeId, setActiveId] = useState<string | null>(null);
  const active = cards.find((c) => c.id === activeId);
  const of = (s: Status) => cards.filter((c) => c.status === s);

  function onDragEnd(e: DragEndEvent) {
    setActiveId(null);
    const card = cards.find((c) => c.id === e.active.id);
    if (card && e.over && e.over.id !== card.status) onMove(card, e.over.id as Status);
  }

  return (
    <DndContext id="tracker-board" sensors={sensors} onDragStart={(e) => setActiveId(String(e.active.id))} onDragEnd={onDragEnd} onDragCancel={() => setActiveId(null)}>
      <div className="flex items-start gap-3 overflow-x-auto pb-3" tabIndex={0} aria-label="Application board. Scroll sideways to see every stage.">
        {PIPELINE.map((s) => (
          <Column key={s} status={s} cards={of(s)} onMove={onMove} />
        ))}
        <div className="flex w-64 shrink-0 flex-col gap-2">
          <p className="px-1 text-sm font-bold text-muted">Closed</p>
          {CLOSED.map((s) => (
            <Column key={s} status={s} cards={of(s)} onMove={onMove} compact />
          ))}
        </div>
      </div>
      <DragOverlay>{active && <div className="w-60"><CardBody card={active} /></div>}</DragOverlay>
    </DndContext>
  );
}

/** Phones show one stage at a time. Moving uses the menu on each card, which also works by keyboard. */
function StageView({ cards, onMove }: { cards: TrackerCard[]; onMove: (c: TrackerCard, to: Status) => void }) {
  const [stage, setStage] = useState<Status>("SAVED");
  const shown = cards.filter((c) => c.status === stage);
  return (
    <div className="flex flex-col gap-3">
      <div className="flex gap-2 overflow-x-auto pb-1" role="group" aria-label="Choose a stage">
        {STATUSES.map((s) => (
          <button
            key={s}
            type="button"
            aria-pressed={stage === s}
            onClick={() => setStage(s)}
            className={cn("inline-flex min-h-11 shrink-0 items-center gap-1.5 rounded-full border px-3 text-sm font-semibold", stage === s ? "border-hl-ink bg-hl-soft" : "border-rule bg-surface text-muted")}
          >
            {STATUS_LABELS[s]} <span className="tabular-nums">{cards.filter((c) => c.status === s).length}</span>
          </button>
        ))}
      </div>
      {shown.length === 0 ? (
        <p className="rounded-xl border border-dashed border-rule-strong px-3 py-6 text-center text-sm text-muted">Nothing in {STATUS_LABELS[stage]} right now.</p>
      ) : (
        <ul className="flex flex-col gap-2">
          {shown.map((c) => (
            <li key={c.id}>
              <CardBody card={c} onMove={onMove} />
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

type SortKey = "company" | "status" | "applied" | "match";

function ListView({ cards, onMove }: { cards: TrackerCard[]; onMove: (c: TrackerCard, to: Status) => void }) {
  const [sort, setSort] = useState<SortKey>("applied");
  const sorted = useMemo(() => {
    const by: Record<SortKey, (a: TrackerCard, b: TrackerCard) => number> = {
      company: (a, b) => a.company.localeCompare(b.company),
      status: (a, b) => STATUSES.indexOf(a.status) - STATUSES.indexOf(b.status),
      applied: (a, b) => b.appliedSort - a.appliedSort,
      match: (a, b) => (b.matchScore ?? -1) - (a.matchScore ?? -1),
    };
    return [...cards].sort(by[sort]);
  }, [cards, sort]);
  const head = (k: SortKey, label: string, right?: boolean) => (
    <th scope="col" aria-sort={sort === k ? (k === "company" || k === "status" ? "ascending" : "descending") : "none"} className={cn("py-1 pr-3 font-semibold", right && "text-right")}>
      <button type="button" onClick={() => setSort(k)} className={cn("min-h-11 hover:text-ink", sort === k && "text-ink underline underline-offset-4")}>
        {label}
      </button>
    </th>
  );
  return (
    <div className="card overflow-x-auto p-4" tabIndex={0} aria-label="Applications table">
      <table className="w-full min-w-[46rem] text-sm">
        <thead>
          <tr className="border-b border-rule text-left text-muted">
            {head("company", "Company and role")}
            {head("status", "Stage")}
            <th scope="col" className="py-1 pr-3 font-semibold">Source</th>
            {head("applied", "Applied")}
            {head("match", "Fit estimate", true)}
            <th scope="col" className="py-1 font-semibold">Move to</th>
          </tr>
        </thead>
        <tbody>
          {sorted.map((c) => (
            <tr key={c.id} className="border-b border-rule align-middle last:border-0">
              <th scope="row" className="py-2 pr-3 text-left font-normal">
                <Link href={`/app/applications/${c.id}`} className="font-semibold hover:underline">{c.company}</Link>
                <span className="block text-[13px] text-muted">{c.title}</span>
              </th>
              <td className="py-2 pr-3"><StatusChip value={c.status} /></td>
              <td className="py-2 pr-3 text-muted">{c.sourceLabel}</td>
              <td className="whitespace-nowrap py-2 pr-3 text-muted">{c.appliedOn ?? "Not yet"}</td>
              <td className="py-2 pr-3 text-right tabular-nums">{c.matchScore ?? "None"}</td>
              <td className="py-2">
                <Select aria-label={`Move ${c.company} to another stage`} className="w-36" value={c.status} onChange={(e) => onMove(c, e.target.value as Status)}>
                  {STATUSES.map((s) => (
                    <option key={s} value={s}>{STATUS_LABELS[s]}</option>
                  ))}
                </Select>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export function Tracker({ cards }: { cards: TrackerCard[] }) {
  const toast = useToast();
  const [, startTransition] = useTransition();
  const [view, setView] = useState<"board" | "list">("board");
  const [query, setQuery] = useState("");
  const [source, setSource] = useState("");
  // Shows the move at once. React drops it when the transition ends, so a failed save rolls back by itself.
  const [optimistic, applyMove] = useOptimistic(cards, (list, move: { id: string; to: Status }) => list.map((c) => (c.id === move.id ? { ...c, status: move.to, daysInStage: 0 } : c)));

  function move(card: TrackerCard, to: Status) {
    if (card.status === to) return;
    startTransition(async () => {
      applyMove({ id: card.id, to });
      try {
        const r = await moveApplicationAction(card.id, { toStatus: to });
        if (!r.ok) return toast(r.error);
        const historyId = r.historyId;
        const hint = to === "INTERVIEWING" ? " Add the round on its page." : "";
        toast(`${card.company} moved to ${STATUS_LABELS[to]}.${hint}`, historyId ? {
          label: "Undo",
          onClick: () => startTransition(async () => {
            applyMove({ id: card.id, to: card.status });
            const u = await undoMoveAction(card.id, historyId);
            if (!u.ok) toast(u.error);
          }),
        } : undefined);
      } catch {
        toast("That move didn't save. Please try again.");
      }
    });
  }

  const sources = useMemo(() => [...new Map(cards.map((c) => [c.source, c.sourceLabel])).entries()].sort((a, b) => a[1].localeCompare(b[1])), [cards]);
  const q = query.trim().toLowerCase();
  const shown = optimistic.filter((c) => (!source || c.source === source) && (!q || `${c.company} ${c.title}`.toLowerCase().includes(q)));

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-end gap-3">
        <div className="flex gap-1 rounded-xl bg-sunken p-1" role="group" aria-label="View">
          {(["board", "list"] as const).map((v) => (
            <button key={v} type="button" aria-pressed={view === v} onClick={() => setView(v)} className={cn("min-h-10 rounded-lg px-4 text-sm font-semibold capitalize", view === v ? "bg-surface shadow-sm" : "text-muted hover:text-ink")}>
              {v}
            </button>
          ))}
        </div>
        <div className="relative min-w-0 flex-1 basis-48">
          <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted" aria-hidden />
          <Input aria-label="Search company or role" placeholder="Search company or role" value={query} onChange={(e) => setQuery(e.target.value)} className="flex-1 w-full pl-9" />
        </div>
        <Select aria-label="Filter by source" className="w-44" value={source} onChange={(e) => setSource(e.target.value)}>
          <option value="">All sources</option>
          {sources.map(([k, label]) => (
            <option key={k} value={k}>{label}</option>
          ))}
        </Select>
      </div>

      {shown.length === 0 && <p className="text-sm text-muted">No applications match this search.</p>}

      {view === "list" ? (
        shown.length > 0 && <ListView cards={shown} onMove={move} />
      ) : (
        <>
          <div className="hidden md:block"><Board cards={shown} onMove={move} /></div>
          <div className="md:hidden"><StageView cards={shown} onMove={move} /></div>
        </>
      )}
    </div>
  );
}
