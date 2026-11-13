"use client";

import { FlaskConical, KeyRound, Lock, ShieldCheck, Upload } from "lucide-react";
import { useRef, useState, type FormEvent, type ReactNode } from "react";
import { useStore } from "@/lib/store";

function Frame({ title, subtitle, children }: { title: string; subtitle: string; children: ReactNode }) {
  return (
    <main className="flex min-h-screen items-center justify-center px-4 py-10">
      <div className="card w-full max-w-md p-7 sm:p-8">
        <div className="flex items-center justify-center gap-2">
          <ShieldCheck className="h-8 w-8 text-primary" aria-hidden />
          <span className="brand-text font-[family-name:var(--font-display)] text-2xl font-bold">CP Consulting</span>
        </div>
        <h1 className="mt-6 text-center text-xl font-bold text-white">{title}</h1>
        <p className="mt-1 text-center text-sm text-mute">{subtitle}</p>
        {children}
      </div>
    </main>
  );
}

export function Gate({ children }: { children: ReactNode }) {
  const s = useStore();
  const [pass, setPass] = useState("");
  const [pass2, setPass2] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [view, setView] = useState<"main" | "restore" | "erase">("main");
  const [confirmText, setConfirmText] = useState("");
  const file = useRef<HTMLInputElement>(null);

  if (s.status === "open") return <>{children}</>;
  if (s.status === "loading") return <Frame title="Opening" subtitle="One moment."><div className="h-10" /></Frame>;

  const run = async (fn: () => Promise<string | void>) => {
    setBusy(true); setError("");
    try { const msg = await fn(); if (msg) setError(msg); else { setPass(""); setPass2(""); setView("main"); } }
    catch { setError("That did not work. Check that this browser allows site storage, then try again."); }
    setBusy(false);
  };
  const demoButton = (
    <button type="button" className="btn w-full" onClick={s.openDemo}><FlaskConical className="h-4 w-4" /> Open the demo with invented customers</button>
  );

  if (view === "restore") {
    const submit = (e: FormEvent) => { e.preventDefault(); run(async () => {
      const f = file.current?.files?.[0];
      if (!f) return "Choose your backup file first.";
      return (await s.restore(await f.text(), pass)) ? undefined : "The file or the passphrase is not right.";
    }); };
    return (
      <Frame title="Restore from a backup" subtitle="This replaces the workspace stored in this browser.">
        <form onSubmit={submit} className="mt-6 space-y-4">
          <label className="block"><span className="label">Backup file</span><input ref={file} type="file" accept=".crmbackup,application/json" className="input mt-1" /></label>
          <label className="block"><span className="label">Passphrase of that backup</span><input type="password" className="input mt-1" value={pass} onChange={(e) => setPass(e.target.value)} autoComplete="current-password" required /></label>
          {error && <p className="text-sm text-bad" role="alert">{error}</p>}
          <button className="btn btn-primary w-full" disabled={busy}><Upload className="h-4 w-4" /> {busy ? "Restoring" : "Restore"}</button>
          <button type="button" className="btn w-full" onClick={() => { setView("main"); setError(""); }}>Back</button>
        </form>
      </Frame>
    );
  }

  if (view === "erase") {
    return (
      <Frame title="Erase this workspace" subtitle="All customer data stored in this browser will be deleted. This cannot be undone.">
        <div className="mt-6 space-y-4">
          <label className="block"><span className="label">Type ERASE to confirm</span><input className="input mt-1" value={confirmText} onChange={(e) => setConfirmText(e.target.value)} /></label>
          <button className="btn btn-danger w-full" disabled={confirmText !== "ERASE" || busy} onClick={() => run(async () => { await s.erase(); setConfirmText(""); })}>Erase everything</button>
          <button type="button" className="btn w-full" onClick={() => setView("main")}>Back</button>
        </div>
      </Frame>
    );
  }

  if (s.status === "locked") {
    const submit = (e: FormEvent) => { e.preventDefault(); run(async () => ((await s.unlock(pass)) ? undefined : "That passphrase is not right.")); };
    return (
      <Frame title="Unlock your workspace" subtitle="Your customer data is encrypted in this browser.">
        <form onSubmit={submit} className="mt-6 space-y-4">
          <label className="block"><span className="label">Passphrase</span><input type="password" className="input mt-1" value={pass} onChange={(e) => setPass(e.target.value)} autoComplete="current-password" autoFocus required /></label>
          {error && <p className="text-sm text-bad" role="alert">{error}</p>}
          <button className="btn btn-primary w-full" disabled={busy}><Lock className="h-4 w-4" /> {busy ? "Unlocking" : "Unlock"}</button>
        </form>
        <div className="mt-4 space-y-2 border-t border-line/60 pt-4">
          {demoButton}
          <div className="flex justify-between text-xs">
            <button className="text-primary hover:underline" onClick={() => { setView("restore"); setError(""); }}>Restore from a backup</button>
            <button className="text-mute hover:underline" onClick={() => { setView("erase"); setError(""); }}>Forgot passphrase</button>
          </div>
        </div>
      </Frame>
    );
  }

  const submit = (e: FormEvent) => { e.preventDefault(); run(async () => {
    if (pass.length < 10) return "Use at least 10 characters.";
    if (pass !== pass2) return "The two passphrases do not match.";
    await s.createWorkspace(pass);
  }); };
  return (
    <Frame title="Set up your secure workspace" subtitle="Customer data stays on this device, encrypted with your passphrase.">
      <form onSubmit={submit} className="mt-6 space-y-4">
        <label className="block"><span className="label">Choose a passphrase (10 characters or more)</span><input type="password" className="input mt-1" value={pass} onChange={(e) => setPass(e.target.value)} autoComplete="new-password" required /></label>
        <label className="block"><span className="label">Repeat the passphrase</span><input type="password" className="input mt-1" value={pass2} onChange={(e) => setPass2(e.target.value)} autoComplete="new-password" required /></label>
        <p className="rounded-md border border-warn/30 bg-warn/5 px-3 py-2 text-xs text-warn">There is no reset. If you lose the passphrase, the data cannot be read by anyone, including us. Keep a backup file.</p>
        {error && <p className="text-sm text-bad" role="alert">{error}</p>}
        <button className="btn btn-primary w-full" disabled={busy}><KeyRound className="h-4 w-4" /> {busy ? "Creating" : "Create workspace"}</button>
      </form>
      <div className="mt-4 space-y-2 border-t border-line/60 pt-4">
        {demoButton}
        <button className="text-xs text-primary hover:underline" onClick={() => { setView("restore"); setError(""); }}>Restore from a backup</button>
      </div>
    </Frame>
  );
}
