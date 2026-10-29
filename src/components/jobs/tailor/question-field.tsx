import { Input } from "@/components/ui/field";
import type { Suggestion } from "@/demo/types";

/** Input for a QUESTION suggestion: the real value must come from the user, never from us. */
export function QuestionField({ s, value, onChange }: { s: Suggestion; value: string; onChange: (v: string) => void }) {
  const id = `ans-${s.id}`;
  return (
    <div className="flex flex-col gap-1.5">
      <label htmlFor={id} className="text-sm font-semibold">{s.question ?? "What's the real value?"}</label>
      <Input id={id} value={value} onChange={(e) => onChange(e.target.value)} placeholder="Type the real answer" />
    </div>
  );
}
