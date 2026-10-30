"use client";

import { Download, TriangleAlert } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { downloadFile } from "@/components/applications/csv";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/field";
import { Dialog } from "@/components/ui/overlay";
import { useToast } from "@/components/ui/toast";
import { useDemo } from "@/demo/store";

export function DataSection() {
  const { state, dispatch } = useDemo();
  const toast = useToast();
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [typed, setTyped] = useState("");
  const close = () => { setOpen(false); setTyped(""); };

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col items-start gap-2 rounded-2xl border border-rule bg-sunken/50 p-4">
        <h3 className="font-bold">Download my data</h3>
        <p className="max-w-prose text-muted">Everything you have put in, as one JSON file: profile, fact bank, resumes, jobs, applications and practice sessions.</p>
        <Button
          onClick={() => {
            downloadFile("my-data.json", JSON.stringify(state, null, 2), "application/json");
            toast("Downloaded my-data.json");
          }}
        >
          <Download className="size-4" aria-hidden /> Download JSON
        </Button>
      </div>
      <div className="flex flex-col items-start gap-2 rounded-2xl border border-danger/50 bg-warn-soft p-4">
        <h3 className="flex items-center gap-2 font-bold text-danger">
          <TriangleAlert className="size-5" aria-hidden /> Danger zone: delete account
        </h3>
        <p className="max-w-prose text-muted">
          Deleting signs you out right away. You have 7 days to change your mind by signing back in. After that we delete your account and files, and backups are fully gone within 37 days.
        </p>
        <Button variant="danger" onClick={() => setOpen(true)}>Delete my account</Button>
      </div>

      <Dialog
        open={open}
        onClose={close}
        title="Delete your account?"
        footer={
          <>
            <Button onClick={close}>Keep my account</Button>
            <Button
              variant="danger"
              disabled={typed !== "DELETE"}
              onClick={() => {
                dispatch({ type: "RESET" });
                close();
                toast("Demo: account deleted and sample data restored");
                router.push("/demo");
              }}
            >
              Delete everything
            </Button>
          </>
        }
      >
        <div className="flex flex-col gap-3">
          <p>
            You can undo this for 7 days by signing back in. After 7 days your profile, resumes, applications and practice history are deleted for good, and backups are fully purged within 37 days.
          </p>
          <p className="text-sm text-muted">In this demo, deleting just resets the sample data.</p>
          <label htmlFor="del-confirm" className="text-sm font-semibold">Type DELETE to confirm</label>
          <Input id="del-confirm" value={typed} onChange={(e) => setTyped(e.target.value)} autoComplete="off" />
        </div>
      </Dialog>
    </div>
  );
}
