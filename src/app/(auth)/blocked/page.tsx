export default function BlockedPage() {
  return (
    <div className="flex flex-col gap-3">
      <h1 className="font-display text-[28px] font-bold leading-tight">Access paused</h1>
      <p className="text-muted">
        This account has been paused while we review unusual activity. If you think this is a mistake, reply to any email
        from us and we&apos;ll look into it.
      </p>
    </div>
  );
}
