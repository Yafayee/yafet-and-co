// The sample data is anchored to a fixed day so every screen shows the same
// thing on server and client. The real backend will use the current date.
export const TODAY = new Date("2026-11-13T09:00:00");

const DAY = 86_400_000;

export function iso(d: Date): string {
  return d.toISOString().slice(0, 10);
}

export function addDays(d: Date, n: number): Date {
  return new Date(d.getTime() + n * DAY);
}

export function age(dob: string, at: Date = TODAY): number {
  const b = new Date(dob);
  let a = at.getFullYear() - b.getFullYear();
  if (at.getMonth() < b.getMonth() || (at.getMonth() === b.getMonth() && at.getDate() < b.getDate())) a--;
  return a;
}

/** Days from today until the next birthday (0 = today). */
export function daysToBirthday(dob: string, at: Date = TODAY): number {
  const b = new Date(dob);
  const start = new Date(at.getFullYear(), at.getMonth(), at.getDate());
  let next = new Date(at.getFullYear(), b.getMonth(), b.getDate());
  if (next < start) next = new Date(at.getFullYear() + 1, b.getMonth(), b.getDate());
  return Math.round((next.getTime() - start.getTime()) / DAY);
}

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

export function fmtDate(s: string): string {
  const d = new Date(s);
  return `${d.getDate()} ${MONTHS[d.getMonth()]} ${d.getFullYear()}`;
}

export function fmtDayMonth(s: string): string {
  const d = new Date(s);
  return `${d.getDate()} ${MONTHS[d.getMonth()]}`;
}

export function daysAgo(s: string, at: Date = TODAY): number {
  return Math.max(0, Math.round((at.getTime() - new Date(s).getTime()) / DAY));
}

export function relative(s: string): string {
  const n = daysAgo(s);
  if (n === 0) return "today";
  if (n === 1) return "yesterday";
  if (n < 30) return `${n} days ago`;
  if (n < 365) return `${Math.round(n / 30)} months ago`;
  return `${Math.round(n / 365)} years ago`;
}
