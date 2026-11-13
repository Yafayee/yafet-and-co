"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { deleteEnvelope, isEnvelope, loadEnvelope, newSession, open, saveEnvelope, seal, type Envelope, type Session } from "./crypto";
import { demoDb } from "./demo";
import { DEFAULT_SETTINGS, DEFAULT_TEMPLATES } from "./templates";
import type { DB } from "./types";

type Status = "loading" | "setup" | "locked" | "open";
type Mode = "demo" | "workspace";

interface Store {
  status: Status;
  mode: Mode;
  db: DB;
  saved: "saved" | "saving" | "error";
  /** Change the data. The mutator receives a private copy; `audit` adds a line to the activity record. */
  update: (fn: (draft: DB) => void, audit?: string) => void;
  createWorkspace: (pass: string) => Promise<void>;
  unlock: (pass: string) => Promise<boolean>;
  openDemo: () => void;
  lock: () => void;
  changePassphrase: (current: string, next: string) => Promise<boolean>;
  backup: () => Promise<string>;
  restore: (fileText: string, pass: string) => Promise<boolean>;
  erase: () => Promise<void>;
}

const emptyDb = (): DB => ({ version: 1, customers: [], events: [], tasks: [], opp: {}, campaigns: [], settings: structuredClone(DEFAULT_SETTINGS), audit: [] });

/** Fill in anything a stored workspace from an older version may lack. */
function normalise(db: DB): DB {
  const base = emptyDb();
  const out = { ...base, ...db, settings: { ...base.settings, ...db.settings, templates: { ...DEFAULT_TEMPLATES, ...(db.settings?.templates ?? {}) } } };
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
  const session = useRef<Session | null>(null);
  const dbRef = useRef(db);
  const dirty = useRef(false);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    loadEnvelope().then((e) => setStatus(e ? "locked" : "setup")).catch(() => setStatus("setup"));
  }, []);

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

  const enter = (next: DB, m: Mode) => { dbRef.current = next; setDb(next); setMode(m); setStatus("open"); };

  const lock = useCallback(() => {
    const wasWorkspace = Boolean(session.current);
    const done = () => {
      session.current = null;
      const blank = emptyDb(); dbRef.current = blank; setDb(blank);
      loadEnvelope().then((e) => setStatus(e ? "locked" : "setup")).catch(() => setStatus("setup"));
    };
    if (wasWorkspace) { if (timer.current) clearTimeout(timer.current); flush().finally(done); } else done();
  }, [flush]);

  const store = useMemo<Store>(() => ({
    status, mode, db, saved, update, lock,
    openDemo: () => { session.current = null; enter(demoDb(), "demo"); },
    createWorkspace: async (pass) => {
      const s = await newSession(pass);
      const fresh = emptyDb();
      fresh.audit.push({ ts: Date.now(), action: "Workspace created" });
      await saveEnvelope(await seal(s, fresh));
      session.current = s;
      enter(fresh, "workspace");
    },
    unlock: async (pass) => {
      const env = await loadEnvelope();
      if (!env) return false;
      try {
        const { session: s, value } = await open<DB>(pass, env);
        session.current = s;
        const next = normalise(value);
        next.audit.unshift({ ts: Date.now(), action: "Workspace unlocked" });
        enter(next, "workspace");
        dirty.current = true; flush();
        return true;
      } catch { return false; }
    },
    changePassphrase: async (current, next) => {
      const env = await loadEnvelope();
      if (!env) return false;
      try { await open<DB>(current, env); } catch { return false; }
      session.current = await newSession(next);
      dbRef.current = { ...dbRef.current, audit: [{ ts: Date.now(), action: "Passphrase changed" }, ...dbRef.current.audit] };
      setDb(dbRef.current);
      dirty.current = true; await flush();
      return true;
    },
    backup: async () => {
      if (!session.current) throw new Error("No workspace open");
      return JSON.stringify(await seal(session.current, dbRef.current));
    },
    restore: async (fileText, pass) => {
      let env: Envelope;
      try { env = JSON.parse(fileText); } catch { return false; }
      if (!isEnvelope(env)) return false;
      try {
        const { session: s, value } = await open<DB>(pass, env);
        const next = normalise(value);
        next.audit.unshift({ ts: Date.now(), action: "Workspace restored from backup file" });
        await saveEnvelope(await seal(s, next));
        session.current = s;
        enter(next, "workspace");
        return true;
      } catch { return false; }
    },
    erase: async () => {
      if (timer.current) clearTimeout(timer.current);
      dirty.current = false; session.current = null;
      await deleteEnvelope();
      const blank = emptyDb(); dbRef.current = blank; setDb(blank); setStatus("setup");
    },
  }), [status, mode, db, saved, update, lock, flush]);

  // Save before the tab closes, and lock after a period without activity.
  useEffect(() => {
    if (status !== "open" || mode !== "workspace") return;
    const onHide = () => { if (document.visibilityState === "hidden") flush(); };
    document.addEventListener("visibilitychange", onHide);
    window.addEventListener("pagehide", flush);
    let idle: ReturnType<typeof setTimeout>;
    const minutes = Math.max(1, db.settings.autoLockMin || 15);
    const reset = () => { clearTimeout(idle); idle = setTimeout(lock, minutes * 60_000); };
    const evts = ["pointerdown", "keydown", "scroll"] as const;
    evts.forEach((e) => window.addEventListener(e, reset, { passive: true }));
    reset();
    return () => {
      document.removeEventListener("visibilitychange", onHide);
      window.removeEventListener("pagehide", flush);
      evts.forEach((e) => window.removeEventListener(e, reset));
      clearTimeout(idle);
    };
  }, [status, mode, db.settings.autoLockMin, flush, lock]);

  return <Ctx.Provider value={store}>{children}</Ctx.Provider>;
}
