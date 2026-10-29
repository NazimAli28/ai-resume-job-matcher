"use client";

import { ShieldCheck } from "lucide-react";
import { useStoredBool } from "@/components/applications/use-stored-state";
import { useToast } from "@/components/ui/toast";
import { Switch } from "./switch";

export function Privacy() {
  const toast = useToast();
  const [training, setTraining] = useStoredBool("arw-consent-training", false);
  const [noAnalytics, setNoAnalytics] = useStoredBool("arw-analytics-optout", false);
  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-col divide-y divide-rule rounded-2xl border border-rule px-4">
        <Switch
          id="training"
          label="Allow anonymized data to improve our models"
          checked={training}
          onChange={(v) => {
            setTraining(v);
            toast(v ? "Thanks. You can turn this off anytime." : "Turned off. Nothing of yours is used to improve models.");
          }}
          description="Off by default. If you turn it on, we may use text from your resume and practice answers after removing your name, contact details and other identifiers. We do not use it for anything else, and you can turn it off and ask us to remove it anytime."
        />
        <Switch
          id="analytics"
          label="Opt out of product analytics"
          checked={noAnalytics}
          onChange={(v) => {
            setNoAnalytics(v);
            toast(v ? "Analytics turned off" : "Analytics turned on");
          }}
          description="We count which features are used to fix what is broken. We never record your resume or interview content, and opting out changes nothing about how the app works."
        />
      </div>
      <div className="rounded-2xl border border-rule bg-sunken p-4">
        <h3 className="flex items-center gap-2 font-bold">
          <span className="grid size-8 place-items-center rounded-lg bg-hl-soft text-hl-ink"><ShieldCheck className="size-4" aria-hidden /></span>
          What we send to AI
        </h3>
        <p className="mt-1 text-muted">
          Before any text goes to the AI model, we replace your CNIC, phone numbers, email addresses and street address with placeholders such as [PHONE]. The AI sees the rest of your resume and the job description, and it has no tools to do anything else. Scores are calculated by our own code, not by the AI.
        </p>
        <p className="mt-2 text-sm text-muted">In this demo no real AI is called; the screens show sample results.</p>
      </div>
    </div>
  );
}
