"use client";

import { useState, type FormEvent } from "react";
import { todayIso } from "@/lib/dates";
import { uid } from "@/lib/send";
import { CHANNELS, CHANNEL_LABEL, type Customer } from "@/lib/types";
import { Toggle } from "./ui";

export function blankCustomer(): Customer {
  return {
    id: uid(), firstName: "", lastName: "", email: "", phone: "", dob: "", street: "", postcode: "", city: "",
    language: "de", occupation: "", ownsCar: "unknown", interests: [], policies: [],
    consent: { email: false, sms: false, whatsapp: false, marketing: false }, consentUpdated: "", consentSource: "",
    preferredChannel: "email", notes: "", createdAt: todayIso(),
  };
}

export function CustomerForm({ initial, isNew, onSave, onCancel }: { initial: Customer; isNew: boolean; onSave: (c: Customer) => void; onCancel: () => void }) {
  const [c, setC] = useState<Customer>(initial);
  const [interests, setInterests] = useState(initial.interests.join(", "));
  const [error, setError] = useState("");
  const set = <K extends keyof Customer>(k: K, v: Customer[K]) => setC((x) => ({ ...x, [k]: v }));
  const text = (k: "firstName" | "lastName" | "email" | "phone" | "street" | "postcode" | "city" | "occupation", label: string, type = "text", span = "") => (
    <label className={`block ${span}`}><span className="label">{label}</span><input type={type} className="input mt-1" value={c[k]} onChange={(e) => set(k, e.target.value)} /></label>
  );
  const submit = (e: FormEvent) => {
    e.preventDefault();
    if (!c.firstName.trim() && !c.lastName.trim()) { setError("Enter a first or last name."); return; }
    if (c.email && !/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(c.email.trim())) { setError("That email address is not valid."); return; }
    const consentChanged = isNew || JSON.stringify(c.consent) !== JSON.stringify(initial.consent);
    onSave({
      ...c, firstName: c.firstName.trim(), lastName: c.lastName.trim(), email: c.email.trim().toLowerCase(), phone: c.phone.trim(),
      interests: interests.split(",").map((x) => x.trim()).filter(Boolean),
      consentUpdated: consentChanged ? todayIso() : c.consentUpdated, consentSource: consentChanged ? "Entered by hand" : c.consentSource,
    });
  };
  return (
    <form onSubmit={submit} className="card mb-4 p-5">
      <h2 className="text-base font-semibold text-white">{isNew ? "New customer" : "Edit details"}</h2>
      <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {text("firstName", "First name")}
        {text("lastName", "Last name")}
        <label className="block"><span className="label">Date of birth</span><input type="date" className="input mt-1" value={c.dob} max={todayIso()} onChange={(e) => set("dob", e.target.value)} /></label>
        {text("email", "Email", "email")}
        {text("phone", "Phone (with country code, e.g. +43 660 1234567)", "tel")}
        {text("occupation", "Occupation")}
        {text("street", "Street and number")}
        {text("postcode", "Postcode")}
        {text("city", "City")}
        <label className="block"><span className="label">Language for messages</span>
          <select className="input mt-1" value={c.language} onChange={(e) => set("language", e.target.value as Customer["language"])}><option value="de">German</option><option value="en">English</option></select>
        </label>
        <label className="block"><span className="label">Owns a car</span>
          <select className="input mt-1" value={c.ownsCar} onChange={(e) => set("ownsCar", e.target.value as Customer["ownsCar"])}><option value="unknown">Not known</option><option value="yes">Yes</option><option value="no">No</option></select>
        </label>
        <label className="block"><span className="label">Preferred channel</span>
          <select className="input mt-1" value={c.preferredChannel} onChange={(e) => set("preferredChannel", e.target.value as Customer["preferredChannel"])}>{CHANNELS.map((ch) => <option key={ch} value={ch}>{CHANNEL_LABEL[ch]}</option>)}</select>
        </label>
        <label className="block sm:col-span-2 lg:col-span-3"><span className="label">Interests (separate with commas)</span><input className="input mt-1" value={interests} onChange={(e) => setInterests(e.target.value)} /></label>
      </div>
      {isNew && (
        <fieldset className="mt-5 border-t border-line/60 pt-4">
          <legend className="label">What the customer agreed to</legend>
          <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2">
            {CHANNELS.map((ch) => <Toggle key={ch} checked={c.consent[ch]} onChange={() => set("consent", { ...c.consent, [ch]: !c.consent[ch] })} label={`Contact by ${CHANNEL_LABEL[ch]}`} />)}
            <Toggle checked={c.consent.marketing} onChange={() => set("consent", { ...c.consent, marketing: !c.consent.marketing })} label="Product offers (marketing)" />
          </div>
        </fieldset>
      )}
      {error && <p className="mt-4 text-sm text-bad" role="alert">{error}</p>}
      <div className="mt-5 flex justify-end gap-2">
        <button type="button" className="btn" onClick={onCancel}>Cancel</button>
        <button type="submit" className="btn btn-primary">{isNew ? "Create profile" : "Save changes"}</button>
      </div>
    </form>
  );
}
