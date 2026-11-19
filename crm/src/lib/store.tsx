"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { addRecovery, checkPass, rotate, deleteEnvelope, isEnvelope, loadEnvelope, newSession, open, openWithRecovery, passkeyOf, saveEnvelope, seal, setPassphrase, type Envelope, type Session } from "./crypto";
import { askPasskey, createPasskey } from "./passkey";
import { recordFail, recordOk, waitMs } from "./throttle";
import { demoDb } from "./demo";
import { emptyKnowledge } from "./knowledge";
import { setLang, storedLang, type Lang } from "./i18n";
import { strength } from "./passphrase";
import { DEFAULT_SETTINGS, DEFAULT_TEMPLATES } from "./templates";
import type { DB } from "./types";
import { t } from "@/lib/i18n";

type Status = "loading" | "setup" | "locked" | "open";
type Mode = "demo" | "workspace";
/**
 * "busy": already open in another tab. "passkey": the passkey was not given
 * (cancelled, or not available on this device). "wait": too many wrong attempts.
 */
export type LockChange = { status: "ok"; code?: string } | { status: "wrong" | "passkey" | "failed" };
export type OpenResult = "ok" | "wrong" | "busy" | "passkey" | "wait";

interface Store {
  status: Status;
  mode: Mode;
  db: DB;
  saved: "saved" | "saving" | "error";
  lang: Lang;
  setLanguage: (l: Lang) => void;
  /** True when the passphrase used to unlock is weak. Known only for this session. */
  weakPass: boolean;
  /** Whether the browser promised not to clear this site's data on its own (null = not known). */
  persisted: boolean | null;
  /** Change the data. The mutator receives a private copy; `audit` adds a line to the activity record. */
  update: (fn: (draft: DB) => void, audit?: string) => void;
  createWorkspace: (pass: string) => Promise<void>;
  /** "busy" means the workspace is already open in another tab or window of this browser. */
  unlock: (pass: string) => Promise<OpenResult>;
  /** Which extra protections the open workspace has. */
  security: { passkey: boolean; recovery: boolean };
  /**
   * Opens with the recovery code and sets a new passphrase. With `fileText` a
   * backup file is recovered instead of the workspace stored in this browser.
   * A passkey requirement is removed, because the code is used when it is lost.
   */
  recover: (code: string, newPass: string, fileText?: string) => Promise<OpenResult>;
  /**
   * The changes below need the current passphrase. Whenever a way of opening is
   * withdrawn or strengthened, the data is re-encrypted under a fresh key, so a
   * lock copied from an older backup no longer fits. That also ends the old
   * recovery code; where one existed, a new one comes back in `code`. It is
   * shown once and never stored. "failed" means the change could not be saved
   * and nothing was changed.
   */
  createRecoveryCode: (pass: string) => Promise<LockChange>;
  removeRecoveryCode: (pass: string) => Promise<LockChange>;
  enablePasskey: (pass: string) => Promise<LockChange | { status: "unsupported" | "cancelled" | "norecovery" }>;
  disablePasskey: (pass: string) => Promise<LockChange>;
  openDemo: () => void;
  lock: () => void;
  changePassphrase: (current: string, next: string) => Promise<LockChange>;
  backup: () => Promise<string>;
  restore: (fileText: string, pass: string) => Promise<OpenResult>;
  erase: () => Promise<void>;
}

const emptyDb = (): DB => ({ version: 1, customers: [], events: [], tasks: [], opp: {}, campaigns: [], settings: structuredClone(DEFAULT_SETTINGS), knowledge: emptyKnowledge(), audit: [] });

/** Fill in anything a stored workspace from an older version may lack. */
function normalise(db: DB): DB {
  const base = emptyDb();
  const customers = (db.customers ?? []).map((c) => ({ ...c, housing: c.housing ?? "unknown", children: c.children ?? "unknown", marital: c.marital ?? "unknown", employment: c.employment ?? "unknown", kids: c.kids ?? [], income: c.income ?? "" }));
  const out = { ...base, ...db, customers, knowledge: { ...emptyKnowledge(), ...(db.knowledge ?? {}) }, settings: { ...base.settings, ...db.settings, templates: { ...DEFAULT_TEMPLATES, ...(db.settings?.templates ?? {}) } } };
  // Old profile copies kept for "undo import" are dropped once the seven days are over.
  if (out.lastImport && Date.now() - out.lastImport.ts > 7 * 86_400_000) out.lastImport = null;
  return out;
}

const Ctx = createContext<Store | null>(null);
export function useStore(): Store {
  const s = useContext(Ctx);
  if (!s) throw new Error("useStore outside provider");
  return s;
}

