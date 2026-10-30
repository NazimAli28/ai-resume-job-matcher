"use client";

import { Plus } from "lucide-react";
import { useState, type ReactNode } from "react";
import type { ActionState } from "@/app/app/profile/actions";
import { Button } from "@/components/ui/button";
import { DeleteButton } from "./delete-button";
import type { Err } from "./fields";
import { ItemForm } from "./item-form";

type Action = (prev: ActionState, form: FormData) => Promise<ActionState>;

export type CrudItem<V> = {
  id: string;
  /** Screen-reader name, e.g. "role Engineer at Acme". */
  label: string;
  view: ReactNode;
  values: V;
};

/** A list of items with inline edit, two-step delete and an "add" form. */
export function CrudList<V>({
  items,
  save,
  del,
  addLabel,
  empty,
  fields,
}: {
  items: CrudItem<V>[];
  save: Action;
  del: Action;
  addLabel: string;
  empty: string;
  fields: (values: V | null, err: Err) => ReactNode;
}) {
  const [editing, setEditing] = useState<string | null>(null);
  const [adding, setAdding] = useState(false);

  return (
    <div className="flex flex-col gap-4">
      {items.length === 0 && !adding && <p className="text-sm text-muted">{empty}</p>}
      {items.length > 0 && (
        <ul className="flex flex-col gap-3">
          {items.map((it) => (
            <li key={it.id} className="rounded-2xl border border-rule p-4">
              {editing === it.id ? (
                <ItemForm action={save} id={it.id} submitLabel="Save changes" onDone={() => setEditing(null)} onCancel={() => setEditing(null)}>
                  {(err) => fields(it.values, err)}
                </ItemForm>
              ) : (
                <div className="flex flex-col gap-3">
                  {it.view}
                  <div className="flex flex-wrap gap-2">
                    <Button
                      aria-label={`Edit ${it.label}`}
                      onClick={() => {
                        setEditing(it.id);
                        setAdding(false);
                      }}
                    >
                      Edit
                    </Button>
                    <DeleteButton action={del} id={it.id} what={it.label} />
                  </div>
                </div>
              )}
            </li>
          ))}
        </ul>
      )}
      {adding ? (
        <div className="rounded-2xl border border-rule bg-sunken/40 p-4">
          <ItemForm action={save} submitLabel={addLabel} onDone={() => setAdding(false)} onCancel={() => setAdding(false)}>
            {(err) => fields(null, err)}
          </ItemForm>
        </div>
      ) : (
        <div>
          <Button
            onClick={() => {
              setAdding(true);
              setEditing(null);
            }}
          >
            <Plus className="size-4" aria-hidden /> {addLabel}
          </Button>
        </div>
      )}
    </div>
  );
}
