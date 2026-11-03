"use client";

import {
  Briefcase, ChevronsUpDown, FileText, KanbanSquare, LayoutDashboard, LogOut, Menu, Monitor, Moon, PanelLeftClose, PanelLeftOpen, Settings, Shield, Sun, User, X,
} from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { signOut } from "@/app/(auth)/actions";
import { LogoMark } from "@/components/brand/logo-mark";
import { useTheme, type ThemePref } from "@/components/theme/use-theme";
import { buttonClass, IconButton } from "@/components/ui/button";
import { PRODUCT_NAME } from "@/config/brand";
import { cn } from "@/lib/cn";

export interface NavAccount {
  name: string | null;
  email: string;
  isAdmin: boolean;
  profile: { headline: string | null; city: string | null; targetTitles: string[]; onboarded: boolean; skills: number; roles: number; evidence: number };
}

const NAV = [
  { href: "/app", label: "Home", icon: LayoutDashboard },
  { href: "/app/resumes", label: "Resumes", icon: FileText },
  { href: "/app/jobs", label: "Jobs", icon: Briefcase },
  { href: "/app/applications", label: "Tracker", icon: KanbanSquare },
  { href: "/app/profile", label: "Profile", icon: User },
];

const THEMES: { value: ThemePref; label: string; icon: typeof Sun }[] = [
  { value: "light", label: "Light", icon: Sun },
  { value: "dark", label: "Dark", icon: Moon },
  { value: "system", label: "Device", icon: Monitor },
];

const isActive = (pathname: string, href: string) => (href === "/app" ? pathname === href : pathname === href || pathname.startsWith(`${href}/`));

function initials({ name, email }: NavAccount) {
  const words = (name ?? "").trim().split(/\s+/).filter(Boolean);
  if (words.length === 0) return email.charAt(0).toUpperCase();
  return (words[0].charAt(0) + (words.length > 1 ? words[words.length - 1].charAt(0) : "")).toUpperCase();
}

function Avatar({ account, large }: { account: NavAccount; large?: boolean }) {
  return (
    <span aria-hidden className={cn("grid shrink-0 place-items-center rounded-xl bg-hl-soft font-display font-bold text-hl-ink", large ? "size-12 text-base" : "size-9 text-sm")}>
      {initials(account)}
    </span>
  );
}

function ThemeChoice() {
  const { theme, setTheme } = useTheme();
  return (
    <fieldset>
      <legend className="pb-1.5 text-xs font-semibold text-muted">Theme</legend>
      <div className="grid grid-cols-3 gap-1 rounded-xl bg-sunken p-1">
        {THEMES.map((t) => (
          <label
            key={t.value}
            className={cn(
              "flex min-h-10 cursor-pointer items-center justify-center gap-1 rounded-lg text-[13px] font-semibold has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-hl-ink",
              theme === t.value ? "bg-surface text-ink shadow-sm" : "text-muted hover:text-ink",
            )}
          >
            <input type="radio" className="sr-only" name="menu-theme" checked={theme === t.value} onChange={() => setTheme(t.value)} />
            <t.icon className="size-3.5" aria-hidden /> {t.label}
          </label>
        ))}
      </div>
    </fieldset>
  );
}

function ProfilePreview({ account }: { account: NavAccount }) {
  const { profile } = account;
  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center gap-3">
        <Avatar account={account} large />
        <div className="min-w-0">
          <p className="truncate font-display text-[15px] font-bold">{account.name || "Your account"}</p>
          <p className="truncate text-[13px] text-muted">{account.email}</p>
        </div>
      </div>
      {profile.onboarded ? (
        <>
          {(profile.headline || profile.city) && (
            <p className="text-[13px] leading-snug">{[profile.headline, profile.city].filter(Boolean).join(" · ")}</p>
          )}
          {profile.targetTitles.length > 0 && (
            <ul aria-label="Target roles" className="flex flex-wrap gap-1">
              {profile.targetTitles.slice(0, 3).map((t) => (
                <li key={t} className="max-w-full truncate rounded-full bg-hl-soft px-2 py-0.5 text-xs font-semibold text-hl-ink">{t}</li>
              ))}
              {profile.targetTitles.length > 3 && <li className="px-1 py-0.5 text-xs text-muted">+{profile.targetTitles.length - 3}</li>}
            </ul>
          )}
          <dl className="grid grid-cols-3 gap-1 text-center">
            {[["Skills", profile.skills], ["Roles", profile.roles], ["Evidence", profile.evidence]].map(([label, n]) => (
              <div key={label} className="flex flex-col-reverse rounded-lg bg-sunken py-1.5">
                <dt className="text-[11px] text-muted">{label}</dt>
                <dd className="font-display text-[15px] font-bold tabular-nums">{n}</dd>
              </div>
            ))}
          </dl>
        </>
      ) : (
        <p className="text-[13px] text-muted">Your profile isn&apos;t set up yet. It&apos;s what suggestions are allowed to use.</p>
      )}
    </div>
  );
}

