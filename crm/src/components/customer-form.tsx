"use client";

import { useState, type FormEvent } from "react";
import { todayIso } from "@/lib/dates";
import { uid } from "@/lib/send";
import { CHANNELS, CHANNEL_LABEL, INCOME_LABEL, type Customer } from "@/lib/types";
import { Toggle } from "./ui";
import { t } from "@/lib/i18n";

export function blankCustomer(): Customer {
  return {
    id: uid(), firstName: "", lastName: "", email: "", phone: "", dob: "", street: "", postcode: "", city: "",
    language: "de", occupation: "", ownsCar: "unknown", housing: "unknown", children: "unknown", marital: "unknown", employment: "unknown", kids: [], income: "", interests: [], policies: [],
    consent: { email: false, sms: false, whatsapp: false, marketing: false }, consentUpdated: "", consentSource: "",
    preferredChannel: "email", notes: "", createdAt: todayIso(),
  };
}

export function CustomerForm({ initial, isNew, onSave, onCancel }: { initial: Customer; isNew: boolean; onSave: (c: Customer) => void; onCancel: () => void }) {
  const [c, setC] = useState<Customer>(initial);
  const [interests, setInterests] = useState(initial.interests.join(", "));
  const [kids, setKids] = useState(initial.kids.join(", "));
  const [error, setError] = useState("");
  const set = <K extends keyof Customer>(k: K, v: Customer[K]) => setC((x) => ({ ...x, [k]: v }));
  const text = (k: "firstName" | "lastName" | "email" | "phone" | "street" | "postcode" | "city" | "occupation", label: string, type = "text", span = "") => (
    <label className={`block ${span}`}><span className="label">{label}</span><input type={type} className="input mt-1" value={c[k]} onChange={(e) => set(k, e.target.value)} /></label>
  );
  const submit = (e: FormEvent) => {
    e.preventDefault();
    if (!c.firstName.trim() && !c.lastName.trim()) { setError("Enter a first or last name."); return; }
    if (c.email && !/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(c.email.trim())) { setError("That email address is not valid."); return; }
    const thisYear = new Date().getFullYear();
    const years = [...new Set(kids.split(/[,;\s]+/).map(Number).filter((y) => Number.isInteger(y) && y >= 1940 && y <= thisYear))].sort((a, b) => a - b);
    if (kids.trim() && years.length === 0) { setError("Enter the children's birth years as four-digit years, separated by commas."); return; }
    const consentChanged = isNew || JSON.stringify(c.consent) !== JSON.stringify(initial.consent);
    onSave({
      ...c, firstName: c.firstName.trim(), lastName: c.lastName.trim(), email: c.email.trim().toLowerCase(), phone: c.phone.trim(),
      interests: interests.split(",").map((x) => x.trim()).filter(Boolean),
      kids: years, children: years.length ? "yes" : c.children,
      consentUpdated: consentChanged ? todayIso() : c.consentUpdated, consentSource: consentChanged ? t("Entered by hand") : c.consentSource,
    });
  };
  return (
    <form onSubmit={submit} className="card mb-4 p-5">
      <h2 className="text-base font-semibold text-white">{isNew ? t("New customer") : t("Edit details")}</h2>
      <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {text("firstName", "First name")}
        {text("lastName", "Last name")}
        <label className="block"><span className="label">{t("Date of birth")}</span><input type="date" className="input mt-1" value={c.dob} max={todayIso()} onChange={(e) => set("dob", e.target.value)} /></label>
        {text("email", "Email", "email")}
        {text("phone", "Phone (with country code, e.g. +43 660 1234567)", "tel")}
        {text("occupation", "Occupation")}
        {text("street", "Street and number")}
        {text("postcode", "Postcode")}
        {text("city", "City")}
        <label className="block"><span className="label">{t("Language for messages")}</span>
          <select className="input mt-1" value={c.language} onChange={(e) => set("language", e.target.value as Customer["language"])}><option value="de">{t("German")}</option><option value="en">{t("English")}</option></select>
        </label>
        <label className="block"><span className="label">{t("Owns a car")}</span>
          <select className="input mt-1" value={c.ownsCar} onChange={(e) => set("ownsCar", e.target.value as Customer["ownsCar"])}><option value="unknown">{t("Not known")}</option><option value="yes">{t("Yes")}</option><option value="no">{t("No")}</option></select>
        </label>
        <label className="block"><span className="label">{t("Marital status")}</span>
          <select className="input mt-1" value={c.marital} onChange={(e) => set("marital", e.target.value as Customer["marital"])}><option value="unknown">{t("Not known")}</option><option value="single">{t("Single")}</option><option value="partner">{t("Lives with a partner")}</option><option value="married">{t("Married")}</option></select>
        </label>
        <label className="block"><span className="label">{t("Work")}</span>
          <select className="input mt-1" value={c.employment} onChange={(e) => set("employment", e.target.value as Customer["employment"])}><option value="unknown">{t("Not known")}</option><option value="employed">{t("Employed")}</option><option value="self">{t("Self-employed")}</option><option value="student">{t("Student or apprentice")}</option><option value="retired">{t("Retired")}</option></select>
        </label>
        <label className="block"><span className="label">{t("Home")}</span>
          <select className="input mt-1" value={c.housing} onChange={(e) => set("housing", e.target.value as Customer["housing"])}><option value="unknown">{t("Not known")}</option><option value="rent">{t("Rents")}</option><option value="owner">{t("Owns, no home loan")}</option><option value="mortgage">{t("Owns, with a home loan")}</option></select>
        </label>
        <label className="block"><span className="label">{t("Children")}</span>
          <select className="input mt-1" value={c.children} onChange={(e) => set("children", e.target.value as Customer["children"])}><option value="unknown">{t("Not known")}</option><option value="yes">{t("Yes")}</option><option value="no">{t("No")}</option></select>
        </label>
        <label className="block"><span className="label">Children&apos;s birth years (e.g. 2015, 2019)</span><input className="input mt-1" inputMode="numeric" value={kids} onChange={(e) => setKids(e.target.value)} /></label>
        <label className="block"><span className="label">{t("Net income per month")}</span>
          <select className="input mt-1" value={c.income} onChange={(e) => set("income", e.target.value as Customer["income"])}>{(Object.keys(INCOME_LABEL) as Customer["income"][]).map((k) => <option key={k} value={k}>{t(INCOME_LABEL[k])}</option>)}</select>
        </label>
        <label className="block"><span className="label">{t("Preferred channel")}</span>
          <select className="input mt-1" value={c.preferredChannel} onChange={(e) => set("preferredChannel", e.target.value as Customer["preferredChannel"])}>{CHANNELS.map((ch) => <option key={ch} value={ch}>{CHANNEL_LABEL[ch]}</option>)}</select>
        </label>
        <label className="block sm:col-span-2 lg:col-span-3"><span className="label">{t("Interests (separate with commas)")}</span><input className="input mt-1" value={interests} onChange={(e) => setInterests(e.target.value)} /></label>
      </div>
      {isNew && (
        <fieldset className="mt-5 border-t border-line/60 pt-4">
          <legend className="label">{t("What the customer agreed to")}</legend>
          <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2">
            {CHANNELS.map((ch) => <Toggle key={ch} checked={c.consent[ch]} onChange={() => set("consent", { ...c.consent, [ch]: !c.consent[ch] })} label={t(`Contact by ${CHANNEL_LABEL[ch]}`)} />)}
            <Toggle checked={c.consent.marketing} onChange={() => set("consent", { ...c.consent, marketing: !c.consent.marketing })} label={t("Product offers (marketing)")} />
          </div>
        </fieldset>
      )}
      {error && <p className="mt-4 text-sm text-bad" role="alert">{error}</p>}
      <div className="mt-5 flex justify-end gap-2">
        <button type="button" className="btn" onClick={onCancel}>{t("Cancel")}</button>
        <button type="submit" className="btn btn-primary">{isNew ? t("Create profile") : t("Save changes")}</button>
      </div>
    </form>
  );
}
