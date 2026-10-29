"use client";

import {
  Bell, Briefcase, FileText, KanbanSquare, LayoutDashboard, Menu, Mic, Moon, Plus, RotateCcw, Search, Settings, Sparkles, Sun, User,
} from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState, type ReactNode } from "react";
import { cn } from "@/lib/cn";
import { relativeDay, TODAY } from "@/lib/dates";
import { useDemo } from "@/demo/store";
import { ACCENTS, useTheme } from "@/components/theme/use-theme";
import { IconButton } from "@/components/ui/button";
import { Sheet } from "@/components/ui/overlay";
import { useToast } from "@/components/ui/toast";
import { LOGO_MARK, PRODUCT_NAME } from "@/config/brand";
import { CommandPalette } from "./command-palette";

const NAV = [
  { href: "/app", label: "Dashboard", icon: LayoutDashboard },
  { href: "/app/resumes", label: "Resumes", icon: FileText },
  { href: "/app/jobs", label: "Jobs", icon: Briefcase },
  { href: "/app/applications", label: "Applications", icon: KanbanSquare },
  { href: "/app/interviews", label: "Interviews", icon: Mic },
  { href: "/app/profile", label: "Profile", icon: User },
  { href: "/app/settings", label: "Settings", icon: Settings },
];
// Phone nav: two links, the raised Match button, one link, More. Everything else lives in More.
const MOBILE_NAV = [NAV[0], NAV[2], NAV[3]];
const MORE_NAV = [NAV[1], NAV[4], NAV[5], NAV[6]];
const MATCH_HREF = "/app/match";

function isActive(pathname: string, href: string) {
  return href === "/app" ? pathname === "/app" : pathname.startsWith(href);
}

function Logo({ compact }: { compact?: boolean }) {
  return (
    <Link href="/" className="flex shrink-0 items-center gap-2.5 rounded-md px-1 py-1">
      <span aria-hidden className="glow grid size-9 place-items-center rounded-xl bg-hl font-display text-[15px] font-extrabold text-on-hl">
        {LOGO_MARK}
      </span>
      <span className={cn("flex-col leading-tight", compact ? "hidden min-[420px]:flex" : "flex")}>
        <span className="whitespace-nowrap font-display text-[16px] font-bold">{PRODUCT_NAME}</span>
        <span className={cn("text-[11px] text-muted", compact && "hidden sm:block")}>Job search copilot</span>
      </span>
    </Link>
  );
}

function UsageRing({ used, max }: { used: number; max: number }) {
  const r = 15;
  const c = 2 * Math.PI * r;
  return (
    <svg width="38" height="38" viewBox="0 0 38 38" className="-rotate-90" aria-hidden>
      <circle cx="19" cy="19" r={r} fill="none" stroke="var(--sunken)" strokeWidth="5" />
      <circle cx="19" cy="19" r={r} fill="none" stroke="var(--viz)" strokeWidth="5" strokeLinecap="round" strokeDasharray={`${(c * used) / max} ${c}`} />
    </svg>
  );
}

function MobileNavLink({ href, label, Icon, active }: { href: string; label: string; Icon: (typeof NAV)[number]["icon"]; active: boolean }) {
  return (
    <Link
      href={href}
      aria-current={active ? "page" : undefined}
      className={cn("flex min-h-14 flex-col items-center justify-center gap-0.5 text-[11px]", active ? "font-bold text-ink" : "text-muted")}
    >
      <span className={cn("grid h-7 w-11 place-items-center rounded-full transition-colors", active && "glow bg-hl text-on-hl")}>
        <Icon className="size-[18px]" aria-hidden />
      </span>
      {label}
    </Link>
  );
}

