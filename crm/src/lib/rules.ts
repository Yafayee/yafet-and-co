import { age, daysAgo, daysSinceBirthday } from "./dates";
import { PRODUCT_DE, PRODUCT_EN, PRODUCTS, type Assessment, type Audience, type Condition, type Channel, type Confidence, type CrmEvent, type Customer, type DB, type Opportunity, type Product, type Purpose, type TemplateText } from "./types";

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

/**
 * The cover check: a verdict on every product for one customer. Plain,
 * explainable rules; no AI and no running cost. Each verdict carries a reason
 * the representative can read and defend. These are general needs-analysis
 * rules, not product advice: the representative decides.
 */
export function assess(db: DB, c: Customer): Assessment[] {
  const has = (p: Product) => hasProduct(c, p);
  const years = age(c.dob);
  const dependants = c.marital === "married" || c.marital === "partner" || c.children === "yes";
  const alone = c.marital === "single" && c.children !== "yes";
  const working = c.employment === "employed" || c.employment === "self";
  const sporty = c.interests.some((i) => /sport|ski|rad|bike|cycl|kletter|climb|motor|fu(ss|ß)ball|football|lauf|run/i.test(i));
  const out: Assessment[] = [];
  const offer = (product: Product, confidence: Confidence, reason: string) => out.push({ product, status: "offer", confidence, reason });
  const ask = (product: Product, reason: string) => out.push({ product, status: "ask", reason });
  const skip = (product: Product, reason: string) => out.push({ product, status: "skip", reason });

  const rules: Record<string, () => void> = {
    Liability: () => offer("Liability", "high", has("Household")
      ? "Has household insurance but no separate liability cover. Check whether liability is included in the household policy; if not, it is the first gap to close."
      : "No personal liability cover. Anyone can be held liable for damage they cause to others, so this is the basic cover to have."),
    Household: () => {
      if (c.housing === "unknown") ask("Household", "Ask whether they rent or own their home.");
      else offer("Household", c.housing === "rent" ? "medium" : "high", c.housing === "rent" ? "Rents their home, but the contents are not insured." : "Owns their home, but it has no household cover with us.");
    },
    Car: () => {
      if (c.ownsCar === "yes") offer("Car", "high", "Owns a car but has no car insurance with us.");
      else if (c.ownsCar === "unknown") offer("Car", "low", "We do not know whether they own a car. Ask first.");
      else skip("Car", "Does not own a car.");
    },
    "Legal protection": () => offer("Legal protection", has("Car") || c.ownsCar === "yes" ? "medium" : "low", has("Car") || c.ownsCar === "yes" ? "Drives a car but has no legal protection; traffic disputes are a common reason to need it." : "No legal protection yet."),
    Accident: () => offer("Accident", sporty ? "high" : "medium", sporty ? "Active in sport, but leisure accidents are not covered." : has("Health") ? "Has health insurance; accident cover closes the gap for lasting injuries from leisure accidents." : "No accident cover. Statutory cover applies only to work and the way there."),
    Health: () => offer("Health", c.employment === "self" ? "medium" : "low", c.employment === "self" ? "Self-employed with no private health cover." : "No private supplementary health cover."),
    Disability: () => {
      if (c.employment === "retired") return skip("Disability", "Retired, so there is no earned income to protect.");
      if (years !== null && years >= 58) return skip("Disability", "Close to retirement age; new cover is rarely worthwhile.");
      if (c.employment === "student") return offer("Disability", "medium", "Still in training. Cover is cheapest when started young and healthy.");
      if (c.employment === "unknown") return offer("Disability", "medium", "Income is not protected against disability. Ask about their job first.");
      if (alone) return offer("Disability", "high", "Lives on one income. If they could no longer work, nobody else would cover the bills.");
      if (dependants) return offer("Disability", "high", "Others depend on this income, and it is not protected against disability.");
      offer("Disability", working ? "high" : "medium", "Income is not protected against disability.");
    },
    Pension: () => {
      if (c.employment === "retired" || (years !== null && years >= 63)) return skip("Pension", "Already at or near retirement.");
      if (years === null) return ask("Pension", "Ask for the date of birth to judge how long they can still save.");
      if (years < 35) return offer("Pension", "medium", `Aged ${years} with no private pension plan. Starting early gives savings the longest time to grow.`);
      if (years <= 55) return offer("Pension", "medium", `Aged ${years} with no private pension plan yet.`);
      offer("Pension", "low", `Aged ${years}: few saving years are left, but a top-up may still help.`);
    },
    Life: () => {
      if (dependants || c.housing === "mortgage") return offer("Life", "high", c.housing === "mortgage" && !dependants ? "Has a home loan that would be left unpaid." : "A partner or children depend on this income and are not protected if they die.");
      if (alone && c.housing !== "unknown") return skip("Life", "Single with no children and no home loan: little need right now. Revisit when that changes.");
      ask("Life", c.marital === "single" ? "Single: life cover matters only if there are children or a home loan. Find that out first." : "Life cover matters when a partner, children or a home loan depend on them. Find that out first.");
    },
    "Home financing": () => {
      if (c.housing === "mortgage") return offer("Home financing", "high", "Has a home loan that does not run through us. Offer to compare whether refinancing would lower the cost.");
      if (c.housing === "rent") return years === null || (years >= 25 && years <= 50) ? offer("Home financing", "medium", "Rents their home. Ask whether buying or building is a goal.") : skip("Home financing", "Rents, and is outside the usual age for buying a first home.");
      if (c.housing === "owner") return skip("Home financing", "Owns their home without a loan.");
      ask("Home financing", "Ask whether they rent or own, and whether a home loan is running.");
    },
    "Child savings": () => {
      if (c.children === "yes") return offer("Child savings", "medium", "Has children but no savings plan for them. The earlier it starts, the longer it can grow.");
      if (c.children === "no") return skip("Child savings", "No children.");
      ask("Child savings", "Ask whether they have children or grandchildren.");
    },
  };

  for (const product of productsOf(db)) {
    if (has(product)) { const pol = c.policies.find((x) => x.product === product)!; out.push({ product, status: "has", reason: pol.number ? `Policy ${pol.number}` : "Held with us" }); continue; }
    // Rules taught in the app come first; they can also cover products the built-in rules do not know.
    const taught = db.knowledge.recs.find((r) => r.product === product && matches(c, r.when));
    if (taught) { out.push({ product, status: "offer", confidence: taught.confidence, reason: taught.reason }); continue; }
    if (rules[product]) rules[product]();
    else skip(product, "No rule for this product yet. Teach one in the Product guide.");
  }

  // Learned from outcomes: products that are often won move up, often dismissed move down.
  const l = learned(db);
  for (const a of out) if (a.status === "offer" && a.confidence) a.confidence = shifted(a.confidence, l.get(a.product)?.shift ?? 0);
  const rank = { high: 0, medium: 1, low: 2 };
  const order = { offer: 0, ask: 1, has: 2, skip: 3 };
  const taughtSet = new Set(db.knowledge.recs.map((r) => r.product));
  return out
    .map((a, i) => ({ a, i }))
    .sort((x, y) => order[x.a.status] - order[y.a.status] || (rank[x.a.confidence ?? "low"] - rank[y.a.confidence ?? "low"]) || Number(taughtSet.has(y.a.product)) - Number(taughtSet.has(x.a.product)) || x.i - y.i)
    .map((x) => x.a);
}

