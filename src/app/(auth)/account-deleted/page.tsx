import Link from "next/link";
import { cancelDeletionAction } from "@/app/app/settings/actions";
import { Button } from "@/components/ui/button";
import { currentUserId } from "@/server/auth/user";
import { db } from "@/server/db";
import { fmtDay } from "@/server/tracker/constants";
import { UNDO_DAYS } from "@/server/privacy/deletion";

export default async function AccountDeletedPage() {
  const id = await currentUserId();
  const user = id ? await db.user.findUnique({ where: { id }, select: { deletedAt: true } }) : null;
  const removeOn = user?.deletedAt ? new Date(user.deletedAt.getTime() + UNDO_DAYS * 86_400_000) : null;

  return (
    <div className="flex flex-col gap-3">
      <h1 className="font-display text-[28px] font-bold leading-tight">This account is being deleted</h1>
      {removeOn ? (
        <>
          <p className="text-muted">Everything will be permanently removed on {fmtDay(removeOn)}. Changed your mind? You can cancel until then.</p>
          <form action={cancelDeletionAction}>
            <Button type="submit" variant="primary">Cancel deletion and keep my account</Button>
          </form>
        </>
      ) : (
        <p className="text-muted">
          Deletion was requested for this account. For {UNDO_DAYS} days after the request you can cancel by{" "}
          <Link href="/login?next=/account-deleted" className="font-semibold underline underline-offset-4">signing in</Link>. After that, everything is permanently removed.
        </p>
      )}
      <Link href="/" className="inline-flex min-h-11 items-center text-sm font-semibold underline underline-offset-4">Go to the home page</Link>
    </div>
  );
}