/** Account button at the foot of the menu: profile preview, theme and account links. */
function AccountMenu({ account, inDrawer }: { account: NavAccount; inDrawer?: boolean }) {
  const [open, setOpen] = useState(false);
  const root = useRef<HTMLDivElement>(null);
  const button = useRef<HTMLButtonElement>(null);
  const pathname = usePathname();

  useEffect(() => {
    if (!open) return;
    const onPointer = (e: PointerEvent) => {
      if (!root.current?.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("pointerdown", onPointer);
    return () => document.removeEventListener("pointerdown", onPointer);
  }, [open]);

  // eslint-disable-next-line react-hooks/set-state-in-effect
  useEffect(() => setOpen(false), [pathname]);

  const close = () => setOpen(false);
  const itemClass = "flex min-h-11 items-center gap-2.5 rounded-xl px-2.5 text-sm font-semibold hover:bg-sunken";

  return (
    <div
      ref={root}
      className="relative"
      onKeyDown={(e) => {
        if (e.key === "Escape" && open) {
          e.preventDefault();
          e.stopPropagation();
          close();
          button.current?.focus();
        }
      }}
    >
      {open && (
        <div
          className={cn(
            "card absolute bottom-full left-0 z-50 mb-2 flex max-h-[calc(100dvh-6rem)] flex-col gap-3 overflow-y-auto p-3 shadow-xl",
            inDrawer ? "w-full" : "w-72 rail-collapsed:bottom-0 rail-collapsed:left-full rail-collapsed:mb-0 rail-collapsed:ml-3",
          )}
        >
          <ProfilePreview account={account} />
          <Link href="/app/profile" onClick={close} className={buttonClass("secondary", "sm", "w-full justify-center")}>
            View full profile
          </Link>
          <div className="border-t border-rule pt-3">
            <ThemeChoice />
          </div>
          <div className="flex flex-col border-t border-rule pt-2">
            <Link href="/app/settings" onClick={close} className={itemClass}>
              <Settings className="size-4 text-muted" aria-hidden /> Settings
            </Link>
            {account.isAdmin && (
              <Link href="/admin" onClick={close} className={itemClass}>
                <Shield className="size-4 text-muted" aria-hidden /> Admin
              </Link>
            )}
            <form action={signOut}>
              <button type="submit" className={cn(itemClass, "w-full text-left")}>
                <LogOut className="size-4 text-muted" aria-hidden /> Sign out
              </button>
            </form>
          </div>
        </div>
      )}
      <button
        ref={button}
        type="button"
        aria-expanded={open}
        aria-label={`Account menu, ${account.name || account.email}`}
        title="Profile and theme"
        onClick={() => setOpen((o) => !o)}
        className="flex min-h-11 w-full items-center gap-2.5 rounded-2xl border border-rule p-1.5 text-left hover:bg-sunken rail-collapsed:justify-center rail-collapsed:border-transparent"
      >
        <Avatar account={account} />
        <span className="min-w-0 flex-1 leading-tight rail-collapsed:hidden">
          <span className="block truncate text-sm font-semibold">{account.name || "Your account"}</span>
          <span className="block truncate text-xs text-muted">{account.email}</span>
        </span>
        <ChevronsUpDown className="size-4 shrink-0 text-muted rail-collapsed:hidden" aria-hidden />
      </button>
    </div>
  );
}

function NavLinks({ onNavigate }: { onNavigate?: () => void }) {
  const pathname = usePathname();
  return (
    <nav aria-label="Main" className="flex min-h-0 flex-1 flex-col gap-1 overflow-y-auto overscroll-contain p-0.5 [scrollbar-width:thin]">
      {NAV.map(({ href, label, icon: Icon }) => {
        const active = isActive(pathname, href);
        return (
          <Link
            key={href}
            href={href}
            title={label}
            onClick={onNavigate}
            aria-current={active ? "page" : undefined}
            className={cn(
              "flex min-h-11 shrink-0 items-center gap-3 rounded-xl px-3 text-[15px] transition-colors rail-collapsed:justify-center rail-collapsed:px-0",
              active ? "glow bg-hl font-semibold text-on-hl" : "text-muted hover:bg-sunken hover:text-ink",
            )}
          >
            <Icon className="size-5 shrink-0" aria-hidden />
            <span className="truncate rail-collapsed:sr-only">{label}</span>
          </Link>
        );
      })}
    </nav>
  );
}

function Brand() {
  return (
    <Link href="/app" aria-label={`${PRODUCT_NAME} home`} className="flex min-w-0 items-center gap-2.5 rounded-xl">
      <LogoMark className="glow size-9 shrink-0 rounded-[10px]" />
      <span className="min-w-0 font-display text-[15px] font-bold leading-tight rail-collapsed:hidden">{PRODUCT_NAME}</span>
    </Link>
  );
}

/** Desktop: a side menu that collapses to icons. Phones and tablets: a top bar that opens the same menu as a drawer. */
export function AppNav({ account }: { account: NavAccount }) {
  const [collapsed, setCollapsed] = useState(false);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const drawer = useRef<HTMLDialogElement>(null);
  const pathname = usePathname();

  // Sync with what ThemeScript applied before hydration.
  // eslint-disable-next-line react-hooks/set-state-in-effect
  useEffect(() => setCollapsed(document.documentElement.dataset.sidebar === "collapsed"), []);

  useEffect(() => {
    const el = drawer.current;
    if (!el) return;
    if (drawerOpen && !el.open) el.showModal();
    if (!drawerOpen && el.open) el.close();
    document.documentElement.style.overflow = drawerOpen ? "hidden" : "";
  }, [drawerOpen]);

  // eslint-disable-next-line react-hooks/set-state-in-effect
  useEffect(() => setDrawerOpen(false), [pathname]);

  const toggle = () => {
    const next = !collapsed;
    setCollapsed(next);
    document.documentElement.dataset.sidebar = next ? "collapsed" : "open";
    try { localStorage.setItem("arw-sidebar", next ? "collapsed" : "open"); } catch {}
  };

  return (
    <>
      <aside data-rail className="sticky top-0 z-40 hidden h-screen w-64 shrink-0 p-3 pr-0 transition-[width] duration-200 motion-reduce:transition-none rail-collapsed:w-[84px] lg:block">
        <div className="card flex h-full flex-col gap-4 p-3">
          <div className="flex items-center justify-between gap-1 rail-collapsed:flex-col">
            <Brand />
            <IconButton aria-label={collapsed ? "Open side menu" : "Collapse side menu"} aria-expanded={!collapsed} title={collapsed ? "Open side menu" : "Collapse side menu"} onClick={toggle} className="shrink-0">
              <PanelLeftClose className="size-5 rail-collapsed:hidden" aria-hidden />
              <PanelLeftOpen className="hidden size-5 rail-collapsed:block" aria-hidden />
            </IconButton>
          </div>
          <NavLinks />
          <AccountMenu account={account} />
        </div>
      </aside>

      <header className="sticky top-0 z-30 px-3 pt-3 lg:hidden">
        <div className="card flex items-center gap-2 px-2 py-1.5 backdrop-blur-xl [background:color-mix(in_oklab,var(--surface)_82%,transparent)]">
          <IconButton aria-label="Open menu" aria-expanded={drawerOpen} onClick={() => setDrawerOpen(true)} className="size-11 shrink-0">
            <Menu className="size-5" aria-hidden />
          </IconButton>
          <Brand />
        </div>
      </header>

      <dialog
        ref={drawer}
        aria-label="Menu"
        onClose={() => setDrawerOpen(false)}
        onClick={(e) => {
          if (e.target === drawer.current) setDrawerOpen(false);
        }}
        className="m-0 h-dvh max-h-none w-[min(20rem,88vw)] max-w-none bg-transparent p-2 text-ink backdrop:bg-black/50"
      >
        {/* Mounted only while open, so the page has one set of nav landmarks and radio names. */}
        {drawerOpen && (
          <div className="card flex h-full flex-col gap-4 p-3">
            <div className="flex items-center justify-between gap-2">
              <Brand />
              <IconButton aria-label="Close menu" onClick={() => setDrawerOpen(false)} className="size-11 shrink-0">
                <X className="size-5" aria-hidden />
              </IconButton>
            </div>
            <NavLinks onNavigate={() => setDrawerOpen(false)} />
            <AccountMenu account={account} inDrawer />
          </div>
        )}
      </dialog>
    </>
  );
}
