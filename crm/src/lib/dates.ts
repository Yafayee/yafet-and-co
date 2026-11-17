// All dates are handled as local calendar dates ("YYYY-MM-DD") to avoid
// time-zone shifts around midnight.
import { getLang, t } from "./i18n";

const MONTHS_EN = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
const MONTHS_DE = ["Jän.", "Feb.", "März", "Apr.", "Mai", "Juni", "Juli", "Aug.", "Sep.", "Okt.", "Nov.", "Dez."];
const month = (i: number) => (getLang() === "de" ? MONTHS_DE : MONTHS_EN)[i];
const dot = () => (getLang() === "de" ? "." : "");
const pad = (n: number) => String(n).padStart(2, "0");

export function toIso(d: Date): string {
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}
export function todayIso(): string {
  return toIso(new Date());
}
export function parseIso(s: string): Date | null {
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(s || "");
  if (!m) return null;
  const d = new Date(+m[1], +m[2] - 1, +m[3]);
  return d.getMonth() === +m[2] - 1 ? d : null;
}
export function addDays(d: Date, n: number): Date {
  const x = new Date(d.getFullYear(), d.getMonth(), d.getDate());
  x.setDate(x.getDate() + n);
  return x;
}
const startOfToday = () => { const n = new Date(); return new Date(n.getFullYear(), n.getMonth(), n.getDate()); };
const dayDiff = (a: Date, b: Date) => Math.round((a.getTime() - b.getTime()) / 86_400_000);

export function age(dob: string): number | null {
  const b = parseIso(dob);
  if (!b) return null;
  const t = startOfToday();
  let a = t.getFullYear() - b.getFullYear();
  if (t.getMonth() < b.getMonth() || (t.getMonth() === b.getMonth() && t.getDate() < b.getDate())) a--;
  return a;
}

/** Days until the next birthday (0 = today), or null when the date of birth is unknown. */
export function daysToBirthday(dob: string): number | null {
  const b = parseIso(dob);
  if (!b) return null;
  const t = startOfToday();
  let next = new Date(t.getFullYear(), b.getMonth(), b.getDate());
  if (next < t) next = new Date(t.getFullYear() + 1, b.getMonth(), b.getDate());
  return dayDiff(next, t);
}

/** Days since the most recent birthday (0 = today), or null. */
export function daysSinceBirthday(dob: string): number | null {
  const b = parseIso(dob);
  if (!b) return null;
  const t = startOfToday();
  let last = new Date(t.getFullYear(), b.getMonth(), b.getDate());
  if (last > t) last = new Date(t.getFullYear() - 1, b.getMonth(), b.getDate());
  return dayDiff(t, last);
}

/** Days from today until the date (negative when it has passed), or null. */
export function daysUntil(s: string): number | null {
  const d = parseIso(s);
  return d ? dayDiff(d, startOfToday()) : null;
}

/** Euro amount: whole numbers as they are, others with two decimals. */
export function eur(n: number): string {
  return `€${Number.isInteger(n) ? n : n.toFixed(2)}`;
}

export function fmtDate(s: string): string {
  const d = parseIso(s);
  return d ? `${d.getDate()}${dot()} ${month(d.getMonth())} ${d.getFullYear()}` : t("Not known");
}
export function fmtDayMonth(s: string): string {
  const d = parseIso(s);
  return d ? `${d.getDate()}${dot()} ${month(d.getMonth())}` : t("Not known");
}
export function fmtDateTime(ts: number): string {
  const d = new Date(ts);
  return `${d.getDate()}${dot()} ${month(d.getMonth())} ${d.getFullYear()} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
}
export function daysAgo(s: string): number | null {
  const d = parseIso(s);
  return d ? Math.max(0, dayDiff(startOfToday(), d)) : null;
}
export function relative(s: string): string {
  const n = daysAgo(s);
  if (n === null) return t("never");
  if (n === 0) return t("today");
  if (n === 1) return t("yesterday");
  if (n < 60) return t("{n} days ago", { n });
  if (n < 365) return t("{n} months ago", { n: Math.round(n / 30) });
  const y = Math.round(n / 365);
  return y === 1 ? t("1 year ago") : t("{n} years ago", { n: y });
}
export function longToday(): string {
  return new Date().toLocaleDateString(getLang() === "de" ? "de-AT" : "en-GB", { weekday: "long", day: "numeric", month: "long", year: "numeric" });
}
