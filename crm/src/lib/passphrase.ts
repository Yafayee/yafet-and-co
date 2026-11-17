/** A rough but honest strength check. It runs only in the browser; the passphrase is never stored. */
export interface Strength { level: "weak" | "fair" | "strong"; hint: string }

const COMMON = ["password", "passwort", "qwertz", "qwerty", "123456", "abc123", "letmein", "hallo", "geheim", "admin", "welcome", "willkommen", "iloveyou", "cpconsulting", "ovb"];
export const MIN_LENGTH = 12;

export function strength(pass: string): Strength {
  const p = pass.trim();
  const lower = p.toLowerCase();
  const unique = new Set(p).size;
  const words = p.split(/[\s\-_.]+/).filter((w) => w.length >= 3).length;
  if (p.length < MIN_LENGTH) return { level: "weak", hint: `Use at least ${MIN_LENGTH} characters. Four random words work well.` };
  if (unique < 6) return { level: "weak", hint: "Too many repeated characters." };
  if (/^\d+$/.test(p)) return { level: "weak", hint: "Numbers alone are easy to guess. Add words." };
  if (COMMON.some((c) => lower.includes(c))) return { level: "weak", hint: "It contains a very common word. Choose something nobody would guess." };
  if (/(.)\1{3,}/.test(p) || /(0123|1234|2345|3456|4567|5678|6789|abcd|qwer|asdf)/i.test(lower)) return { level: "weak", hint: "It contains a simple pattern such as 1234 or aaaa." };
  if (p.length >= 20 || words >= 4) return { level: "strong", hint: "Strong. Do not use it anywhere else." };
  return { level: "fair", hint: "Acceptable. Four or more random words would be stronger." };
}
