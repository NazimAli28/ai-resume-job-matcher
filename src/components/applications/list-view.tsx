"use client";

import { ArrowDown, ArrowUp } from "lucide-react";
import Link from "next/link";
import { useMemo, useState } from "react";
import { StatusChip } from "@/components/ui/chip";
import { cn } from "@/lib/cn";
import { formatDate } from "@/lib/dates";
import { SOURCE_LABEL } from "@/demo/labels";
import { useDemo } from "@/demo/store";
import type { Application } from "@/demo/types";
import { ALL_STATUSES, isOverdue } from "./helpers";
import { InitialTile } from "./tile";

type Key = "company" | "title" | "status" | "source" | "applied" | "updated" | "next";

const COLS: { key: Key; label: string }[] = [
  { key: "company", label: "Company" },
  { key: "title", label: "Role" },
  { key: "status", label: "Status" },
  { key: "source", label: "Source" },
  { key: "applied", label: "Applied" },
  { key: "updated", label: "Updated" },
  { key: "next", label: "Next action" },
];

function sortValue(a: Application, k: Key): string | number {
  switch (k) {
    case "company": return a.company.toLowerCase();
    case "title": return a.title.toLowerCase();
    case "status": return ALL_STATUSES.indexOf(a.status);
    case "source": return SOURCE_LABEL[a.source];
    case "applied": return a.appliedAt ?? "";
    case "updated": return a.updatedAt;
    case "next": return a.nextAction?.due ?? "9999";
  }
}

export function ListView({ apps, onOpen }: { apps: Application[]; onOpen: (id: string) => void }) {
  const { resumeById } = useDemo();
  const [sort, setSort] = useState<{ key: Key; dir: 1 | -1 }>({ key: "updated", dir: -1 });
  const rows = useMemo(
    () =>
      [...apps].sort((a, b) => {
        const x = sortValue(a, sort.key);
        const y = sortValue(b, sort.key);
        return (x < y ? -1 : x > y ? 1 : 0) * sort.dir;
      }),
    [apps, sort],
  );

  return (
    <div
      className="card overflow-x-auto"
      tabIndex={0}
      role="region"
      aria-label="Applications table, scrolls sideways on small screens"
    >
      <table className="w-full min-w-[860px] border-collapse text-left text-[15px]">
        <thead>
          <tr className="border-b border-rule bg-sunken/60">
            {COLS.map((c) => {
              const on = sort.key === c.key;
              return (
                <th key={c.key} scope="col" aria-sort={on ? (sort.dir === 1 ? "ascending" : "descending") : "none"} className="p-0 font-semibold">
                  <button
                    type="button"
                    onClick={() => setSort({ key: c.key, dir: on && sort.dir === 1 ? -1 : 1 })}
                    className="flex min-h-11 w-full items-center gap-1 px-3 text-left hover:bg-sunken"
                  >
                    {c.label}
                    {on && (sort.dir === 1 ? <ArrowUp className="size-4" aria-hidden /> : <ArrowDown className="size-4" aria-hidden />)}
                  </button>
                </th>
              );
            })}
            <th scope="col" className="px-3 font-semibold">Resume</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((a) => {
            const r = resumeById(a.resumeVersionId);
            return (
              <tr key={a.id} className="border-b border-rule transition-colors last:border-0 hover:bg-hl-soft/50">
                <td className="py-2 pl-3 pr-1">
                  <button type="button" onClick={() => onOpen(a.id)} className="flex min-h-11 items-center gap-3 pr-3 text-left font-semibold hover:underline">
                    <InitialTile name={a.company} size={36} />
                    {a.company}
                  </button>
                </td>
                <td className="px-3 font-medium">{a.title}</td>
                <td className="px-3"><StatusChip value={a.status} /></td>
                <td className="px-3 text-muted">{SOURCE_LABEL[a.source]}</td>
                <td className="px-3 text-muted">{a.appliedAt ? formatDate(a.appliedAt) : "Not yet"}</td>
                <td className="px-3 text-muted">{formatDate(a.updatedAt)}</td>
                <td className={cn("px-3", isOverdue(a) ? "font-semibold text-warn" : "text-muted")}>
                  {a.nextAction ? `${a.nextAction.label}, ${formatDate(a.nextAction.due)}` : "None"}
                </td>
                <td className="px-3">
                  {r && (
                    <Link href={`/app/resumes/${r.id}`} className="font-semibold underline-offset-4 hover:underline">
                      {r.label}
                    </Link>
                  )}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
