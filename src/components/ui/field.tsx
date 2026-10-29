import type { ComponentProps, ReactNode } from "react";
import { cn } from "@/lib/cn";

const controlBase =
  "rounded-[var(--radius-md)] border border-rule bg-surface px-3 text-ink placeholder:text-muted/80 focus:border-hl-ink focus:outline-none focus-visible:outline-2";

/** Full width unless the caller passes its own width class (Tailwind doesn't merge conflicting classes). */
function control(className?: string) {
  return /(^|\s)(w-|min-w-|max-w-|flex-1)/.test(className ?? "") ? controlBase : `w-full ${controlBase}`;
}

export function Field({
  label,
  hint,
  htmlFor,
  children,
  className,
}: {
  label: string;
  hint?: ReactNode;
  htmlFor: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("flex flex-col gap-1.5", className)}>
      <label htmlFor={htmlFor} className="text-sm font-semibold">
        {label}
      </label>
      {children}
      {hint && <p className="text-sm text-muted">{hint}</p>}
    </div>
  );
}

export function Input({ className, ...props }: ComponentProps<"input">) {
  return <input className={cn(control(className), "h-11", className)} {...props} />;
}

export function Textarea({ className, ...props }: ComponentProps<"textarea">) {
  return <textarea className={cn(control(className), "min-h-32 py-2.5 leading-relaxed", className)} {...props} />;
}

export function Select({ className, ...props }: ComponentProps<"select">) {
  return <select className={cn(control(className), "h-11 pr-8", className)} {...props} />;
}

/** Segmented single-choice control built on radio inputs (keyboard-accessible). */
export function Segmented<T extends string>({
  name,
  value,
  options,
  onChange,
  legend,
}: {
  name: string;
  value: T;
  options: { value: T; label: string; hint?: string; disabled?: boolean }[];
  onChange: (v: T) => void;
  legend: string;
}) {
  return (
    <fieldset className="flex flex-col gap-1.5">
      <legend className="pb-1.5 text-sm font-semibold">{legend}</legend>
      <div className="flex flex-wrap gap-2">
        {options.map((o) => (
          <label
            key={o.value}
            className={cn(
              "flex min-h-11 cursor-pointer flex-col justify-center rounded-[var(--radius-md)] border px-4 py-2 text-sm transition-colors has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-hl-ink",
              value === o.value ? "border-hl-ink bg-hl-soft font-semibold text-ink" : "border-rule bg-surface hover:border-rule-strong",
              o.disabled && "cursor-not-allowed opacity-50",
            )}
          >
            <input
              type="radio"
              className="sr-only"
              name={name}
              value={o.value}
              checked={value === o.value}
              disabled={o.disabled}
              onChange={() => onChange(o.value)}
            />
            <span>{o.label}</span>
            {o.hint && <span className="text-xs font-normal text-muted">{o.hint}</span>}
          </label>
        ))}
      </div>
    </fieldset>
  );
}