export function AppShell({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const { state, dispatch } = useDemo();
  const { theme, accent, setTheme, setAccent } = useTheme();
  const toast = useToast();
  const [notifOpen, setNotifOpen] = useState(false);
  const [moreOpen, setMoreOpen] = useState(false);
  const [cmdOpen, setCmdOpen] = useState(false);
  const unread = state.notifications.filter((n) => !n.read).length;
  const { usage, limits } = state;
  const usedTotal = usage.analyses + usage.tailored + usage.coverLetters + usage.interviews;
  const maxTotal = limits.analyses + limits.tailored + limits.coverLetters + limits.interviews;
  // Soonest upcoming (not done) interview round, for the practice prompt.
  const upcoming = state.applications
    .flatMap((a) =>
      a.rounds
        .filter((r) => !r.done && r.type !== "TAKE_HOME" && r.at >= TODAY)
        .map((r) => ({ jobId: a.jobId, company: a.company, at: r.at, label: `${r.type === "HR" ? "HR" : r.type.charAt(0) + r.type.slice(1).toLowerCase()} round` })),
    )
    .sort((x, y) => x.at.localeCompare(y.at))[0];

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setCmdOpen((o) => !o);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  const resetDemo = () => {
    dispatch({ type: "RESET" });
    toast("Demo reset to the original sample data");
  };

  return (
    <div className="ambient flex min-h-screen">
      {/* Desktop sidebar: a floating card */}
      <aside className="sticky top-0 hidden h-screen w-[264px] shrink-0 p-3 lg:block">
        <div className="card flex h-full flex-col gap-4 overflow-y-auto overscroll-contain px-3 py-4 [scrollbar-width:thin] tall:gap-6">
          <Logo />
          <nav aria-label="Main" className="flex flex-col gap-1">
            {NAV.map(({ href, label, icon: Icon }) => {
              const active = isActive(pathname, href);
              return (
                <Link
                  key={href}
                  href={href}
                  aria-current={active ? "page" : undefined}
                  className={cn(
                    "group relative flex min-h-10 shrink-0 items-center gap-3 rounded-xl px-3 text-[15px] transition-all tall:min-h-11",
                    active ? "glow bg-hl font-semibold text-on-hl" : "text-muted hover:bg-sunken hover:text-ink",
                  )}
                >
                  <Icon className="size-[18px] transition-transform group-hover:scale-110" aria-hidden />
                  {label}
                  {label === "Applications" && (
                    <span className={cn("ml-auto rounded-full px-2 text-xs font-bold tabular-nums leading-5", active ? "bg-on-hl/15" : "bg-sunken text-ink")}>
                      {state.applications.filter((a) => !["REJECTED", "WITHDRAWN", "GHOSTED", "ACCEPTED"].includes(a.status)).length}
                    </span>
                  )}
                </Link>
              );
            })}
          </nav>

          <div className="mt-auto flex flex-col gap-3">
            {upcoming && (
              <Link href={`/app/interviews/new?job=${upcoming.jobId}`} className="relative hidden overflow-hidden rounded-2xl bg-ink p-4 text-paper tall:block">
                <span aria-hidden className="absolute -right-6 -top-6 size-24 rounded-full bg-hl opacity-40 blur-2xl" />
                <Sparkles className="relative size-5 text-hl" aria-hidden />
                <p className="relative mt-2 font-display text-[15px] font-bold leading-snug">
                  {upcoming.label} {relativeDay(upcoming.at)}
                </p>
                <p className="relative text-xs opacity-75">Practice 5 questions for {upcoming.company}</p>
              </Link>
            )}
            <Link href="/app/settings" className="flex shrink-0 items-center gap-3 rounded-2xl border border-rule p-3 hover:bg-sunken">
              <UsageRing used={usedTotal} max={maxTotal} />
              <span className="flex flex-col text-sm leading-tight">
                <span className="font-semibold">Free beta</span>
                <span className="text-xs text-muted">
                  {usedTotal} of {maxTotal} AI actions used
                </span>
              </span>
            </Link>
          </div>
        </div>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-30 px-3 pt-3 lg:pl-0">
          <div className="card flex items-center gap-2 px-3 py-2 backdrop-blur-xl [background:color-mix(in_oklab,var(--surface)_82%,transparent)]">
            <div className="lg:hidden">
              <Logo compact />
            </div>
            <button
              type="button"
              onClick={() => setCmdOpen(true)}
              className="hidden h-10 min-w-0 flex-1 items-center gap-2 rounded-xl border border-rule bg-sunken/60 px-3 text-left text-sm text-muted transition-colors hover:border-rule-strong sm:flex lg:max-w-md"
            >
              <Search className="size-4" aria-hidden />
              <span className="flex-1 truncate">Search jobs, applications, resumes</span>
              <kbd className="rounded-md border border-rule bg-surface px-1.5 text-xs">Ctrl K</kbd>
            </button>
            <div className="ml-auto flex items-center gap-1">
              <Link
                href={MATCH_HREF}
                className="glow mr-1 hidden h-10 items-center gap-1.5 rounded-xl bg-hl px-3.5 text-sm font-semibold text-on-hl transition-transform hover:scale-[1.03] sm:inline-flex"
              >
                <Plus className="size-4" aria-hidden /> New match
              </Link>
              <span className="mr-1 hidden items-center gap-2 rounded-full border border-dashed border-rule-strong px-3 py-1 text-xs text-muted xl:inline-flex">
                Demo data
                <button type="button" onClick={resetDemo} className="inline-flex items-center gap-1 font-semibold text-ink hover:underline">
                  <RotateCcw className="size-3" aria-hidden /> Reset
                </button>
              </span>
              <div role="radiogroup" aria-label="Accent color" className="mr-1 hidden items-center gap-1.5 rounded-full border border-rule px-2 py-1.5 md:flex">
                {ACCENTS.map((a) => (
                  <button
                    key={a.id}
                    type="button"
                    role="radio"
                    aria-checked={accent === a.id}
                    aria-label={`${a.label} accent`}
                    title={`${a.label} accent`}
                    onClick={() => setAccent(a.id)}
                    className={cn("size-5 rounded-full transition-transform", accent === a.id ? "scale-110 ring-2 ring-ink ring-offset-2 ring-offset-surface" : "hover:scale-110")}
                    style={{ background: a.hex }}
                  />
                ))}
              </div>
              <IconButton aria-label="Search" className="sm:hidden" onClick={() => setCmdOpen(true)}>
                <Search className="size-5" />
              </IconButton>
              <IconButton
                aria-label={`Switch to ${theme === "dark" ? "light" : "dark"} mode`}
                onClick={() => setTheme(document.documentElement.dataset.theme === "dark" ? "light" : "dark")}
              >
                <Sun className="hidden size-5 dark:block" />
                <Moon className="size-5 dark:hidden" />
              </IconButton>
              <IconButton aria-label={`Notifications${unread ? `, ${unread} unread` : ""}`} onClick={() => setNotifOpen(true)} className="relative">
                <Bell className="size-5" />
                {unread > 0 && (
                  <span className="absolute right-1 top-1 grid min-w-[18px] place-items-center rounded-full bg-hl px-1 text-[11px] font-bold leading-[18px] text-on-hl glow">{unread}</span>
                )}
              </IconButton>
              <span aria-hidden className="ml-1 hidden size-10 place-items-center rounded-xl bg-gradient-to-br from-hl to-hl-ink font-display text-sm font-bold text-on-hl sm:grid">
                AK
              </span>
            </div>
          </div>
        </header>

        <main className="mx-auto w-full max-w-[1280px] flex-1 px-3 pb-28 pt-6 sm:px-5 lg:pb-12 lg:pl-3 lg:pr-6">{children}</main>
      </div>

      {/* Mobile bottom nav */}
      <nav aria-label="Main" className="fixed inset-x-3 bottom-3 z-40 grid grid-cols-5 rounded-2xl border border-rule bg-surface/90 shadow-lg backdrop-blur-xl lg:hidden">
        {MOBILE_NAV.slice(0, 2).map(({ href, label, icon: Icon }) => (
          <MobileNavLink key={href} href={href} label={label} Icon={Icon} active={isActive(pathname, href)} />
        ))}
        <Link href={MATCH_HREF} aria-current={pathname === MATCH_HREF ? "page" : undefined} className="flex min-h-14 flex-col items-center justify-center gap-0.5 text-[11px] font-bold text-ink">
          <span className="glow -mt-5 grid size-12 place-items-center rounded-2xl bg-hl text-on-hl shadow-lg">
            <Plus className="size-6" aria-hidden />
          </span>
          Match
        </Link>
        {MOBILE_NAV.slice(2).map(({ href, label, icon: Icon }) => (
          <MobileNavLink key={href} href={href} label={label} Icon={Icon} active={isActive(pathname, href)} />
        ))}
        <button type="button" onClick={() => setMoreOpen(true)} className="flex min-h-14 flex-col items-center justify-center gap-0.5 text-[11px] text-muted">
          <span className="grid h-7 w-11 place-items-center">
            <Menu className="size-[18px]" aria-hidden />
          </span>
          More
        </button>
      </nav>

      <CommandPalette open={cmdOpen} onClose={() => setCmdOpen(false)} />

      <Sheet open={moreOpen} onClose={() => setMoreOpen(false)} title="More">
        <div className="flex flex-col gap-1">
          {MORE_NAV.map(({ href, label, icon: Icon }) => (
            <Link key={href} href={href} onClick={() => setMoreOpen(false)} className="flex min-h-12 items-center gap-3 rounded-xl px-3 hover:bg-sunken">
              <Icon className="size-5" aria-hidden /> {label}
            </Link>
          ))}
          <div className="mt-4 flex flex-col gap-2">
            <span className="text-sm font-semibold">Accent</span>
            <div className="flex gap-2">
              {ACCENTS.map((a) => (
                <button
                  key={a.id}
                  type="button"
                  aria-label={`${a.label} accent`}
                  aria-pressed={accent === a.id}
                  onClick={() => setAccent(a.id)}
                  className={cn("size-10 rounded-full border-2", accent === a.id ? "border-ink" : "border-transparent")}
                  style={{ background: a.hex }}
                />
              ))}
            </div>
          </div>
          <button type="button" onClick={resetDemo} className="mt-4 flex min-h-12 items-center gap-3 rounded-xl px-3 text-left hover:bg-sunken">
            <RotateCcw className="size-5" aria-hidden /> Reset demo data
          </button>
        </div>
      </Sheet>

      <Sheet open={notifOpen} onClose={() => setNotifOpen(false)} title="Notifications">
        <ul className="flex flex-col gap-3">
          {state.notifications.map((n) => (
            <li key={n.id} className={cn("rounded-2xl border p-4", n.read ? "border-rule" : "border-hl-ink/40 bg-hl-soft/50")}>
              <div className="flex items-start justify-between gap-3">
                <span className="font-semibold">{n.title}</span>
                <span className="shrink-0 text-xs text-muted">{relativeDay(n.createdAt)}</span>
              </div>
              <p className="mt-1 text-sm text-muted">{n.body}</p>
              <div className="mt-2 flex gap-3 text-sm font-semibold">
                {n.applicationId && (
                  <Link
                    href={`/app/applications?open=${n.applicationId}`}
                    onClick={() => {
                      dispatch({ type: "MARK_NOTIFICATION_READ", id: n.id });
                      setNotifOpen(false);
                    }}
                    className="text-hl-ink underline-offset-4 hover:underline"
                  >
                    Open application
                  </Link>
                )}
                {!n.read && (
                  <button type="button" className="text-muted hover:text-ink" onClick={() => dispatch({ type: "MARK_NOTIFICATION_READ", id: n.id })}>
                    Mark as read
                  </button>
                )}
              </div>
            </li>
          ))}
        </ul>
      </Sheet>
    </div>
  );
}
