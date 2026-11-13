import { age, daysAgo, daysSinceBirthday } from "./dates";
import { PRODUCT_DE, PRODUCT_EN, PRODUCTS, type Audience, type Condition, type Channel, type Confidence, type CrmEvent, type Customer, type DB, type Opportunity, type Product, type Purpose, type TemplateText } from "./types";

export const fullName = (c: Customer) => `${c.firstName} ${c.lastName}`.trim() || "Unnamed customer";
export const initials = (c: Customer) => `${c.firstName[0] ?? ""}${c.lastName[0] ?? ""}`.toUpperCase() || "?";
export const hasProduct = (c: Customer, p: Product) => c.policies.some((x) => x.product === p);

/** Does the customer have the contact detail a channel needs? */
export const reachable = (c: Customer, ch: Channel) => (ch === "email" ? Boolean(c.email) : Boolean(c.phone));

/** Channels the customer agreed to and can actually be reached on, preferred channel first. */
export function allowedChannels(c: Customer): Channel[] {
  const all: Channel[] = [c.preferredChannel, "email", "whatsapp", "sms"];
  return [...new Set(all)].filter((ch) => c.consent[ch] && reachable(c, ch));
}
export const bestChannel = (c: Customer, among?: Channel[]): Channel | null =>
  allowedChannels(c).find((ch) => !among || among.includes(ch)) ?? null;

/** Product offers need marketing consent and at least one agreed, reachable channel. */
export const canMarket = (c: Customer) => c.consent.marketing && allowedChannels(c).length > 0;

/**
 * Cross-selling rules. Plain, explainable rules decide who is eligible for
 * what; no AI and no running cost. Each rule returns a reason the
 * representative can read and defend.
 */
/** Built-in products plus the ones taught in the app. */
export function productsOf(db: DB): Product[] {
  return [...new Set([...PRODUCTS, ...db.knowledge.products.map((p) => p.name)])];
}

export function matches(c: Customer, w: Condition): boolean {
  const years = age(c.dob);
  if (w.has.some((p) => !hasProduct(c, p)) || w.lacks.some((p) => hasProduct(c, p))) return false;
  if (w.ageMin !== null && (years === null || years < w.ageMin)) return false;
  if (w.ageMax !== null && (years === null || years > w.ageMax)) return false;
  if (w.housing !== "any" && c.housing !== w.housing) return false;
  if (w.children !== "any" && c.children !== w.children) return false;
  if (w.ownsCar !== "any" && c.ownsCar !== w.ownsCar) return false;
  return true;
}

export interface Learned { suggested: number; contacted: number; won: number; dismissed: number; shift: -1 | 0 | 1 }
const learnedCache = new WeakMap<object, Map<Product, Learned>>();
/**
 * What the outcomes so far say about each product. Once at least five
 * opportunities for a product are decided, a high share of wins ranks it
 * higher and a low share ranks it lower.
 */
export function learned(db: DB): Map<Product, Learned> {
  const hit = learnedCache.get(db.opp);
  if (hit) return hit;
  const m = new Map<Product, Learned>();
  for (const [key, st] of Object.entries(db.opp)) {
    const product = key.slice(key.indexOf("|") + 1);
    const l = m.get(product) ?? { suggested: 0, contacted: 0, won: 0, dismissed: 0, shift: 0 as const };
    l.suggested++; l[st.status]++;
    m.set(product, l);
  }
  for (const l of m.values()) {
    const decided = l.won + l.dismissed;
    if (decided >= 5) l.shift = l.won / decided >= 0.5 ? 1 : l.won / decided <= 0.15 ? -1 : 0;
  }
  learnedCache.set(db.opp, m);
  return m;
}
const LEVELS: Confidence[] = ["low", "medium", "high"];
const shifted = (c: Confidence, by: number): Confidence => LEVELS[Math.min(2, Math.max(0, LEVELS.indexOf(c) + by))];

