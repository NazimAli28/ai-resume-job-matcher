import type { Metadata } from "next";
import Link from "next/link";
import { acceptCurrentTerms, signOut } from "@/app/(auth)/actions";
import { FormAlert } from "@/components/auth/auth-ui";
import { Button } from "@/components/ui/button";
import { requireUser } from "@/server/auth/user";

export const metadata: Metadata = { title: "Before you continue" };

export default async function ConsentPage({ searchParams }: PageProps<"/consent">) {
  await requireUser({ allowMissingConsent: true });
  const sp = await searchParams;
  return (
    <div className="flex flex-col gap-5">
      <div>
        <h1 className="font-display text-[28px] font-bold leading-tight">One step before you start</h1>
        <p className="text-muted">Please confirm the points below. We keep a record of the version you accepted.</p>
      </div>
      {sp.error === "required" && <FormAlert>Please tick the first box to continue.</FormAlert>}
      <form action={acceptCurrentTerms} className="flex flex-col gap-4">
        <input type="hidden" name="next" value="/app" />
        <label className="flex items-start gap-3 text-sm">
          <input type="checkbox" name="accept" required className="mt-0.5 size-5 shrink-0 accent-[var(--hl-ink)]" />
          <span>
            I am 16 or older and agree to the{" "}
            <Link href="/legal/terms" target="_blank" className="font-semibold underline underline-offset-4">
              Terms
            </Link>{" "}
            and{" "}
            <Link href="/legal/privacy" target="_blank" className="font-semibold underline underline-offset-4">
              Privacy Policy
            </Link>
            .
          </span>
        </label>
        <label className="flex items-start gap-3 text-sm text-muted">
          <input type="checkbox" name="marketing" className="mt-0.5 size-5 shrink-0 accent-[var(--hl-ink)]" />
          <span>Send me occasional product tips and news.</span>
        </label>
        <Button type="submit" variant="primary" size="lg">
          Continue
        </Button>
      </form>
      <form action={signOut}>
        <button type="submit" className="text-sm font-semibold text-muted hover:text-ink">
          Not now, sign me out
        </button>
      </form>
    </div>
  );
}
