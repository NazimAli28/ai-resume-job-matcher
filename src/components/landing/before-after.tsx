"use client";

import { ChevronsLeftRight, CircleHelp } from "lucide-react";
import { useId, useState, type ReactNode } from "react";
import { suggestionById } from "./sample";

const EXAMPLES = ["sg2", "sg3", "sg6"].map(suggestionById);
const PLACEHOLDER = "[your number]";

/** Keep the visitor's answer short and plain; it is their fact, we only insert it. */
const clean = (s: string) => s.replace(/[<>[\]]/g, "").slice(0, 24).trim();

function withAnswer(text: string, answer: string): ReactNode {
  if (!text.includes(PLACEHOLDER)) return text;
  if (answer) return text.replace(PLACEHOLDER, answer);
  const [a, b] = text.split(PLACEHOLDER);
  return (
    <>
      {a}
      <span className="rounded-[4px] border border-dashed border-warn px-1 font-normal text-warn">{PLACEHOLDER}</span>
      {b}
    </>
  );
}

/**
 * Before/after bullets. A two-way switch flips every bullet; tapping a bullet flips just that one.
 * New text gets the highlighter sweep, the original stays muted, so the change reads at a glance.
 */
export function BeforeAfter() {
  const [all, setAll] = useState<"before" | "after">("after");
  const [flipped, setFlipped] = useState<Record<string, boolean>>({});
  const [answer, setAnswer] = useState("");
  const inputId = useId();
  const filled = clean(answer);
  const q = EXAMPLES.find((s) => s.kind === "QUESTION");
  const showAfter = (id: string) => (all === "after") !== Boolean(flipped[id]);

  return (
    <div className="flex flex-col gap-4">
      <div className="overflow-hidden rounded-2xl border border-rule bg-surface">
        <div role="radiogroup" aria-label="Show bullets as" className="flex gap-1 border-b border-rule p-1.5">
          {(["before", "after"] as const).map((v) => (
            <button
              key={v}
              type="button"
              role="radio"
              aria-checked={all === v}
              onClick={() => {
                setAll(v);
                setFlipped({});
              }}
              className={`flex-1 rounded-xl px-3 py-2 text-[13px] font-semibold transition-colors ${all === v ? (v === "after" ? "bg-hl text-on-hl glow" : "bg-sunken text-ink") : "text-muted hover:text-ink"}`}
            >
              {v === "before" ? "Your original" : "Our suggestion"}
            </button>
          ))}
        </div>
        <ul className="flex flex-col divide-y divide-rule">
          {EXAMPLES.map((s) => {
            const after = showAfter(s.id);
            return (
              <li key={s.id}>
                <button
                  type="button"
                  onClick={() => setFlipped((f) => ({ ...f, [s.id]: !f[s.id] }))}
                  aria-label={`${after ? "Showing suggestion" : "Showing original"}. Tap to compare.`}
                  className="flex w-full items-start gap-3 px-4 py-3 text-left transition-colors hover:bg-sunken/60"
                >
                  <ChevronsLeftRight className="mt-1 size-4 shrink-0 text-muted" aria-hidden />
                  {after ? (
                    <span key="a" className="text-[15px] font-semibold">
                      <span className="hl hl-sweep">{withAnswer(s.after, filled)}</span>
                    </span>
                  ) : (
                    <span key="b" className="text-[15px] text-muted">
                      {s.before}
                    </span>
                  )}
                </button>
              </li>
            );
          })}
        </ul>
      </div>

      {q && (
        <div className="flex flex-col gap-2 rounded-2xl bg-warn-soft/60 p-4">
          <label htmlFor={inputId} className="flex items-start gap-2 text-sm font-semibold">
            <CircleHelp className="mt-0.5 size-4 shrink-0 text-warn" aria-hidden />
            {q.question}
          </label>
          <input
            id={inputId}
            value={answer}
            onChange={(e) => setAnswer(e.target.value)}
            maxLength={24}
            placeholder="For example: about 20%"
            className="h-11 w-full max-w-xs rounded-xl border border-rule bg-surface px-3 text-ink placeholder:text-muted focus:border-hl-ink focus:outline-none"
          />
          <p className="text-[13px] text-muted" aria-live="polite">
            {filled
              ? `Inserted your answer, “${filled}”, into the suggestion. Tap a bullet to compare.`
              : "We don't guess numbers. Leave it blank and the placeholder stays until you know."}
          </p>
        </div>
      )}
    </div>
  );
}
