import { Suspense } from "react";
import { Tracker } from "@/components/applications/tracker";

export default function ApplicationsPage() {
  return (
    <Suspense fallback={<p className="text-muted">Loading your applications…</p>}>
      <Tracker />
    </Suspense>
  );
}
