import { CheckCircle2, MailWarning, PlayCircle } from "lucide-react";
import type { Metadata } from "next";
import { signOut } from "@/app/(auth)/actions";
import { FormAlert } from "@/components/auth/auth-ui";
import { ButtonLink } from "@/components/ui/button";
import { requireUser } from "@/server/auth/user";

export const metadata: Metadata = { title: "Home" };

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
