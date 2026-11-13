// All dates are handled as local calendar dates ("YYYY-MM-DD") to avoid
// time-zone shifts around midnight.
const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
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

export function fmtDate(s: string): string {
  const d = parseIso(s);
  return d ? `${d.getDate()} ${MONTHS[d.getMonth()]} ${d.getFullYear()}` : "Not known";
}
export function fmtDayMonth(s: string): string {
  const d = parseIso(s);
  return d ? `${d.getDate()} ${MONTHS[d.getMonth()]}` : "Not known";
}
export function fmtDateTime(ts: number): string {
  const d = new Date(ts);
  return `${d.getDate()} ${MONTHS[d.getMonth()]} ${d.getFullYear()} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
}
export function daysAgo(s: string): number | null {
  const d = parseIso(s);
  return d ? Math.max(0, dayDiff(startOfToday(), d)) : null;
}
export function relative(s: string): string {
  const n = daysAgo(s);
  if (n === null) return "never";
  if (n === 0) return "today";
  if (n === 1) return "yesterday";
  if (n < 60) return `${n} days ago`;
  if (n < 365) return `${Math.round(n / 30)} months ago`;
  const y = Math.round(n / 365);
  return y === 1 ? "1 year ago" : `${y} years ago`;
}
export function longToday(): string {
  const d = new Date();
  const days = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
  const months = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
  return `${days[d.getDay()]}, ${d.getDate()} ${months[d.getMonth()]} ${d.getFullYear()}`;
}
