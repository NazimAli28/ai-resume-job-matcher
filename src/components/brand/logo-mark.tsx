/** The logo: a resume page with a match check. Follows the accent color; src/app/icon.svg is the fixed-color copy. */
export function LogoMark({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 32 32" aria-hidden className={className}>
      <rect width="32" height="32" rx="9" fill="var(--hl)" />
      <path
        d="M10 5.5h8.2c.6 0 1.1.2 1.5.6l5.2 5.2c.4.4.6.9.6 1.5V24.5a2 2 0 0 1-2 2H10a2 2 0 0 1-2-2v-17a2 2 0 0 1 2-2z"
        fill="var(--on-hl)"
      />
      <path d="M11.6 17.2l3.2 3.2 6.2-6.6" fill="none" stroke="var(--hl)" strokeWidth="2.8" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}
