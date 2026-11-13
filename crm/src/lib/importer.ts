import { toIso, todayIso } from "./dates";
import { uid } from "./send";
import { PRODUCTS, type Channel, type Customer, type Policy, type Product } from "./types";

export type Cell = string | number | boolean | Date | null | undefined;

export const FIELDS = [
  "Do not import", "First name", "Last name", "Full name", "Email", "Phone", "Date of birth",
  "Street", "Postcode", "City", "Language", "Occupation", "Owns a car", "Housing", "Children", "Interests",
  "Products", "Policy number", "Policy start", "Premium per month",
  "Email consent", "SMS consent", "WhatsApp consent", "Marketing consent", "Preferred channel", "Notes",
] as const;
export type Field = (typeof FIELDS)[number];

const HINTS: [RegExp, Field][] = [
  [/^(vor|first|given)|vorname/i, "First name"],
  [/^(nach|last|sur|family)|nachname|familienname/i, "Last name"],
  [/^(name|kunde|kundenname|full.?name|customer)$/i, "Full name"],
  [/whats/i, "WhatsApp consent"],
  [/sms/i, "SMS consent"],
  [/(mail).*(einwill|consent|opt|erlaub|zustimm)|(einwill|consent|opt|erlaub|zustimm).*(mail)/i, "Email consent"],
  [/market|werb|newsletter|angebot.*(einwill|consent)/i, "Marketing consent"],
  [/mail/i, "Email"],
  [/tel|phone|mobil|handy/i, "Phone"],
  [/geb|birth|dob/i, "Date of birth"],
  [/stra(ß|ss)e|street|adresse|address|anschrift/i, "Street"],
  [/plz|post.?(code|leitzahl)|zip/i, "Postcode"],
  [/^ort$|city|stadt|wohnort/i, "City"],
  [/wohnsit|wohnform|wohnverh|housing|^miete|eigentum|eigenheim/i, "Housing"],
  [/kind|child/i, "Children"],
  [/sprache|language/i, "Language"],
  [/beruf|occupation|job/i, "Occupation"],
  [/auto|kfz.?besitz|car|fahrzeug/i, "Owns a car"],
  [/interess/i, "Interests"],
  [/(polizz|police|policy|vertrag).*(n(umme)?r|no|number)|vertragsnummer|polizzennummer/i, "Policy number"],
  [/(beginn|start|seit|since|abschluss)/i, "Policy start"],
  [/pr(ä|ae|a)mie|premium|beitrag/i, "Premium per month"],
  [/produ|sparte|vertr(a|ä)g|polic|polizz|versicherung/i, "Products"],
  [/kanal|channel|bevorzugt|preferred/i, "Preferred channel"],
  [/notiz|note|bemerk|kommentar|comment/i, "Notes"],
];
export function guessField(header: string, taken: Set<Field>): Field {
  for (const [re, f] of HINTS) if (re.test(header.trim()) && !taken.has(f)) return f;
  return "Do not import";
}
export function guessMapping(header: string[]): Field[] {
  const taken = new Set<Field>();
  return header.map((h) => { const f = guessField(h, taken); if (f !== "Do not import") taken.add(f); return f; });
}

/** CSV parser that handles quotes, embedded line breaks, and comma, semicolon or tab separators. */
export function parseCsv(text: string): string[][] {
  text = text.replace(/^﻿/, "");
  const firstLine = text.split(/\r?\n/, 1)[0] ?? "";
  const count = (ch: string) => firstLine.split(ch).length - 1;
  const sep = count(";") >= count(",") && count(";") >= count("\t") && count(";") > 0 ? ";" : count("\t") > count(",") ? "\t" : ",";
  const rows: string[][] = [];
  let row: string[] = [], cur = "", quoted = false;
  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    if (quoted) {
      if (ch === '"') { if (text[i + 1] === '"') { cur += '"'; i++; } else quoted = false; }
      else cur += ch;
    } else if (ch === '"') quoted = true;
    else if (ch === sep) { row.push(cur); cur = ""; }
    else if (ch === "\n" || ch === "\r") {
      if (ch === "\r" && text[i + 1] === "\n") i++;
      row.push(cur); cur = ""; rows.push(row); row = [];
    } else cur += ch;
  }
  if (cur !== "" || row.length) { row.push(cur); rows.push(row); }
  return rows.map((r) => r.map((c) => c.trim())).filter((r) => r.some((c) => c !== ""));
}

