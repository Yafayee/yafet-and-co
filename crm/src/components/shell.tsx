"use client";

import { CheckCheck, Inbox, LayoutDashboard, LogOut, Megaphone, Menu, Settings, ShieldCheck, Upload, Users, X } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState, type ReactNode } from "react";
import { drafts, replies } from "@/lib/data";

const NAV = [
  { href: "/", label: "Dashboard", icon: LayoutDashboard },
  { href: "/customers", label: "Customers", icon: Users },
  { href: "/approvals", label: "Approvals", icon: CheckCheck, badge: drafts.length },
  { href: "/inbox", label: "Replies & tasks", icon: Inbox, badge: replies.filter((x) => !x.handled).length },
  { href: "/campaigns", label: "Campaigns", icon: Megaphone },
  { href: "/import", label: "Import", icon: Upload },
  { href: "/settings", label: "Settings", icon: Settings },
];

export function Logo() {
  return (
    <Link href="/" className="flex items-center gap-2">
      <ShieldCheck className="h-7 w-7 text-primary" aria-hidden />
      <span className="brand-text font-[family-name:var(--font-display)] text-xl font-bold">CP Consulting</span>
    </Link>
  );
}

export function Shell({ children }: { children: ReactNode }) {
  const path = usePathname();
  const [open, setOpen] = useState(false);
  const active = (href: string) => (href === "/" ? path === "/" : path.startsWith(href));

  const nav = (
    <nav className="flex flex-col gap-1" aria-label="Main">
      {NAV.map(({ href, label, icon: Icon, badge }) => (
        <Link
          key={href}
          href={href}
          onClick={() => setOpen(false)}
          aria-current={active(href) ? "page" : undefined}
          className={`flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors ${
            active(href) ? "bg-primary/15 text-white shadow-[inset_2px_0_0_var(--color-accent)]" : "text-ink-2 hover:bg-white/5 hover:text-white"
          }`}
        >
          <Icon className={`h-4 w-4 ${active(href) ? "text-primary" : ""}`} aria-hidden />
          <span className="flex-1">{label}</span>
          {badge ? <span className="rounded-full bg-accent px-1.5 text-[11px] font-semibold leading-5 text-white">{badge}</span> : null}
        </Link>
      ))}
    </nav>
  );

  return (
    <div className="min-h-screen lg:flex">
      {/* Desktop sidebar */}
      <aside className="sticky top-0 hidden h-screen w-60 shrink-0 flex-col border-r border-white/10 bg-white/[0.03] p-4 backdrop-blur-md lg:flex">
        <div className="px-2 pb-6 pt-2"><Logo /></div>
        {nav}
        <div className="mt-auto border-t border-white/10 pt-3">
          <div className="px-3 pb-2 text-xs text-mute">Signed in as<br /><span className="text-ink">Representative</span></div>
          <Link href="/login" className="flex items-center gap-3 rounded-md px-3 py-2 text-sm text-ink-2 hover:bg-white/5 hover:text-white">
            <LogOut className="h-4 w-4" aria-hidden /> Sign out
          </Link>
        </div>
      </aside>

      {/* Mobile top bar */}
      <header className="sticky top-0 z-30 flex items-center justify-between border-b border-white/10 bg-night/85 px-4 py-3 backdrop-blur-md lg:hidden">
        <Logo />
        <button className="btn !p-2" onClick={() => setOpen(!open)} aria-label={open ? "Close menu" : "Open menu"} aria-expanded={open}>
          {open ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
        </button>
      </header>
      {open && (
        <div className="fixed inset-x-0 top-[57px] z-20 border-b border-white/10 bg-night/95 p-4 backdrop-blur-md lg:hidden">
          {nav}
          <Link href="/login" className="mt-2 flex items-center gap-3 rounded-md px-3 py-2 text-sm text-ink-2">
            <LogOut className="h-4 w-4" aria-hidden /> Sign out
          </Link>
        </div>
      )}

      <main className="min-w-0 flex-1 px-4 py-6 sm:px-6 lg:px-8 lg:py-8">
        <div className="mx-auto max-w-6xl">
          <div className="mb-5 rounded-md border border-warn/30 bg-warn/5 px-3 py-2 text-xs text-warn">
            Preview with invented sample customers. Nothing is sent and nothing is saved yet.
          </div>
          {children}
        </div>
      </main>
    </div>
  );
}
