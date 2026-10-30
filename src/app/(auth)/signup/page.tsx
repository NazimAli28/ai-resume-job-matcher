import type { Metadata } from "next";
import Link from "next/link";
import { signInWithGoogle } from "@/app/(auth)/actions";
import { Divider, GoogleButton } from "@/components/auth/auth-ui";
import { SignupForm } from "@/components/auth/forms";

export const metadata: Metadata = { title: "Create your account" };

export default function SignupPage() {
  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="font-display text-[28px] font-bold leading-tight">Create your free account</h1>
        <p className="text-muted">Free during beta. No card needed.</p>
      </div>
      <GoogleButton action={signInWithGoogle} next="/app" label="Sign up with Google" />
      <Divider />
      <SignupForm />
      <p className="text-center text-sm text-muted">
        Already have an account?{" "}
        <Link href="/login" className="font-semibold text-ink underline underline-offset-4">
          Sign in
        </Link>
      </p>
    </div>
  );
}
