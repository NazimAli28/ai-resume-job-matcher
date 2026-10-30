import type { Metadata } from "next";
import { OnboardingForm } from "@/components/profile-real/onboarding-form";
import { requireUser } from "@/server/auth/user";
import { getFullProfile } from "@/server/profile/service";

export const metadata: Metadata = { title: "Get started" };

export default async function OnboardingPage() {
  const user = await requireUser();
  const profile = await getFullProfile(user.id);

  return (
    <div className="mx-auto flex max-w-2xl flex-col gap-6">
      <div className="flex flex-col gap-2">
        <h1 className="font-display text-[32px] font-bold leading-tight">Let&apos;s get you started</h1>
        <p className="text-muted">Four quick questions. You can change any of them later.</p>
      </div>
      <section className="card p-6 sm:p-8" aria-label="Your job search">
        <OnboardingForm
          values={{
            targetMarket: profile?.targetMarket ?? "PK_LOCAL",
            targetTitles: profile?.targetTitles ?? [],
            city: profile?.city ?? "",
            headline: profile?.headline ?? "",
          }}
        />
      </section>
    </div>
  );
}
