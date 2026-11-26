import { describe, expect, it } from "vitest";
import { calendarFile } from "@/lib/ics";
import { customer } from "./helpers";

const now = new Date(Date.UTC(2026, 10, 26, 9, 0, 0));
const c = customer({ firstName: "Anna", lastName: "Muster", phone: "+436601234567", email: "anna@example.com" });

describe("calendar files", () => {
  it("writes a timed call with a reminder and the customer's contact details", () => {
    const f = calendarFile([{ task: { id: "t1", customerId: c.id, title: "Unfall, besprechen; heute", due: "2026-12-03", done: false, kind: "call", time: "10:30" }, customer: c }], now);
    expect(f.startsWith("BEGIN:VCALENDAR\r\nVERSION:2.0\r\n")).toBe(true);
    expect(f).toContain("DTSTART:20261203T103000");
    expect(f).toContain("DTEND:20261203T104500");
    expect(f).toContain("SUMMARY:Unfall\\, besprechen\\; heute – Anna Muster");
    expect(f).toContain("DESCRIPTION:Tel: +436601234567\\nE-Mail: anna@example.com");
    expect(f).toContain("TRIGGER:-PT15M");
    expect(f).toContain("DTSTAMP:20261126T090000Z");
    expect(f.endsWith("END:VCALENDAR\r\n")).toBe(true);
  });
  it("writes a to-do without time as an all-day entry and folds long lines", () => {
    const f = calendarFile([{ task: { id: "t2", customerId: c.id, title: "x".repeat(120), due: "2026-12-31", done: false }, customer: c }], now);
    expect(f).toContain("DTSTART;VALUE=DATE:20261231");
    expect(f).toContain("DTEND;VALUE=DATE:20270101");
    for (const line of f.split("\r\n")) expect(new TextEncoder().encode(line).length).toBeLessThanOrEqual(75);
  });
  it("lets a late meeting end after midnight, strictly after its start", () => {
    const f = calendarFile([{ task: { id: "t3", customerId: c.id, title: "Termin", due: "2026-12-03", done: false, kind: "meeting", time: "23:30", place: "Büro" } }], now);
    expect(f).toContain("DTSTART:20261203T233000");
    expect(f).toContain("DTEND:20261204T003000");
    const g = calendarFile([{ task: { id: "t4", customerId: c.id, title: "Spät", due: "2026-12-31", done: false, kind: "call", time: "23:59" } }], now);
    expect(g).toContain("DTSTART:20261231T235900");
    expect(g).toContain("DTEND:20270101T001400");
    expect(f).toContain("LOCATION:Büro");
  });
});
