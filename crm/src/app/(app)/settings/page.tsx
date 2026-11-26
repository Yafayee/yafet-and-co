"use client";

import { CircleAlert, CircleCheck, Download, KeyRound, Trash2 } from "lucide-react";
import { PassMeter } from "@/components/gate";
import { useState, type FormEvent } from "react";
import { Card, PageHeader, StatusChip, Toggle } from "@/components/ui";
import { fmtDate, fmtDateTime, todayIso } from "@/lib/dates";
import { daysAgo } from "@/lib/dates";
import { strength } from "@/lib/passphrase";
import { CodeBox, SecurityPanel } from "@/components/security-panel";
import { download, toCsv, DEFAULT_WEBMAIL } from "@/lib/send";
import { useStore } from "@/lib/store";
import { DEFAULT_TEMPLATES } from "@/lib/templates";
import { CHANNEL_LABEL } from "@/lib/types";
import { t } from "@/lib/i18n";

export default function SettingsPage() {
  const s = useStore();
  const { db, update, mode } = s;
  const [tKey, setTKey] = useState("birthday");
  const [lang, setLang] = useState<"de" | "en">("de");
  const [pw, setPw] = useState({ current: "", next: "", again: "" });
  const [pwMsg, setPwMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [newCode, setNewCode] = useState("");
  const [erase, setErase] = useState("");
  const [shown, setShown] = useState(30);
  const [confirmExport, setConfirmExport] = useState(false);
  const tpl = db.settings.templates[tKey];
  const real = mode === "workspace";

  const setTemplate = (field: "subject" | "body", value: string) => update((d) => { d.settings.templates[tKey][lang][field] = value; });
  const changePw = async (e: FormEvent) => {
    e.preventDefault();
    const st = strength(pw.next);
    if (st.level === "weak") return setPwMsg({ ok: false, text: st.hint });
    if (pw.next !== pw.again) return setPwMsg({ ok: false, text: t("The two new passphrases do not match.") });
    const r = await s.changePassphrase(pw.current, pw.next);
    const ok = r.status === "ok";
    setPwMsg(ok ? { ok: true, text: t("Passphrase changed. Backup files made before this still need the old passphrase; download a new backup.") }
      : { ok: false, text: r.status === "passkey" ? t("The passkey was not confirmed.") : r.status === "failed" ? t("The change could not be saved, so nothing was changed. Check that the browser has free storage and try again.") : t("The current passphrase is not right.") });
    if (r.status === "ok" && r.code) setNewCode(r.code);
    if (ok) setPw({ current: "", next: "", again: "" });
  };
  const backup = async () => { download(`cp-crm-backup-${todayIso()}.crmbackup`, await s.backup(), "application/json"); update((d) => { d.settings.lastBackup = todayIso(); }, "Encrypted backup file downloaded"); };
  const exportCsv = () => {
    const rows = [["First name", "Last name", "Email", "Phone", "Date of birth", "Street", "Postcode", "City", "Language", "Occupation", "Owns a car", "Housing", "Children", "Marital status", "Employment", "Children birth years", "Net income per month", "Products", "Email consent", "SMS consent", "WhatsApp consent", "Marketing consent", "Preferred channel", "Notes"],
      ...db.customers.map((c) => [c.firstName, c.lastName, c.email, c.phone, c.dob, c.street, c.postcode, c.city, c.language, c.occupation, c.ownsCar === "unknown" ? "" : c.ownsCar === "yes" ? "ja" : "nein", { rent: "Miete", owner: "Eigentum", mortgage: "Eigentum mit Kredit", unknown: "" }[c.housing], c.children === "unknown" ? "" : c.children === "yes" ? "ja" : "nein", { single: "ledig", partner: "Lebensgemeinschaft", married: "verheiratet", unknown: "" }[c.marital], { employed: "angestellt", self: "selbstständig", student: "Student", retired: "Pension", unknown: "" }[c.employment], c.kids.join(", "), { "": "", under1500: "1400", "1500to2500": "2000", "2500to4000": "3000", over4000: "4500" }[c.income], c.policies.map((p) => p.product).join(", "), c.consent.email ? "ja" : "nein", c.consent.sms ? "ja" : "nein", c.consent.whatsapp ? "ja" : "nein", c.consent.marketing ? "ja" : "nein", CHANNEL_LABEL[c.preferredChannel], c.notes])];
    download(`customers-${todayIso()}.csv`, toCsv(rows), "text/csv");
    update(() => {}, `Exported all ${db.customers.length} customers as an unencrypted CSV file`);
  };

  return (
    <>
      <PageHeader title={t("Settings")} subtitle={t("Sending rules, message texts, security and the activity record.")} />
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <Card title={t("Sending rules")}>
          <div className="space-y-4 px-5 pb-5 pt-3">
            <label className="block"><span className="label">{t("Signature used in messages")}</span>
              <input className="input mt-1" defaultValue={db.settings.senderName} onBlur={(e) => { const v = e.target.value; if (v !== db.settings.senderName) update((d) => { d.settings.senderName = v; }); }} />
            </label>
            <label className="block"><span className="label">{t("Minimum days between product messages to one customer")}</span>
              <input type="number" min={7} max={365} className="input mt-1 max-w-32" defaultValue={db.settings.capDays} onBlur={(e) => { const v = Math.min(365, Math.max(7, Math.round(Number(e.target.value)) || 30)); e.target.value = String(v); if (v !== db.settings.capDays) update((d) => { d.settings.capDays = v; }, `Frequency limit set to ${v} days`); }} />
            </label>
            {/* Three visible choices instead of a drop-down list, so the options cannot be overlooked. */}
            <fieldset>
              <legend className="label">{t("Send emails with")}</legend>
              <div className="mt-1 grid gap-2">
                {([["default", "The mail program of this computer", "Outlook, Apple Mail or Thunderbird on this computer."], ["gmail", "Gmail in the browser", "Opens a filled-in Gmail message."], ["webmail", "Company webmail (e.g. OVB)", "Sends from your company address, e.g. yafet.teshome@ovb.at."]] as const).map(([v, l, d]) => {
                  const on = (db.settings.emailVia ?? "default") === v;
                  return (
                    // A real radio input inside each card keeps arrow-key and screen-reader behaviour.
                    <label key={v} data-testid={`email-via-${v}`}
                      className={`flex cursor-pointer items-start gap-3 rounded-md border px-3 py-2.5 text-left transition-colors focus-within:ring-2 focus-within:ring-white/60 ${on ? "border-primary bg-primary/15" : "border-line hover:border-primary/60"}`}>
                      <input type="radio" name="email-via" value={v} className="sr-only" checked={on}
                        onChange={() => update((x) => { x.settings.emailVia = v; }, `Emails are sent with ${v === "gmail" ? "Gmail in the browser" : v === "webmail" ? "the company webmail" : "the computer's mail program"}`)} />
                      <span aria-hidden className={`mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded-full border ${on ? "border-primary" : "border-mute"}`}>{on && <span className="h-2 w-2 rounded-full bg-primary" />}</span>
                      <span><span className="block text-sm font-medium text-white">{t(l)}</span><span className="block text-xs text-mute">{t(d)}</span></span>
                    </label>
                  );
                })}
              </div>
            </fieldset>
            {db.settings.emailVia === "webmail" && (
              <label className="block"><span className="label">{t("Address of the company webmail")}</span>
                <input type="url" className="input mt-1" placeholder={DEFAULT_WEBMAIL} defaultValue={db.settings.webmailUrl ?? DEFAULT_WEBMAIL} onBlur={(e) => { const v = e.target.value.trim(); if (v !== (db.settings.webmailUrl ?? DEFAULT_WEBMAIL)) update((d) => { d.settings.webmailUrl = v; }, "Company webmail address changed"); }} />
                <span className="mt-1 block text-xs text-mute">{t("Emails go out from your company address. The CRM opens the webmail and copies the address, subject and text for you to paste into a new message.")}</span>
              </label>
            )}
            {db.settings.emailVia === "gmail" && (
              <label className="block"><span className="label">{t("Your Gmail address (the sender)")}</span>
                <input type="email" className="input mt-1" placeholder="name@gmail.com" defaultValue={db.settings.gmailAddress ?? ""} onBlur={(e) => { const v = e.target.value.trim(); if (v !== (db.settings.gmailAddress ?? "")) update((d) => { d.settings.gmailAddress = v; }, "Gmail sender address changed"); }} />
                <span className="mt-1 block text-xs text-mute">{t("Each email opens as a new message in this Gmail account, already filled in. You check it and press Send in Gmail. You must be signed in to this account in this browser.")}</span>
              </label>
            )}
            <Toggle checked={db.settings.followUpAfterBirthday} onChange={() => update((d) => { d.settings.followUpAfterBirthday = !d.settings.followUpAfterBirthday; })} label={t("Suggest a product follow-up one week after a birthday greeting")} />
            <p className="text-xs text-mute">{t("Product messages are only ever suggested for customers who agreed to offers. Greetings need an agreed channel. These two rules cannot be switched off.")}</p>
          </div>
        </Card>

        <Card title={t("Message texts")}>
          <div className="space-y-3 px-5 pb-5 pt-3">
            <div className="flex flex-wrap gap-2">
              <select className="input !w-auto flex-1" aria-label={t("Message")} value={tKey} onChange={(e) => setTKey(e.target.value)}>{Object.entries(db.settings.templates).map(([k, v]) => <option key={k} value={k}>{t(v.label)}</option>)}</select>
              <select className="input !w-auto" aria-label={t("Language")} value={lang} onChange={(e) => setLang(e.target.value as "de" | "en")}><option value="de">{t("German")}</option><option value="en">{t("English")}</option></select>
            </div>
            <label className="block"><span className="label">{t("Subject (email only)")}</span><input key={`s${tKey}${lang}${tpl[lang].subject}`} className="input mt-1" defaultValue={tpl[lang].subject} onBlur={(e) => { if (e.target.value !== tpl[lang].subject) setTemplate("subject", e.target.value); }} /></label>
            <label className="block"><span className="label">{t("Text")}</span><textarea key={`b${tKey}${lang}${tpl[lang].body.length}`} className="input mt-1 min-h-44 leading-relaxed" defaultValue={tpl[lang].body} onBlur={(e) => { if (e.target.value !== tpl[lang].body) setTemplate("body", e.target.value); }} /></label>
            <div className="flex flex-wrap items-center justify-between gap-2">
              <p className="text-xs text-mute">Placeholders: {"{firstName} {lastName} {product} {sender}"}</p>
              {DEFAULT_TEMPLATES[tKey] && <button className="text-xs text-primary hover:underline" onClick={() => update((d) => { d.settings.templates[tKey][lang] = { ...DEFAULT_TEMPLATES[tKey][lang] }; })}>{t("Reset this text")}</button>}
            </div>
          </div>
        </Card>

        <Card title={t("Security and backup")}>
          <div className="space-y-4 px-5 pb-5 pt-3">
            <div className="flex flex-wrap gap-2">
              <StatusChip tone={real ? "good" : "warn"}>{real ? t("Encrypted on this device (AES-256)") : t("Demo: nothing is stored")}</StatusChip>
              <StatusChip tone="good">{t("No customer data leaves this browser")}</StatusChip>
            </div>
            <label className="block"><span className="label">{t("Lock automatically after minutes without activity")}</span>
              <input type="number" min={1} max={240} className="input mt-1 max-w-32" defaultValue={db.settings.autoLockMin} onBlur={(e) => { const v = Math.min(240, Math.max(1, Math.round(Number(e.target.value)) || 15)); e.target.value = String(v); if (v !== db.settings.autoLockMin) update((d) => { d.settings.autoLockMin = v; }, `Automatic lock set to ${v} minutes`); }} />
            </label>
            <div className="flex flex-wrap gap-2">
              <button className="btn btn-primary" disabled={!real} onClick={backup}><Download className="h-4 w-4" /> {t("Download encrypted backup")}</button>
              <button className="btn" disabled={db.customers.length === 0} onClick={() => setConfirmExport(true)}><Download className="h-4 w-4" /> {t("Export customers (CSV, not encrypted)")}</button>
            </div>
            {confirmExport && (
              <div className="rounded-md border border-warn/40 bg-warn/5 p-3 text-sm text-ink" role="alert">
                This file will hold all {db.customers.length} customers in plain text. Anyone who gets the file can read it. Use it only when another program needs it, and delete it afterwards. For safekeeping, use the encrypted backup instead.
                <div className="mt-2 flex flex-wrap gap-2"><button className="btn btn-danger" onClick={() => { exportCsv(); setConfirmExport(false); }}>{t("Download the plain file anyway")}</button><button className="btn" onClick={() => setConfirmExport(false)}>{t("Cancel")}</button></div>
              </div>
            )}
            <p className={`text-sm ${db.settings.lastBackup ? "text-ink-2" : "text-warn"}`}>{db.settings.lastBackup ? `Last backup downloaded: ${fmtDate(db.settings.lastBackup)}.` : t("No backup downloaded yet.")}</p>
            <p className="text-xs text-mute">{t("The data lives only in this browser on this device. Download a backup regularly and keep it somewhere safe; to move to another computer, restore the backup there.")}</p>
            {real && (
              <>
                <form onSubmit={changePw} className="space-y-2 border-t border-line/60 pt-4">
                  <span className="label">{t("Change passphrase")}</span>
                  <input type="password" className="input" aria-label={t("Current passphrase")} placeholder={t("Current passphrase")} autoComplete="current-password" value={pw.current} onChange={(e) => setPw({ ...pw, current: e.target.value })} required />
                  <input type="password" className="input" aria-label={t("New passphrase")} placeholder={t("New passphrase (12 characters or more)")} autoComplete="new-password" value={pw.next} onChange={(e) => setPw({ ...pw, next: e.target.value })} required />
                  {pw.next && <PassMeter pass={pw.next} />}
                  <input type="password" className="input" aria-label={t("Repeat new passphrase")} placeholder={t("Repeat new passphrase")} autoComplete="new-password" value={pw.again} onChange={(e) => setPw({ ...pw, again: e.target.value })} required />
                  {pwMsg && <p className={`text-sm ${pwMsg.ok ? "text-good" : "text-bad"}`} role="status">{pwMsg.text}</p>}
                  {newCode && <CodeBox code={newCode} note={t("Your recovery code was renewed together with the passphrase. The previous code no longer works.")} onDone={() => setNewCode("")} />}
                  <button className="btn"><KeyRound className="h-4 w-4" /> {t("Change passphrase")}</button>
                </form>
                <div className="space-y-2 border-t border-line/60 pt-4">
                  <span className="label">{t("Erase everything stored in this browser")}</span>
                  <div className="flex flex-wrap gap-2">
                    <input className="input max-w-44" aria-label={t("Type ERASE to confirm")} placeholder={t("Type ERASE")} value={erase} onChange={(e) => setErase(e.target.value)} />
                    <button className="btn btn-danger" disabled={erase !== "ERASE"} onClick={() => s.erase()}><Trash2 className="h-4 w-4" /> {t("Erase workspace")}</button>
                  </div>
                </div>
              </>
            )}
          </div>
        </Card>

        {real && <SecurityPanel />}
        <SecurityChecklist />

        <Card title={t("Activity record")} action={<span className="text-xs text-mute">{db.audit.length} entries</span>}>
          {db.audit.length === 0 ? <p className="px-5 pb-5 pt-3 text-sm text-mute">{t("Nothing recorded yet.")}</p> : (
            <ul className="px-5 pb-5 pt-3">
              {db.audit.slice(0, shown).map((a, i) => (
                <li key={i} className="flex flex-wrap gap-x-3 border-t border-line/50 py-2 text-sm first:border-t-0">
                  <span className="w-36 shrink-0 text-xs tabular-nums text-mute">{fmtDateTime(a.ts)}</span>
                  <span className="min-w-0 flex-1 basis-48 text-ink-2">{t(a.action)}</span>
                </li>
              ))}
              {db.audit.length > shown && <li className="pt-2"><button className="text-xs text-primary hover:underline" onClick={() => setShown(shown + 50)}>{t("Show more")}</button></li>}
            </ul>
          )}
        </Card>
      </div>
      <p className="mt-3 text-xs text-mute">{t("{c} customers · {e} history entries", { c: db.customers.length, e: db.events.length })}</p>
    </>
  );
}

const MANUAL: { key: string; label: string; how: string }[] = [
  { key: "twoFactor", label: "Two-factor login is on for the GitHub account that hosts this app", how: "On github.com: Settings, then Password and authentication. This protects the app's code from being changed by someone else." },
  { key: "uniquePass", label: "The passphrase is used nowhere else and is written down in a safe place", how: "There is no reset. A password manager or a note in a locked drawer both work." },
  { key: "diskEncryption", label: "This computer's disk is encrypted and it asks for a password after sleep", how: "Windows: BitLocker or Device encryption. Mac: FileVault. Both are in the system settings." },
  { key: "cleanBrowser", label: "I use a browser profile without extensions for this app", how: "Extensions can read what a page shows. Create a separate profile in your browser and add no extensions to it." },
  { key: "backupStored", label: "Backup files are kept outside this computer", how: "A USB stick or your cloud storage. The file is encrypted, so it is safe to store there." },
  { key: "exportsDeleted", label: "Plain exports are deleted after use", how: "CSV exports, single-customer exports and mail-merge lists are readable by anyone. Empty the Downloads folder and the bin." },
];

function SecurityChecklist() {
  const { db, update, mode, weakPass, persisted, security } = useStore();
  const real = mode === "workspace";
  const https = typeof window !== "undefined" && (window.location.protocol === "https:" || window.location.hostname === "localhost");
  const backupAge = db.settings.lastBackup ? daysAgo(db.settings.lastBackup) : null;
  const auto: { ok: boolean; label: string; detail: string }[] = [
    { ok: https, label: t("Secure connection"), detail: https ? t("The page is loaded over HTTPS.") : t("The page is not loaded over HTTPS. Do not enter data.") },
    { ok: real, label: t("Encrypted workspace"), detail: real ? t("Data is stored encrypted with AES-256.") : t("This is the demo; nothing is stored.") },
    { ok: real && !weakPass, label: t("Passphrase strength"), detail: !real ? t("Not applicable in the demo.") : weakPass ? t("Weak. Change it below.") : t("Passed the strength check.") },
    { ok: real && security.recovery, label: t("Recovery code"), detail: security.recovery ? t("A recovery code exists for a forgotten passphrase.") : t("Not set up. Without it a forgotten passphrase means the data is lost.") },
    { ok: real && security.passkey, label: t("Second factor"), detail: security.passkey ? t("Unlocking needs the passphrase and the passkey.") : t("Off. Switch on a passkey above so that the passphrase alone is not enough.") },
    { ok: backupAge !== null && backupAge <= 7, label: t("Recent backup"), detail: backupAge === null ? t("No backup downloaded yet.") : `Last backup ${backupAge === 0 ? "today" : `${backupAge} days ago`}.` },
    { ok: db.settings.autoLockMin <= 15, label: t("Automatic lock"), detail: t("Locks after {n} minutes without activity, also after the computer wakes from sleep.", { n: db.settings.autoLockMin }) },
    { ok: persisted === true, label: t("Browser keeps the data"), detail: persisted === true ? t("The browser will not clear this site's data on its own.") : persisted === false ? t("The browser may clear this data if disk space runs low. Keep backups current; using the app regularly usually changes this.") : t("This browser does not report it. Keep backups current.") },
  ];
  const done = auto.filter((a) => a.ok).length + MANUAL.filter((m) => db.settings.checks[m.key]).length;
  const total = auto.length + MANUAL.length;
  return (
    <Card title={t("Security checklist")} className="lg:col-span-2" action={<StatusChip tone={done === total ? "good" : "warn"}>{t("{a} of {b} done", { a: done, b: total })}</StatusChip>}>
      <div className="grid gap-x-8 gap-y-1 px-5 pb-5 pt-3 md:grid-cols-2">
        <div>
          <h3 className="label mb-2">{t("Checked by the app")}</h3>
          <ul className="space-y-2">
            {auto.map((a) => (
              <li key={a.label} className="flex gap-2 text-sm">
                {a.ok ? <CircleCheck className="mt-0.5 h-4 w-4 shrink-0 text-good" aria-label={t("OK")} /> : <CircleAlert className="mt-0.5 h-4 w-4 shrink-0 text-warn" aria-label={t("Needs attention")} />}
                <span><span className="text-white">{a.label}</span><span className="block text-xs text-mute">{a.detail}</span></span>
              </li>
            ))}
          </ul>
          <p className="mt-3 text-xs text-mute">{t("App version {v}, built {d}. A notice appears whenever the version changes.", { v: process.env.NEXT_PUBLIC_BUILD ?? "local", d: process.env.NEXT_PUBLIC_BUILT_AT ?? "" })}</p>
        </div>
        <div>
          <h3 className="label mb-2">{t("Only you can check these")}</h3>
          <ul className="space-y-2">
            {MANUAL.map((m) => (
              <li key={m.key}>
                <label className="flex cursor-pointer gap-2 text-sm">
                  <input type="checkbox" className="mt-0.5 h-4 w-4 shrink-0 accent-[#2b8cee]" checked={Boolean(db.settings.checks[m.key])} onChange={() => update((d) => { d.settings.checks[m.key] = !d.settings.checks[m.key]; }, `Security checklist: ${db.settings.checks[m.key] ? "unticked" : "ticked"} "${m.label}"`)} />
                  <span><span className="text-white">{t(m.label)}</span><span className="block text-xs text-mute">{t(m.how)}</span></span>
                </label>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </Card>
  );
}
