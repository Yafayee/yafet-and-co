/** A product name. The built-in ones are listed below; more can be taught in the Product guide. */
export type Product = string;

export const PRODUCTS: Product[] = [
  "Health", "Life", "Household", "Liability", "Car",
  "Accident", "Legal protection", "Pension", "Disability",
  "Home financing", "Child savings",
];

export const PRODUCT_DE: Record<string, string> = {
  Health: "Krankenversicherung", Life: "Lebensversicherung", Household: "Haushaltsversicherung",
  Liability: "Haftpflichtversicherung", Car: "Kfz-Versicherung", Accident: "Unfallversicherung",
  "Legal protection": "Rechtsschutzversicherung", Pension: "private Pensionsvorsorge", Disability: "Berufsunfähigkeitsversicherung",
  "Home financing": "Immobilienfinanzierung", "Child savings": "Kindervorsorge",
};
export const PRODUCT_EN: Record<string, string> = {
  Health: "health insurance", Life: "life insurance", Household: "household insurance",
  Liability: "personal liability insurance", Car: "car insurance", Accident: "accident insurance",
  "Legal protection": "legal protection insurance", Pension: "a private pension plan", Disability: "occupational disability insurance",
  "Home financing": "home financing", "Child savings": "a savings plan for your child",
};

export const INCOME_LABEL: Record<Customer["income"], string> = {
  "": "Not known", under1500: "Under €1,500", "1500to2500": "€1,500 to €2,500", "2500to4000": "€2,500 to €4,000", over4000: "Over €4,000",
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
  /** End or renewal date, ISO, or "" when not known. */
  until?: string;
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
  /** rent = tenant, owner = owns without a loan, mortgage = owns with a running home loan */
  housing: "rent" | "owner" | "mortgage" | "unknown";
  children: "yes" | "no" | "unknown";
  /** Birth years of the children, when known. */
  kids: number[];
  /** Net income per month in euros, as a band. "" = not known. */
  income: "" | "under1500" | "1500to2500" | "2500to4000" | "over4000";
  marital: "single" | "partner" | "married" | "unknown";
  employment: "employed" | "self" | "student" | "retired" | "unknown";
  interests: string[];
  policies: Policy[];
  consent: Consent;
  consentUpdated: string;
  consentSource: string;
  preferredChannel: Channel;
  notes: string;
  createdAt: string;
  /** The number the customer has in the company's own system. */
  customerNo?: string;
  /** A prospect ("Interessent") has no contract yet. */
  kind?: "customer" | "prospect";
  /** Customer since (ISO date). */
  since?: string;
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

/** The verdict on one product for one customer. */
export interface Assessment {
  product: Product;
  /** has = holds it; offer = worth offering; ask = a fact is missing; skip = not needed now */
  status: "has" | "offer" | "ask" | "skip";
  confidence?: Confidence;
  reason: string;
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

export type Audience = string; // "all" | "marketing" | "missing:<product>" | "has:<product>"

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
  /** Date of the last encrypted backup download, or "" if never. */
  lastBackup: string;
  /** Security checklist items the user confirmed by hand. */
  checks: Record<string, boolean>;
  /** Version of the app last seen in this workspace, to notice updates. */
  seenBuild: string;
  /** Hide the screen while the window is not in focus. */
  privacyScreen?: boolean;
  /** How email links open: the computer's mail program, or Gmail in the browser. */
  emailVia?: "default" | "gmail" | "webmail";
  /** Address of the company webmail (used with emailVia "webmail"). */
  webmailUrl?: string;
  /** The Gmail address to send from, so the right account opens when several are signed in. */
  gmailAddress?: string;
  templates: Record<string, Template>;
}

export interface Guide {
  title: string;
  summary: string;
  fits: string[];
  ask: string[];
  say: string[];
  never: string[];
  source: string;
}

/** A condition on a customer profile. Every field that is set must hold. */
export interface Condition {
  has: Product[];
  lacks: Product[];
  ageMin: number | null;
  ageMax: number | null;
  housing: Customer["housing"] | "any";
  children: "yes" | "no" | "any";
  ownsCar: "yes" | "no" | "any";
}

/** Knowledge added inside the app, on top of what is built in. */
export interface Knowledge {
  products: { name: Product; de: string; en: string }[];
  guides: (Guide & { id: string; product: Product; addedAt: string })[];
  rules: { id: string; title: string; text: string; source: string }[];
  recs: { id: string; product: Product; confidence: Confidence; reason: string; when: Condition; source: string }[];
  /** Words or phrases the message check flags. */
  avoid: string[];
  /** Optional key for reading documents with AI. Stored only in the encrypted workspace. */
  apiKey: string;
}

export interface DB {
  version: 1;
  customers: Customer[];
  events: CrmEvent[];
  tasks: Task[];
  opp: Record<string, { status: Exclude<OppStatus, "open">; date: string }>;
  campaigns: Campaign[];
  settings: Settings;
  knowledge: Knowledge;
  /** What the most recent import did, kept so that it can be undone. */
  lastImport?: { ts: number; file: string; created: string[]; before: Customer[] } | null;
  audit: { ts: number; action: string }[];
}
