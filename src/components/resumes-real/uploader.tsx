"use client";

import { Check, FileText, Loader2, ShieldCheck, Upload } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useRef, useState, type DragEvent } from "react";
import { finishUpload, startUpload } from "@/app/app/resumes/actions";
import { FormAlert } from "@/components/auth/auth-ui";
import { Button } from "@/components/ui/button";
import { supabaseBrowser } from "@/lib/supabase/browser";
import { cn } from "@/lib/cn";

type Phase = "idle" | "uploading" | "analyzing";

const CONSENT_TEXT =
  "I understand resumes can include sensitive details (like health or religion). I consent to this service processing my resume to give me feedback. Personal details are masked before any AI step.";

function precheck(f: File, maxBytes: number): string | null {
  if (!/\.(pdf|docx)$/i.test(f.name)) return "Only PDF and Word (.docx) files are supported. Older .doc files: open in Word and save as .docx.";
  if (f.size <= 0) return "That file is empty.";
  if (f.size > maxBytes) return "That file is over 5 MB. Export a smaller PDF or Word file and try again.";
  return null;
}

function Step({ state, children }: { state: "todo" | "active" | "done"; children: React.ReactNode }) {
  return (
    <li className={cn("flex items-center gap-3", state === "todo" && "text-muted")}>
      <span
        className={cn(
          "flex size-7 shrink-0 items-center justify-center rounded-full border-2",
          state === "done" ? "border-hl-ink bg-hl text-on-hl" : state === "active" ? "border-hl-ink bg-surface" : "border-rule bg-surface",
        )}
      >
        {state === "done" ? (
          <Check className="size-3.5" strokeWidth={3} aria-hidden />
        ) : state === "active" ? (
          <Loader2 className="size-3.5 animate-spin motion-reduce:animate-none" aria-hidden />
        ) : null}
      </span>
      <span className={cn(state === "active" && "font-semibold")}>
        {children}
        {state === "done" && <span className="sr-only"> (done)</span>}
      </span>
    </li>
  );
}

export function Uploader({
  used,
  limit,
  needsConsent,
  maxBytes,
  maxPages,
}: {
  used: number;
  limit: number;
  needsConsent: boolean;
  maxBytes: number;
  maxPages: number;
}) {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const [file, setFile] = useState<File | null>(null);
  const [consent, setConsent] = useState(false);
  const [phase, setPhase] = useState<Phase>("idle");
  const [error, setError] = useState("");
  const [over, setOver] = useState(false);

  const running = phase !== "idle";
  const outOfQuota = used >= limit;

  const pick = (f: File | undefined) => {
    if (!f || running) return;
    const problem = precheck(f, maxBytes);
    if (problem) {
      setFile(null);
      setError(problem);
      return;
    }
    setError("");
    setFile(f);
  };

  const onDrop = (e: DragEvent) => {
    e.preventDefault();
    setOver(false);
    pick(e.dataTransfer.files[0]);
  };

  const canStart = !!file && !running && !outOfQuota && (!needsConsent || consent);

  async function run() {
    if (!file || !canStart) return;
    setError("");
    setPhase("uploading");
    try {
      const started = await startUpload({ name: file.name, size: file.size, consent: needsConsent ? consent : true });
      if (!started.ok) {
        setError(started.error);
        setPhase("idle");
        return;
      }
      const { error: upErr } = await supabaseBrowser()
        .storage.from("resumes")
        .uploadToSignedUrl(started.path, started.token, file, { contentType: file.type || undefined });
      if (upErr) {
        setError("The upload didn't go through. Check your connection and try again.");
        setPhase("idle");
        return;
      }
      setPhase("analyzing");
      const done = await finishUpload(started.uploadId);
      if (!done.ok) {
        setError(done.error);
        setPhase("idle");
        return;
      }
      router.push(`/app/resumes/${done.versionId}`);
    } catch {
      setError("Something went wrong. Please try again.");
      setPhase("idle");
    }
  }

  const status =
    phase === "uploading"
      ? "Uploading securely."
      : phase === "analyzing"
        ? "Checking the file, reading the text and running checks."
        : "";

  return (
    <div className="flex flex-col gap-4">
      <div
        onDragOver={(e) => {
          e.preventDefault();
          if (!running) setOver(true);
        }}
        onDragLeave={() => setOver(false)}
        onDrop={onDrop}
        className={cn(
          "flex flex-col items-start gap-2 rounded-[20px] border-2 border-dashed p-5 transition-colors",
          file ? "border-hl-ink bg-hl-soft/60" : "border-rule-strong bg-surface/60",
          over && "border-hl-ink bg-hl-soft",
        )}
      >
        <span className="relative mb-1 grid size-12 place-items-center" aria-hidden>
          <FileText className="absolute size-9 text-muted/50" style={{ transform: "translate(-8px, 2px) rotate(-12deg)" }} />
          <span className="relative grid size-10 place-items-center rounded-xl bg-ink text-paper">
            <Upload className="size-5" />
          </span>
        </span>
        <span className="break-all font-display text-base font-bold">{file ? file.name : "Drop your resume here"}</span>
        <span className="text-sm text-muted">PDF or DOCX, up to {Math.round(maxBytes / (1024 * 1024))} MB and {maxPages} pages. You can also drop it here.</span>
        <input
          ref={inputRef}
          type="file"
          accept=".pdf,.docx,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
          className="sr-only"
          tabIndex={-1}
          aria-label="Resume file (PDF or DOCX)"
          disabled={running}
          onChange={(e) => {
            pick(e.target.files?.[0]);
            e.target.value = "";
          }}
        />
        <Button className="mt-1" disabled={running} onClick={() => inputRef.current?.click()}>
          {file ? "Choose a different file" : "Choose a file"}
        </Button>
      </div>

      {needsConsent && (
        <label className="flex min-h-11 cursor-pointer items-start gap-3 text-sm">
          <input
            type="checkbox"
            checked={consent}
            disabled={running}
            onChange={(e) => setConsent(e.target.checked)}
            className="mt-0.5 size-5 shrink-0 accent-[var(--hl-ink)]"
          />
          <span>
            {CONSENT_TEXT}{" "}
            <Link href="/legal/privacy" target="_blank" className="font-semibold underline underline-offset-2">
              Privacy policy
            </Link>
          </span>
        </label>
      )}

      <p className="flex items-start gap-2.5 text-sm text-muted">
        <ShieldCheck className="mt-0.5 size-4 shrink-0 text-hl-ink" aria-hidden />
        <span>
          {used} of {limit} free analyses used this month.
          {outOfQuota && " They reset on the 1st."}
        </span>
      </p>

      <div className="sr-only" role="status" aria-live="polite">
        {status}
      </div>
      {error && <FormAlert>{error}</FormAlert>}

      {running && (
        <ol className="flex flex-col gap-3 rounded-xl bg-sunken p-4 text-sm" aria-label="Progress">
          <Step state={phase === "uploading" ? "active" : "done"}>Uploading securely</Step>
          <Step state={phase === "analyzing" ? "active" : "todo"}>Checking the file</Step>
          <Step state={phase === "analyzing" ? "active" : "todo"}>Reading the text</Step>
          <Step state={phase === "analyzing" ? "active" : "todo"}>Running 30+ checks</Step>
        </ol>
      )}

      <div>
        <Button variant="primary" size="lg" disabled={!canStart} onClick={run}>
          {running ? "Working..." : "Check my resume"}
        </Button>
      </div>
    </div>
  );
}
