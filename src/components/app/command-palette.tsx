"use client";

import { CornerDownLeft, Search } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";
import { cn } from "@/lib/cn";
import { useDemo } from "@/demo/store";

interface Command {
  id: string;
  label: string;
  hint: string;
  href: string;
}

/** Ctrl/⌘+K quick navigation across pages, jobs, applications and resumes. */
export function CommandPalette({ open, onClose }: { open: boolean; onClose: () => void }) {
  const router = useRouter();
  const { state } = useDemo();
  const [query, setQuery] = useState("");
  const [active, setActive] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);

  const commands = useMemo<Command[]>(
    () => [
      { id: "p-match", label: "Match a job (resume + job description)", hint: "Action", href: "/app/match" },
      { id: "p-dash", label: "Dashboard", hint: "Page", href: "/app" },
      { id: "p-res", label: "Resumes", hint: "Page", href: "/app/resumes" },
      { id: "p-jobs", label: "Jobs", hint: "Page", href: "/app/jobs" },
      { id: "p-apps", label: "Applications", hint: "Page", href: "/app/applications" },
      { id: "p-int", label: "Interviews", hint: "Page", href: "/app/interviews" },
      { id: "p-new", label: "Start a practice interview", hint: "Action", href: "/app/interviews/new" },
      { id: "p-prof", label: "Profile and fact bank", hint: "Page", href: "/app/profile" },
      { id: "p-set", label: "Settings", hint: "Page", href: "/app/settings" },
      ...state.jobs.filter((j) => !j.archived).map((j) => ({ id: `j-${j.id}`, label: `${j.title} at ${j.company}`, hint: "Job", href: `/app/jobs/${j.id}` })),
      ...state.applications.map((a) => ({ id: `a-${a.id}`, label: `${a.company}: ${a.title}`, hint: "Application", href: `/app/applications?open=${a.id}` })),
      ...state.resumes.map((r) => ({ id: `r-${r.id}`, label: `${r.label} ${r.name}`, hint: "Resume", href: `/app/resumes/${r.id}` })),
    ],
    [state.jobs, state.applications, state.resumes],
  );

  const results = useMemo(() => {
    const q = query.trim().toLowerCase();
    return (q ? commands.filter((c) => c.label.toLowerCase().includes(q)) : commands).slice(0, 8);
  }, [commands, query]);

  useEffect(() => {
    if (!open) return;
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setQuery("");
    setActive(0);
    requestAnimationFrame(() => inputRef.current?.focus());
  }, [open]);

  if (!open) return null;

  const go = (c: Command | undefined) => {
    if (!c) return;
    onClose();
    router.push(c.href);
  };

  return (
    <div className="fixed inset-0 z-[70] flex items-start justify-center p-4 pt-[12vh]" onKeyDown={(e) => e.key === "Escape" && onClose()}>
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} aria-hidden />
      <div role="dialog" aria-modal="true" aria-label="Search and jump" className="card relative w-full max-w-xl overflow-hidden">
        <div className="flex items-center gap-3 border-b border-rule px-4">
          <Search className="size-5 text-muted" aria-hidden />
          <input
            ref={inputRef}
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setActive(0);
            }}
            onKeyDown={(e) => {
              if (e.key === "ArrowDown") { e.preventDefault(); setActive((a) => Math.min(a + 1, results.length - 1)); }
              if (e.key === "ArrowUp") { e.preventDefault(); setActive((a) => Math.max(a - 1, 0)); }
              if (e.key === "Enter") go(results[active]);
            }}
            placeholder="Search jobs, applications, resumes or pages"
            aria-label="Search"
            role="combobox"
            aria-expanded="true"
            aria-controls="cmdk-list"
            className="h-14 flex-1 bg-transparent text-base outline-none placeholder:text-muted"
          />
          <kbd className="rounded-md border border-rule px-1.5 text-xs text-muted">Esc</kbd>
        </div>
        <ul id="cmdk-list" role="listbox" className="max-h-80 overflow-y-auto p-2">
          {results.length === 0 && <li className="px-3 py-6 text-center text-sm text-muted">Nothing matches “{query}”.</li>}
          {results.map((c, i) => (
            <li key={c.id} role="option" aria-selected={i === active}>
              <button
                type="button"
                onMouseEnter={() => setActive(i)}
                onClick={() => go(c)}
                className={cn("flex w-full items-center justify-between gap-3 rounded-xl px-3 py-2.5 text-left", i === active ? "bg-hl-soft" : "hover:bg-sunken")}
              >
                <span className="truncate font-semibold">{c.label}</span>
                <span className="flex shrink-0 items-center gap-2 text-xs text-muted">
                  {c.hint}
                  {i === active && <CornerDownLeft className="size-3.5" aria-hidden />}
                </span>
              </button>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
