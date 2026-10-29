"use client";
import { useSkipMotion } from "@/components/ui/motion";

import { AnimatePresence, motion } from "motion/react";
import { Check, ChevronDown, PartyPopper } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { SeverityChip } from "@/components/ui/chip";
import { Select } from "@/components/ui/field";
import type { ResumeFinding, Severity } from "@/demo/types";
import { cn } from "@/lib/cn";
import { PillTabs, SeverityIcon } from "./visual";

type Category = ResumeFinding["category"];

export const CATEGORY_LABEL: Record<Category, string> = {
  PARSE: "Parsing",
  READABILITY: "Readability",
  PRIVACY: "Privacy",
  CONTENT: "Content",
};
const CATEGORIES = Object.keys(CATEGORY_LABEL) as Category[];
const SEVERITY_ORDER: Severity[] = ["HIGH", "MEDIUM", "LOW", "TIP"];

export const findingDomId = (id: string) => `finding-${id}`;

function FindingCard({
  f,
  active,
  onSelect,
  onToggle,
}: {
  f: ResumeFinding;
  active: boolean;
  onSelect: (id: string) => void;
  onToggle: (id: string, resolved: boolean) => void;
}) {
  const reduce = useSkipMotion();
  // null = follow the default (open while unresolved); a click overrides it until the finding is toggled.
  const [manual, setManual] = useState<boolean | null>(null);
  const open = manual ?? !f.resolved;
  const bodyId = `${findingDomId(f.id)}-body`;

  return (
    <motion.li
      layout={reduce ? false : "position"}
      initial={reduce ? false : { opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={reduce ? undefined : { opacity: 0, scale: 0.97 }}
      transition={{ duration: 0.28, ease: [0.2, 0.7, 0.2, 1] }}
      id={findingDomId(f.id)}
      className={cn(
        "card scroll-mt-24 overflow-hidden transition-[border-color,box-shadow]",
        active && "border-hl-ink glow",
        f.resolved && "opacity-80",
      )}
    >
      <div className="flex items-start gap-3 p-4">
        {f.resolved ? (
          <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-hl text-on-hl">
            <Check className="size-5" strokeWidth={3} aria-hidden />
          </span>
        ) : (
          <SeverityIcon value={f.severity} />
        )}
        <div className="flex min-w-0 flex-1 flex-col gap-1.5">
          <button
            type="button"
            onClick={() => onSelect(f.id)}
            aria-pressed={active}
            className={cn("min-h-11 text-left font-display text-[17px] font-bold leading-snug hover:underline", f.resolved && "text-muted line-through")}
          >
            {f.title}
          </button>
          <div className="flex flex-wrap items-center gap-2">
            <SeverityChip value={f.severity} />
            <span className="text-sm text-muted">{CATEGORY_LABEL[f.category]}</span>
          </div>
        </div>
        <button
          type="button"
          aria-expanded={open}
          aria-controls={bodyId}
          aria-label={open ? `Hide details: ${f.title}` : `Show details: ${f.title}`}
          onClick={() => setManual(!open)}
          className="grid size-11 shrink-0 place-items-center rounded-xl text-muted hover:bg-sunken hover:text-ink"
        >
          <ChevronDown className={cn("size-5 transition-transform", open && "rotate-180")} aria-hidden />
        </button>
      </div>

      <AnimatePresence initial={false}>
        {open && (
          <motion.div
            id={bodyId}
            key="body"
            initial={reduce ? false : { height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={reduce ? undefined : { height: 0, opacity: 0 }}
            transition={{ duration: 0.28, ease: [0.2, 0.7, 0.2, 1] }}
            className="overflow-hidden"
          >
            <dl className="flex flex-col gap-3 border-t border-rule px-4 pb-1 pt-3 text-[15px]">
              <div>
                <dt className="text-sm font-semibold">What we saw</dt>
                <dd>{f.whatWeSaw}</dd>
              </div>
              <div>
                <dt className="text-sm font-semibold">Why it matters</dt>
                <dd>{f.why}</dd>
              </div>
              <div className="rounded-xl bg-hl-soft/60 p-3">
                <dt className="text-sm font-semibold">How to fix it</dt>
                <dd>{f.fix}</dd>
              </div>
            </dl>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="px-4 pb-4 pt-3">
        <Button
          size="sm"
          variant="secondary"
          aria-pressed={!!f.resolved}
          onClick={() => {
            setManual(null);
            onToggle(f.id, !f.resolved);
          }}
        >
          {f.resolved ? (
            <>
              <Check className="size-4" aria-hidden />
              Fixed. Undo
            </>
          ) : (
            "Mark as fixed"
          )}
        </Button>
      </div>
    </motion.li>
  );
}

export function FindingsPanel({
  findings,
  activeId,
  onSelect,
  onToggle,
}: {
  findings: ResumeFinding[];
  activeId: string | null;
  onSelect: (id: string) => void;
  onToggle: (id: string, resolved: boolean) => void;
}) {
  const [cat, setCat] = useState<Category | "ALL">("ALL");
  const [sev, setSev] = useState<Severity | "ALL">("ALL");

  const visible = findings
    .filter((f) => (cat === "ALL" || f.category === cat) && (sev === "ALL" || f.severity === sev))
    .sort((a, b) => SEVERITY_ORDER.indexOf(a.severity) - SEVERITY_ORDER.indexOf(b.severity));
  const count = (c: Category) => findings.filter((f) => f.category === c).length;

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col gap-3">
        <PillTabs<Category | "ALL">
          kind="filter"
          label="Filter by category"
          value={cat}
          onChange={setCat}
          options={[
            { value: "ALL", label: `All (${findings.length})` },
            ...CATEGORIES.map((c) => ({ value: c, label: `${CATEGORY_LABEL[c]} (${count(c)})` })),
          ]}
        />
        <div className="flex items-center gap-2">
          <label htmlFor="sev-filter" className="text-sm font-semibold">
            Severity
          </label>
          <Select id="sev-filter" className="w-auto" value={sev} onChange={(e) => setSev(e.target.value as Severity | "ALL")}>
            <option value="ALL">All severities</option>
            <option value="HIGH">Fix first</option>
            <option value="MEDIUM">Worth fixing</option>
            <option value="LOW">Minor</option>
            <option value="TIP">Tip</option>
          </Select>
        </div>
      </div>

      {visible.length === 0 ? (
        <div className="card flex flex-col items-center gap-2 px-4 py-8 text-center text-muted">
          <PartyPopper className="size-6 text-hl-ink" aria-hidden />
          No findings match these filters. Choose &quot;All&quot; to see everything.
        </div>
      ) : (
        <ul className="flex flex-col gap-3">
          <AnimatePresence initial={false} mode="popLayout">
            {visible.map((f) => (
              <FindingCard key={f.id} f={f} active={activeId === f.id} onSelect={onSelect} onToggle={onToggle} />
            ))}
          </AnimatePresence>
        </ul>
      )}
    </div>
  );
}
