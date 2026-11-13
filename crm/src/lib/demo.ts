import { addDays, toIso } from "./dates";
import { DEFAULT_SETTINGS } from "./templates";
import type { Channel, CrmEvent, Customer, DB, Policy, Product } from "./types";

/**
 * DEMO DATA ONLY. Every person below is invented by a seeded random
 * generator. No real customer data belongs in this repository.
 */
function rng(seed: number) {
  return () => {
    seed |= 0; seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const FIRST = ["Anna", "Lukas", "Sophie", "Maximilian", "Elena", "Tobias", "Mira", "Jonas", "Katharina", "Felix", "Amira", "David", "Lea", "Stefan", "Ivana", "Paul", "Nora", "Emre", "Julia", "Marko", "Hannah", "Simon", "Tereza", "Daniel"];
const LAST = ["Gruber", "Huber", "Bauer", "Wagner", "Pichler", "Steiner", "Moser", "Hofer", "Leitner", "Berger", "Fuchs", "Eder", "Novak", "Kovac", "Yilmaz", "Schmid", "Winkler", "Weber", "Reiter", "Brunner"];
const CITY = ["Wien", "Wien", "Wien", "Wien", "Klosterneuburg", "Mödling", "Baden", "Schwechat", "St. Pölten"];
const JOBS = ["Teacher", "Nurse", "Software developer", "Electrician", "Accountant", "Shop owner", "Architect", "Chef", "Civil servant", "Sales manager", "Student", "Physiotherapist"];
const INTERESTS = ["Family", "Property", "Travel", "Sport", "Retirement planning", "Investing", "Self-employment", "Cycling", "Skiing"];
const NOTES = ["Prefers contact in the evening.", "Bought a flat last year; mortgage running.", "Expecting a second child in spring.", "Recently changed employer.", "Asked for an annual review each autumn.", "", ""];
const POOL: Product[] = ["Health", "Life", "Household", "Liability", "Car", "Accident", "Legal protection", "Pension", "Disability"];
const PREMIUM: Record<Product, number> = { Health: 96, Life: 45, Household: 19, Liability: 8, Car: 74, Accident: 14, "Legal protection": 22, Pension: 120, Disability: 58 };

export function demoDb(): DB {
  const r = rng(20261113);
  const pick = <T,>(a: T[]): T => a[Math.floor(r() * a.length)];
  const chance = (p: number) => r() < p;
  const shuffle = <T,>(a: T[]): T[] => { const o = [...a]; for (let i = o.length - 1; i > 0; i--) { const j = Math.floor(r() * (i + 1)); [o[i], o[j]] = [o[j], o[i]]; } return o; };
  const today = new Date();
  const back = (n: number) => toIso(addDays(today, -n));
  let seq = 0;
  const id = (p: string) => `${p}${++seq}`;
  const events: CrmEvent[] = [];
  const ev = (customerId: string, daysBack: number, e: Omit<CrmEvent, "id" | "customerId" | "date" | "ts">) =>
    events.push({ id: id("e"), customerId, date: back(daysBack), ts: today.getTime() - daysBack * 86_400_000 - seq * 1000, ...e });

  const customers: Customer[] = Array.from({ length: 48 }, (_, i) => {
    const firstName = pick(FIRST), lastName = pick(LAST);
    const offset = i < 9 ? i * 3 : Math.floor(r() * 365);
    const years = 22 + Math.floor(r() * 46);
    const bd = addDays(today, offset);
    const dob = toIso(new Date(today.getFullYear() - years - 1, bd.getMonth(), bd.getDate()));
    const products = shuffle(POOL).slice(0, 1 + Math.floor(r() * 4));
    const policies: Policy[] = products.map((product, k) => ({ id: id("p"), product, number: `AT-${100000 + i * 37 + k * 11}`, since: back(Math.floor(200 + r() * 2800)), premium: Math.round(PREMIUM[product] * (0.8 + r() * 0.5)) }));
    const email = chance(0.9), whatsapp = chance(0.6), sms = chance(0.45);
    const channels = ([["email", email], ["whatsapp", whatsapp], ["sms", sms]] as [Channel, boolean][]).filter((x) => x[1]).map((x) => x[0]);
    const first = policies.map((p) => p.since).sort()[0];
    const c: Customer = {
      id: `demo${String(i + 1).padStart(3, "0")}`, firstName, lastName,
      email: `${firstName}.${lastName}@example.com`.toLowerCase(), phone: `+43660${1000000 + Math.floor(r() * 8999999)}`,
      dob, street: `Beispielgasse ${1 + Math.floor(r() * 80)}`, postcode: "1050", city: pick(CITY),
      language: chance(0.8) ? "de" : "en", occupation: pick(JOBS),
      ownsCar: products.includes("Car") ? "yes" : pick(["yes", "no", "unknown", "unknown"] as const),
      interests: shuffle(INTERESTS).slice(0, 1 + Math.floor(r() * 3)), policies,
      consent: { email, whatsapp, sms, marketing: channels.length > 0 && chance(0.7) },
      consentUpdated: first, consentSource: "First meeting", preferredChannel: channels[0] ?? "email",
      notes: pick(NOTES), createdAt: first,
    };
    const last = Math.floor(r() * 300);
    ev(c.id, last, { kind: "call", text: "Phone call: annual review of existing policies." });
    if (channels[0]) {
      ev(c.id, last + 40 + Math.floor(r() * 60), { kind: "sent", channel: channels[0], purpose: "holiday", text: "Easter greeting sent." });
      if (chance(0.4)) ev(c.id, 8 + Math.floor(r() * 75), { kind: "sent", channel: channels[0], purpose: "service", text: "Policy document sent." });
      if (c.consent.marketing && chance(0.3)) ev(c.id, 35 + Math.floor(r() * 45), { kind: "sent", channel: channels[0], purpose: "marketing", text: "Product information sent." });
    }
    ev(c.id, Math.round((today.getTime() - new Date(first).getTime()) / 86_400_000), { kind: "meeting", text: `First meeting. ${policies[0].product} policy signed.` });
    return c;
  });

  const replies: { text: string; interest?: Product }[] = [
    { text: "Danke für die Glückwünsche! Könnten wir nächste Woche über eine Kfz-Versicherung sprechen?", interest: "Car" },
    { text: "Thank you! Yes, I would like to hear more about the pension plan.", interest: "Pension" },
    { text: "Vielen Dank, sehr nett. Derzeit kein Bedarf." },
    { text: "Ja, ich habe seit März ein Auto. Was würde das kosten?", interest: "Car" },
    { text: "Bitte rufen Sie mich am Donnerstag nach 17 Uhr an.", interest: "Liability" },
  ];
  replies.forEach((x, i) => { const c = customers[(i * 7 + 3) % customers.length]; ev(c.id, i, { kind: "reply", channel: c.preferredChannel, text: x.text, interest: x.interest, handled: i > 3 }); });

  return {
    version: 1, customers, events,
    tasks: [
      { id: "t1", customerId: customers[3].id, title: "Call back about car insurance", due: toIso(addDays(today, 1)), done: false },
      { id: "t2", customerId: customers[10].id, title: "Send pension plan comparison", due: toIso(addDays(today, 2)), done: false },
      { id: "t3", customerId: customers[11].id, title: "Ask for marketing consent at next meeting", due: toIso(addDays(today, 9)), done: false },
      { id: "t4", customerId: customers[20].id, title: "Confirm new address", due: back(2), done: true },
    ],
    opp: {},
    campaigns: [
      { id: "k1", name: "Christmas greetings", templateKey: "christmas", audience: "all", channels: ["email", "whatsapp"], date: `${today.getFullYear()}-12-22`, createdAt: back(3), sentTo: [] },
      { id: "k2", name: "Car insurance check", templateKey: "offer", product: "Car", audience: "missing:Car", channels: ["email"], date: back(10), createdAt: back(12), sentTo: customers.filter((c) => c.consent.marketing && c.consent.email && !c.policies.some((p) => p.product === "Car")).slice(0, 4).map((c) => c.id) },
    ],
    settings: structuredClone(DEFAULT_SETTINGS),
    audit: [{ ts: Date.now(), action: "Demo opened with invented customers" }],
  };
}
