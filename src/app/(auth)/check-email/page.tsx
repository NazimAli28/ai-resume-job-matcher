import { MailCheck } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = { title: "Check your email" };

export default function CheckEmailPage() {
  return (
    <div className="flex flex-col items-start gap-5">
      <span className="grid size-12 place-items-center rounded-2xl bg-hl text-on-hl glow">
        <MailCheck className="size-6" aria-hidden />
      </span>
      <div>
        <h1 className="font-display text-[28px] font-bold leading-tight">Check your email</h1>
        <p className="mt-1 text-muted">
          If this email can be used, we&apos;ve sent a confirmation link. Open it on this device to finish creating your
          account. The link expires in 24 hours.
        </p>
      </div>
      <p className="text-sm text-muted">Nothing after a few minutes? Check your spam folder, or sign up again with the same email.</p>
      <Link href="/login" className="text-sm font-semibold underline underline-offset-4">
        Back to sign in
      </Link>
    </div>
  );
}
