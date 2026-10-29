"use client";

import { useStoredBool } from "@/components/applications/use-stored-state";
import { Switch } from "./switch";

export function Notifications() {
  const [followUps, setFollowUps] = useStoredBool("arw-notify-followups", true);
  const [interviews, setInterviews] = useStoredBool("arw-notify-interviews", true);
  return (
    <div className="flex flex-col divide-y divide-rule rounded-2xl border border-rule px-4">
      <Switch id="n-follow" label="Follow-up reminders" description="An email when a follow-up you set is due." checked={followUps} onChange={setFollowUps} />
      <Switch id="n-int" label="Interview reminders" description="An email a day before and an hour before a scheduled round." checked={interviews} onChange={setInterviews} />
      <Switch id="n-week" label="Weekly digest" description="Coming later. A Monday summary of what needs attention." checked={false} onChange={() => {}} disabled />
      <p className="py-3 text-sm text-muted">Security emails, like sign-in alerts and account deletion notices, cannot be turned off.</p>
    </div>
  );
}
