/**
 * Slows down guessing at the unlock screen. After a few wrong attempts the
 * next try has to wait, and the wait grows. This stops someone sitting at the
 * computer from trying passphrase after passphrase; it survives a page reload.
 * (Someone who copies the stored data elsewhere is held back by the slow key
 * derivation and, if switched on, by the passkey.)
 */
const KEY = "cp-crm-attempts";
const FREE = 4; // wrong attempts before waiting starts
const STEPS = [30, 60, 120, 300, 900]; // seconds

interface State { n: number; until: number }
type Box = Pick<Storage, "getItem" | "setItem" | "removeItem">;
const box = (): Box | null => { try { return typeof localStorage !== "undefined" ? localStorage : null; } catch { return null; } };

function read(b: Box | null): State {
  try { const s = JSON.parse(b?.getItem(KEY) ?? "null") as State | null; if (s && Number.isFinite(s.n) && Number.isFinite(s.until)) return s; } catch { /* unreadable: start again */ }
  return { n: 0, until: 0 };
}
/** Milliseconds still to wait before the next attempt (0 = go ahead). */
export function waitMs(now = Date.now(), b: Box | null = box()): number {
  const s = read(b);
  // A clock set far into the past must not make the wait endless.
  return Math.max(0, Math.min(s.until - now, STEPS[STEPS.length - 1] * 1000));
}
export function recordFail(now = Date.now(), b: Box | null = box()): number {
  const s = read(b);
  const n = s.n + 1;
  const wait = n <= FREE ? 0 : STEPS[Math.min(n - FREE - 1, STEPS.length - 1)] * 1000;
  try { b?.setItem(KEY, JSON.stringify({ n, until: now + wait })); } catch { /* storage blocked */ }
  return wait;
}
export function recordOk(b: Box | null = box()): void { try { b?.removeItem(KEY); } catch { /* storage blocked */ } }
