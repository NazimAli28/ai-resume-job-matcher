import type { Metadata } from "next";
import Link from "next/link";
import { ForgotForm } from "@/components/auth/forms";

export const metadata: Metadata = { title: "Reset your password" };

export default function ForgotPage() {
  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="font-display text-[28px] font-bold leading-tight">Reset your password</h1>
        <p className="text-muted">Enter your account email and we&apos;ll send you a reset link.</p>
      </div>
      <ForgotForm />
      <Link href="/login" className="text-center text-sm font-semibold text-muted hover:text-ink">
        Back to sign in
      </Link>
    </div>
  );
}