export async function readFile(file: File): Promise<Cell[][]> {
  if (/\.xlsx$/i.test(file.name)) {
    const { readSheet } = await import("read-excel-file/browser");
    const data = (await readSheet(file)) as Cell[][];
    return data.filter((r) => r.some((c) => c !== null && c !== undefined && String(c).trim() !== ""));
  }
  if (/\.xls$/i.test(file.name)) throw new Error("Old .xls files are not supported. Open the file in Excel and save it as .xlsx or CSV.");
  const buf = await file.arrayBuffer();
  let text = new TextDecoder("utf-8", { fatal: false }).decode(buf);
  // Excel on Windows often saves CSV in Windows-1252; a replacement character means UTF-8 was the wrong guess.
  if (text.includes("�")) text = new TextDecoder("windows-1252").decode(buf);
  return parseCsv(text);
}

const str = (v: Cell) => (v instanceof Date ? toIso(v) : v === null || v === undefined ? "" : String(v).trim());

export function parseDate(v: Cell): string {
  if (v instanceof Date) return isNaN(v.getTime()) ? "" : `${v.getUTCFullYear()}-${String(v.getUTCMonth() + 1).padStart(2, "0")}-${String(v.getUTCDate()).padStart(2, "0")}`;
  const s = str(v);
  if (!s) return "";
  let y = 0, m = 0, d = 0;
  let r = /^(\d{4})-(\d{1,2})-(\d{1,2})/.exec(s);
  if (r) { y = +r[1]; m = +r[2]; d = +r[3]; }
  else if ((r = /^(\d{1,2})[./-](\d{1,2})[./-](\d{2}|\d{4})$/.exec(s))) {
    d = +r[1]; m = +r[2]; y = +r[3];
    if (y < 100) y += y > new Date().getFullYear() % 100 ? 1900 : 2000;
  } else if (/^\d{4,5}$/.test(s)) {
    // Excel serial date number
    const dt = new Date(Date.UTC(1899, 11, 30) + +s * 86_400_000);
    y = dt.getUTCFullYear(); m = dt.getUTCMonth() + 1; d = dt.getUTCDate();
  } else return "";
  const check = new Date(y, m - 1, d);
  if (check.getFullYear() !== y || check.getMonth() !== m - 1 || check.getDate() !== d || y < 1900 || y > new Date().getFullYear() + 1) return "";
  return `${y}-${String(m).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
}

export function parsePhone(v: Cell): string {
  let s = str(v).replace(/[^\d+]/g, "");
  if (!s) return "";
  if (s.startsWith("00")) s = "+" + s.slice(2);
  else if (s.startsWith("0")) s = "+43" + s.slice(1);
  else if (!s.startsWith("+")) s = "+" + s;
  return s.length >= 8 ? s : "";
}

const YES = /^(ja|j|yes|y|1|true|wahr|x|ok|✓|✔)$/i;
const NO = /^(nein|n|no|0|false|falsch|-|)$/i;
export const parseYes = (v: Cell) => (typeof v === "boolean" ? v : YES.test(str(v)));

const PRODUCT_WORDS: [RegExp, Product][] = [
  [/kranken|health|gesundheit/i, "Health"],
  [/berufsunf|^bu$|disab|erwerbsunf/i, "Disability"],
  [/leben|life|ableben|risiko/i, "Life"],
  [/haushalt|household|hausrat|eigenheim|wohn/i, "Household"],
  [/haftpflicht|liabil/i, "Liability"],
  [/kfz|auto|car|motor|fahrzeug/i, "Car"],
  [/unfall|accident/i, "Accident"],
  [/kindervorsorge|kinder|child/i, "Child savings"],
  [/finanzierung|kredit|hypothek|darlehen|financing|mortgage|loan/i, "Home financing"],
  [/rechtsschutz|legal/i, "Legal protection"],
  [/pension|vorsorge|rente|retire/i, "Pension"],
];
export function parseProducts(v: Cell, known: Product[] = PRODUCTS): { products: Product[]; unknown: string[] } {
  const products: Product[] = [], unknown: string[] = [];
  for (const token of str(v).split(/[,;/|+\n]/).map((t) => t.trim()).filter(Boolean)) {
    const exact = known.find((p) => p.toLowerCase() === token.toLowerCase());
    const hit = exact ?? PRODUCT_WORDS.find(([re]) => re.test(token))?.[1];
    if (hit) { if (!products.includes(hit)) products.push(hit); } else unknown.push(token);
  }
  return { products, unknown };
}

export function parseHousing(v: Cell): Customer["housing"] {
  const s = str(v).toLowerCase();
  if (!s) return "unknown";
  if (/kredit|hypothek|finanz|darlehen|mortgage|loan/.test(s)) return "mortgage";
  if (/miet|rent|tenant/.test(s)) return "rent";
  if (/eigent|eigenheim|own|besitz|haus/.test(s)) return "owner";
  return "unknown";
}
export function parseChildren(v: Cell): Customer["children"] {
  const s = str(v).toLowerCase();
  if (!s) return "unknown";
  if (/^\d+$/.test(s)) return +s > 0 ? "yes" : "no";
  if (/^(nein|n|no|keine|false|falsch)$/.test(s)) return "no";
  return YES.test(s) ? "yes" : "unknown";
}

const parseChannel = (v: Cell): Channel | null => { const s = str(v).toLowerCase(); return /whats/.test(s) ? "whatsapp" : /sms/.test(s) ? "sms" : /mail/.test(s) ? "email" : null; };
const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

export interface ImportResult {
  create: Customer[];
  update: Customer[]; // full replacement records for existing customers
  issues: { row: number; message: string }[];
  merged: number; // rows folded into another row of the same person
  skipped: number;
  consentMapped: boolean;
}

const personKey = (c: { email: string; firstName: string; lastName: string; dob: string }) =>
  c.email ? `e:${c.email}` : `n:${c.firstName}|${c.lastName}|${c.dob}`.toLowerCase();

/**
 * Turns spreadsheet rows into customer profiles. Rows for the same person
 * (same email, or same name and date of birth) are merged, so an export with
 * one row per policy works. Existing profiles are updated, never duplicated.
 * Consent already recorded on an existing profile is kept unless
 * `overwriteConsent` is set, so an old file cannot undo an opt-out.
 */
export function convert(rows: Cell[][], mapping: Field[], existing: Customer[], source: string, overwriteConsent = false, known: Product[] = PRODUCTS): ImportResult {
  const col = (f: Field) => mapping.indexOf(f);
  const get = (r: Cell[], f: Field): Cell => (col(f) >= 0 ? r[col(f)] : "");
  const has = (f: Field) => col(f) >= 0;
  const consentMapped = has("Email consent") || has("SMS consent") || has("WhatsApp consent") || has("Marketing consent");
  const today = todayIso();
  const res: ImportResult = { create: [], update: [], issues: [], merged: 0, skipped: 0, consentMapped };
  const byKey = new Map<string, Customer>();
  const isNew = new Set<string>();
  const existingByKey = new Map(existing.map((c) => [personKey(c), c] as const));

  rows.forEach((r, i) => {
    const rowNo = i + 2; // header is row 1
    const note = (message: string) => res.issues.push({ row: rowNo, message });
    let firstName = str(get(r, "First name")), lastName = str(get(r, "Last name"));
    const full = str(get(r, "Full name"));
    if (full && !lastName) {
      if (full.includes(",")) { const [l, f] = full.split(","); lastName = l.trim(); firstName = firstName || (f ?? "").trim(); }
      else { const parts = full.split(/\s+/); lastName = parts.pop() ?? ""; firstName = firstName || parts.join(" "); }
    }
    if (!lastName && !firstName) { res.skipped++; note("No name in this row; skipped."); return; }

    let email = str(get(r, "Email")).toLowerCase();
    if (email && !EMAIL.test(email)) { note(`Email "${email}" is not valid; left empty.`); email = ""; }
    const rawPhone = str(get(r, "Phone"));
    const phone = parsePhone(rawPhone);
    if (rawPhone && !phone) note(`Phone "${rawPhone}" is not valid; left empty.`);
    const rawDob = get(r, "Date of birth");
    const dob = parseDate(rawDob);
    if (str(rawDob) && !dob) note(`Date of birth "${str(rawDob)}" could not be read; left empty.`);

    const { products, unknown } = parseProducts(get(r, "Products"), known);
    if (unknown.length) note(`Unknown product "${unknown.join(", ")}" ignored.`);
    const premium = Number(str(get(r, "Premium per month")).replace(/[^\d.,]/g, "").replace(",", ".")) || 0;
    const policies: Policy[] = products.map((product) => ({
      id: uid(), product,
      number: products.length === 1 ? str(get(r, "Policy number")) : "",
      since: products.length === 1 ? parseDate(get(r, "Policy start")) : "",
      premium: products.length === 1 ? premium : 0,
    }));

    const carRaw = str(get(r, "Owns a car"));
    const ownsCar: Customer["ownsCar"] = !carRaw ? "unknown" : YES.test(carRaw) ? "yes" : NO.test(carRaw) ? "no" : "unknown";
    const consent = { email: parseYes(get(r, "Email consent")), sms: parseYes(get(r, "SMS consent")), whatsapp: parseYes(get(r, "WhatsApp consent")), marketing: parseYes(get(r, "Marketing consent")) };
    const lang = /^(en|eng)/i.test(str(get(r, "Language"))) ? "en" : "de";
    const incoming: Customer = {
      id: uid(), firstName, lastName, email, phone, dob,
      street: str(get(r, "Street")), postcode: str(get(r, "Postcode")), city: str(get(r, "City")),
      language: lang, occupation: str(get(r, "Occupation")), ownsCar,
      housing: parseHousing(get(r, "Housing")), children: parseChildren(get(r, "Children")),
      interests: str(get(r, "Interests")).split(/[,;/|]/).map((x) => x.trim()).filter(Boolean),
      policies, consent, consentUpdated: consentMapped ? today : "", consentSource: consentMapped ? `Import: ${source}` : "",
      preferredChannel: parseChannel(get(r, "Preferred channel")) ?? (consent.email || !consentMapped ? "email" : consent.whatsapp ? "whatsapp" : consent.sms ? "sms" : "email"),
      notes: str(get(r, "Notes")), createdAt: today,
    };

    const key = personKey(incoming);
    let target = byKey.get(key);
    if (target) res.merged++;
    else {
      const old = existingByKey.get(key);
      target = old ? structuredClone(old) : undefined;
      if (target) { byKey.set(key, target); res.update.push(target); }
    }
    if (!target) { byKey.set(key, incoming); isNew.add(incoming.id); res.create.push(incoming); return; }

    // Merge into the existing record: fill blanks, add policies, apply consent only when the file carries it.
    const fill = <K extends keyof Customer>(k: K) => { if (!target![k] && incoming[k]) target![k] = incoming[k]; };
    (["firstName", "lastName", "email", "phone", "dob", "street", "postcode", "city", "occupation"] as const).forEach(fill);
    if (has("Language")) target.language = incoming.language;
    if (incoming.ownsCar !== "unknown") target.ownsCar = incoming.ownsCar;
    if (incoming.housing !== "unknown") target.housing = incoming.housing;
    if (incoming.children !== "unknown") target.children = incoming.children;
    for (const x of incoming.interests) if (!target.interests.includes(x)) target.interests.push(x);
    for (const p of incoming.policies) {
      const same = target.policies.find((q) => q.product === p.product && (!p.number || !q.number || q.number === p.number));
      if (!same) target.policies.push(p);
      else { same.number ||= p.number; same.since ||= p.since; same.premium ||= p.premium; }
    }
    if (incoming.notes && !target.notes.includes(incoming.notes)) target.notes = [target.notes, incoming.notes].filter(Boolean).join("\n");
    if (consentMapped) {
      if (isNew.has(target.id)) { (["email", "sms", "whatsapp", "marketing"] as const).forEach((k) => { target!.consent[k] = target!.consent[k] || incoming.consent[k]; }); }
      else if (overwriteConsent) { target.consent = incoming.consent; target.consentUpdated = today; target.consentSource = `Import: ${source}`; }
    }
  });
  return res;
}

export const TEMPLATE_CSV =
  "Vorname;Nachname;E-Mail;Telefon;Geburtsdatum;Straße;PLZ;Ort;Sprache;Beruf;Auto;Wohnsituation;Kinder;Produkte;Polizzennummer;Prämie;E-Mail Einwilligung;SMS Einwilligung;WhatsApp Einwilligung;Werbung Einwilligung;Notizen\r\n" +
  "Anna;Muster;anna.muster@example.com;0660 1234567;14.03.1988;Musterweg 1;1050;Wien;de;Lehrerin;ja;Miete;2;Haushalt, Kranken;;;ja;nein;ja;ja;Beispielzeile, bitte löschen\r\n" +
  "John;Sample;john.sample@example.com;+43 660 7654321;02.11.1979;Sample Street 2;1010;Wien;en;Engineer;;Eigentum mit Kredit;0;Leben;AT-123456;45;ja;nein;nein;nein;Example row, please delete\r\n";
