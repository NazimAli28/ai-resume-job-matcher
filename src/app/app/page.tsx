import { CheckCircle2, MailWarning, PlayCircle, Sparkles } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { signOut } from "@/app/(auth)/actions";
import { FormAlert } from "@/components/auth/auth-ui";
import { DashboardStats } from "@/components/dashboard-real/stats";
import { SectionCard } from "@/components/profile-real/section-card";
import { MarkGhosted, SnoozeButton } from "@/components/tracker/detail-controls";
import { ButtonLink } from "@/components/ui/button";
import { BarChart, Funnel, RingScore } from "@/components/ui/charts";
import { StatusChip } from "@/components/ui/chip";
import { cn } from "@/lib/cn";
import { requireUser } from "@/server/auth/user";
import { db } from "@/server/db";
import { computeDashboard, MIN_TIME_SAMPLE, needsAttention, nextBestAction, SMALL_SAMPLE, type AttentionItem, type Breakdown, type Rate, type TimeStat } from "@/server/tracker/analytics";
import { fmtDay, STATUS_LABELS } from "@/server/tracker/constants";
import { listApplications } from "@/server/tracker/service";

export const metadata: Metadata = { title: "Home" };

const RANGES = [
  { key: "all", label: "All time", days: null },
  { key: "90", label: "90 days", days: 90 },
  { key: "30", label: "30 days", days: 30 },
] as const;

/** First step of the real app: the profile everything else draws on. */
function ProfileStep({ items }: { items: { label: string; done: boolean }[] }) {
  const doneCount = items.filter((i) => i.done).length;
  const started = items[0]?.done;
  return (
    <section className="card flex flex-col gap-4 p-6" aria-labelledby="profile-step-h">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 id="profile-step-h" className="font-display text-lg font-bold">
            Your profile
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
        <ButtonLink href={started ? "/app/profile" : "/app/onboarding"} variant="secondary">
          {started ? "Continue your profile" : "Set up your profile"}
        </ButtonLink>
      </div>
    </section>
  );
}

const SmallSample = () => <p className="text-[13px] text-muted">Small sample. Don&apos;t over-read this.</p>;

function RateTile({ label, rate, help }: { label: string; rate: Rate; help: string }) {
  const small = rate.n < SMALL_SAMPLE;
  return (
    <div className="flex flex-col gap-0.5 rounded-xl border border-rule p-3">
      <dt className="text-sm font-semibold">{label}</dt>
      <dd className={cn("font-display text-2xl font-bold tabular-nums", small && "text-muted")}>{rate.pct === null ? "None yet" : `${rate.pct}%`}</dd>
      <dd className="text-[13px] text-muted">{rate.count} of {rate.n}. {help}</dd>
      {small && rate.n > 0 && <dd><SmallSample /></dd>}
    </div>
  );
}

function TimeTile({ label, stat, help }: { label: string; stat: TimeStat; help: string }) {
  return (
    <div className="flex flex-col gap-0.5 rounded-xl border border-rule p-3">
      <dt className="text-sm font-semibold">{label}</dt>
      <dd className="font-display text-2xl font-bold tabular-nums">{stat.median === null ? "Not enough data yet" : `${stat.median} day${stat.median === 1 ? "" : "s"}`}</dd>
      <dd className="text-[13px] text-muted">
        {stat.median === null ? `Shown from ${MIN_TIME_SAMPLE} applications; you have ${stat.n}. ` : `Median, n=${stat.n}, average ${stat.average}. `}
        {help}
      </dd>
    </div>
  );
}

