import { addDays, iso, TODAY } from "./dates";
import { draftFor, findOpportunities } from "./rules";
import type { Campaign, Channel, Customer, Draft, Opportunity, Policy, Product, Reply, Task, TimelineEvent } from "./types";

/**
 * SAMPLE DATA ONLY. Every person below is invented by a seeded random
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
const r = rng(20261113);
const pick = <T,>(a: T[]): T => a[Math.floor(r() * a.length)];
const chance = (p: number) => r() < p;
/** Fisher-Yates shuffle: uses a fixed number of random draws, so server and browser agree. */
function shuffle<T>(a: T[]): T[] {
  const out = [...a];
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(r() * (i + 1));
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}

const FIRST = ["Anna", "Lukas", "Sophie", "Maximilian", "Elena", "Tobias", "Mira", "Jonas", "Katharina", "Felix", "Amira", "David", "Lea", "Stefan", "Ivana", "Paul", "Nora", "Emre", "Julia", "Marko", "Hannah", "Simon", "Tereza", "Daniel"];
const LAST = ["Gruber", "Huber", "Bauer", "Wagner", "Pichler", "Steiner", "Moser", "Hofer", "Leitner", "Berger", "Fuchs", "Eder", "Novak", "Kovac", "Yilmaz", "Schmid", "Winkler", "Weber", "Reiter", "Brunner"];
const CITY = ["Wien", "Wien", "Wien", "Wien", "Klosterneuburg", "Mödling", "Baden", "Schwechat", "St. Pölten"];
const JOBS = ["Teacher", "Nurse", "Software developer", "Electrician", "Accountant", "Shop owner", "Architect", "Chef", "Civil servant", "Sales manager", "Student", "Physiotherapist"];
const INTERESTS = ["Family", "Property", "Travel", "Sport", "Retirement planning", "Investing", "Self-employment", "Cycling", "Skiing"];
const NOTES = [
  "Prefers contact in the evening.",
  "Bought a flat last year; mortgage running.",
  "Expecting a second child in spring.",
  "Recently changed employer.",
  "Asked for an annual review each autumn.",
  "",
  "",
];
const POOL: Product[] = ["Health", "Life", "Household", "Liability", "Car", "Accident", "Legal protection", "Pension", "Disability"];
const PREMIUM: Record<Product, number> = { Health: 96, Life: 45, Household: 19, Liability: 8, Car: 74, Accident: 14, "Legal protection": 22, Pension: 120, Disability: 58 };

function makeCustomer(i: number): Customer {
  const firstName = pick(FIRST);
  const lastName = pick(LAST);
  // Spread birthdays over the year, with a cluster in the coming weeks so the birthday screens are populated.
  const birthdayOffset = i < 9 ? i * 3 : Math.floor(r() * 365);
  const years = 22 + Math.floor(r() * 46);
  const bd = addDays(TODAY, birthdayOffset);
  const dob = iso(new Date(Date.UTC(TODAY.getFullYear() - years - 1, bd.getMonth(), bd.getDate())));
  const count = 1 + Math.floor(r() * 4);
  const products = shuffle(POOL).slice(0, count);
  const policies: Policy[] = products.map((product, k) => ({
    product,
    number: `AT-${String(100000 + i * 37 + k * 11)}`,
    since: iso(addDays(TODAY, -Math.floor(200 + r() * 2800))),
    premium: Math.round(PREMIUM[product] * (0.8 + r() * 0.5)),
  }));
  const hasCar = products.includes("Car");
  const email = chance(0.9);
  const whatsapp = chance(0.6);
  const sms = chance(0.45);
  const channels = ([["email", email], ["whatsapp", whatsapp], ["sms", sms]] as [Channel, boolean][]).filter((x) => x[1]).map((x) => x[0]);
  return {
    id: `c${String(i + 1).padStart(3, "0")}`,
    firstName,
    lastName,
    email: `${firstName}.${lastName}@example.com`.toLowerCase(),
    phone: `+43 660 ${String(1000000 + Math.floor(r() * 8999999))}`,
    dob,
    city: pick(CITY),
    language: chance(0.8) ? "de" : "en",
    occupation: pick(JOBS),
    ownsCar: hasCar ? "yes" : pick(["yes", "no", "unknown", "unknown"] as const),
    interests: shuffle(INTERESTS).slice(0, 1 + Math.floor(r() * 3)),
    policies,
    consent: { email, whatsapp, sms, marketing: channels.length > 0 && chance(0.7) },
    preferredChannel: channels[0] ?? "email",
    lastContact: iso(addDays(TODAY, -Math.floor(r() * 300))),
    notes: pick(NOTES),
  };
}

export const customers: Customer[] = Array.from({ length: 48 }, (_, i) => makeCustomer(i));

export const customerById = (id: string) => customers.find((c) => c.id === id);
export const fullName = (c: Customer) => `${c.firstName} ${c.lastName}`;
export const initials = (c: Customer) => `${c.firstName[0]}${c.lastName[0]}`;

export const opportunities: Opportunity[] = customers.flatMap(findOpportunities);
export const opportunitiesFor = (id: string) => opportunities.filter((o) => o.customerId === id);

/** Drafts waiting for the representative's approval: best opportunity per contactable customer. */
export const drafts: Draft[] = customers
  .map((c) => opportunities.find((o) => o.customerId === c.id && o.canContact))
  .filter((o): o is Opportunity => Boolean(o))
  .slice(0, 9)
  .map((o) => draftFor(customerById(o.customerId)!, o));

