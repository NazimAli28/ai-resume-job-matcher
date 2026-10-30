import type { Metadata } from "next";
import Link from "next/link";
import { signInWithGoogle } from "@/app/(auth)/actions";
import { Divider, GoogleButton } from "@/components/auth/auth-ui";
import { SignupForm } from "@/components/auth/forms";
import { FEATURES } from "@/config/features";

export const metadata: Metadata = { title: "Create your account" };

export default function SignupPage() {
  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="font-display text-[28px] font-bold leading-tight">Create your free account</h1>
        <p className="text-muted">Free during beta. No card needed.</p>
      </div>
      <GoogleButton action={signInWithGoogle} next="/app" label="Sign up with Google" />
      {FEATURES.EMAIL_PASSWORD_AUTH ? (
        <>
          <Divider />
          <SignupForm />
        </>
      ) : (
        <p className="text-sm text-muted">
          After Google, you&apos;ll confirm you are 16 or older and accept our{" "}
          <Link href="/legal/terms" className="font-semibold text-ink underline underline-offset-4">Terms</Link> and{" "}
          <Link href="/legal/privacy" className="font-semibold text-ink underline underline-offset-4">Privacy Policy</Link>. We only
          ask Google for your name and email. Email sign-up is coming soon.
        </p>
      )}
      <p className="text-center text-sm text-muted">
        Already have an account?{" "}
        <Link href="/login" className="font-semibold text-ink underline underline-offset-4">
          Sign in
        </Link>
      </p>
    </div>
  );
}
