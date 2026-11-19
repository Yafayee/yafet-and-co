import { describe, expect, it } from "vitest";
import { convert, guessMapping, parseCsv, parseDate, parseEmployment, parseHousing, parseIncome, parseKids, parseMarital, parsePhone, parseProducts } from "@/lib/importer";
import { customer } from "./helpers";

const header = ["Vorname", "Nachname", "E-Mail", "Telefon", "Geburtsdatum", "Produkte", "Polizzennummer", "E-Mail Einwilligung", "Werbung Einwilligung"];
const map = guessMapping(header);

describe("reading values", () => {
  it("reads dates in the usual formats and rejects impossible ones", () => {
    expect(parseDate("14.03.1988")).toBe("1988-03-14");
    expect(parseDate("1988-03-14")).toBe("1988-03-14");
    expect(parseDate("4/3/1988")).toBe("1988-03-04");
    expect(parseDate("31.02.1990")).toBe("");
    expect(parseDate("")).toBe("");
    expect(parseDate("morgen")).toBe("");
  });
  it("normalises Austrian phone numbers", () => {
    expect(parsePhone("0660 1234567")).toBe("+436601234567");
    expect(parsePhone("0043 660 1234567")).toBe("+436601234567");
    expect(parsePhone("+43 660/123 45 67")).toBe("+436601234567");
    expect(parsePhone("12")).toBe("");
  });
  it("recognises German product words and reports unknown ones", () => {
    expect(parseProducts("Kfz, Rechtsschutz; Haftpflicht")).toEqual({ products: ["Car", "Legal protection", "Liability"], unknown: [] });
    expect(parseProducts("Kindervorsorge / Yacht")).toEqual({ products: ["Child savings"], unknown: ["Yacht"] });
  });
  it("reads children's birth years and income bands", () => {
    expect(parseKids("2019, 2022; abc")).toEqual([2019, 2022]);
    expect(parseIncome("2.800")).toBe("2500to4000");
    expect(parseIncome("1.400,50")).toBe("under1500");
    expect(parseIncome("")).toBe("");
  });
  it("parses quoted CSV with semicolons and embedded line breaks", () => {
    expect(parseCsv('a;b\n"x;1";"line1\nline2"\n')).toEqual([["a", "b"], ["x;1", "line1\nline2"]]);
  });
  it("matches German column names", () => {
    expect(map).toEqual(["First name", "Last name", "Email", "Phone", "Date of birth", "Products", "Policy number", "Email consent", "Marketing consent"]);
  });
});

describe("creating and merging profiles", () => {
  const rows = [
    ["Anna", "Muster", "anna@example.com", "0660 1111111", "14.03.1988", "Kfz", "AT-1", "ja", "ja"],
    ["Anna", "Muster", "anna@example.com", "0660 1111111", "14.03.1988", "Haushalt", "AT-2", "ja", "ja"],
    ["", "", "x@example.com", "", "", "", "", "", ""],
  ];
  it("merges rows of the same person and skips rows without a name", () => {
    const r = convert(rows, map, [], "f.csv");
    expect(r.create).toHaveLength(1);
    expect(r.merged).toBe(1);
    expect(r.skipped).toBe(1);
    expect(r.create[0].policies.map((p) => [p.product, p.number])).toEqual([["Car", "AT-1"], ["Household", "AT-2"]]);
    expect(r.create[0].consent).toMatchObject({ email: true, marketing: true });
  });
  it("updates instead of duplicating on a second import, without duplicating policies", () => {
    const first = convert(rows, map, [], "f.csv").create;
    const again = convert(rows, map, first, "f.csv");
    expect(again.create).toHaveLength(0);
    expect(again.update).toHaveLength(1);
    expect(again.update[0].policies).toHaveLength(2);
  });
  it("keeps recorded consent on re-import unless told to replace it", () => {
    const existing = customer({ firstName: "Anna", lastName: "Muster", email: "anna@example.com", consent: { email: true, sms: false, whatsapp: false, marketing: false } });
    expect(convert(rows, map, [existing], "f.csv").update[0].consent.marketing).toBe(false);
    expect(convert(rows, map, [existing], "f.csv", true).update[0].consent.marketing).toBe(true);
  });
  it("creates profiles with messaging off when the file has no consent columns", () => {
    const h = ["Vorname", "Nachname", "E-Mail"];
    const r = convert([["Ben", "Test", "ben@example.com"]], guessMapping(h), [], "f.csv");
    expect(r.consentMapped).toBe(false);
    expect(r.create[0].consent).toEqual({ email: false, sms: false, whatsapp: false, marketing: false });
  });
  it("does not merge two different people who share a name but not a birth date or email", () => {
    const h = ["Vorname", "Nachname", "Geburtsdatum"];
    const r = convert([["Max", "Huber", "01.01.1980"], ["Max", "Huber", "02.02.1990"]], guessMapping(h), [], "f.csv");
    expect(r.create).toHaveLength(2);
  });
});

