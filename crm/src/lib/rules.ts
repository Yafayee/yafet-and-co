import { age } from "./dates";
import type { Customer, Draft, Opportunity, Product } from "./types";

/**
 * Cross-selling rules. Plain, explainable rules decide who is eligible for
 * what; no AI and no running cost. Each rule returns a reason the
 * representative can read and defend.
 */
export function findOpportunities(c: Customer): Opportunity[] {
  const has = (p: Product) => c.policies.some((x) => x.product === p);
  const years = age(c.dob);
  const out: Omit<Opportunity, "id" | "customerId" | "canContact">[] = [];

  if (!has("Car") && c.ownsCar === "yes")
    out.push({ product: "Car", confidence: "high", reason: "Owns a car but has no car insurance with us." });
  if (!has("Car") && c.ownsCar === "unknown")
    out.push({ product: "Car", confidence: "low", reason: "We do not know whether they own a car. Ask first." });
  if (has("Household") && !has("Liability"))
    out.push({ product: "Liability", confidence: "high", reason: "Has household insurance but no personal liability cover." });
  if (years >= 25 && years <= 45 && !has("Pension"))
    out.push({ product: "Pension", confidence: "medium", reason: `Aged ${years} with no private pension plan yet.` });
  if (years < 50 && !has("Disability") && has("Life"))
    out.push({ product: "Disability", confidence: "medium", reason: "Has life insurance but income is not protected against disability." });
  if (has("Health") && !has("Accident"))
    out.push({ product: "Accident", confidence: "medium", reason: "Has health insurance; accident cover closes the gap for leisure accidents." });
  if (c.policies.length >= 3 && !has("Legal protection"))
    out.push({ product: "Legal protection", confidence: "low", reason: "Holds three or more policies but no legal protection." });

  const rank = { high: 0, medium: 1, low: 2 };
  return out
    .sort((a, b) => rank[a.confidence] - rank[b.confidence])
    .slice(0, 2)
    .map((o, i) => ({ ...o, id: `${c.id}-o${i}`, customerId: c.id, canContact: c.consent.marketing && c.consent[c.preferredChannel] }));
}

const DE: Record<Product, string> = {
  Health: "Krankenversicherung", Life: "Lebensversicherung", Household: "Haushaltsversicherung",
  Liability: "Haftpflichtversicherung", Car: "Kfz-Versicherung", Accident: "Unfallversicherung",
  "Legal protection": "Rechtsschutzversicherung", Pension: "private Pensionsvorsorge", Disability: "Berufsunfähigkeitsversicherung",
};

/** Template-based draft in the customer's language. Always reviewed by a person before sending. */
export function draftFor(c: Customer, o: Opportunity): Draft {
  const asking = o.product === "Car" && c.ownsCar === "unknown";
  const de = c.language === "de";
  const p = de ? DE[o.product] : `${o.product.toLowerCase()} insurance`.replace("pension insurance", "private pension plan");
  let subject: string;
  let body: string;
  if (de) {
    subject = asking ? "Kurze Frage zu Ihrem Fahrzeug" : `Ein Gedanke zu Ihrer Absicherung: ${DE[o.product]}`;
    body = asking
      ? `Guten Tag ${c.firstName} ${c.lastName},\n\nich hoffe, es geht Ihnen gut. Eine kurze Frage: Besitzen Sie derzeit ein Auto? Falls ja, vergleiche ich gerne unverbindlich Ihre Kfz-Versicherung für Sie.\n\nEine kurze Antwort genügt.\n\nHerzliche Grüße\nIhr CP Consulting Team`
      : `Guten Tag ${c.firstName} ${c.lastName},\n\nbei der Durchsicht Ihrer Unterlagen ist mir aufgefallen, dass Sie noch keine ${p} bei uns haben. Gerne zeige ich Ihnen in einem kurzen, kostenlosen Gespräch, ob das für Ihre Situation sinnvoll ist.\n\nPasst Ihnen ein Termin in den nächsten zwei Wochen?\n\nHerzliche Grüße\nIhr CP Consulting Team`;
  } else {
    subject = asking ? "A quick question about your car" : `A thought on your cover: ${o.product}`;
    body = asking
      ? `Hello ${c.firstName},\n\nI hope you are well. A quick question: do you currently own a car? If so, I would be glad to compare your car insurance for you, with no obligation.\n\nA short reply is all I need.\n\nKind regards\nYour CP Consulting team`
      : `Hello ${c.firstName},\n\nWhile reviewing your file I noticed you do not yet have ${p} with us. I would be happy to show you in a short, free conversation whether it makes sense for your situation.\n\nWould a call in the next two weeks suit you?\n\nKind regards\nYour CP Consulting team`;
  }
  if (c.preferredChannel !== "email") body = body.replace(/\n\n/g, "\n");
  return {
    id: `d-${o.id}`, customerId: c.id, channel: c.preferredChannel,
    kind: asking ? "Question" : "Product offer", product: o.product, reason: o.reason, subject, body,
  };
}
