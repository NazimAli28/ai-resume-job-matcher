import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { ResetForm } from "@/components/auth/forms";
import { currentUserId } from "@/server/auth/user";

export const metadata: Metadata = { title: "Choose a new password" };

export default async function ResetPage() {
  // Reached through the emailed link, which signs the user in for this one step.
  if (!(await currentUserId())) redirect("/login?error=link");
  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="font-display text-[28px] font-bold leading-tight">Choose a new password</h1>
        <p className="text-muted">Saving it signs you out on every other device.</p>
      </div>
      <ResetForm />
    </div>
  );
}
