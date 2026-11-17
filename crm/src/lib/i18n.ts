import { DE, DE_PATTERNS } from "./de";

/**
 * Interface language. English text is the key; German comes from the
 * dictionary in de.ts, and anything missing there stays English. `t` is called
 * while rendering, never at module level, so a language switch takes effect on
 * the next render.
 */
export type Lang = "en" | "de";
let lang: Lang = "en";
const KEY = "cp-crm-lang";

export const getLang = (): Lang => lang;
export function setLang(next: Lang) {
  lang = next;
  if (typeof document !== "undefined") document.documentElement.lang = next;
  try { localStorage.setItem(KEY, next); } catch { /* storage may be unavailable */ }
}
/** The language chosen earlier on this device, or German when the browser is set to German. */
export function storedLang(): Lang {
  try {
    const v = localStorage.getItem(KEY);
    if (v === "de" || v === "en") return v;
  } catch { /* ignore */ }
  return typeof navigator !== "undefined" && navigator.language?.toLowerCase().startsWith("de") ? "de" : "en";
}

function german(text: string): string {
  const exact = DE[text];
  if (exact !== undefined) return exact;
  for (const [re, make] of DE_PATTERNS) {
    const m = text.match(re);
    if (m) return make(m, german);
  }
  return text;
}

export function t(text: string, vars?: Record<string, string | number>): string {
  let out = lang === "de" ? german(text) : text;
  if (vars) for (const [k, v] of Object.entries(vars)) out = out.replaceAll(`{${k}}`, String(v));
  return out;
}
