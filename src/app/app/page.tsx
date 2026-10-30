import { CheckCircle2, MailWarning, PlayCircle } from "lucide-react";
import type { Metadata } from "next";
import { signOut } from "@/app/(auth)/actions";
import { FormAlert } from "@/components/auth/auth-ui";
import { ButtonLink } from "@/components/ui/button";
import { requireUser } from "@/server/auth/user";
import { db } from "@/server/db";

export const metadata: Metadata = { title: "Home" };

/** First step of the real app: the profile everything else draws on. */
async function ProfileStep({ userId }: { userId: string }) {
  const p = await db.profile.findUnique({
    where: { userId },
    select: { onboardedAt: true, _count: { select: { skills: true, experiences: true, facts: true } } },
  });
  const started = Boolean(p?.onboardedAt);
  const c = p?._count ?? { skills: 0, experiences: 0, facts: 0 };
  const items = [
    { label: "Target market and roles", done: started },
    { label: "At least one role", done: c.experiences > 0 },
    { label: "Your key skills", done: c.skills >= 3 },
    { label: "One confirmed fact in your evidence bank", done: c.facts > 0 },
  ];
  const doneCount = items.filter((i) => i.done).length;
  return (
    <section className="card flex flex-col gap-4 p-6" aria-labelledby="profile-step-h">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 id="profile-step-h" className="font-display text-lg font-bold">
            Step 1: your profile
          </h2>
          <p className="text-sm text-muted">Suggestions may only use what&apos;s here and in your resume, so a few minutes now pays off.</p>
        </div>
        <span className="rounded-full bg-sunken px-3 py-1 text-sm font-semibold tabular-nums">
          {doneCount} of {items.length}
        </span>
      </div>
      <ul className="grid gap-2 sm:grid-cols-2">
        {items.map((i) => (
          <li key={i.label} className="flex items-center gap-2 text-sm">
            <CheckCircle2 className={i.done ? "size-4 text-hl-ink" : "size-4 text-rule-strong"} aria-hidden />
            <span className={i.done ? "" : "text-muted"}>{i.label}</span>
            <span className="sr-only">{i.done ? "(done)" : "(to do)"}</span>
          </li>
        ))}
      </ul>
      <div>
        <ButtonLink href={started ? "/app/profile" : "/app/onboarding"} variant={doneCount === items.length ? "secondary" : "primary"}>
          {started ? (doneCount === items.length ? "Review your profile" : "Continue your profile") : "Set up your profile"}
        </ButtonLink>
      </div>
    </section>
  );
}

export default async function AppHome({ searchParams }: PageProps<"/app">) {
  const user = await requireUser();
  const sp = await searchParams;
  const first = user.name?.split(" ")[0];

  return (
    <div className="flex flex-col gap-6">
      {sp.password === "updated" && <FormAlert tone="ok">Your password was updated. Other devices have been signed out.</FormAlert>}

      <section className="card relative overflow-hidden p-6 sm:p-8">
        <div aria-hidden className="pointer-events-none absolute -right-16 -top-20 size-64 rounded-full blur-3xl" style={{ background: "rgb(var(--hl-rgb) / 0.16)" }} />
        <div className="relative flex flex-col gap-3">
          <h1 className="font-display text-[32px] font-bold leading-tight">{first ? `Welcome, ${first}` : "Welcome"}</h1>
          <p className="max-w-2xl text-muted">
            Your account is ready. We&apos;re switching the app on feature by feature during the beta: resume upload and job
            matching come next. Until then, the demo shows every screen with sample data.
          </p>
          <div className="flex flex-wrap gap-2 pt-2">
            <ButtonLink href="/demo" variant="primary" className="glow">
              <PlayCircle className="size-4" aria-hidden /> Explore the demo
            </ButtonLink>
          </div>
        </div>
      </section>

      <ProfileStep userId={user.id} />

      <section className="card flex flex-col gap-4 p-6" aria-labelledby="acct-h">
        <h2 id="acct-h" className="font-display text-lg font-bold">Your account</h2>
        <dl className="grid gap-3 text-sm sm:grid-cols-[10rem_1fr]">
          <dt className="text-muted">Email</dt>
          <dd className="font-semibold">{user.email}</dd>
          <dt className="text-muted">Email confirmed</dt>
          <dd className="flex items-center gap-2 font-semibold">
            {user.emailVerified ? (
              <>
                <CheckCircle2 className="size-4 text-hl-ink" aria-hidden /> Yes
              </>
            ) : (
              <>
                <MailWarning className="size-4 text-warn" aria-hidden /> Not yet. Check your inbox for the link.
              </>
            )}
          </dd>
          <dt className="text-muted">Plan</dt>
          <dd className="font-semibold">Free beta</dd>
        </dl>
        <form action={signOut} className="border-t border-rule pt-4">
          <input type="hidden" name="scope" value="global" />
          <button type="submit" className="text-sm font-semibold text-muted underline-offset-4 hover:text-ink hover:underline">
            Sign out on all devices
          </button>
        </form>
      </section>
    </div>
  );
}
