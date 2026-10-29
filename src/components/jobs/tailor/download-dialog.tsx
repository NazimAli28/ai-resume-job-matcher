"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Segmented } from "@/components/ui/field";
import { Dialog } from "@/components/ui/overlay";
import { downloadText } from "../lib/browser";

type Format = "PDF" | "DOCX";

export function DownloadDialog({ open, onClose, fileBase, text, pendingQuestions, hadCnic }: { open: boolean; onClose: () => void; fileBase: string; text: string; pendingQuestions: number; hadCnic: boolean }) {
  const [format, setFormat] = useState<Format>("PDF");
  return (
    <Dialog
      open={open}
      onClose={onClose}
      title="Download your tailored resume"
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>Cancel</Button>
          <Button
            variant="primary"
            onClick={() => {
              downloadText(`${fileBase}.txt`, text);
              onClose();
            }}
          >
            Download demo .txt
          </Button>
        </>
      }
    >
      <div className="flex flex-col gap-4">
        <Segmented<Format>
          name="dl-format"
          legend="Format"
          value={format}
          onChange={setFormat}
          options={[
            { value: "PDF", label: "PDF", hint: "Best for most applications" },
            { value: "DOCX", label: "Word (DOCX)", hint: "If the employer asks for Word" },
          ]}
        />
        <p className="rounded-[var(--radius-md)] bg-sunken p-3 text-sm">
          This demo can&apos;t make real {format} files yet, so it downloads a plain .txt with the same text. The full app exports a single-column,
          ATS-safe {format}.
        </p>
        {pendingQuestions > 0 && (
          <p className="text-sm text-warn">
            {pendingQuestions} {pendingQuestions === 1 ? "question still needs" : "questions still need"} your answer. Those lines keep your original wording.
          </p>
        )}
        {hadCnic && <p className="text-sm text-muted">Your CNIC line is left out of the file.</p>}
      </div>
    </Dialog>
  );
}
