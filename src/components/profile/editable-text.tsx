"use client";

import { Pencil } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input, Textarea } from "@/components/ui/field";

/** Click "Edit" to change text in place; Save commits, Cancel discards. */
export function EditableText({
  value,
  onSave,
  label,
  multiline,
  placeholder,
  className,
}: {
  value: string;
  onSave: (v: string) => void;
  label: string;
  multiline?: boolean;
  placeholder?: string;
  className?: string;
}) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(value);

  if (!editing) {
    return (
      <div className="flex items-start gap-2">
        <p className={className ?? "flex-1"}>{value || <span className="text-muted">{placeholder ?? "Nothing yet"}</span>}</p>
        <button
          type="button"
          aria-label={`Edit ${label}`}
          onClick={() => { setDraft(value); setEditing(true); }}
          className="grid size-11 shrink-0 place-items-center rounded-xl text-muted hover:bg-sunken hover:text-ink"
        >
          <Pencil className="size-4" aria-hidden />
        </button>
      </div>
    );
  }
  const commit = () => {
    const v = draft.trim();
    if (v && v !== value) onSave(v);
    setEditing(false);
  };
  return (
    <form onSubmit={(e) => { e.preventDefault(); commit(); }} className="flex flex-col gap-2">
      {multiline ? (
        <Textarea aria-label={label} value={draft} onChange={(e) => setDraft(e.target.value)} className="min-h-24" autoFocus />
      ) : (
        <Input aria-label={label} value={draft} onChange={(e) => setDraft(e.target.value)} autoFocus />
      )}
      <div className="flex gap-2">
        <Button type="submit" variant="primary" size="sm">Save</Button>
        <Button size="sm" onClick={() => setEditing(false)}>Cancel</Button>
      </div>
    </form>
  );
}