/** Facts missing from the profile that would sharpen the cover check, as questions to ask. */
export function missingFacts(c: Customer): string[] {
  const q: string[] = [];
  if (!c.dob) q.push("What is their date of birth?");
  if (c.marital === "unknown") q.push("Are they single, living with a partner, or married?");
  if (c.children === "unknown") q.push("Do they have children?");
  if (c.employment === "unknown") q.push("Are they employed, self-employed, in training, or retired?");
  if (c.housing === "unknown") q.push("Do they rent or own their home, and is a home loan running?");
  if (c.ownsCar === "unknown" && !hasProduct(c, "Car")) q.push("Do they own a car?");
  return q;
}

function rawOpportunities(db: DB, c: Customer): { product: Product; reason: string; confidence: Confidence }[] {
  return assess(db, c).filter((a) => a.status === "offer").map((a) => ({ product: a.product, reason: a.reason, confidence: a.confidence ?? "low" }));
}

export const oppKey = (customerId: string, product: Product) => `${customerId}|${product}`;

export function opportunitiesFor(db: DB, c: Customer): Opportunity[] {
  return rawOpportunities(db, c).slice(0, 5).map((o) => {
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

/** How many of the covers relevant to this customer they already hold with us. */
export function coverage(db: DB, c: Customer): { held: number; of: number; pct: number } {
  const all = assess(db, c);
  const held = all.filter((a) => a.status === "has").length;
  const of = all.filter((a) => a.status !== "skip").length;
  return { held, of, pct: of ? Math.round((held / of) * 100) : 0 };
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