export function StoreProvider({ children }: { children: ReactNode }) {
  const [status, setStatus] = useState<Status>("loading");
  const [mode, setMode] = useState<Mode>("demo");
  const [db, setDb] = useState<DB>(emptyDb);
  const [saved, setSaved] = useState<Store["saved"]>("saved");
  // The server renders English; the stored language is applied right after the page loads.
  const [lang, setLangState] = useState<Lang>("en");
  const setLanguage = useCallback((l: Lang) => { setLang(l); setLangState(l); }, []);
  const [weakPass, setWeakPass] = useState(false);
  const [persisted, setPersisted] = useState<boolean | null>(null);
  const session = useRef<Session | null>(null);
  const [security, setSecurity] = useState({ passkey: false, recovery: false });
  const started = (s: Session) => { session.current = s; setSecurity({ passkey: Boolean(s.pass.passkey), recovery: Boolean(s.recovery) }); };
  const release = useRef<(() => void) | null>(null);
  /**
   * Only one tab may have the workspace open, because two tabs would each save
   * their own copy and the later save would silently undo the other's changes.
   */
  const claim = useCallback((): Promise<boolean> => new Promise((done) => {
    if (release.current) return done(true);
    const locks = typeof navigator !== "undefined" ? navigator.locks : undefined;
    if (!locks) return done(true);
    locks.request("cp-crm-workspace", { ifAvailable: true }, (lock) => {
      if (!lock) { done(false); return undefined; }
      done(true);
      return new Promise<void>((free) => { release.current = () => { release.current = null; free(); }; });
    }).catch(() => done(true));
  }), []);
  /** Ask the browser to keep the stored data even when disk space runs low. */
  const keep = useCallback(() => {
    const st = typeof navigator !== "undefined" ? navigator.storage : undefined;
    if (!st?.persist) { setPersisted(null); return; }
    st.persist().then(setPersisted).catch(() => setPersisted(null));
  }, []);
  const dbRef = useRef(db);
  const dirty = useRef(false);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    const start = (s: Status) => { const l = storedLang(); if (l !== "en") setLanguage(l); setStatus(s); };
    loadEnvelope().then((e) => start(e ? "locked" : "setup")).catch(() => start("setup"));
  }, [setLanguage]);

  const flush = useCallback(async () => {
    if (!session.current || !dirty.current) return;
    dirty.current = false;
    try { await saveEnvelope(await seal(session.current, dbRef.current)); setSaved("saved"); }
    catch { dirty.current = true; setSaved("error"); }
  }, []);

  const update = useCallback<Store["update"]>((fn, audit) => {
    setDb((prev) => {
      const next = structuredClone(prev);
      fn(next);
      if (audit) { next.audit.unshift({ ts: Date.now(), action: audit }); next.audit.length = Math.min(next.audit.length, 500); }
      dbRef.current = next;
      return next;
    });
    if (session.current) {
      dirty.current = true;
      setSaved("saving");
      if (timer.current) clearTimeout(timer.current);
      timer.current = setTimeout(flush, 400);
    }
  }, [flush]);

  /**
   * Changes the locks on the data key. The change is made on a copy of the
   * session and only kept once it is safely stored; if storing fails, the
   * previous locks stay in force and the caller learns about it.
   */
  const relock = useCallback(async <T,>(action: string, change: (s: Session) => Promise<T>): Promise<T> => {
    const before = session.current;
    if (!before) throw new Error("No workspace open");
    const next: Session = { ...before };
    const result = await change(next);
    const audited = { ...dbRef.current, audit: [{ ts: Date.now(), action }, ...dbRef.current.audit].slice(0, 500) };
    if (timer.current) clearTimeout(timer.current);
    try { await saveEnvelope(await seal(next, audited)); }
    catch { setSaved("error"); throw new Error("not saved"); }
    session.current = next; dbRef.current = audited; setDb(audited);
    dirty.current = false; setSaved("saved");
    setSecurity({ passkey: Boolean(next.pass.passkey), recovery: Boolean(next.recovery) });
    return result;
  }, []);
  /** Checks the current passphrase (asking the passkey when one is required). */
  const verify = useCallback(async (pass: string): Promise<{ ok: true; passkey?: { id: string; salt: string; prf: Uint8Array<ArrayBuffer> } } | { ok: false; status: "wrong" | "passkey" }> => {
    const s = session.current;
    if (!s) return { ok: false, status: "wrong" };
    const pk = s.pass.passkey;
    const prf = pk ? await askPasskey(pk.id, pk.salt) : null;
    if (pk && !prf) return { ok: false, status: "passkey" };
    if (!(await checkPass(s, pass, prf ?? undefined))) return { ok: false, status: "wrong" };
    return { ok: true, passkey: pk && prf ? { ...pk, prf } : undefined };
  }, []);

  const enter = (next: DB, m: Mode) => { dbRef.current = next; setDb(next); setMode(m); setStatus("open"); };

  const lock = useCallback(() => {
    const wasWorkspace = Boolean(session.current);
    const done = () => {
      session.current = null;
      release.current?.();
      const blank = emptyDb(); dbRef.current = blank; setDb(blank);
      loadEnvelope().then((e) => setStatus(e ? "locked" : "setup")).catch(() => setStatus("setup"));
    };
    if (!wasWorkspace) return done();
    if (timer.current) clearTimeout(timer.current);
    // If the last save failed, stay open: locking would throw the unsaved changes away.
    flush().finally(() => { if (dirty.current) setSaved("error"); else done(); });
  }, [flush]);

  const store = useMemo<Store>(() => ({
    status, mode, db, saved, update, lock, weakPass, persisted, lang, setLanguage, security,
    openDemo: () => { session.current = null; setSecurity({ passkey: false, recovery: false }); enter(demoDb(), "demo"); },
    createWorkspace: async (pass) => {
      if (!(await claim())) throw new Error("busy");
      const s = await newSession(pass);
      const fresh = emptyDb();
      fresh.audit.push({ ts: Date.now(), action: t("Workspace created") });
      fresh.settings.seenBuild = process.env.NEXT_PUBLIC_BUILD ?? "local";
      await saveEnvelope(await seal(s, fresh));
      started(s);
      setWeakPass(strength(pass).level === "weak"); keep();
      enter(fresh, "workspace");
    },
    unlock: async (pass) => {
      if (waitMs() > 0) return "wait";
      const env = await loadEnvelope();
      if (!env) return "wrong";
      const pk = passkeyOf(env);
      const prf = pk ? await askPasskey(pk.id, pk.salt) : undefined;
      if (pk && !prf) return "passkey";
      let opened: { session: Session; value: DB };
      try { opened = await open<DB>(pass, env, prf ?? undefined); } catch { recordFail(); return "wrong"; }
      if (!(await claim())) return "busy";
      // Read again after claiming: another tab may have saved while the passphrase was being checked.
      const fresh = await loadEnvelope();
      if (fresh && fresh.savedAt !== env.savedAt) { try { opened = await open<DB>(pass, fresh, prf ?? undefined); } catch { release.current?.(); return "wrong"; } }
      recordOk();
      started(opened.session);
      const next = normalise(opened.value);
      next.audit.unshift({ ts: Date.now(), action: "Workspace unlocked" });
      setWeakPass(strength(pass).level === "weak"); keep();
      enter(next, "workspace");
      dirty.current = true; flush();
      return "ok";
    },
    recover: async (code, newPass, fileText) => {
      if (waitMs() > 0) return "wait";
      let env: Envelope | null;
      if (fileText === undefined) env = await loadEnvelope();
      else { try { const parsed: unknown = JSON.parse(fileText); env = isEnvelope(parsed) ? parsed : null; } catch { env = null; } }
      if (!env) return "wrong";
      let opened: { session: Session; value: DB };
      try { opened = await openWithRecovery<DB>(code, env); } catch { recordFail(); return "wrong"; }
      if (!(await claim())) return "busy";
      recordOk();
      // The code is single use: the data moves to a fresh key locked by the new passphrase only.
      // The old passphrase, any passkey and the code itself no longer open anything saved from now on.
      await rotate(opened.session, newPass);
      const next = normalise(opened.value);
      next.audit.unshift({ ts: Date.now(), action: fileText === undefined ? "Workspace opened with the recovery code; new passphrase set" : "Backup file opened with the recovery code; new passphrase set" });
      await saveEnvelope(await seal(opened.session, next));
      started(opened.session);
      setWeakPass(strength(newPass).level === "weak"); keep();
      enter(next, "workspace");
      return "ok";
    },
    changePassphrase: async (current, next) => {
      const v = await verify(current);
      if (!v.ok) return { status: v.status };
      try {
        const code = await relock("Passphrase changed", async (n) => { const had = Boolean(n.recovery); await rotate(n, next, v.passkey); return had ? addRecovery(n) : undefined; });
        setWeakPass(strength(next).level === "weak");
        return { status: "ok", code };
      } catch { return { status: "failed" }; }
    },
    createRecoveryCode: async (pass) => {
      const v = await verify(pass);
      if (!v.ok) return { status: v.status };
      const had = Boolean(session.current?.recovery);
      try {
        // Replacing a code withdraws the old one, so the data key is renewed as well.
        const code = await relock(had ? "Recovery code replaced" : "Recovery code created", async (n) => { if (had) await rotate(n, pass, v.passkey); return addRecovery(n); });
        return { status: "ok", code };
      } catch { return { status: "failed" }; }
    },
    removeRecoveryCode: async (pass) => {
      if (session.current?.pass.passkey) return { status: "wrong" }; // with a passkey the code is the only way back in
      const v = await verify(pass);
      if (!v.ok) return { status: v.status };
      try { await relock("Recovery code removed", (n) => rotate(n, pass)); return { status: "ok" }; }
      catch { return { status: "failed" }; }
    },
    enablePasskey: async (pass) => {
      const s = session.current;
      if (!s || s.pass.passkey) return { status: "wrong" };
      if (!s.recovery) return { status: "norecovery" };
      if (!(await checkPass(s, pass))) return { status: "wrong" };
      const made = await createPasskey("CRM workspace");
      if (typeof made === "string") return { status: made };
      try {
        // A fresh key, so that a backup from before the passkey cannot be used to get around it.
        const code = await relock("Passkey switched on as a second factor", async (n) => { await rotate(n, pass, made); return addRecovery(n); });
        return { status: "ok", code };
      } catch { return { status: "failed" }; }
    },
    disablePasskey: async (pass) => {
      if (!session.current?.pass.passkey) return { status: "wrong" };
      const v = await verify(pass);
      if (!v.ok) return { status: v.status };
      try { await relock("Passkey switched off", (n) => setPassphrase(n, pass)); return { status: "ok" }; }
      catch { return { status: "failed" }; }
    },
    backup: async () => {
      if (!session.current) throw new Error("No workspace open");
      return JSON.stringify(await seal(session.current, dbRef.current));
    },
    restore: async (fileText, pass) => {
      if (waitMs() > 0) return "wait";
      let env: unknown;
      try { env = JSON.parse(fileText); } catch { return "wrong"; }
      if (!isEnvelope(env)) return "wrong";
      const pk = passkeyOf(env);
      const prf = pk ? await askPasskey(pk.id, pk.salt) : undefined;
      if (pk && !prf) return "passkey";
      let opened: { session: Session; value: DB };
      try { opened = await open<DB>(pass, env, prf ?? undefined); } catch { recordFail(); return "wrong"; }
      if (!(await claim())) return "busy";
      recordOk();
      const next = normalise(opened.value);
      next.audit.unshift({ ts: Date.now(), action: "Workspace restored from backup file" });
      await saveEnvelope(await seal(opened.session, next));
      started(opened.session);
      setWeakPass(strength(pass).level === "weak"); keep();
      enter(next, "workspace");
      return "ok";
    },
    erase: async () => {
      if (timer.current) clearTimeout(timer.current);
      dirty.current = false; session.current = null;
      release.current?.();
      await deleteEnvelope();
      const blank = emptyDb(); dbRef.current = blank; setDb(blank); setStatus("setup");
    },
  }), [status, mode, db, saved, update, lock, flush, weakPass, persisted, keep, lang, setLanguage, claim, security, relock, verify]);

  // Save before the tab closes, and lock after a period without activity.
  useEffect(() => {
    if (status !== "open" || mode !== "workspace") return;
    const onHide = () => { if (document.visibilityState === "hidden") flush(); };
    document.addEventListener("visibilitychange", onHide);
    window.addEventListener("pagehide", flush);
    // Lock by the clock, not by a timer alone: a sleeping computer pauses timers,
    // so the time since the last activity is checked again whenever the page wakes.
    const limit = Math.max(1, db.settings.autoLockMin || 15) * 60_000;
    let last = Date.now();
    const check = () => { if (Date.now() - last >= limit) lock(); };
    const reset = () => { last = Date.now(); };
    const wake = () => { if (document.visibilityState === "visible") check(); };
    const idle = setInterval(check, 15_000);
    const evts = ["pointerdown", "keydown", "scroll"] as const;
    evts.forEach((e) => window.addEventListener(e, reset, { passive: true }));
    document.addEventListener("visibilitychange", wake);
    window.addEventListener("focus", check);
    return () => {
      document.removeEventListener("visibilitychange", onHide);
      window.removeEventListener("pagehide", flush);
      evts.forEach((e) => window.removeEventListener(e, reset));
      document.removeEventListener("visibilitychange", wake);
      window.removeEventListener("focus", check);
      clearInterval(idle);
    };
  }, [status, mode, db.settings.autoLockMin, flush, lock]);

  // The key makes every screen render again when the language changes.
  return <Ctx.Provider value={store}><div key={lang} className="contents">{children}</div></Ctx.Provider>;
}
