"use client";

import { Download, Trash2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { deleteResume, downloadOriginal } from "@/app/app/resumes/actions";
import { FormAlert } from "@/components/auth/auth-ui";
import { Button } from "@/components/ui/button";

export function VersionActions({ versionId, canDownload }: { versionId: string; canDownload: boolean }) {
  const router = useRouter();
  const [busy, setBusy] = useState<"" | "download" | "delete">("");
  const [confirming, setConfirming] = useState(false);
  const [error, setError] = useState("");

  async function download() {
    setBusy("download");
    setError("");
    try {
      const r = await downloadOriginal(versionId);
      if (r.ok) window.location.href = r.url;
      else setError(r.error);
    } catch {
      setError("Something went wrong. Please try again.");
    }
    setBusy("");
  }

  async function remove() {
    setBusy("delete");
    setError("");
    try {
      const r = await deleteResume(versionId);
      if (r.ok) {
        router.push("/app/resumes");
        return;
      }
      setError(r.error);
    } catch {
      setError("Something went wrong. Please try again.");
    }
    setBusy("");
    setConfirming(false);
  }

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-wrap items-center gap-2">
        {canDownload && (
          <Button disabled={busy !== ""} onClick={download}>
            <Download className="size-4" aria-hidden />
            {busy === "download" ? "Preparing..." : "Download original"}
          </Button>
        )}
        {confirming ? (
          <>
            <Button variant="danger" disabled={busy !== ""} onClick={remove}>
              <Trash2 className="size-4" aria-hidden />
              {busy === "delete" ? "Deleting..." : "Yes, delete permanently"}
            </Button>
            <Button variant="ghost" disabled={busy !== ""} onClick={() => setConfirming(false)}>
              Cancel
            </Button>
          </>
        ) : (
          <Button variant="danger" disabled={busy !== ""} onClick={() => setConfirming(true)}>
            <Trash2 className="size-4" aria-hidden />
            Delete
          </Button>
        )}
      </div>
      {confirming && (
        <p role="status" className="text-sm text-muted">
          This removes this version and its stored file. It can&apos;t be undone.
        </p>
      )}
      {error && <FormAlert>{error}</FormAlert>}
    </div>
  );
}
