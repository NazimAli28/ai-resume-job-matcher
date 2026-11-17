import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { answerAiHelp, signOut } from "@/app/(auth)/actions";
import { FormAlert } from "@/components/auth/auth-ui";
import { Button } from "@/components/ui/button";
import { AI_HELP } from "@/config/ai-help";
import { safeNext } from "@/server/auth/schemas";
import { requireUser } from "@/server/auth/user";
import { hasAnswered } from "@/server/training/service";

export const metadata: Metadata = { title: "Help improve our AI?" };

/**
 * Asked once, at signup or on the next sign-in for people who never answered. Neither answer is
 * pre-selected, both buttons look the same, and the app stays closed until one is chosen.
 */
export default async function AiHelpPage({ searchParams }: PageProps<"/ai-help">) {
  const user = await requireUser({ allowMissingAiChoice: true });
  const sp = await searchParams;
  const next = safeNext(typeof sp.next === "string" ? sp.next : undefined);
  if (await hasAnswered(user.id)) redirect(next);
  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-col gap-2">
        <h1 className="font-display text-[28px] font-bold leading-tight">{AI_HELP.title}</h1>
        <p className="text-muted">{AI_HELP.body}</p>
        <p className="text-[13px] text-muted">
          We don&apos;t train any AI model yet. Details are in the{" "}
          <Link href="/legal/privacy#ai-improvement" target="_blank" className="font-semibold underline underline-offset-4">
            Privacy Policy
          </Link>
          .
        </p>
      </div>
      {sp.error === "required" && <FormAlert>Please choose Yes or No to continue.</FormAlert>}
      <form action={answerAiHelp} className="grid gap-3 sm:grid-cols-2">
        <input type="hidden" name="next" value={next} />
        <Button type="submit" name="answer" value="yes" variant="secondary" size="lg">
          {AI_HELP.yes}
        </Button>
        <Button type="submit" name="answer" value="no" variant="secondary" size="lg">
          {AI_HELP.no}
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
