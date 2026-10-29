import type { LucideIcon } from "lucide-react";
import type { ReactNode } from "react";
import { cn } from "@/lib/cn";

/** Card wrapper for a profile section: icon chip, title, optional count badge. */
export function SectionCard({
  id,
  title,
  icon: Icon,
  count,
  children,
  className,
}: {
  id: string;
  title: string;
  icon: LucideIcon;
  count?: number;
  children: ReactNode;
  className?: string;
}) {
  return (
    <section aria-labelledby={id} className={cn("card flex flex-col gap-4 p-5 sm:p-6", className)}>
      <div className="flex items-center gap-3">
        <span className="grid size-10 place-items-center rounded-xl bg-hl-soft text-hl-ink">
          <Icon className="size-5" aria-hidden />
        </span>
        <h2 id={id} className="text-xl font-bold">{title}</h2>
        {count !== undefined && (
          <span className="rounded-full bg-sunken px-2.5 py-0.5 text-sm font-bold tabular-nums text-muted">{count}</span>
        )}
      </div>
      {children}
    </section>
  );
}
