import type { Metadata } from "next";
import Link from "next/link";
import { signInWithGoogle } from "@/app/(auth)/actions";
import { Divider, FormAlert, GoogleButton } from "@/components/auth/auth-ui";
import { LoginForm } from "@/components/auth/forms";
import { safeNext } from "@/server/auth/schemas";

export const metadata: Metadata = { title: "Sign in" };

const NOTICE: Record<string, { tone: "error" | "ok"; text: string }> = {
  link: { tone: "error", text: "That link has expired or was already used. Sign in, or request a new link." },
  google: { tone: "error", text: "Google sign-in didn't complete. Please try again." },
  server: { tone: "error", text: "Something went wrong on our side. Please try again." },
};

export default async function LoginPage({ searchParams }: PageProps<"/login">) {
  const sp = await searchParams;
  const next = safeNext(typeof sp.next === "string" ? sp.next : undefined);
  const notice =
    typeof sp.error === "string" ? NOTICE[sp.error] : sp.signed === "out" ? { tone: "ok" as const, text: "You're signed out." } : undefined;
  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="font-display text-[28px] font-bold leading-tight">Welcome back</h1>
        <p className="text-muted">Sign in to your resumes, jobs and interview practice.</p>
      </div>
      {notice && <FormAlert tone={notice.tone}>{notice.text}</FormAlert>}
      <GoogleButton action={signInWithGoogle} next={next} label="Continue with Google" />
      <Divider />
      <LoginForm next={next} />
      <p className="text-center text-sm text-muted">
        New here?{" "}
        <Link href="/signup" className="font-semibold text-ink underline underline-offset-4">
          Create a free account
        </Link>
      </p>
    </div>
  );
}
