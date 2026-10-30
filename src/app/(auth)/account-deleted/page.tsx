import Link from "next/link";

export default function AccountDeletedPage() {
  return (
    <div className="flex flex-col gap-3">
      <h1 className="font-display text-[28px] font-bold leading-tight">This account is being deleted</h1>
      <p className="text-muted">
        Deletion was requested for this account. For 7 days after the request you can still cancel it from the email we
        sent. After that, everything is permanently removed.
      </p>
      <Link href="/" className="text-sm font-semibold underline underline-offset-4">
        Go to the home page
      </Link>
    </div>
  );
}
