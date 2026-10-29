import { Suspense } from "react";
import { InterviewSetup } from "@/components/interviews/setup";

export default function NewInterviewPage() {
  return (
    <Suspense fallback={<p className="py-16 text-center text-muted" role="status">Loading</p>}>
      <InterviewSetup />
    </Suspense>
  );
}
