import { todayIso } from "./dates";
import { fullName, oppKey } from "./rules";
import { uid } from "./send";
import type { Channel, CrmEvent, Customer, DB, OppStatus, Product, Purpose } from "./types";

/** Helpers that change a draft copy of the database. Use inside `update(...)`. */

export function logEvent(d: DB, e: Omit<CrmEvent, "id" | "date" | "ts">) {
  d.events.push({ id: uid(), date: todayIso(), ts: Date.now(), ...e });
}

export function recordSent(d: DB, o: { customer: Customer; channel: Channel; purpose: Purpose; label: string; body: string; product?: Product; campaignId?: string }) {
  logEvent(d, { customerId: o.customer.id, kind: "sent", channel: o.channel, purpose: o.purpose, product: o.product, campaignId: o.campaignId, text: o.label, body: o.body });
  if (o.campaignId) {
    const k = d.campaigns.find((x) => x.id === o.campaignId);
    if (k && !k.sentTo.includes(o.customer.id)) k.sentTo.push(o.customer.id);
  }
  if (o.purpose === "marketing" && o.product) {
    const key = oppKey(o.customer.id, o.product);
    if (!d.opp[key]) d.opp[key] = { status: "contacted", date: todayIso() };
  }
}

export function setOpp(d: DB, customerId: string, product: Product, status: OppStatus) {
  const key = oppKey(customerId, product);
  if (status === "open") { delete d.opp[key]; return; }
  d.opp[key] = { status, date: todayIso() };
  if (status === "won") {
    const c = d.customers.find((x) => x.id === customerId);
    if (c && !c.policies.some((p) => p.product === product)) {
      c.policies.push({ id: uid(), product, number: "", since: todayIso(), premium: 0 });
      logEvent(d, { customerId, kind: "system", text: `${product} policy added (opportunity won).`, product });
    }
  }
}

export function deleteCustomer(d: DB, id: string) {
  d.customers = d.customers.filter((c) => c.id !== id);
  d.events = d.events.filter((e) => e.customerId !== id);
  d.tasks = d.tasks.filter((t) => t.customerId !== id);
  for (const k of Object.keys(d.opp)) if (k.startsWith(`${id}|`)) delete d.opp[k];
  for (const k of d.campaigns) k.sentTo = k.sentTo.filter((x) => x !== id);
}

export const auditName = (c: Customer) => `${fullName(c)} (${c.id})`;
