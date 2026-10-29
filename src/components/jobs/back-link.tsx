import { ArrowLeft } from "lucide-react";
import Link from "next/link";

export function BackLink({ href, label }: { href: string; label: string }) {
  return (
    <Link href={href} className="inline-flex min-h-11 w-fit items-center gap-1.5 text-sm font-semibold text-muted hover:text-ink">
      <ArrowLeft className="size-4" aria-hidden />
      {label}
    </Link>
  );
}