function rawOpportunities(db: DB, c: Customer): { product: Product; reason: string; confidence: Confidence }[] {
  const has = (p: Product) => hasProduct(c, p);
  const years = age(c.dob);
  const out: { product: Product; reason: string; confidence: Confidence }[] = [];

  if (!has("Car") && c.ownsCar === "yes")
    out.push({ product: "Car", confidence: "high", reason: "Owns a car but has no car insurance with us." });
  if (c.housing === "mortgage" && !has("Home financing"))
    out.push({ product: "Home financing", confidence: "high", reason: "Has a home loan that does not run through us. Offer to compare whether refinancing would lower the cost." });
  if (has("Household") && !has("Liability"))
    out.push({ product: "Liability", confidence: "high", reason: "Has household insurance but no personal liability cover." });
  if (years !== null && years >= 25 && years <= 45 && !has("Pension"))
    out.push({ product: "Pension", confidence: "medium", reason: years < 35 ? `Aged ${years} with no private pension plan. Starting early gives savings the longest time to grow.` : `Aged ${years} with no private pension plan yet.` });
  if (c.children === "yes" && !has("Child savings"))
    out.push({ product: "Child savings", confidence: "medium", reason: "Has children but no savings plan for them. The earlier it starts, the longer it can grow." });
  if (c.housing === "rent" && !has("Home financing") && (years === null || (years >= 25 && years <= 50)))
    out.push({ product: "Home financing", confidence: "medium", reason: "Rents their home. Ask whether buying or building is a goal." });
  if ((years === null || years < 50) && !has("Disability") && has("Life"))
    out.push({ product: "Disability", confidence: "medium", reason: "Has life insurance but income is not protected against disability." });
  if (has("Health") && !has("Accident"))
    out.push({ product: "Accident", confidence: "medium", reason: "Has health insurance; accident cover closes the gap for leisure accidents." });
  if (!has("Household") && (has("Liability") || has("Legal protection")))
    out.push({ product: "Household", confidence: "medium", reason: "Has liability or legal cover but the home contents are not insured." });
  if (!has("Car") && c.ownsCar === "unknown")
    out.push({ product: "Car", confidence: "low", reason: "We do not know whether they own a car. Ask first." });
  if (c.policies.length >= 3 && !has("Legal protection"))
    out.push({ product: "Legal protection", confidence: "low", reason: "Holds three or more policies but no legal protection." });

  // Rules taught in the app.
  for (const r of db.knowledge.recs) {
    if (!has(r.product) && !out.some((o) => o.product === r.product) && matches(c, r.when)) out.push({ product: r.product, confidence: r.confidence, reason: r.reason });
  }
  // Learned from outcomes: products that are often won move up, often dismissed move down.
  const l = learned(db);
  const rank = { high: 0, medium: 1, low: 2 };
  return out
    .map((o, i) => ({ ...o, confidence: shifted(o.confidence, l.get(o.product)?.shift ?? 0), i }))
    .sort((a, b) => rank[a.confidence] - rank[b.confidence] || a.i - b.i)
    .map(({ product, reason, confidence }) => ({ product, reason, confidence }));
}

export const oppKey = (customerId: string, product: Product) => `${customerId}|${product}`;

export function opportunitiesFor(db: DB, c: Customer): Opportunity[] {
  return rawOpportunities(db, c).slice(0, 4).map((o) => {
    const key = oppKey(c.id, o.product);
    const st = db.opp[key];
    return { ...o, key, customerId: c.id, status: st?.status ?? "open", statusDate: st?.date };
  });
}

export function allOpportunities(db: DB): Opportunity[] {
  const live = db.customers.flatMap((c) => opportunitiesFor(db, c));
  // Won deals no longer match a rule (the customer now holds the product), so list them from the record.
  const seen = new Set(live.map((o) => o.key));
  for (const [key, st] of Object.entries(db.opp)) {
    if (seen.has(key)) continue;
    const customerId = key.slice(0, key.indexOf("|")), product = key.slice(key.indexOf("|") + 1);
    if (!db.customers.some((c) => c.id === customerId)) continue;
    live.push({ key, customerId, product, reason: st.status === "won" ? "Policy added." : "No longer applies.", confidence: "medium", status: st.status, statusDate: st.date });
  }
  return live;
}

export type Stage = "Starting out" | "Building" | "Pre-retirement" | "Retired" | "Age not known";
export function lifeStage(c: Customer): Stage {
  const a = age(c.dob);
  if (a === null) return "Age not known";
  if (a < 30) return "Starting out";
  if (a < 50) return "Building";
  if (a < 65) return "Pre-retirement";
  return "Retired";
}

/** Share of the covers relevant to this customer that they already hold with us. */
export function coverage(c: Customer): { held: number; of: number; pct: number } {
  const a = age(c.dob);
  const relevant: Product[] = ["Health", "Household", "Liability", "Accident", "Legal protection", "Life"];
  if (a === null || a < 60) relevant.push("Pension", "Disability");
  if (c.ownsCar !== "no") relevant.push("Car");
  if (c.children === "yes") relevant.push("Child savings");
  const held = relevant.filter((p) => hasProduct(c, p)).length;
  return { held, of: relevant.length, pct: Math.round((held / relevant.length) * 100) };
}

export function eventsOf(db: DB, id: string): CrmEvent[] {
  return db.events.filter((e) => e.customerId === id).sort((a, b) => b.ts - a.ts);
}

export function lastContact(db: DB, id: string): string {
  let best = "";
  for (const e of db.events) if (e.customerId === id && e.kind !== "system" && e.date > best) best = e.date;
  return best;
}

