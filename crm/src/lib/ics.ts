import type { Customer, Task } from "./types";

/**
 * Calendar files (.ics) that Outlook, Google Calendar, Apple Calendar and the
 * IceWarp calendar can import. Times are written as local "floating" times,
 * so 10:00 stays 10:00 wherever the file is opened.
 */
const esc = (s: string) => s.replace(/\\/g, "\\\\").replace(/;/g, "\;").replace(/,/g, "\\,").replace(/\r?\n/g, "\\n");
/** Lines longer than 75 bytes are folded, as the format requires. */
function fold(line: string): string {
  const out: string[] = [];
  let cur = "";
  for (const ch of line) {
    if (new TextEncoder().encode(cur + ch).length > 74) { out.push(cur); cur = " " + ch; } else cur += ch;
  }
  out.push(cur);
  return out.join("\r\n");
}
const stamp = (d: Date) => d.toISOString().replace(/[-:]/g, "").replace(/\.\d{3}/, "");
const day = (iso: string) => iso.replace(/-/g, "");
const nextDay = (iso: string) => { const [y, m, d] = iso.split("-").map(Number); const x = new Date(y, m - 1, d + 1); return `${x.getFullYear()}${String(x.getMonth() + 1).padStart(2, "0")}${String(x.getDate()).padStart(2, "0")}`; };

export const KIND_LABEL: Record<NonNullable<Task["kind"]>, string> = { task: "Task", call: "Call", meeting: "Meeting" };

export function taskEvent(task: Task, c: Customer | undefined, now = new Date()): string[] {
  const who = c ? `${c.firstName} ${c.lastName}`.trim() : "";
  const lines = ["BEGIN:VEVENT", `UID:${task.id}@cp-crm`, `DTSTAMP:${stamp(now)}`];
  if (task.time && /^\d{2}:\d{2}$/.test(task.time)) {
    const start = `${day(task.due)}T${task.time.replace(":", "")}00`;
    const mins = Math.max(5, Math.min(600, task.minutes ?? (task.kind === "call" ? 15 : 60)));
    const [h, m] = task.time.split(":").map(Number);
    const endD = new Date(2000, 0, 1, h, m + mins);
    const end = endD.getDate() === 1 ? `${day(task.due)}T${String(endD.getHours()).padStart(2, "0")}${String(endD.getMinutes()).padStart(2, "0")}00` : `${day(task.due)}T235900`;
    lines.push(`DTSTART:${start}`, `DTEND:${end}`);
  } else {
    lines.push(`DTSTART;VALUE=DATE:${day(task.due)}`, `DTEND;VALUE=DATE:${nextDay(task.due)}`);
  }
  lines.push(`SUMMARY:${esc([task.title, who].filter(Boolean).join(" – "))}`);
  if (task.place) lines.push(`LOCATION:${esc(task.place)}`);
  const desc = [c?.phone ? `Tel: ${c.phone}` : "", c?.email ? `E-Mail: ${c.email}` : ""].filter(Boolean).join("\n");
  if (desc) lines.push(`DESCRIPTION:${esc(desc)}`);
  lines.push("BEGIN:VALARM", "ACTION:DISPLAY", `DESCRIPTION:${esc(task.title)}`, `TRIGGER:${task.time ? "-PT15M" : "-PT9H"}`, "END:VALARM", "END:VEVENT");
  return lines;
}

export function calendarFile(items: { task: Task; customer?: Customer }[], now = new Date()): string {
  const lines = ["BEGIN:VCALENDAR", "VERSION:2.0", "PRODID:-//CP Consulting//CRM//DE", "CALSCALE:GREGORIAN", "METHOD:PUBLISH"];
  for (const { task, customer } of items) lines.push(...taskEvent(task, customer, now));
  lines.push("END:VCALENDAR");
  return lines.map(fold).join("\r\n") + "\r\n";
}
