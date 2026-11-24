import { describe, expect, it } from "vitest";
import { checkMessage } from "@/lib/compliance";
import { newSession, open, seal } from "@/lib/crypto";
import { age, daysToBirthday, daysUntil, parseIso } from "@/lib/dates";
import { setLang, t } from "@/lib/i18n";
import { strength } from "@/lib/passphrase";
import { assess } from "@/lib/rules";
import { sendLink } from "@/lib/send";
import { customer, daysFromNow, db, policy } from "./helpers";

describe("dates", () => {
  it("rejects invalid dates", () => {
    expect(parseIso("2026-02-31")).toBeNull();
    expect(parseIso("")).toBeNull();
    expect(age("")).toBeNull();
  });
  it("counts days to the next birthday", () => {
    const today = new Date();
    const mk = (k: number) => { const d = new Date(1990, today.getMonth(), today.getDate() + k); return `1990-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`; };
    expect(daysToBirthday(mk(0))).toBe(0);
    expect(daysToBirthday(mk(3))).toBe(3);
  });
  it("counts days until a date in both directions", () => {
    expect(daysUntil(daysFromNow(7))).toBe(7);
    expect(daysUntil(daysFromNow(-7))).toBe(-7);
  });
});

describe("message check", () => {
  it("flags rates, amounts, promises and taught phrases", () => {
    expect(checkMessage("Guten Tag, darf ich mich melden?")).toEqual([]);
    expect(checkMessage("Nur 0,5 % Zinsen")).toHaveLength(1);
    expect(checkMessage("Sie sparen 170 € im Monat")).toHaveLength(1);
    expect(checkMessage("garantiert ohne Risiko")).toHaveLength(1);
    expect(checkMessage("Das ist steuerfrei.", ["steuerfrei"])).toHaveLength(1);
  });
});

describe("passphrase", () => {
  it("refuses weak passphrases and accepts strong ones", () => {
    for (const p of ["short", "password12345", "111111111111", "aaaaaaaaaaaaaaa", "qwertz123456"]) expect(strength(p).level).toBe("weak");
    expect(strength("blauer Tisch Wolke 47 Fenster").level).toBe("strong");
  });
});

describe("encryption", () => {
  it("round-trips data and refuses a wrong passphrase", async () => {
    const s = await newSession("blauer Tisch Wolke 47 Fenster");
    const env = await seal(s, { secret: "Müller" });
    expect(env.data).not.toContain("Müller");
    expect((await open<{ secret: string }>("blauer Tisch Wolke 47 Fenster", env)).value.secret).toBe("Müller");
    await expect(open("wrong passphrase 123", env)).rejects.toBeTruthy();
  });
});

describe("send links", () => {
  it("builds links with encoded text and digits-only WhatsApp numbers", () => {
    const c = customer({ phone: "+436601234567", email: "a.b@example.com" });
    const text = { subject: "Frage & Antwort", body: "Hallo,\nwie geht's? 100%" };
    expect(sendLink(c, "whatsapp", text)).toBe("https://wa.me/436601234567?text=Hallo%2C%0Awie%20geht's%3F%20100%25");
    expect(sendLink(c, "email", text)).toContain("subject=Frage%20%26%20Antwort");
    // With Gmail chosen, the link opens Gmail's new-message window in the named account.
    const g = new URL(sendLink(c, "email", text, { emailVia: "gmail", gmailAddress: "berater@example.com" }));
    expect(g.origin + g.pathname).toBe("https://mail.google.com/mail/");
    expect(Object.fromEntries(g.searchParams)).toMatchObject({ authuser: "berater@example.com", view: "cm", to: c.email, su: text.subject, body: text.body });
    expect(sendLink(c, "whatsapp", text, { emailVia: "gmail" })).toContain("https://wa.me/");
  });
});

describe("German", () => {
  it("falls back to English for unknown text and fills in values", () => {
    setLang("de");
    expect(t("Customers")).toBe("Kunden");
    expect(t("no such text")).toBe("no such text");
    expect(t("In {n} days", { n: 3 })).toBe("In 3 Tagen");
    expect(t("12 of 48 profiles")).toBe("12 von 48 Profilen");
    setLang("en");
    expect(t("Customers")).toBe("Customers");
  });
  it("translates every cover-check reason", () => {
    const year = new Date().getFullYear();
    const profiles = [
      customer(), customer({ marital: "single", employment: "employed", ownsCar: "yes", children: "no", housing: "rent", income: "2500to4000" }),
      customer({ marital: "married", employment: "self", housing: "mortgage", children: "yes", kids: [year - 3], interests: ["Skifahren"], policies: [policy("Household", daysFromNow(30)), policy("Health", daysFromNow(-5)), policy("Car", daysFromNow(300))] }),
      customer({ employment: "retired", dob: "1950-01-01", housing: "owner", ownsCar: "no", children: "yes", kids: [year - 40] }),
      customer({ employment: "student", dob: `${year - 22}-01-01`, housing: "rent" }), customer({ dob: "", employment: "unknown" }), customer({ dob: `${year - 60}-01-01`, employment: "employed" }),
    ];
    setLang("en");
    const reasons = profiles.flatMap((c) => assess(db([c]), c).map((a) => a.reason));
    setLang("de");
    const untranslated = [...new Set(reasons)].filter((r) => t(r) === r);
    setLang("en");
    expect(untranslated).toEqual([]);
  });
});

describe("deleting a customer", () => {
  it("also removes them from the undo copy of the last import", async () => {
    const { deleteCustomer } = await import("@/lib/actions");
    const a = customer(), b = customer();
    const d = db([a, b], { lastImport: { ts: Date.now(), file: "f.csv", created: [b.id], before: [structuredClone(a)] } });
    deleteCustomer(d, a.id); deleteCustomer(d, b.id);
    expect(d.lastImport).toMatchObject({ before: [], created: [] });
  });
});

describe("slowing down guesses at the unlock screen", () => {
  const box = () => { const m = new Map<string, string>(); return { getItem: (k: string) => m.get(k) ?? null, setItem: (k: string, v: string) => { m.set(k, v); }, removeItem: (k: string) => { m.delete(k); } }; };
  it("allows a few mistakes, then makes each further try wait longer", async () => {
    const { recordFail, recordOk, waitMs } = await import("@/lib/throttle");
    const b = box(); const now = 1_000_000;
    for (let i = 0; i < 4; i++) expect(recordFail(now, b)).toBe(0);
    expect(recordFail(now, b)).toBe(30_000);
    expect(waitMs(now + 10_000, b)).toBe(20_000);
    expect(waitMs(now + 31_000, b)).toBe(0);
    expect(recordFail(now, b)).toBe(60_000);
    for (let i = 0; i < 10; i++) recordFail(now, b);
    expect(waitMs(now, b)).toBe(900_000);
    // A clock set back does not lock the user out for longer than the longest step.
    expect(waitMs(now - 10 * 86_400_000, b)).toBe(900_000);
    recordOk(b);
    expect(waitMs(now, b)).toBe(0);
    expect(recordFail(now, b)).toBe(0);
  });
  it("copes with unreadable stored state", async () => {
    const { waitMs } = await import("@/lib/throttle");
    const b = box(); b.setItem("cp-crm-attempts", "{broken");
    expect(waitMs(1, b)).toBe(0);
  });
});
