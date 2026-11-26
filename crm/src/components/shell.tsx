"use client";

import { BookOpen, CheckCheck, FlaskConical, Inbox, LayoutDashboard, Lock, Megaphone, Menu, Settings, ShieldCheck, Target, Upload, Users, X } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useMemo, useState, type ReactNode } from "react";
import { QuickSearch } from "@/components/quick-search";
import { LangSwitch } from "@/components/ui";
import { daysAgo } from "@/lib/dates";
import { suggestions } from "@/lib/rules";
import { useStore } from "@/lib/store";
import { t } from "@/lib/i18n";

export function Logo() {
  return (
    <Link href="/" className="flex items-center gap-2">
      <ShieldCheck className="h-7 w-7 text-primary" aria-hidden />
      <span className="brand-text font-[family-name:var(--font-display)] text-xl font-bold">{t("CP Consulting")}</span>
    </Link>
  );
}

export function Shell({ children }: { children: ReactNode }) {
  const path = usePathname();
  const { db, mode, saved, lock, weakPass, update, lang, setLanguage } = useStore();
  const build = process.env.NEXT_PUBLIC_BUILD ?? "local";
  const [open, setOpen] = useState(false);
  // A browser can keep showing an old copy of the app. Ask the site which version is current
  // (when the page opens and when the window gets focus again) and offer to reload.
  const [newer, setNewer] = useState(false);
  useEffect(() => {
    if (build === "local") return;
    let last = 0;
    const check = () => {
      if (Date.now() - last < 120_000) return;
      last = Date.now();
      fetch(`${process.env.NEXT_PUBLIC_BASE_PATH ?? ""}/version.json?t=${last}`, { cache: "no-store" })
        .then((r) => (r.ok ? r.json() : null))
        .then((v: { build?: string } | null) => { if (v?.build && v.build !== "local" && v.build !== build) setNewer(true); })
        .catch(() => undefined);
    };
    check();
    window.addEventListener("focus", check);
    return () => window.removeEventListener("focus", check);
  }, [build]);
  // Privacy screen: cover everything while the window is not the active one.
  const [away, setAway] = useState(false);
  const privacy = Boolean(db.settings.privacyScreen) && mode === "workspace";
  useEffect(() => {
    if (!privacy) return;
    const off = () => setAway(true), on = () => setAway(false);
    window.addEventListener("blur", off); window.addEventListener("focus", on);
    return () => { window.removeEventListener("blur", off); window.removeEventListener("focus", on); };
  }, [privacy]);
  const approvals = useMemo(() => suggestions(db).list.length, [db]);
  const replies = useMemo(() => db.events.filter((e) => e.kind === "reply" && !e.handled).length + db.tasks.filter((t) => !t.done).length, [db]);
  const NAV = [
    { href: "/", label: t("Dashboard"), icon: LayoutDashboard },
    { href: "/customers/", label: t("Customers"), icon: Users },
    { href: "/opportunities/", label: t("Opportunities"), icon: Target },
    { href: "/approvals/", label: t("Approvals"), icon: CheckCheck, badge: approvals },
    { href: "/inbox/", label: t("Replies & tasks"), icon: Inbox, badge: replies },
    { href: "/campaigns/", label: t("Campaigns"), icon: Megaphone },
    { href: "/knowledge/", label: t("Product guide"), icon: BookOpen },
    { href: "/import/", label: t("Import"), icon: Upload },
    { href: "/settings/", label: t("Settings"), icon: Settings },
  ];
  const active = (href: string) => (href === "/" ? path === "/" : path.startsWith(href.replace(/\/$/, "")) || (href === "/campaigns/" && path.startsWith("/queue")));

  const nav = (
    <nav className="flex flex-col gap-1" aria-label={t("Main")}>
      {NAV.map(({ href, label, icon: Icon, badge }) => (
        <Link key={href} href={href} onClick={() => setOpen(false)} aria-current={active(href) ? "page" : undefined}
          className={`flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors ${active(href) ? "bg-primary/15 text-white shadow-[inset_2px_0_0_var(--color-accent)]" : "text-ink-2 hover:bg-white/5 hover:text-white"}`}>
          <Icon className={`h-4 w-4 ${active(href) ? "text-primary" : ""}`} aria-hidden />
          <span className="flex-1">{label}</span>
          {badge ? <span className="rounded-full bg-accent px-1.5 text-[11px] font-semibold leading-5 text-white">{badge > 99 ? "99+" : badge}</span> : null}
        </Link>
      ))}
    </nav>
  );
  const lockButton = (
    <button onClick={lock} className="flex w-full items-center gap-3 rounded-md px-3 py-2 text-left text-sm text-ink-2 hover:bg-white/5 hover:text-white">
      <Lock className="h-4 w-4" aria-hidden /> {mode === "demo" ? t("Leave the demo") : t("Lock workspace")}
    </button>
  );

  if (path.startsWith("/customers/print")) return <>{children}</>;

  return (
    <div className="min-h-screen lg:flex">
      {privacy && away && (
        <div className="fixed inset-0 z-[100] flex flex-col items-center justify-center gap-3 bg-night text-center" data-testid="privacy-screen">
          <ShieldCheck className="h-10 w-10 text-primary" aria-hidden />
          <p className="text-sm text-ink-2">{t("Hidden while you are in another window. Click here to continue.")}</p>
        </div>
      )}
      <aside className="sticky top-0 hidden h-screen w-60 shrink-0 flex-col overflow-y-auto border-r border-white/10 bg-white/[0.03] p-4 backdrop-blur-md lg:flex">
        <div className="px-2 pb-6 pt-2"><Logo /></div>
        {nav}
        <div className="mt-auto border-t border-white/10 pt-3">
          <div className="px-3 pb-2 text-xs text-mute">
            {mode === "demo" ? t("Demo data") : <>{t("Encrypted on this device")}<br /><span className={saved === "error" ? "text-bad" : "text-ink"}>{saved === "saved" ? t("All changes saved") : saved === "saving" ? t("Saving") : t("Could not save")}</span></>}
          </div>
          {lockButton}
        </div>
      </aside>

      <header className="sticky top-0 z-30 flex items-center justify-between border-b border-white/10 bg-night/85 px-4 py-3 backdrop-blur-md lg:hidden">
        <Logo />
        <div className="flex items-center gap-2">
          <LangSwitch lang={lang} onChange={setLanguage} />
          <button className="btn !p-2" onClick={() => setOpen(!open)} aria-label={open ? t("Close menu") : t("Open menu")} aria-expanded={open}>
            {open ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
        </div>
      </header>
      {open && (
        <div className="fixed inset-x-0 top-[57px] z-20 max-h-[calc(100vh-57px)] overflow-y-auto border-b border-white/10 bg-night/95 p-4 backdrop-blur-md lg:hidden">
          <div className="mb-3"><QuickSearch onPick={() => setOpen(false)} /></div>
          {nav}
          <div className="mt-2 border-t border-white/10 pt-2">{lockButton}</div>
        </div>
      )}

      <main className="min-w-0 flex-1 px-4 py-6 sm:px-6 lg:px-8 lg:py-8">
        <div className="mx-auto max-w-6xl">
          <div className="mb-4 hidden items-center justify-between gap-4 lg:flex"><QuickSearch /><LangSwitch full lang={lang} onChange={setLanguage} /></div>
          {mode === "demo" && (
            <div className="mb-5 flex items-center gap-2 rounded-md border border-warn/30 bg-warn/5 px-3 py-2 text-xs text-warn">
              <FlaskConical className="h-4 w-4 shrink-0" aria-hidden />
              <span>{t("Demo with invented customers. Changes are not saved. Leave the demo to set up your own encrypted workspace.")}</span>
            </div>
          )}
          {mode === "workspace" && db.customers.length > 0 && !path.startsWith("/settings") && (db.settings.lastBackup === "" || (daysAgo(db.settings.lastBackup) ?? 0) > 7) && (
            <div className="mb-5 flex flex-wrap items-center gap-x-3 gap-y-1 rounded-md border border-warn/30 bg-warn/5 px-3 py-2 text-sm text-warn">
              <span>{db.settings.lastBackup === "" ? t("You have no backup yet.") : `Your last backup is ${daysAgo(db.settings.lastBackup)} days old.`} The data exists only in this browser.</span>
              <Link href="/settings/" className="font-medium underline">{t("Download a backup")}</Link>
            </div>
          )}
          {mode === "workspace" && weakPass && !path.startsWith("/settings") && (
            <div className="mb-5 flex flex-wrap items-center gap-x-3 gap-y-1 rounded-md border border-bad/40 bg-bad/10 px-3 py-2 text-sm text-bad">
              <span>{t("Your passphrase is weak. If this computer were stolen, the customer data could be guessed open.")}</span>
              <Link href="/settings/" className="font-medium underline">{t("Change it")}</Link>
            </div>
          )}
          {newer && (
            <div className="mb-4 flex flex-wrap items-center justify-between gap-2 rounded-md border border-accent/50 bg-accent/10 px-3 py-2 text-sm text-ink" role="status" data-testid="update-banner">
              <span>{t("A newer version of the app is available. Reload to get the latest functions.")}</span>
              {/* Reloading is only offered once every change is safely stored. */}
              <button className="btn btn-primary" disabled={mode === "workspace" && saved !== "saved"} title={mode === "workspace" && saved !== "saved" ? t("Wait until all changes are saved.") : undefined} onClick={() => window.location.reload()}>{t("Reload now")}</button>
            </div>
          )}
          {mode === "workspace" && db.settings.seenBuild !== build && (
            <div className="mb-5 flex flex-wrap items-center gap-x-3 gap-y-1 rounded-md border border-line bg-night-2/60 px-3 py-2 text-sm text-ink-2">
              <span>{db.settings.seenBuild ? `The app was updated since you last used it here (version ${db.settings.seenBuild} to ${build}). If you did not expect an update, stop and check before entering data.` : `This is app version ${build}. From now on a notice appears here whenever the app's code changes.`}</span>
              <button className="font-medium text-primary underline" onClick={() => update((d) => { d.settings.seenBuild = build; }, `Acknowledged app version ${build}`)}>{t("OK, noted")}</button>
            </div>
          )}
          {saved === "error" && mode === "workspace" && (
            <div className="mb-5 rounded-md border border-bad/40 bg-bad/10 px-3 py-2 text-sm text-bad" role="alert">{t("Your latest changes could not be saved in this browser. Download a backup from Settings before closing this page.")}</div>
          )}
          {children}
        </div>
      </main>
    </div>
  );
}
