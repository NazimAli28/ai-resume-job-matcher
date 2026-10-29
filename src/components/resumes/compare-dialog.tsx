"use client";

import { Button } from "@/components/ui/button";
import { Select } from "@/components/ui/field";
import { Dialog } from "@/components/ui/overlay";
import type { ResumeVersion } from "@/demo/types";
import { cn } from "@/lib/cn";

function Delta({ n }: { n: number }) {
  if (n === 0) return <span className="text-muted">No change</span>;
  return <span className={cn("font-semibold", n < 0 && "text-warn")}>{n > 0 ? `+${n}` : n}</span>;
}

function rowsFor(current: ResumeVersion, other: ResumeVersion) {
  const rows: { label: string; other: number; current: number }[] = [
    { label: "Parse health", other: other.parseHealth, current: current.parseHealth },
    { label: "Readability", other: other.readability, current: current.readability },
  ];
  for (const [a, b] of [
    [current.parseBreakdown, other.parseBreakdown],
    [current.readabilityBreakdown, other.readabilityBreakdown],
  ] as const) {
    for (const r of a) {
      const o = b.find((x) => x.label === r.label);
      if (o) rows.push({ label: r.label, other: o.value, current: r.value });
    }
  }
  return rows;
}

export function CompareDialog({
  open,
  onClose,
  current,
  others,
  otherId,
  onOtherChange,
}: {
  open: boolean;
  onClose: () => void;
  current: ResumeVersion;
  others: ResumeVersion[];
  otherId: string;
  onOtherChange: (id: string) => void;
}) {
  const other = others.find((o) => o.id === otherId) ?? others[0];
  if (!other) return null;
  const rows = rowsFor(current, other);
  const open1 = (v: ResumeVersion) => v.findings.filter((f) => !f.resolved).length;

  return (
    <Dialog
      open={open}
      onClose={onClose}
      title={`Compare ${current.label} with ${other.label}`}
      footer={<Button onClick={onClose}>Close</Button>}
    >
      <div className="flex flex-col gap-4">
        <div className="flex items-center gap-2">
          <label htmlFor="cmp" className="text-sm font-semibold">
            Compare with
          </label>
          <Select id="cmp" className="w-auto" value={other.id} onChange={(e) => onOtherChange(e.target.value)}>
            {others.map((o) => (
              <option key={o.id} value={o.id}>
                {o.label} {o.name}
              </option>
            ))}
          </Select>
        </div>
        <table className="w-full text-left text-sm">
          <caption className="sr-only">Score change per check</caption>
          <thead>
            <tr className="border-b border-rule text-muted">
              <th scope="col" className="py-2 pr-2 font-semibold">Check</th>
              <th scope="col" className="px-2 py-2 text-right font-semibold">{other.label}</th>
              <th scope="col" className="px-2 py-2 text-right font-semibold">{current.label}</th>
              <th scope="col" className="py-2 pl-2 text-right font-semibold">Change</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r, i) => (
              <tr key={r.label} className={cn("border-b border-rule", i < 2 && "font-semibold")}>
                <th scope="row" className="py-2 pr-2 font-[inherit]">{r.label}</th>
                <td className="px-2 py-2 text-right tabular-nums">{r.other}</td>
                <td className="px-2 py-2 text-right tabular-nums">{r.current}</td>
                <td className="py-2 pl-2 text-right tabular-nums">
                  <Delta n={r.current - r.other} />
                </td>
              </tr>
            ))}
            <tr>
              <th scope="row" className="py-2 pr-2 font-[inherit]">Open findings</th>
              <td className="px-2 py-2 text-right tabular-nums">{open1(other)}</td>
              <td className="px-2 py-2 text-right tabular-nums">{open1(current)}</td>
              <td className="py-2 pl-2 text-right tabular-nums">
                <Delta n={open1(current) - open1(other)} />
              </td>
            </tr>
          </tbody>
        </table>
        <p className="text-sm text-muted">Scores are estimates. A higher number means fewer reading and parsing problems, not a better candidate.</p>
      </div>
    </Dialog>
  );
}
