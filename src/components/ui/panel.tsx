import type { ReactNode } from "react";
import { cn } from "@/lib/cn";

/** Bordered surface. Use sparingly; not every group of content needs a box. */
export function Panel({
  className,
  children,
  as: Tag = "section",
  ...rest
}: {
  className?: string;
  children: ReactNode;
  as?: "section" | "div" | "article" | "aside";
} & Record<string, unknown>) {
  return (
    <Tag className={cn("card", className)} {...rest}>
      {children}
    </Tag>
  );
}

export function PageHeader({
  title,
  description,
  actions,
  back,
}: {
  title: string;
  description?: ReactNode;
  actions?: ReactNode;
  back?: ReactNode;
}) {
  return (
    <header className="flex flex-col gap-3 pb-6">
      {back}
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div className="flex max-w-2xl flex-col gap-1.5">
          <h1 className="text-[28px] font-bold leading-tight sm:text-[32px]">{title}</h1>
          {description && <p className="text-muted">{description}</p>}
        </div>
        {actions && <div className="flex flex-wrap gap-2">{actions}</div>}
      </div>
    </header>
  );
}

export function EmptyState({
  title,
  body,
  action,
  icon,
}: {
  title: string;
  body: string;
  action?: ReactNode;
  icon?: ReactNode;
}) {
  return (
    <div className="flex flex-col items-center gap-3 rounded-[var(--radius-lg)] border border-dashed border-rule-strong px-6 py-12 text-center">
      {icon && <div className="text-muted">{icon}</div>}
      <h2 className="text-lg font-bold">{title}</h2>
      <p className="max-w-md text-muted">{body}</p>
      {action}
    </div>
  );
}
