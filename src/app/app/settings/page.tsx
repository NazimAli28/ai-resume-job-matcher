import { CheckCircle2, Download, MailWarning } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { signOut } from "@/app/(auth)/actions";
import { SectionCard } from "@/components/profile-real/section-card";
import { Appearance } from "@/components/settings/appearance";
import { ConfirmIdentity, ConsentToggle, DeleteAccount, FeedbackForm } from "@/components/settings-real/controls";
import { LocalTime } from "@/components/tracker/local-time";
import { ButtonLink, buttonClass } from "@/components/ui/button";
import { FEATURES } from "@/config/features";
import { isRecentlySignedIn, requireUser } from "@/server/auth/user";
import { db } from "@/server/db";
import { UNDO_DAYS } from "@/server/privacy/deletion";
import { USAGE_LABELS } from "@/server/usage/limits";
import { usageSummary } from "@/server/usage/service";

export const metadata: Metadata = { title: "Settings" };

const ACTIVITY: Record<string, string> = {
  SIGNUP: "Account created",
  LOGIN: "Signed in",
  LOGOUT: "Signed out",
  LOGOUT_ALL: "Signed out on all devices",
  PASSWORD_CHANGED: "Password changed",
  DATA_EXPORTED: "Data downloaded",
  CONSENT_CHANGED: "Privacy choice changed",
  ACCOUNT_DELETE_REQUESTED: "Deletion requested",
  ACCOUNT_DELETE_CANCELED: "Deletion canceled",
};

export default async function SettingsPage({ searchParams }: { searchParams: Promise<{ confirm?: string }> }) {
  const user = await requireUser();
  const sp = await searchParams;
  const [usage, consents, activity, recent] = await Promise.all([
    usageSummary(user),
    db.consentRecord.findMany({ where: { userId: user.id, type: { in: ["TRAINING_OPT_IN", "ANALYTICS_COOKIES", "MARKETING_EMAIL"] } }, orderBy: { createdAt: "desc" } }),
    db.auditLog.findMany({ where: { subjectUserId: user.id, action: { in: Object.keys(ACTIVITY) } }, orderBy: { createdAt: "desc" }, take: 12, select: { id: true, action: true, createdAt: true } }),
    isRecentlySignedIn(),
  ]);
  const latest = (t: string) => consents.find((c) => c.type === t)?.granted;

  return (
    <div className="flex flex-col gap-6">
      <h1 className="font-display text-[32px] font-bold leading-tight">Settings</h1>

      <SectionCard id="account" title="Account">
        <dl className="grid gap-3 text-sm sm:grid-cols-[10rem_1fr]">
          <dt className="text-muted">Email</dt>
          <dd className="break-words font-semibold">{user.email}</dd>
          <dt className="text-muted">Email confirmed</dt>
          <dd className="flex items-center gap-2 font-semibold">
            {user.emailVerified ? (
              <><CheckCircle2 className="size-4 text-hl-ink" aria-hidden /> Yes</>
            ) : (
              <><MailWarning className="size-4 text-warn" aria-hidden /> Not yet. Check your inbox for the link.</>
            )}
          </dd>
          <dt className="text-muted">Plan</dt>
          <dd className="font-semibold">Free beta</dd>
        </dl>
        <div className="flex flex-wrap items-center gap-2 border-t border-rule pt-4">
          {FEATURES.EMAIL_PASSWORD_AUTH && <ButtonLink href="/forgot-password" size="sm">Set or change password</ButtonLink>}
          <form action={signOut}>
            <input type="hidden" name="scope" value="global" />
            <button type="submit" className={buttonClass("ghost", "sm")}>Sign out on all devices</button>
          </form>
        </div>
      </SectionCard>

      <SectionCard id="usage" title="This month's usage" intro="Limits reset on the 1st. Attempts that fail don't count.">
        <ul className="grid gap-3 sm:grid-cols-2">
          {usage.map((u) => (
            <li key={u.kind} className="flex flex-col gap-1.5 text-sm">
              <span className="flex justify-between gap-2">
                <span className="font-semibold">{USAGE_LABELS[u.kind]}</span>
                <span className="tabular-nums text-muted">{u.used} of {u.limit}</span>
              </span>
              <span className="h-2 rounded-full bg-sunken" aria-hidden>
                <span className="block h-2 rounded-full" style={{ width: `${Math.min(100, (u.used / u.limit) * 100)}%`, background: "var(--viz)" }} />
              </span>
            </li>
          ))}
        </ul>
        <p className="text-[13px] text-muted">Tracking applications is unlimited.</p>
      </SectionCard>

      <SectionCard id="appearance" title="Appearance">
        <Appearance />
      </SectionCard>

      <SectionCard id="privacy" title="Privacy choices" intro="Each choice is saved with its date, and you can change it any time.">
        <div className="flex flex-col gap-2">
          <ConsentToggle type="ANALYTICS_COOKIES" checked={latest("ANALYTICS_COOKIES") !== false} label="Count which features I use" hint="On our own servers, as plain counts. Never your content, and no third-party tracking." />
          <ConsentToggle type="TRAINING_OPT_IN" checked={latest("TRAINING_OPT_IN") === true} label="Allow de-identified data to improve our AI" hint="Off unless you turn it on. We don't currently train any model." />
          <ConsentToggle type="MARKETING_EMAIL" checked={latest("MARKETING_EMAIL") === true} label="Send me product tips by email" hint="Off unless you turn it on. Account and security emails are always sent." />
        </div>
      </SectionCard>

      <SectionCard id="data" title="Your data" intro="Everything we store about you, in a file you can keep.">
        {sp.confirm === "export" && <p className="rounded-xl bg-warn-soft px-4 py-3 text-sm text-warn">Downloading your data needs a fresh sign-in.</p>}
        {recent ? (
          <div className="flex flex-wrap gap-2">
            {/* A plain link: this is a file download, not a page change. */}
            <a href="/app/settings/export" className={buttonClass("secondary")}>
              <Download className="size-4" aria-hidden /> Download my data (ZIP)
            </a>
          </div>
        ) : (
          <ConfirmIdentity reason="Downloading all your data needs a fresh sign-in, so someone at an unlocked computer can't take it." />
        )}
        <p className="text-sm text-muted">
          Need just your applications? <Link href="/app/applications" className="font-semibold underline underline-offset-4">Export them from the tracker</Link>.
          How long we keep each kind of data is in the <Link href="/legal/privacy" className="font-semibold underline underline-offset-4">Privacy Policy</Link>.
        </p>
      </SectionCard>

      <SectionCard id="activity" title="Recent activity" intro="Security events on your account.">
        {activity.length === 0 ? (
          <p className="text-sm text-muted">Nothing yet.</p>
        ) : (
          <ul className="flex flex-col gap-1.5 text-sm">
            {activity.map((a) => (
              <li key={a.id} className="flex flex-wrap justify-between gap-x-3">
                <span>{ACTIVITY[a.action]}</span>
                <span className="text-muted"><LocalTime iso={a.createdAt.toISOString()} /></span>
              </li>
            ))}
          </ul>
        )}
      </SectionCard>

      <SectionCard id="feedback" title="Report an issue or send feedback">
        <FeedbackForm />
      </SectionCard>

      <SectionCard id="delete" title="Delete your account" intro={`You lose access right away. You have ${UNDO_DAYS} days to change your mind by signing in. After that, your account, resumes, jobs and applications are permanently removed, and backups clear within 30 days.`}>
        <DeleteAccount recent={recent} />
      </SectionCard>
    </div>
  );
}