function BreakdownTable({ id, title, intro, rows, first }: { id: string; title: string; intro: string; rows: Breakdown[]; first: string }) {
  return (
    <SectionCard id={id} title={title} intro={intro}>
      <div className="overflow-x-auto" tabIndex={0} aria-label={title}>
        <table className="w-full min-w-[28rem] text-sm">
          <thead>
            <tr className="border-b border-rule text-left text-muted">
              <th scope="col" className="py-2 pr-3 font-semibold">{first}</th>
              <th scope="col" className="py-2 pr-3 text-right font-semibold">Applied (n)</th>
              <th scope="col" className="py-2 pr-3 text-right font-semibold">Replies</th>
              <th scope="col" className="py-2 pr-3 text-right font-semibold">Interviews</th>
              <th scope="col" className="py-2 text-right font-semibold">Offers</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.key} className={cn("border-b border-rule last:border-0", r.n < SMALL_SAMPLE && "text-muted")}>
                <th scope="row" className="break-words py-2 pr-3 text-left font-semibold">{r.label}</th>
                <td className="py-2 pr-3 text-right tabular-nums">{r.n}</td>
                <td className="py-2 pr-3 text-right tabular-nums">{r.responses}</td>
                <td className="py-2 pr-3 text-right tabular-nums">{r.interviews}</td>
                <td className="py-2 text-right tabular-nums">{r.offers}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {rows.some((r) => r.n < SMALL_SAMPLE) && <p className="text-[13px] text-muted">Greyed rows have fewer than {SMALL_SAMPLE} applications. Don&apos;t over-read them.</p>}
    </SectionCard>
  );
}

function AttentionRow({ item }: { item: AttentionItem }) {
  return (
    <li className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-rule p-3">
      <Link href={`/app/applications/${item.applicationId}`} className="flex min-h-11 min-w-0 flex-col justify-center text-sm hover:underline">
        <span className="break-words font-semibold">{item.company} · {item.title}</span>
        <span className="break-words text-muted">{item.message}</span>
      </Link>
      {(item.kind === "GHOSTED" || item.kind === "FOLLOW_UP") && (
        <div className="flex flex-wrap items-center gap-1">
          {item.kind === "GHOSTED" && <MarkGhosted id={item.applicationId} />}
          <SnoozeButton id={item.applicationId} />
        </div>
      )}
    </li>
  );
}