export function timelineFor(c: Customer): TimelineEvent[] {
  const t = rng(Number(c.id.slice(1)) * 7919);
  const ch = c.preferredChannel;
  const events: TimelineEvent[] = [
    { date: c.lastContact, kind: "call", text: "Phone call: annual review of existing policies." },
    { date: iso(addDays(new Date(c.lastContact), -40 - Math.floor(t() * 60))), kind: "sent", channel: ch, text: "Birthday greeting sent." },
    { date: iso(addDays(new Date(c.lastContact), -120 - Math.floor(t() * 90))), kind: "reply", channel: ch, text: "Customer replied: thanked us and asked for a callback." },
    { date: iso(addDays(new Date(c.lastContact), -230 - Math.floor(t() * 60))), kind: "sent", channel: "email", text: "Christmas greeting sent." },
    { date: c.policies[0].since, kind: "meeting", text: `First meeting. ${c.policies[0].product} policy signed.` },
    { date: c.policies[0].since, kind: "system", text: "Profile created and consent recorded." },
  ];
  return events.sort((a, b) => b.date.localeCompare(a.date));
}

export const campaigns: Campaign[] = [
  { id: "k1", name: "Christmas greetings 2026", occasion: "Christmas", channels: ["email", "whatsapp"], audience: "All customers with channel consent", status: "Scheduled", date: "2026-12-22", recipients: 44, delivered: 0, replied: 0 },
  { id: "k2", name: "Birthday greetings", occasion: "Birthday", channels: ["email", "whatsapp", "sms"], audience: "Each customer on their birthday", status: "Running", date: "2026-01-01", recipients: 41, delivered: 40, replied: 17 },
  { id: "k3", name: "Car insurance check", occasion: "Product", channels: ["email"], audience: "Car owners without a car policy, marketing consent", status: "Running", date: "2026-11-03", recipients: 9, delivered: 9, replied: 3 },
  { id: "k4", name: "Year-end pension reminder", occasion: "Product", channels: ["email"], audience: "Aged 25 to 45, no pension plan, marketing consent", status: "Draft", date: "2026-11-27", recipients: 12, delivered: 0, replied: 0 },
  { id: "k5", name: "Easter greetings 2026", occasion: "Easter", channels: ["email"], audience: "All customers with email consent", status: "Completed", date: "2026-04-03", recipients: 42, delivered: 41, replied: 8 },
  { id: "k6", name: "Household policy review", occasion: "Product", channels: ["email", "whatsapp"], audience: "Household policy older than five years", status: "Completed", date: "2026-09-14", recipients: 14, delivered: 14, replied: 6 },
];

const replyTexts: { text: string; interest?: Product }[] = [
  { text: "Danke für die Glückwünsche! Könnten wir nächste Woche über eine Kfz-Versicherung sprechen?", interest: "Car" },
  { text: "Thank you! Yes, I would like to hear more about the pension plan.", interest: "Pension" },
  { text: "Vielen Dank, sehr nett. Derzeit kein Bedarf." },
  { text: "Ja, ich habe seit März ein Auto. Was würde das kosten?", interest: "Car" },
  { text: "Bitte rufen Sie mich am Donnerstag nach 17 Uhr an.", interest: "Liability" },
  { text: "Thanks for thinking of me. Happy holidays to you too." },
];
export const replies: Reply[] = replyTexts.map((x, i) => {
  const c = customers[(i * 7 + 3) % customers.length];
  return { id: `r${i}`, customerId: c.id, channel: c.preferredChannel, date: iso(addDays(TODAY, -i)), text: x.text, interest: x.interest, handled: i > 3 };
});

export const tasks: Task[] = [
  { id: "t1", customerId: replies[0].customerId, title: "Call back about car insurance", due: iso(addDays(TODAY, 1)), done: false },
  { id: "t2", customerId: replies[1].customerId, title: "Send pension plan comparison", due: iso(addDays(TODAY, 2)), done: false },
  { id: "t3", customerId: replies[4].customerId, title: "Phone call Thursday after 17:00", due: iso(addDays(TODAY, 6)), done: false },
  { id: "t4", customerId: customers[11].id, title: "Ask for marketing consent at next meeting", due: iso(addDays(TODAY, 9)), done: false },
  { id: "t5", customerId: customers[20].id, title: "Confirm new address", due: iso(addDays(TODAY, -2)), done: true },
];

/** Messages sent per week, oldest first (last 12 weeks). */
export const weeklySent = [18, 22, 15, 27, 31, 24, 19, 35, 29, 33, 41, 26].map((n, i) => ({
  week: iso(addDays(TODAY, -(11 - i) * 7)),
  sent: n,
}));

export const channelStats: { channel: Channel; sent: number; delivered: number; replied: number }[] = [
  { channel: "email", sent: 212, delivered: 207, replied: 38 },
  { channel: "whatsapp", sent: 84, delivered: 83, replied: 31 },
  { channel: "sms", sent: 24, delivered: 23, replied: 4 },
];

export const auditLog = [
  { time: "13 Nov 2026 08:52", user: "Representative", action: "Signed in with two-factor code" },
  { time: "13 Nov 2026 08:41", user: "System", action: "Birthday greeting sent to 1 customer" },
  { time: "12 Nov 2026 17:20", user: "Representative", action: "Approved 3 product messages" },
  { time: "12 Nov 2026 17:02", user: "Representative", action: "Viewed customer profile c014" },
  { time: "12 Nov 2026 11:15", user: "Assistant", action: "Updated phone number on profile c027" },
  { time: "11 Nov 2026 09:30", user: "System", action: "Customer c031 opted out of WhatsApp; channel disabled" },
  { time: "10 Nov 2026 14:05", user: "Representative", action: "Exported data for customer c008 (access request)" },
  { time: "10 Nov 2026 02:00", user: "System", action: "Encrypted backup completed" },
];
