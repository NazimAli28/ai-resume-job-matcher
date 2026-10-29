import { AlertTriangle, Quote } from "lucide-react";
import { Chip } from "@/components/ui/chip";
import type { Suggestion } from "@/demo/types";

export const KIND_LABEL: Record<Suggestion["kind"], string> = {
  REWRITE: "Rewrite",
  KEYWORD: "Job's wording",
  REORDER: "New order",
  SUMMARY: "Summary",
  QUESTION: "Needs your input",
};

export function EvidenceChip({ s }: { s: Suggestion }) {
  if (!s.evidence) return <Chip className="border border-dashed border-rule-strong text-muted">Waiting for your answer</Chip>;
  return (
    <span className="inline-flex max-w-full flex-wrap items-baseline gap-x-1.5 text-sm">
      <Chip className="bg-hl-soft text-hl-ink">
        <Quote className="size-3.5" aria-hidden />
        Based on your {s.evidence.section}
      </Chip>
      <span className="text-muted">“{s.evidence.text}”</span>
    </span>
  );
}

export function ClaimWarning() {
  return (
    <Chip className="bg-warn-soft text-warn">
      <AlertTriangle className="size-3.5" aria-hidden />
      Adds a claim — accept only if true
    </Chip>
  );
}

export function SuggestionMeta({ s }: { s: Suggestion }) {
  return (
    <div className="flex flex-wrap items-center gap-2">
      <span className="text-sm font-semibold">{KIND_LABEL[s.kind]}</span>
      {!s.safe && <ClaimWarning />}
    </div>
  );
}
