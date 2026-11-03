import { DeleteAccount } from "@/components/settings-real/controls";
import { buttonClass } from "@/components/ui/button";
import { currentUserId, isRecentlySignedIn } from "@/server/auth/user";

export default async function BlockedPage() {
  const [id, recent] = await Promise.all([currentUserId(), isRecentlySignedIn()]);
  return (
    <div className="flex flex-col gap-4">
      <h1 className="font-display text-[28px] font-bold leading-tight">Access paused</h1>
      <p className="text-muted">
        This account has been paused while we review unusual activity. If you think this is a mistake, reply to any email
        from us and we&apos;ll look into it. Your data is still yours: you can download or delete it here.
      </p>
      {id && (
        <>
          {recent && (
            <a href="/app/settings/export" className={buttonClass("secondary", "md", "w-fit")}>Download my data (ZIP)</a>
          )}
          <DeleteAccount recent={recent} back="blocked" />
        </>
      )}
    </div>
  );
}