export default async function AppHome({ searchParams }: PageProps<"/app">) {
  const user = await requireUser();
  const sp = await searchParams;
  const first = user.name?.split(" ")[0];
  const range = RANGES.find((r) => r.key === sp.range) ?? RANGES[0];

  const [apps, profile, jobs, latestVersion] = await Promise.all([
    listApplications(user.id),
    db.profile.findUnique({ where: { userId: user.id }, select: { onboardedAt: true, _count: { select: { skills: true, experiences: true, facts: true } } } }),
    db.job.count({ where: { userId: user.id } }),
    db.resumeVersion.findFirst({
      where: { userId: user.id, deletedAt: null },
      orderBy: { createdAt: "desc" },
      select: { id: true, label: true, name: true, analyses: { orderBy: { createdAt: "desc" }, take: 1, select: { parseHealth: true, readability: true } } },
    }),
  ]);

  const c = profile?._count ?? { skills: 0, experiences: 0, facts: 0 };
  const profileItems = [
    { label: "Target market and roles", done: Boolean(profile?.onboardedAt) },
    { label: "At least one role", done: c.experiences > 0 },
    { label: "Your key skills", done: c.skills >= 3 },
    { label: "One confirmed fact in your evidence bank", done: c.facts > 0 },
  ];

  const d = computeDashboard(
    apps.map((a) => ({ ...a, resumeLabel: a.resumeVersion ? `${a.resumeVersion.label} · ${a.resumeVersion.name}` : null })),
    { rangeDays: range.days },
  );
  const attention = needsAttention(apps);
  const next = nextBestAction({
    hasResume: Boolean(latestVersion),
    onboarded: Boolean(profile?.onboardedAt),
    jobs,
    applications: apps.length,
    attention,
    saved: apps.filter((a) => a.status === "SAVED").map((a) => ({ id: a.id, company: a.company })),
  });
  const analysis = latestVersion?.analyses[0];
  const hasApps = apps.length > 0;

  return (
    <div className="flex flex-col gap-6">
      {sp.password === "updated" && <FormAlert tone="ok">Your password was updated. Other devices have been signed out.</FormAlert>}

      <section className="card relative overflow-hidden p-6 sm:p-8">
        <div aria-hidden className="pointer-events-none absolute -right-16 -top-20 size-64 rounded-full blur-3xl" style={{ background: "rgb(var(--hl-rgb) / 0.16)" }} />
        <div className="relative flex flex-col gap-3">
          <h1 className="font-display text-[32px] font-bold leading-tight">{first ? `Welcome, ${first}` : "Welcome"}</h1>
          <div className="flex items-start gap-2">
            <Sparkles className="mt-1 size-4 shrink-0 text-hl-ink" aria-hidden />
            <div className="min-w-0">
              <h2 className="break-words font-semibold">{next.title}</h2>
              <p className="break-words text-muted">{next.body}</p>
            </div>
          </div>
          <div className="flex flex-wrap gap-2 pt-2">
            <ButtonLink href={next.href} variant="primary" className="glow">{next.cta}</ButtonLink>
            {next.href !== "/app/jobs/new" && <ButtonLink href="/app/jobs/new" variant="secondary">Match a job</ButtonLink>}
            {!hasApps && (
              <ButtonLink href="/demo" variant="ghost">
                <PlayCircle className="size-4" aria-hidden /> Explore the demo
              </ButtonLink>
            )}
          </div>
        </div>
      </section>

      {attention.length > 0 && (
        <SectionCard id="attention" title={`Needs attention (${attention.length})`} intro="Due reminders, interviews this week, and applications that have gone quiet.">
          <ul className="flex flex-col gap-2">
            {attention.slice(0, 8).map((i) => (
              <AttentionRow key={`${i.applicationId}:${i.kind}:${i.when}`} item={i} />
            ))}
          </ul>
        </SectionCard>
      )}

      {hasApps && (
        <>
          <nav aria-label="Date range" className="flex flex-wrap gap-1">
            {RANGES.map((r) => (
              <Link
                key={r.key}
                href={r.key === "all" ? "/app" : `/app?range=${r.key}`}
                aria-current={r.key === range.key ? "true" : undefined}
                className={cn("inline-flex min-h-11 items-center rounded-xl px-3 text-sm font-semibold", r.key === range.key ? "bg-hl-soft" : "text-muted hover:bg-sunken hover:text-ink")}
              >
                {r.label}
              </Link>
            ))}
          </nav>

          <DashboardStats
            applied={d.applied}
            active={d.counts.active}
            interviewing={d.counts.interviewing}
            offers={d.counts.offers}
            trend={d.weekly}
            closed={`${d.counts.saved} saved · ${d.counts.rejected} rejected · ${d.counts.ghosted} ghosted`}
          />

          <SectionCard id="rates" title="How it's going" intro="Worked out from your own stage changes. These describe the past; they don't predict anything.">
            <dl className="grid gap-3 sm:grid-cols-3">
              <RateTile label="Reply rate" rate={d.responseRate} help="Heard back: a later stage or a rejection." />
              <RateTile label="Interview rate" rate={d.interviewRate} help="Reached Interviewing." />
              <RateTile label="Offer rate" rate={d.offerRate} help="Reached Offer." />
            </dl>
            <dl className="grid gap-3 sm:grid-cols-3">
              <TimeTile label="Time to first reply" stat={d.time.firstResponse} help="From applying." />
              <TimeTile label="Time to interview" stat={d.time.toInterview} help="From applying." />
              <TimeTile label="Time in current stage" stat={d.time.inStage} help="Open applications." />
            </dl>
          </SectionCard>

          <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
            <SectionCard id="funnel" title="Pipeline" intro="How far your applications got. Skipped stages count as passed.">
              <Funnel data={d.funnel.map((f) => ({ label: STATUS_LABELS[f.stage], value: f.count }))} label="Applications reaching each stage" />
              <details className="text-sm">
                <summary className="flex min-h-11 cursor-pointer items-center font-semibold">Show as a table</summary>
                <table className="w-full">
                  <thead><tr className="border-b border-rule text-left text-muted"><th scope="col" className="py-1 font-semibold">Stage</th><th scope="col" className="py-1 text-right font-semibold">Reached</th><th scope="col" className="py-1 text-right font-semibold">From previous</th></tr></thead>
                  <tbody>
                    {d.funnel.map((f) => (
                      <tr key={f.stage} className="border-b border-rule last:border-0">
                        <th scope="row" className="py-1 text-left font-normal">{STATUS_LABELS[f.stage]}</th>
                        <td className="py-1 text-right tabular-nums">{f.count}</td>
                        <td className="py-1 text-right tabular-nums">{f.conversion === null ? "" : `${f.conversion}%`}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </details>
            </SectionCard>

            <SectionCard id="weekly" title="Applications per week" intro="The last 12 weeks, by the Monday each week starts.">
              <BarChart data={d.weekly} labelEvery={3} label={`Applications per week: ${d.weekly.map((w) => `${w.label} ${w.value}`).join(", ")}`} />
              <details className="text-sm">
                <summary className="flex min-h-11 cursor-pointer items-center font-semibold">Show as a table</summary>
                <table className="w-full">
                  <thead><tr className="border-b border-rule text-left text-muted"><th scope="col" className="py-1 font-semibold">Week of</th><th scope="col" className="py-1 text-right font-semibold">Applied</th></tr></thead>
                  <tbody>
                    {d.weekly.map((w) => (
                      <tr key={w.label} className="border-b border-rule last:border-0"><th scope="row" className="py-1 text-left font-normal">{w.label}</th><td className="py-1 text-right tabular-nums">{w.value}</td></tr>
                    ))}
                  </tbody>
                </table>
              </details>
            </SectionCard>
          </div>

          {d.applied >= SMALL_SAMPLE ? (
            <>
              <BreakdownTable id="sources" title="By source" intro="Counts from your applications. Correlation, not cause." rows={d.bySource} first="Source" />
              <BreakdownTable id="resumes" title="By resume version" intro="What happened with each version you sent. Correlation, not cause." rows={d.byResume} first="Resume" />
              {d.byBand.length > 0 && <BreakdownTable id="bands" title="Fit estimate and outcome" intro="Your fit estimate when linked, next to what happened. Correlation, not cause." rows={d.byBand} first="Fit estimate" />}
            </>
          ) : (
            <p className="text-sm text-muted">Breakdowns by source and resume appear once you&apos;ve applied to {SMALL_SAMPLE} jobs, so small numbers don&apos;t mislead you.</p>
          )}

          <SectionCard id="recent" title="Recent applications" action={<ButtonLink href="/app/applications" size="sm">Open tracker</ButtonLink>}>
            <div className="overflow-x-auto" tabIndex={0} aria-label="Recent applications">
              <table className="w-full min-w-[36rem] text-sm">
                <thead>
                  <tr className="border-b border-rule text-left text-muted">
                    <th scope="col" className="py-2 pr-3 font-semibold">Company</th>
                    <th scope="col" className="py-2 pr-3 font-semibold">Position</th>
                    <th scope="col" className="py-2 pr-3 text-right font-semibold">Fit estimate</th>
                    <th scope="col" className="py-2 pr-3 font-semibold">Stage</th>
                    <th scope="col" className="py-2 font-semibold">Applied</th>
                  </tr>
                </thead>
                <tbody>
                  {apps.slice(0, 5).map((a) => (
                    <tr key={a.id} className="border-b border-rule last:border-0">
                      <th scope="row" className="py-2 pr-3 text-left font-semibold"><Link href={`/app/applications/${a.id}`} className="hover:underline">{a.company}</Link></th>
                      <td className="py-2 pr-3">{a.title}</td>
                      <td className="py-2 pr-3 text-right tabular-nums">{a.matchScore ?? "None"}</td>
                      <td className="py-2 pr-3"><StatusChip value={a.status} /></td>
                      <td className="whitespace-nowrap py-2 text-muted">{a.appliedAt ? fmtDay(a.appliedAt) : "Not yet"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </SectionCard>
        </>
      )}

      {latestVersion && analysis && (
        <SectionCard id="health" title="Resume health" intro={`${latestVersion.label} · ${latestVersion.name}. Estimates from code, not a hiring prediction.`} action={<ButtonLink href={`/app/resumes/${latestVersion.id}`} size="sm">Open analysis</ButtonLink>}>
          <div className="flex flex-wrap gap-6">
            <div className="flex items-center gap-3"><RingScore value={analysis.parseHealth} size={72} stroke={7} label="Parse health estimate" /><span className="text-sm font-semibold">Parse health<span className="block font-normal text-muted">estimate</span></span></div>
            <div className="flex items-center gap-3"><RingScore value={analysis.readability} size={72} stroke={7} label="Readability estimate" /><span className="text-sm font-semibold">Readability<span className="block font-normal text-muted">estimate</span></span></div>
          </div>
        </SectionCard>
      )}

      {profileItems.some((i) => !i.done) && <ProfileStep items={profileItems} />}

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
