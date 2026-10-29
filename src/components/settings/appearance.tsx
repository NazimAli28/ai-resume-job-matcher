"use client";

import { Check, Monitor, Moon, Sun } from "lucide-react";
import type { CSSProperties } from "react";
import { ACCENTS, useTheme, type ThemePref } from "@/components/theme/use-theme";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/cn";

// Preview tiles must show a fixed light or dark palette whatever the page theme is,
// so they set their own token values (the only place colors are spelled out).
const LIGHT: CSSProperties = {
  ["--paper" as string]: "#f6f7f9",
  ["--surface" as string]: "#ffffff",
  ["--sunken" as string]: "#eef0f3",
  ["--ink" as string]: "#14161a",
  ["--rule" as string]: "#e3e6eb",
};
const DARK: CSSProperties = {
  ["--paper" as string]: "#101215",
  ["--surface" as string]: "#181b20",
  ["--sunken" as string]: "#1f232a",
  ["--ink" as string]: "#eceef1",
  ["--rule" as string]: "#2a2e36",
};

/** A miniature app window: sidebar, a card and a highlighted line. */
function MiniWindow({ style, className }: { style: CSSProperties; className?: string }) {
  return (
    <div aria-hidden className={cn("flex h-full w-full gap-1.5 p-2", className)} style={{ ...style, background: "var(--paper)" }}>
      <div className="flex w-1/4 flex-col gap-1 rounded-md p-1" style={{ background: "var(--surface)", border: "1px solid var(--rule)" }}>
        <span className="h-1.5 rounded-full bg-hl" />
        <span className="h-1.5 rounded-full" style={{ background: "var(--sunken)" }} />
        <span className="h-1.5 rounded-full" style={{ background: "var(--sunken)" }} />
      </div>
      <div className="flex flex-1 flex-col gap-1 rounded-md p-1.5" style={{ background: "var(--surface)", border: "1px solid var(--rule)" }}>
        <span className="h-1.5 w-1/2 rounded-full" style={{ background: "var(--ink)" }} />
        <span className="h-1.5 w-full rounded-full" style={{ background: "var(--sunken)" }} />
        <span className="h-1.5 w-3/4 rounded-full bg-hl" />
      </div>
    </div>
  );
}

const THEMES: { value: ThemePref; label: string; icon: typeof Sun }[] = [
  { value: "light", label: "Light", icon: Sun },
  { value: "dark", label: "Dark", icon: Moon },
  { value: "system", label: "Match my device", icon: Monitor },
];

export function Appearance() {
  const { theme, accent, setTheme, setAccent } = useTheme();
  return (
    <div className="flex flex-col gap-6">
      <fieldset className="flex flex-col gap-2">
        <legend className="pb-1.5 text-sm font-semibold">Theme</legend>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
          {THEMES.map((t) => {
            const on = theme === t.value;
            return (
              <label
                key={t.value}
                className={cn(
                  "flex cursor-pointer flex-col gap-2 rounded-2xl border p-2 transition-all has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-offset-2 has-[:focus-visible]:outline-hl-ink",
                  on ? "border-hl-ink bg-hl-soft glow" : "border-rule bg-surface hover:border-rule-strong",
                )}
              >
                <input type="radio" className="sr-only" name="theme" checked={on} onChange={() => setTheme(t.value)} />
                <span className="relative block h-20 overflow-hidden rounded-xl border border-rule">
                  {t.value === "system" ? (
                    <>
                      <span className="absolute inset-0"><MiniWindow style={LIGHT} /></span>
                      <span className="absolute inset-0" style={{ clipPath: "polygon(100% 0, 100% 100%, 0 100%)" }}>
                        <MiniWindow style={DARK} />
                      </span>
                    </>
                  ) : (
                    <MiniWindow style={t.value === "light" ? LIGHT : DARK} />
                  )}
                </span>
                <span className="flex items-center gap-2 px-1 pb-0.5 text-sm font-semibold">
                  <t.icon className="size-4" aria-hidden /> {t.label}
                  {on && <Check className="ml-auto size-4" strokeWidth={3} aria-hidden />}
                </span>
              </label>
            );
          })}
        </div>
      </fieldset>

      <fieldset className="flex flex-col gap-2">
        <legend className="pb-1.5 text-sm font-semibold">Highlighter color</legend>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          {ACCENTS.map((a) => {
            const on = accent === a.id;
            return (
              <label
                key={a.id}
                className={cn(
                  "flex min-h-11 cursor-pointer flex-col items-center gap-2 rounded-2xl border p-3 text-sm transition-all has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-offset-2 has-[:focus-visible]:outline-hl-ink",
                  on ? "border-hl-ink bg-hl-soft font-semibold glow" : "border-rule bg-surface hover:border-rule-strong",
                )}
              >
                <input type="radio" className="sr-only" name="accent" checked={on} onChange={() => setAccent(a.id)} />
                <span
                  aria-hidden
                  className="grid size-10 place-items-center rounded-full border border-ink/20"
                  style={{ background: a.hex, boxShadow: on ? `0 0 18px ${a.hex}` : undefined }}
                >
                  {on && <Check className="size-5 text-on-hl" strokeWidth={3} />}
                </span>
                {a.label}
              </label>
            );
          })}
        </div>
      </fieldset>

      <div className="rounded-2xl border border-rule bg-sunken p-4" aria-label="Preview">
        <p className="text-sm text-muted">Live preview</p>
        <p className="mt-1 max-w-prose">
          The highlighter only marks things backed by your resume, like <span className="hl px-0.5">built 14 React and TypeScript screens</span> for the job&apos;s must-have.
        </p>
        <div className="mt-3 flex flex-wrap gap-2">
          <Button variant="primary" size="sm">Primary button</Button>
          <Button size="sm">Secondary</Button>
        </div>
      </div>
    </div>
  );
}
