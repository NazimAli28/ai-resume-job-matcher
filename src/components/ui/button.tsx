import Link from "next/link";
import type { ComponentProps, ReactNode } from "react";
import { cn } from "@/lib/cn";

// Note: variants own their colors; don't override bg/text via className (Tailwind won't merge conflicts).
type Variant = "primary" | "secondary" | "ink" | "ghost" | "danger";
type Size = "sm" | "md" | "lg";

const base =
  "inline-flex items-center justify-center gap-2 rounded-xl font-semibold transition-colors disabled:opacity-50 disabled:pointer-events-none whitespace-nowrap select-none";

const variants: Record<Variant, string> = {
  // Highlighter fill + near-black text in both modes; a deeper accent edge keeps it visible on white.
  primary: "bg-hl text-on-hl border border-hl-ink/40 hover:glow hover:-translate-y-px active:translate-y-0 transition-all",
  secondary: "bg-surface text-ink border border-rule hover:border-rule-strong hover:bg-sunken",
  // High-contrast neutral action (ink on paper, inverts in dark mode); for a second strong action beside a lime one.
  ink: "bg-ink text-paper border border-ink hover:opacity-90",
  ghost: "text-ink hover:bg-sunken",
  danger: "bg-surface text-danger border border-rule hover:border-danger",
};

const sizes: Record<Size, string> = {
  sm: "h-9 px-3 text-sm",
  md: "h-11 px-4 text-[15px]",
  lg: "h-12 px-6 text-base",
};

export function buttonClass(variant: Variant = "secondary", size: Size = "md", className?: string) {
  return cn(base, variants[variant], sizes[size], className);
}

export function Button({
  variant = "secondary",
  size = "md",
  className,
  type = "button",
  ...props
}: ComponentProps<"button"> & { variant?: Variant; size?: Size }) {
  return <button type={type} className={buttonClass(variant, size, className)} {...props} />;
}

export function ButtonLink({
  href,
  variant = "secondary",
  size = "md",
  className,
  children,
  ...props
}: Omit<ComponentProps<typeof Link>, "className"> & {
  variant?: Variant;
  size?: Size;
  className?: string;
  children: ReactNode;
}) {
  return (
    <Link href={href} className={buttonClass(variant, size, className)} {...props}>
      {children}
    </Link>
  );
}

/** Square icon-only button; always pass an aria-label. */
export function IconButton({
  className,
  type = "button",
  ...props
}: ComponentProps<"button"> & { "aria-label": string }) {
  return (
    <button
      type={type}
      className={cn(
        "inline-flex size-10 items-center justify-center rounded-[var(--radius-md)] text-muted hover:text-ink hover:bg-sunken transition-colors",
        className,
      )}
      {...props}
    />
  );
}
