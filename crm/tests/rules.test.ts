import { describe, expect, it } from "vitest";
import { allowedChannels, assess, audienceMembers, birthdaysDue, renewals, suggestions } from "@/lib/rules";
import { customer, daysFromNow, db, policy } from "./helpers";

const verdict = (d: ReturnType<typeof db>, c: ReturnType<typeof customer>, product: string) => assess(d, c).find((a) => a.product === product)!;

describe("cover check", () => {
  it("handles the single, employed car owner example", () => {
    const c = customer({ marital: "single", employment: "employed", ownsCar: "yes", children: "no", housing: "rent", policies: [policy("Car"), policy("Legal protection"), policy("Liability")] });
    const d = db([c]);
    const all = assess(d, c);
    expect(all.filter((a) => a.status === "has").map((a) => a.product).sort()).toEqual(["Car", "Legal protection", "Liability"]);
    expect(all[0]).toMatchObject({ product: "Disability", status: "offer", confidence: "high" });
    expect(verdict(d, c, "Life").status).toBe("skip");
    expect(verdict(d, c, "Child savings").status).toBe("skip");
    expect(verdict(d, c, "Household")).toMatchObject({ status: "offer", confidence: "medium" });
  });

  it("asks instead of guessing when facts are missing", () => {
    const c = customer();
    const d = db([c]);
    expect(verdict(d, c, "Household").status).toBe("ask");
    expect(verdict(d, c, "Child savings").status).toBe("ask");
    expect(verdict(d, c, "Life").status).toBe("ask");
  });

  it("offers life cover when others depend on the income", () => {
    const c = customer({ marital: "married", employment: "employed" });
    expect(verdict(db([c]), c, "Life")).toMatchObject({ status: "offer", confidence: "high" });
  });

  it("does not count adult children as dependants", () => {
    const year = new Date().getFullYear();
    const c = customer({ marital: "single", children: "yes", kids: [year - 30], housing: "rent", employment: "employed" });
    const d = db([c]);
    expect(verdict(d, c, "Child savings").status).toBe("skip");
    expect(verdict(d, c, "Life").status).toBe("skip");
  });

  it("skips disability and pension for retired customers", () => {
    const c = customer({ employment: "retired", dob: "1950-01-01" });
    const d = db([c]);
    expect(verdict(d, c, "Disability").status).toBe("skip");
    expect(verdict(d, c, "Pension").status).toBe("skip");
  });

  it("never offers a product the customer already holds", () => {
    const c = customer({ ownsCar: "yes", housing: "mortgage", children: "yes", marital: "married", policies: ["Health", "Life", "Household", "Liability", "Car", "Accident", "Legal protection", "Pension", "Disability", "Home financing", "Child savings"].map((p) => policy(p)) });
    expect(assess(db([c]), c).every((a) => a.status === "has")).toBe(true);
  });
});

describe("consent", () => {
  it("suggests product messages only with marketing consent on a reachable, agreed channel", () => {
    const yes = customer({ ownsCar: "yes" });
    const noMarketing = customer({ ownsCar: "yes", consent: { email: true, sms: false, whatsapp: false, marketing: false } });
    const noChannel = customer({ ownsCar: "yes", consent: { email: false, sms: false, whatsapp: false, marketing: true } });
    const noAddress = customer({ ownsCar: "yes", email: "", consent: { email: true, sms: false, whatsapp: false, marketing: true } });
    const ids = suggestions(db([yes, noMarketing, noChannel, noAddress])).list.map((s) => s.customer.id);
    expect(ids).toEqual([yes.id]);
  });

  it("holds back customers inside the frequency limit", () => {
    const c = customer({ ownsCar: "yes" });
    const recent = { id: "e1", customerId: c.id, date: daysFromNow(-5), ts: Date.now(), kind: "sent" as const, purpose: "marketing" as const, channel: "email" as const, text: "x" };
    const d = db([c], { events: [recent] });
    expect(suggestions(d)).toMatchObject({ list: [], heldBack: 1 });
    d.events[0].date = daysFromNow(-40);
    expect(suggestions(d).list).toHaveLength(1);
  });

  it("uses only channels that are agreed and have contact details", () => {
    const c = customer({ phone: "", consent: { email: true, sms: true, whatsapp: true, marketing: true } });
    expect(allowedChannels(c)).toEqual(["email"]);
  });

  it("limits product campaigns to customers who agreed to offers", () => {
    const a = customer();
    const b = customer({ consent: { email: true, sms: false, whatsapp: false, marketing: false } });
    const d = db([a, b]);
    expect(audienceMembers(d, "all", ["email"], "holiday").map((c) => c.id)).toEqual([a.id, b.id]);
    expect(audienceMembers(d, "all", ["email"], "marketing").map((c) => c.id)).toEqual([a.id]);
    expect(audienceMembers(d, "missing:Car", ["email"], "marketing").map((c) => c.id)).toEqual([a.id]);
    expect(audienceMembers(d, "all", ["whatsapp"], "holiday")).toEqual([]);
  });

  it("lists a birthday only when a greeting is allowed and not yet sent", () => {
    const today = new Date();
    const dob = `1990-${String(today.getMonth() + 1).padStart(2, "0")}-${String(today.getDate()).padStart(2, "0")}`;
    const a = customer({ dob });
    const noConsent = customer({ dob, consent: { email: false, sms: false, whatsapp: false, marketing: false } });
    const d = db([a, noConsent]);
    expect(birthdaysDue(d).map((c) => c.id)).toEqual([a.id]);
    d.events.push({ id: "e", customerId: a.id, date: daysFromNow(0), ts: Date.now(), kind: "sent", purpose: "birthday", channel: "email", text: "x" });
    expect(birthdaysDue(d)).toEqual([]);
  });
});

describe("renewals", () => {
  it("lists policies ending soon or recently ended, soonest first", () => {
    const c = customer({ policies: [policy("Car", daysFromNow(40)), policy("Household", daysFromNow(-10)), policy("Health", daysFromNow(200)), policy("Life", daysFromNow(-90)), policy("Accident")] });
    expect(renewals(db([c])).map((r) => [r.product, r.days])).toEqual([["Household", -10], ["Car", 40]]);
  });
});