/** Days since the last marketing message, or null if there never was one. */
export function daysSinceMarketing(events: CrmEvent[], id: string): number | null {
  let best = "";
  for (const e of events) if (e.customerId === id && e.kind === "sent" && e.purpose === "marketing" && e.date > best) best = e.date;
  return best ? daysAgo(best) : null;
}

export function render(t: TemplateText, c: Customer, sender: string, product?: Product, names?: { de: string; en: string }): TemplateText {
  const p = product ? (c.language === "de" ? names?.de || PRODUCT_DE[product] : names?.en || PRODUCT_EN[product]) || product : "";
  const fill = (s: string) => s.replaceAll("{firstName}", c.firstName).replaceAll("{lastName}", c.lastName).replaceAll("{product}", p).replaceAll("{sender}", sender).replace(/ {2,}/g, " ");
  return { subject: fill(t.subject), body: fill(t.body) };
}

/** Products with their own message text instead of the general offer. */
function specialKey(c: Customer, product?: Product): string | null {
  if (product === "Home financing") return c.housing === "mortgage" ? "refinancing" : "financing";
  if (product === "Child savings") return "childSavings";
  return null;
}

export function templateFor(db: DB, key: string, c: Customer, product?: Product): TemplateText {
  if (key === "offer" || key === "followUp") key = specialKey(c, product) ?? key;
  const t = db.settings.templates[key] ?? db.settings.templates.offer;
  return render(t[c.language] ?? t.de, c, db.settings.senderName, product, db.knowledge.products.find((x) => x.name === product));
}

export interface Suggestion {
  id: string;
  customer: Customer;
  opportunity: Opportunity;
  kind: "Product offer" | "Question" | "Follow-up";
  channel: Channel;
  text: TemplateText;
}

/**
 * Product messages suggested for approval: the best open opportunity per
 * customer, only with marketing consent, and never inside the frequency limit.
 */
export function suggestions(db: DB): { list: Suggestion[]; heldBack: number } {
  const list: Suggestion[] = [];
  let heldBack = 0;
  const birthdayGreeted = new Map<string, number>();
  for (const e of db.events) if (e.kind === "sent" && e.purpose === "birthday") { const d = daysAgo(e.date); if (d !== null) birthdayGreeted.set(e.customerId, Math.min(d, birthdayGreeted.get(e.customerId) ?? 9999)); }

  for (const c of db.customers) {
    if (!canMarket(c)) continue;
    const o = opportunitiesFor(db, c).find((x) => x.status === "open");
    if (!o) continue;
    const since = daysSinceMarketing(db.events, c.id);
    if (since !== null && since < db.settings.capDays) { heldBack++; continue; }
    const asking = o.product === "Car" && c.ownsCar === "unknown";
    const g = birthdayGreeted.get(c.id);
    const follow = db.settings.followUpAfterBirthday && !asking && g !== undefined && g >= 7 && g <= 30 && (daysSinceBirthday(c.dob) ?? 99) <= 31;
    const key = asking ? "carQuestion" : follow ? "followUp" : "offer";
    list.push({ id: o.key, customer: c, opportunity: o, kind: asking ? "Question" : follow ? "Follow-up" : "Product offer", channel: bestChannel(c)!, text: templateFor(db, key, c, o.product) });
  }
  const rank = { high: 0, medium: 1, low: 2 };
  list.sort((a, b) => rank[a.opportunity.confidence] - rank[b.opportunity.confidence]);
  return { list, heldBack };
}

export function audienceLabel(a: Audience): string {
  if (a === "all") return "All customers with an agreed channel";
  if (a === "marketing") return "Customers who agreed to product offers";
  const [kind, p] = a.split(":");
  return kind === "missing" ? `Agreed to offers, without ${p}` : `Agreed to offers, with ${p}`;
}

export function audienceMembers(db: DB, a: Audience, channels: Channel[], purpose: Purpose): Customer[] {
  return db.customers.filter((c) => {
    if (!bestChannel(c, channels)) return false;
    if (purpose === "marketing" && !c.consent.marketing) return false;
    if (a === "all") return true;
    if (a === "marketing") return c.consent.marketing;
    const kind = a.slice(0, a.indexOf(":")), p = a.slice(a.indexOf(":") + 1);
    return c.consent.marketing && (kind === "has" ? hasProduct(c, p) : !hasProduct(c, p));
  });
}

/** Customers whose birthday is today or was in the last three days and who have not been greeted yet. */
export function birthdaysDue(db: DB): Customer[] {
  const greeted = new Set(db.events.filter((e) => e.kind === "sent" && e.purpose === "birthday" && (daysAgo(e.date) ?? 99) <= 10).map((e) => e.customerId));
  return db.customers.filter((c) => { const d = daysSinceBirthday(c.dob); return d !== null && d <= 3 && !greeted.has(c.id) && allowedChannels(c).length > 0; });
}
