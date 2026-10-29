import { cn } from "@/lib/cn";

const TONES = [
  "bg-hl-soft text-hl-ink",
  "bg-partial-soft text-partial",
  "bg-warn-soft text-warn",
  "bg-sunken text-ink",
  "bg-hl text-on-hl",
];

function hash(s: string) {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) >>> 0;
  return h;
}

export function initialsOf(name: string, max = 2) {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "?";
  if (parts.length === 1) return parts[0].slice(0, max).toUpperCase();
  return parts.slice(0, max).map((p) => p[0]).join("").toUpperCase();
}

/** Initials tile; the tone comes from a hash of the name, using tokens only. */
export function InitialTile({
  name,
  size = 40,
  className,
  round,
}: {
  name: string;
  size?: number;
  className?: string;
  round?: boolean;
}) {
  return (
    <span
      aria-hidden
      className={cn(
        "grid shrink-0 place-items-center font-display font-bold",
        round ? "rounded-full" : "rounded-xl",
        TONES[hash(name) % TONES.length],
        className,
      )}
      style={{ width: size, height: size, fontSize: Math.max(11, size * 0.38) }}
    >
      {initialsOf(name)}
    </span>
  );
}
