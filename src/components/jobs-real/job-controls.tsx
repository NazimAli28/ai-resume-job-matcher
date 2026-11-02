"use client";

import { Trash2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { addRequirementAction, deleteJobAction } from "@/app/app/jobs/actions";
import { FormAlert } from "@/components/auth/auth-ui";
import { Button } from "@/components/ui/button";
import { Input, Select } from "@/components/ui/field";

export function ResumePicker({ jobId, value, versions }: { jobId: string; value: string; versions: { id: string; label: string; name: string }[] }) {
  const router = useRouter();
  return (
    <div className="flex flex-col gap-1.5">
      <label htmlFor="pick-resume" className="text-sm font-semibold">Compared with</label>
      <Select id="pick-resume" value={value} onChange={(e) => router.push(`/app/jobs/${jobId}?resume=${e.target.value}`)}>
        {versions.map((v) => (
          <option key={v.id} value={v.id}>
            {v.label} · {v.name}
          </option>
        ))}
      </Select>
    </div>
  );
}

export function AddRequirement({ jobId }: { jobId: string }) {
  const [text, setText] = useState("");
  const [priority, setPriority] = useState<"MUST_HAVE" | "NICE_TO_HAVE">("MUST_HAVE");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  return (
    <form
      className="flex flex-col gap-3 border-t border-rule pt-4"
      onSubmit={async (e) => {
        e.preventDefault();
        setBusy(true);
        setError("");
        try {
          const r = await addRequirementAction(jobId, { text, priority });
          if (r.ok) setText("");
          else setError(r.error);
        } catch {
          setError("Something went wrong. Please try again.");
        }
        setBusy(false);
      }}
    >
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
        <div className="flex min-w-0 flex-1 flex-col gap-1.5">
          <label htmlFor="add-req" className="text-sm font-semibold">Did we miss a requirement?</label>
          <Input id="add-req" maxLength={200} required value={text} onChange={(e) => setText(e.target.value)} placeholder="e.g. Docker" />
        </div>
        <div className="flex flex-col gap-1.5">
          <label htmlFor="add-pri" className="text-sm font-semibold">Priority</label>
          <Select id="add-pri" value={priority} onChange={(e) => setPriority(e.target.value as typeof priority)}>
            <option value="MUST_HAVE">Must have</option>
            <option value="NICE_TO_HAVE">Nice to have</option>
          </Select>
        </div>
        <Button type="submit" disabled={busy}>Add</Button>
      </div>
      {error && <FormAlert>{error}</FormAlert>}
    </form>
  );
}

export function DeleteJob({ jobId }: { jobId: string }) {
  const router = useRouter();
  const [confirming, setConfirming] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function remove() {
    setBusy(true);
    setError("");
    try {
      const r = await deleteJobAction(jobId);
      if (r.ok) {
        router.push("/app/jobs");
        return;
      }
      setError(r.error);
    } catch {
      setError("Something went wrong. Please try again.");
    }
    setBusy(false);
  }

  return (
    <div className="flex flex-col gap-2">
      {confirming ? (
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-sm">Delete this job and its results?</span>
          <Button variant="danger" size="sm" disabled={busy} onClick={remove}>Delete</Button>
          <Button variant="ghost" size="sm" disabled={busy} onClick={() => setConfirming(false)}>Keep it</Button>
        </div>
      ) : (
        <Button variant="danger" size="sm" onClick={() => setConfirming(true)}>
          <Trash2 className="size-4" aria-hidden /> Delete job
        </Button>
      )}
      {error && <FormAlert>{error}</FormAlert>}
    </div>
  );
}
