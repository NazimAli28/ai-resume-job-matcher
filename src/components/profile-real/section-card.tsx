import type { ReactNode } from "react";

export function SectionCard({ id, title, intro, action, children }: { id: string; title: string; intro?: ReactNode; action?: ReactNode; children: ReactNode }) {
  return (
    <section id={id} aria-labelledby={`${id}-h`} className="card flex scroll-mt-24 flex-col gap-4 p-6">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div className="flex min-w-0 flex-col gap-1">
          <h2 id={`${id}-h`} className="font-display text-lg font-bold">
            {title}
          </h2>
          {intro && <p className="max-w-2xl text-sm text-muted">{intro}</p>}
        </div>
        {action}
      </div>
      {children}
    </section>
  );
}
