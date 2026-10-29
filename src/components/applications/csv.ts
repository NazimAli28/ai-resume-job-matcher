import { SOURCE_LABEL } from "@/demo/labels";
import type { Application, ResumeVersion } from "@/demo/types";
import { STATUS_LABEL } from "@/components/ui/chip";

function cell(value: string): string {
  // Neutralize spreadsheet formulas, then quote.
  const safe = /^[=+\-@\t\r]/.test(value) ? `'${value}` : value;
  return `"${safe.replace(/"/g, '""')}"`;
}

export function applicationsToCsv(apps: Application[], resumes: ResumeVersion[]): string {
  const head = ["Company", "Title", "Status", "Source", "Applied", "Last update", "Next action", "Next action due", "Salary", "Resume version", "Tags", "Notes"];
  const rows = apps.map((a) => [
    a.company,
    a.title,
    STATUS_LABEL[a.status],
    SOURCE_LABEL[a.source],
    a.appliedAt ?? "",
    a.updatedAt,
    a.nextAction?.label ?? "",
    a.nextAction?.due ?? "",
    a.salary ?? "",
    resumes.find((r) => r.id === a.resumeVersionId)?.label ?? "",
    a.tags.join("; "),
    a.notes,
  ]);
  return [head, ...rows].map((r) => r.map(cell).join(",")).join("\r\n");
}

export function downloadFile(name: string, content: string, type: string) {
  const url = URL.createObjectURL(new Blob([content], { type }));
  const a = document.createElement("a");
  a.href = url;
  a.download = name;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}
