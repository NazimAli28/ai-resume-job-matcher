import { useId, type ComponentProps, type ReactNode } from "react";
import { Input, Select, Textarea } from "@/components/ui/field";

/** Looks up the inline error for a field name. */
export type Err = (name: string) => string | undefined;

type Common = { name: string; label: string; error?: string; hint?: ReactNode; optional?: boolean; className?: string };

const INVALID = "aria-invalid:border-warn";

function Shell({
  id,
  label,
  optional,
  hint,
  error,
  className,
  children,
}: Common & { id: string; children: ReactNode }) {
  return (
    <div className={`flex flex-col gap-1.5 ${className ?? ""}`}>
      <label htmlFor={id} className="text-sm font-semibold">
        {label}
        {optional && <span className="font-normal text-muted"> (optional)</span>}
      </label>
      {children}
      {hint && (
        <p id={`${id}-hint`} className="text-[13px] text-muted">
          {hint}
        </p>
      )}
      {error && (
        <p id={`${id}-err`} className="text-[13px] text-warn">
          {error}
        </p>
      )}
    </div>
  );
}

function describedBy(id: string, hint: unknown, error: unknown) {
  return [error ? `${id}-err` : "", hint ? `${id}-hint` : ""].filter(Boolean).join(" ") || undefined;
}

export function TextField({
  name,
  label,
  error,
  hint,
  optional,
  className,
  ...rest
}: Common & Omit<ComponentProps<"input">, "name" | "className">) {
  const id = useId();
  return (
    <Shell id={id} name={name} label={label} error={error} hint={hint} optional={optional} className={className}>
      <Input id={id} name={name} aria-invalid={!!error} aria-describedby={describedBy(id, hint, error)} className={INVALID} {...rest} />
    </Shell>
  );
}

export function AreaField({
  name,
  label,
  error,
  hint,
  optional,
  className,
  ...rest
}: Common & Omit<ComponentProps<"textarea">, "name" | "className">) {
  const id = useId();
  return (
    <Shell id={id} name={name} label={label} error={error} hint={hint} optional={optional} className={className}>
      <Textarea
        id={id}
        name={name}
        aria-invalid={!!error}
        aria-describedby={describedBy(id, hint, error)}
        className={INVALID}
        {...rest}
      />
    </Shell>
  );
}

export function SelectField({
  name,
  label,
  error,
  hint,
  optional,
  className,
  options,
  ...rest
}: Common & Omit<ComponentProps<"select">, "name" | "className"> & { options: { value: string; label: string }[] }) {
  const id = useId();
  return (
    <Shell id={id} name={name} label={label} error={error} hint={hint} optional={optional} className={className}>
      <Select id={id} name={name} aria-invalid={!!error} aria-describedby={describedBy(id, hint, error)} className={INVALID} {...rest}>
        {options.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </Select>
    </Shell>
  );
}
