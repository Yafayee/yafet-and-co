export type Product =
  | "Health" | "Life" | "Household" | "Liability" | "Car"
  | "Accident" | "Legal protection" | "Pension" | "Disability";

export const PRODUCTS: Product[] = [
  "Health", "Life", "Household", "Liability", "Car",
  "Accident", "Legal protection", "Pension", "Disability",
];

export const PRODUCT_DE: Record<Product, string> = {
  Health: "Krankenversicherung", Life: "Lebensversicherung", Household: "Haushaltsversicherung",
  Liability: "Haftpflichtversicherung", Car: "Kfz-Versicherung", Accident: "Unfallversicherung",
  "Legal protection": "Rechtsschutzversicherung", Pension: "private Pensionsvorsorge", Disability: "Berufsunfähigkeitsversicherung",
};
export const PRODUCT_EN: Record<Product, string> = {
  Health: "health insurance", Life: "life insurance", Household: "household insurance",
  Liability: "personal liability insurance", Car: "car insurance", Accident: "accident insurance",
  "Legal protection": "legal protection insurance", Pension: "a private pension plan", Disability: "occupational disability insurance",
};

export type Channel = "email" | "sms" | "whatsapp";
export const CHANNELS: Channel[] = ["email", "whatsapp", "sms"];
export const CHANNEL_LABEL: Record<Channel, string> = { email: "Email", sms: "SMS", whatsapp: "WhatsApp" };

export type Consent = Record<Channel, boolean> & { marketing: boolean };

export interface Policy {
  id: string;
  product: Product;
  number: string;
  since: string; // ISO date or ""
  premium: number; // EUR per month, 0 if unknown
}

export interface Customer {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  dob: string; // ISO date or ""
  street: string;
  postcode: string;
  city: string;
  language: "de" | "en";
  occupation: string;
  ownsCar: "yes" | "no" | "unknown";
  interests: string[];
  policies: Policy[];
  consent: Consent;
  consentUpdated: string;
  consentSource: string;
  preferredChannel: Channel;
  notes: string;
  createdAt: string;
}

export type Confidence = "high" | "medium" | "low";
export type OppStatus = "open" | "contacted" | "won" | "dismissed";

export interface Opportunity {
  key: string; // customerId|product
  customerId: string;
  product: Product;
  reason: string;
  confidence: Confidence;
  status: OppStatus;
  statusDate?: string;
}

export type Purpose = "birthday" | "holiday" | "marketing" | "service";

export interface CrmEvent {
  id: string;
  customerId: string;
  date: string; // local ISO date
  ts: number;
  kind: "sent" | "reply" | "call" | "meeting" | "note" | "system";
  channel?: Channel;
  text: string;
  body?: string; // the message that was sent, for the record
  purpose?: Purpose;
  product?: Product;
  campaignId?: string;
  interest?: Product;
  handled?: boolean;
}

export interface Task {
  id: string;
  customerId: string;
  title: string;
  due: string;
  done: boolean;
}

export type Audience = "all" | "marketing" | `missing:${Product}` | `has:${Product}`;

export interface Campaign {
  id: string;
  name: string;
  templateKey: string;
  product?: Product;
  audience: Audience;
  channels: Channel[];
  date: string;
  createdAt: string;
  sentTo: string[];
}

export interface TemplateText { subject: string; body: string }
export interface Template { label: string; purpose: Purpose; de: TemplateText; en: TemplateText }

export interface Settings {
  capDays: number;
  autoLockMin: number;
  senderName: string;
  followUpAfterBirthday: boolean;
  templates: Record<string, Template>;
}

export interface DB {
  version: 1;
  customers: Customer[];
  events: CrmEvent[];
  tasks: Task[];
  opp: Record<string, { status: Exclude<OppStatus, "open">; date: string }>;
  campaigns: Campaign[];
  settings: Settings;
  audit: { ts: number; action: string }[];
}
