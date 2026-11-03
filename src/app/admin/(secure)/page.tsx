import Link from "next/link";
import { DefaultAccent, KillSwitch } from "@/components/admin/controls";
import { SectionCard } from "@/components/profile-real/section-card";
import { requireAdmin } from "@/server/admin/guard";
import { adminOverview } from "@/server/admin/metrics";
import { SPEND } from "@/server/ai/run";
import { defaultAccent } from "@/server/settings/app-settings";

const usd = (n: number) => `$${n.toFixed(n < 1 ? 4 : 2)}`;
const FUNNEL_LABEL: Record<string, string> = {
  SIGNED_IN: "Signed in",
  RESUME_CHECKED: "Checked a resume",
  JOB_MATCHED: "Matched a job",
  APPLICATION_ADDED: "Added an application",
  MARKED_APPLIED: "Marked one applied",
};

function Stat({ label, value, href }: { label: string; value: string | number; href?: string }) {
  const body = (
    <>
      <dt className="text-sm text-muted">{label}</dt>
      <dd className="font-display text-2xl font-bold tabular-nums">{value}</dd>
    </>
  );
  return href ? <Link href={href} className="rounded-xl border border-rule p-3 hover:border-rule-strong">{body}</Link> : <div className="rounded-xl border border-rule p-3">{body}</div>;
}

export default async function AdminOverviewPage() {
  await requireAdmin();
  const [m, accent] = await Promise.all([adminOverview(), defaultAccent()]);
  return (
    <div className="flex flex-col gap-6">
      <h1 className="font-display text-[32px] font-bold leading-tight">Overview</h1>

      <SectionCard id="people" title="People and activity">
        <dl className="grid grid-cols-2 gap-3 md:grid-cols-4">
          <Stat label="Accounts" value={m.users.total} href="/admin/users" />
          <Stat label="New in 7 days" value={m.users.new7} />
          <Stat label="Active in 7 days" value={m.users.active7} />
          <Stat label="Blocked" value={m.users.blocked} />
          <Stat label="Waiting to be deleted" value={m.users.deleting} />
          <Stat label="Open errors" value={m.openErrors} href="/admin/errors" />
          <Stat label="Unread feedback" value={m.unreadFeedback} href="/admin/feedback" />
          <Stat label="Resumes / jobs / applications" value={`${m.content.versions} / ${m.content.jobs} / ${m.content.applications}`} />
        </dl>
      </SectionCard>

      <SectionCard id="ai" title="AI cost and health" intro={`Guards: ${usd(SPEND.globalDaily)} a day overall, ${usd(SPEND.userDaily)} a day and ${usd(SPEND.userMonthly)} a month per person. Set the matching spend limit in the Anthropic console too.`}>
        <dl className="grid grid-cols-2 gap-3 md:grid-cols-4">
          <Stat label="Today" value={usd(m.ai.costDay)} />
          <Stat label="This month" value={usd(m.ai.costMonth)} />
          <Stat label="Requests this month" value={m.ai.requestsMonth} />
          <Stat label="p95 time" value={m.ai.p95Ms === null ? "None yet" : `${Math.round(m.ai.p95Ms)} ms`} />
        </dl>
        {m.ai.byTask.length > 0 && (
          <div className="overflow-x-auto" tabIndex={0} aria-label="AI use by task">
            <table className="w-full min-w-[36rem] text-sm">
              <thead>
                <tr className="border-b border-rule text-left text-muted">
                  <th scope="col" className="py-2 pr-3 font-semibold">Task</th>
                  <th scope="col" className="py-2 pr-3 font-semibold">Model</th>
                  <th scope="col" className="py-2 pr-3 font-semibold">Result</th>
                  <th scope="col" className="py-2 pr-3 text-right font-semibold">Requests</th>
                  <th scope="col" className="py-2 pr-3 text-right font-semibold">Tokens in / out</th>
                  <th scope="col" className="py-2 text-right font-semibold">Cost</th>
                </tr>
              </thead>
              <tbody>
                {m.ai.byTask.map((t) => (
                  <tr key={`${t.task}:${t.model}:${t.status}`} className="border-b border-rule last:border-0">
                    <th scope="row" className="py-2 pr-3 text-left font-semibold">{t.task}</th>
                    <td className="py-2 pr-3">{t.model}</td>
                    <td className="py-2 pr-3">{t.status}</td>
                    <td className="py-2 pr-3 text-right tabular-nums">{t._count}</td>
                    <td className="py-2 pr-3 text-right tabular-nums">{t._sum.inTok ?? 0} / {t._sum.outTok ?? 0}</td>
                    <td className="py-2 text-right tabular-nums">{usd(t._sum.costUsd ?? 0)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        <KillSwitch disabled={m.ai.killed} />
      </SectionCard>

      <SectionCard id="funnel" title="Funnel" intro="People who ever did each step. Counts only, from those who haven't opted out.">
        <dl className="grid grid-cols-2 gap-3 md:grid-cols-5">
          {m.funnel.map((f) => (
            <Stat key={f.name} label={FUNNEL_LABEL[f.name] ?? f.name} value={f.people} />
          ))}
        </dl>
      </SectionCard>

      <SectionCard id="brand" title="Brand">
        <DefaultAccent value={accent} />
      </SectionCard>
    </div>
  );
}