describe("defects found in the audit", () => {
  const year = new Date().getFullYear();
  it("keeps policy end dates that lie in the future", () => {
    expect(parseDate(`31.12.${year + 9}`, true)).toBe(`${year + 9}-12-31`);
    expect(parseDate("31.12.35", true)).toBe("2035-12-31");
    expect(parseDate(`31.12.${year + 9}`)).toBe("");
  });
  it("does not turn a bare year into a date", () => {
    expect(parseDate("1988")).toBe("");
    expect(parseDate(1988)).toBe("");
  });
  it("reads phone numbers with a bracketed zero or without the leading zero", () => {
    expect(parsePhone("+43 (0) 660 1234567")).toBe("+436601234567");
    expect(parsePhone("+430660 1234567")).toBe("+436601234567");
    expect(parsePhone("660 1234567")).toBe("+436601234567");
    expect(parsePhone("43 660 1234567")).toBe("+436601234567");
  });
  it("does not mistake look-alike column names", () => {
    const m = guessMapping(["Titel", "Angebot", "Erwerbstätig", "Telefon", "Geburtsdatum", "Werbung"]);
    expect(m).toEqual(["Do not import", "Do not import", "Employment", "Phone", "Date of birth", "Marketing consent"]);
  });
  it("understands negations", () => {
    expect(parseHousing("Eigentum ohne Kredit")).toBe("owner");
    expect(parseHousing("Eigentum mit Kredit")).toBe("mortgage");
    expect(parseEmployment("unselbstständig")).toBe("employed");
    expect(parseEmployment("selbstständig")).toBe("self");
    expect(parseMarital("unverheiratet")).toBe("single");
    expect(parseMarital("verheiratet")).toBe("married");
  });
  it("reads income ranges", () => {
    expect(parseIncome("1500-2500")).toBe("1500to2500");
    expect(parseIncome("€ 2,800")).toBe("2500to4000");
    expect(parseIncome("4500")).toBe("over4000");
  });
  it("keeps two people who share an email address apart", () => {
    const r = convert([
      ["Anna", "Muster", "familie@example.com", "", "14.03.1988", "Kfz", "", "ja", "ja"],
      ["Paul", "Muster", "familie@example.com", "", "02.02.1985", "Haushalt", "", "nein", "nein"],
    ], map, [], "f.csv");
    expect(r.create).toHaveLength(2);
    expect(r.create[0].consent.marketing).toBe(true);
    expect(r.create[1].consent.marketing).toBe(false);
  });
  it("recognises the same person by name and date of birth when the email is new", () => {
    const old = customer({ firstName: "Anna", lastName: "Muster", email: "", dob: "1988-03-14" });
    const r = convert([["Anna", "Muster", "anna@example.com", "", "14.03.1988", "Kfz", "", "", ""]], map, [old], "f.csv");
    expect(r.create).toHaveLength(0);
    expect(r.update[0].email).toBe("anna@example.com");
  });
  it("lets a 'no' in any row of a new person win", () => {
    const r = convert([
      ["Anna", "Muster", "anna@example.com", "", "14.03.1988", "Kfz", "", "ja", "ja"],
      ["Anna", "Muster", "anna@example.com", "", "14.03.1988", "Haushalt", "", "ja", "nein"],
    ], map, [], "f.csv");
    expect(r.create[0].consent).toMatchObject({ email: true, marketing: false });
  });
});

