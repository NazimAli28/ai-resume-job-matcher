"use client";
import { useSkipMotion } from "@/components/ui/motion";

import {
  DndContext, DragOverlay, KeyboardSensor, PointerSensor, useDraggable, useDroppable, useSensor, useSensors,
  type DragEndEvent, type DragStartEvent,
} from "@dnd-kit/core";
import { GripVertical } from "lucide-react";
import { LayoutGroup, motion } from "motion/react";
import { useState } from "react";
import { STATUS_LABEL } from "@/components/ui/chip";
import { cn } from "@/lib/cn";
import { PIPELINE } from "@/demo/labels";
import type { Application } from "@/demo/types";
import { AppCard } from "./app-card";
import { COLUMN_TONE, columnOf, statusForColumn, type ColumnId } from "./helpers";

type Move = (id: string, s: Application["status"]) => void;

const COLUMNS: { id: ColumnId; label: string }[] = [
  ...PIPELINE.map((s) => ({ id: s as ColumnId, label: STATUS_LABEL[s] })),
  { id: "CLOSED", label: "Closed" },
];

function DraggableCard({ app, onOpen, onMove }: { app: Application; onOpen: (id: string) => void; onMove: Move }) {
  const reduce = useSkipMotion();
  const { attributes, listeners, setNodeRef, setActivatorNodeRef, isDragging } = useDraggable({ id: app.id });
  // Pointer drag works anywhere on the card; the keyboard sensor only starts from the handle button.
  return (
    <motion.div
      layout={!reduce}
      layoutId={reduce ? undefined : `board-${app.id}`}
      transition={{ type: "spring", stiffness: 420, damping: 36 }}
    >
      <div ref={setNodeRef} {...listeners} className={cn("transition-opacity", isDragging && "opacity-30")}>
        <AppCard
          app={app}
          onOpen={onOpen}
          onMove={onMove}
          showStatus={columnOf(app.status) === "CLOSED"}
          handle={
            <button
              type="button"
              ref={setActivatorNodeRef}
              {...attributes}
              aria-label={`Drag ${app.company}. Space to pick up, arrow keys to move, space to drop.`}
              className="-mr-1 grid size-11 shrink-0 cursor-grab touch-none place-items-center rounded-xl text-muted hover:bg-sunken hover:text-ink"
            >
              <GripVertical className="size-5" aria-hidden />
            </button>
          }
        />
      </div>
    </motion.div>
  );
}

function Column({ id, label, apps, onOpen, onMove }: { id: ColumnId; label: string; apps: Application[]; onOpen: (id: string) => void; onMove: Move }) {
  const { setNodeRef, isOver } = useDroppable({ id });
  return (
    <section
      ref={setNodeRef}
      aria-label={`${label}, ${apps.length} applications`}
      className={cn(
        "flex w-72 shrink-0 flex-col gap-3 rounded-3xl border p-3 backdrop-blur-md transition-all",
        isOver ? "border-hl-ink bg-hl-soft glow" : "border-rule bg-sunken/60",
      )}
    >
      <h2 className="flex items-center justify-between px-1.5 pt-1 text-[15px] font-bold">
        {label}
        <span className={cn("grid min-w-7 place-items-center rounded-full px-2 py-0.5 text-sm font-bold tabular-nums", COLUMN_TONE[id])}>{apps.length}</span>
      </h2>
      {apps.length === 0 && (
        <p className="rounded-2xl border border-dashed border-rule-strong px-3 py-6 text-center text-sm text-muted">Drop a card here.</p>
      )}
      {apps.map((a) => (
        <DraggableCard key={a.id} app={a} onOpen={onOpen} onMove={onMove} />
      ))}
    </section>
  );
}

export function Board({ apps, onOpen, onMove }: { apps: Application[]; onOpen: (id: string) => void; onMove: Move }) {
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 6 } }), useSensor(KeyboardSensor));
  const [activeId, setActiveId] = useState<string | null>(null);
  const active = apps.find((a) => a.id === activeId);

  const onDragStart = (e: DragStartEvent) => setActiveId(String(e.active.id));
  const onDragEnd = (e: DragEndEvent) => {
    setActiveId(null);
    if (!e.over) return;
    const app = apps.find((a) => a.id === e.active.id);
    if (!app) return;
    const col = e.over.id as ColumnId;
    if (columnOf(app.status) === col) return;
    onMove(app.id, statusForColumn(col));
  };

  return (
    <DndContext sensors={sensors} onDragStart={onDragStart} onDragEnd={onDragEnd} onDragCancel={() => setActiveId(null)}>
      <LayoutGroup id="board">
        <div className="flex items-start gap-3 overflow-x-auto pb-4 pt-1 -mx-3 px-3 sm:-mx-5 sm:px-5 lg:-ml-3 lg:-mr-6 lg:pl-3 lg:pr-6">
          {COLUMNS.map((c) => (
            <Column key={c.id} id={c.id} label={c.label} apps={apps.filter((a) => columnOf(a.status) === c.id)} onOpen={onOpen} onMove={onMove} />
          ))}
        </div>
      </LayoutGroup>
      <DragOverlay dropAnimation={{ duration: 200, easing: "cubic-bezier(.2,.7,.2,1)" }}>
        {active && (
          <div className="w-[16.5rem]">
            <AppCard app={active} floating showStatus={columnOf(active.status) === "CLOSED"} />
          </div>
        )}
      </DragOverlay>
    </DndContext>
  );
}
