import { emptyKnowledge } from "@/lib/knowledge";
import { DEFAULT_SETTINGS } from "@/lib/templates";
import type { Customer, DB } from "@/lib/types";

let n = 0;
export function customer(over: Partial<Customer> = {}): Customer {
  n++;
  return {
    id: `c${n}`, firstName: "Test", lastName: `Person${n}`, email: `p${n}@example.com`, phone: "+436601234567", dob: "1990-06-15",
    street: "", postcode: "", city: "Wien", language: "de", occupation: "", ownsCar: "unknown", housing: "unknown", children: "unknown",
    kids: [], income: "", marital: "unknown", employment: "unknown", interests: [], policies: [],
    consent: { email: true, sms: false, whatsapp: false, marketing: true }, consentUpdated: "2026-01-01", consentSource: "test",
    preferredChannel: "email", notes: "", createdAt: "2026-01-01", ...over,
  };
}
export const policy = (product: string, until = "") => ({ id: `p${++n}`, product, number: "", since: "2020-01-01", premium: 10, until });
export function db(customers: Customer[], over: Partial<DB> = {}): DB {
  return { version: 1, customers, events: [], tasks: [], opp: {}, campaigns: [], settings: structuredClone(DEFAULT_SETTINGS), knowledge: emptyKnowledge(), audit: [], ...over };
}
export const iso = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
export const daysFromNow = (k: number) => { const d = new Date(); d.setDate(d.getDate() + k); return iso(d); };
