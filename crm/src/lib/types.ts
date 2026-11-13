export type Product =
  | "Health" | "Life" | "Household" | "Liability" | "Car"
  | "Accident" | "Legal protection" | "Pension" | "Disability";

export const PRODUCTS: Product[] = [
  "Health", "Life", "Household", "Liability", "Car",
  "Accident", "Legal protection", "Pension", "Disability",
];

export type Channel = "email" | "sms" | "whatsapp";
export const CHANNELS: Channel[] = ["email", "sms", "whatsapp"];
export const CHANNEL_LABEL: Record<Channel, string> = { email: "Email", sms: "SMS", whatsapp: "WhatsApp" };

export type Consent = Record<Channel, boolean> & { marketing: boolean };

export interface Policy {
  product: Product;
  number: string;
  since: string; // ISO date
  premium: number; // EUR per month
}

export interface Customer {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  dob: string; // ISO date
  city: string;
  language: "de" | "en";
  occupation: string;
  ownsCar: "yes" | "no" | "unknown";
  interests: string[];
  policies: Policy[];
  consent: Consent;
  preferredChannel: Channel;
  lastContact: string; // ISO date
  notes: string;
}

export type Confidence = "high" | "medium" | "low";

export interface Opportunity {
  id: string;
  customerId: string;
  product: Product;
  reason: string;
  confidence: Confidence;
  /** false when the customer has not agreed to marketing: raise it in person instead */
  canContact: boolean;
}

export interface Draft {
  id: string;
  customerId: string;
  channel: Channel;
  kind: "Product offer" | "Question" | "Follow-up";
  product: Product;
  reason: string;
  subject: string;
  body: string;
}

export interface TimelineEvent {
  date: string;
  kind: "sent" | "reply" | "call" | "meeting" | "system";
  channel?: Channel;
  text: string;
}

export interface Campaign {
  id: string;
  name: string;
  occasion: string;
  channels: Channel[];
  audience: string;
  status: "Scheduled" | "Running" | "Completed" | "Draft";
  date: string;
  recipients: number;
  delivered: number;
  replied: number;
}

export interface Reply {
  id: string;
  customerId: string;
  channel: Channel;
  date: string;
  text: string;
  interest?: Product;
  handled: boolean;
}

export interface Task {
  id: string;
  customerId: string;
  title: string;
  due: string;
  done: boolean;
}
