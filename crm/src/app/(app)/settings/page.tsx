"use client";

import { CircleAlert, CircleCheck, Download, KeyRound, Trash2 } from "lucide-react";
import { PassMeter } from "@/components/gate";
import { useState, type FormEvent } from "react";
import { Card, PageHeader, StatusChip, Toggle } from "@/components/ui";
import { fmtDate, fmtDateTime, todayIso } from "@/lib/dates";
import { daysAgo } from "@/lib/dates";
import { strength } from "@/lib/passphrase";
import { fullName } from "@/lib/rules";
import { download, toCsv } from "@/lib/send";
import { useStore } from "@/lib/store";
import { DEFAULT_TEMPLATES } from "@/lib/templates";
import { CHANNEL_LABEL } from "@/lib/types";

export default function SettingsPage() {
  const s = useStore();
  const { db, update, mode } = s;
  const [tKey, setTKey] = useState("birthday");
  const [lang, setLang] = useState<"de" | "en">("de");
  const [pw, setPw] = useState({ current: "", next: "", again: "" });
  const [pwMsg, setPwMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [erase, setErase] = useState("");
  const [shown, setShown] = useState(30);
  const [confirmExport, setConfirmExport] = useState(false);
  const t = db.settings.templates[tKey];
  const real = mode === "workspace";

  const setTemplate = (field: "subject" | "body", value: string) => update((d) => { d.settings.templates[tKey][lang][field] = value; });
  const changePw = async (e: FormEvent) => {
    e.preventDefault();
    const st = strength(pw.next);
    if (st.level === "weak") return setPwMsg({ ok: false, text: st.hint });
    if (pw.next !== pw.again) return setPwMsg({ ok: false, text: "The two new passphrases do not match." });
    const ok = await s.changePassphrase(pw.current, pw.next);
    setPwMsg(ok ? { ok: true, text: "Passphrase changed. Older backup files still open with the old passphrase." } : { ok: false, text: "The current passphrase is not right." });
    if (ok) setPw({ current: "", next: "", again: "" });
  };
  const backup = async () => { download(`cp-crm-backup-${todayIso()}.crmbackup`, await s.backup(), "application/json"); update((d) => { d.settings.lastBackup = todayIso(); }, "Encrypted backup file downloaded"); };
  const exportCsv = () => {
    const rows = [["First name", "Last name", "Email", "Phone", "Date of birth", "Street", "Postcode", "City", "Language", "Occupation", "Owns a car", "Housing", "Children", "Products", "Email consent", "SMS consent", "WhatsApp consent", "Marketing consent", "Preferred channel", "Notes"],
      ...db.customers.map((c) => [c.firstName, c.lastName, c.email, c.phone, c.dob, c.street, c.postcode, c.city, c.language, c.occupation, c.ownsCar === "unknown" ? "" : c.ownsCar === "yes" ? "ja" : "nein", { rent: "Miete", owner: "Eigentum", mortgage: "Eigentum mit Kredit", unknown: "" }[c.housing], c.children === "unknown" ? "" : c.children === "yes" ? "ja" : "nein", c.policies.map((p) => p.product).join(", "), c.consent.email ? "ja" : "nein", c.consent.sms ? "ja" : "nein", c.consent.whatsapp ? "ja" : "nein", c.consent.marketing ? "ja" : "nein", CHANNEL_LABEL[c.preferredChannel], c.notes])];
    download(`customers-${todayIso()}.csv`, toCsv(rows), "text/csv");
    update(() => {}, `Exported all ${db.customers.length} customers as an unencrypted CSV file`);
  };

  return (
    <>
      <PageHeader title="Settings" subtitle="Sending rules, message texts, security and the activity record." />
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <Card title="Sending rules">
          <div className="space-y-4 px-5 pb-5 pt-3">
            <label className="block"><span className="label">Signature used in messages</span>
              <input className="input mt-1" value={db.settings.senderName} onChange={(e) => update((d) => { d.settings.senderName = e.target.value; })} />
            </label>
            <label className="block"><span className="label">Minimum days between product messages to one customer</span>
              <input type="number" min={7} max={365} className="input mt-1 max-w-32" value={db.settings.capDays} onChange={(e) => update((d) => { d.settings.capDays = Math.min(365, Math.max(7, Number(e.target.value) || 30)); })} />
            </label>
            <Toggle checked={db.settings.followUpAfterBirthday} onChange={() => update((d) => { d.settings.followUpAfterBirthday = !d.settings.followUpAfterBirthday; })} label="Suggest a product follow-up one week after a birthday greeting" />
            <p className="text-xs text-mute">Product messages are only ever suggested for customers who agreed to offers. Greetings need an agreed channel. These two rules cannot be switched off.</p>
          </div>
        </Card>

        <Card title="Message texts">
          <div className="space-y-3 px-5 pb-5 pt-3">
            <div className="flex flex-wrap gap-2">
              <select className="input !w-auto flex-1" aria-label="Message" value={tKey} onChange={(e) => setTKey(e.target.value)}>{Object.entries(db.settings.templates).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}</select>
              <select className="input !w-auto" aria-label="Language" value={lang} onChange={(e) => setLang(e.target.value as "de" | "en")}><option value="de">German</option><option value="en">English</option></select>
            </div>
            <label className="block"><span className="label">Subject (email only)</span><input className="input mt-1" value={t[lang].subject} onChange={(e) => setTemplate("subject", e.target.value)} /></label>
            <label className="block"><span className="label">Text</span><textarea className="input mt-1 min-h-44 leading-relaxed" value={t[lang].body} onChange={(e) => setTemplate("body", e.target.value)} /></label>
            <div className="flex flex-wrap items-center justify-between gap-2">
              <p className="text-xs text-mute">Placeholders: {"{firstName} {lastName} {product} {sender}"}</p>
              {DEFAULT_TEMPLATES[tKey] && <button className="text-xs text-primary hover:underline" onClick={() => update((d) => { d.settings.templates[tKey][lang] = { ...DEFAULT_TEMPLATES[tKey][lang] }; })}>Reset this text</button>}
            </div>
          </div>
        </Card>

        <Card title="Security and backup">
          <div className="space-y-4 px-5 pb-5 pt-3">
            <div className="flex flex-wrap gap-2">
              <StatusChip tone={real ? "good" : "warn"}>{real ? "Encrypted on this device (AES-256)" : "Demo: nothing is stored"}</StatusChip>
              <StatusChip tone="good">No customer data leaves this browser</StatusChip>
            </div>
            <label className="block"><span className="label">Lock automatically after minutes without activity</span>
              <input type="number" min={1} max={240} className="input mt-1 max-w-32" value={db.settings.autoLockMin} onChange={(e) => update((d) => { d.settings.autoLockMin = Math.min(240, Math.max(1, Number(e.target.value) || 15)); })} />
            </label>
            <div className="flex flex-wrap gap-2">
              <button className="btn btn-primary" disabled={!real} onClick={backup}><Download className="h-4 w-4" /> Download encrypted backup</button>
              <button className="btn" disabled={db.customers.length === 0} onClick={() => setConfirmExport(true)}><Download className="h-4 w-4" /> Export customers (CSV, not encrypted)</button>
            </div>
            {confirmExport && (
              <div className="rounded-md border border-warn/40 bg-warn/5 p-3 text-sm text-ink" role="alert">
                This file will hold all {db.customers.length} customers in plain text. Anyone who gets the file can read it. Use it only when another program needs it, and delete it afterwards. For safekeeping, use the encrypted backup instead.
                <div className="mt-2 flex flex-wrap gap-2"><button className="btn btn-danger" onClick={() => { exportCsv(); setConfirmExport(false); }}>Download the plain file anyway</button><button className="btn" onClick={() => setConfirmExport(false)}>Cancel</button></div>
              </div>
            )}
            <p className={`text-sm ${db.settings.lastBackup ? "text-ink-2" : "text-warn"}`}>{db.settings.lastBackup ? `Last backup downloaded: ${fmtDate(db.settings.lastBackup)}.` : "No backup downloaded yet."}</p>
            <p className="text-xs text-mute">The data lives only in this browser on this device. Download a backup regularly and keep it somewhere safe; to move to another computer, restore the backup there.</p>
            {real && (
              <>
                <form onSubmit={changePw} className="space-y-2 border-t border-line/60 pt-4">
                  <span className="label">Change passphrase</span>
                  <input type="password" className="input" aria-label="Current passphrase" placeholder="Current passphrase" autoComplete="current-password" value={pw.current} onChange={(e) => setPw({ ...pw, current: e.target.value })} required />
                  <input type="password" className="input" aria-label="New passphrase" placeholder="New passphrase (12 characters or more)" autoComplete="new-password" value={pw.next} onChange={(e) => setPw({ ...pw, next: e.target.value })} required />
                  {pw.next && <PassMeter pass={pw.next} />}
                  <input type="password" className="input" aria-label="Repeat new passphrase" placeholder="Repeat new passphrase" autoComplete="new-password" value={pw.again} onChange={(e) => setPw({ ...pw, again: e.target.value })} required />
                  {pwMsg && <p className={`text-sm ${pwMsg.ok ? "text-good" : "text-bad"}`} role="status">{pwMsg.text}</p>}
                  <button className="btn"><KeyRound className="h-4 w-4" /> Change passphrase</button>
                </form>
                <div className="space-y-2 border-t border-line/60 pt-4">
                  <span className="label">Erase everything stored in this browser</span>
                  <div className="flex flex-wrap gap-2">
                    <input className="input max-w-44" aria-label="Type ERASE to confirm" placeholder="Type ERASE" value={erase} onChange={(e) => setErase(e.target.value)} />
                    <button className="btn btn-danger" disabled={erase !== "ERASE"} onClick={() => s.erase()}><Trash2 className="h-4 w-4" /> Erase workspace</button>
                  </div>
                </div>
              </>
            )}
          </div>
        </Card>

        <SecurityChecklist />

        <Card title="Activity record" action={<span className="text-xs text-mute">{db.audit.length} entries</span>}>
          {db.audit.length === 0 ? <p className="px-5 pb-5 pt-3 text-sm text-mute">Nothing recorded yet.</p> : (
            <ul className="px-5 pb-5 pt-3">
              {db.audit.slice(0, shown).map((a, i) => (
                <li key={i} className="flex flex-wrap gap-x-3 border-t border-line/50 py-2 text-sm first:border-t-0">
                  <span className="w-36 shrink-0 text-xs tabular-nums text-mute">{fmtDateTime(a.ts)}</span>
                  <span className="min-w-0 flex-1 basis-48 text-ink-2">{a.action}</span>
                </li>
              ))}
              {db.audit.length > shown && <li className="pt-2"><button className="text-xs text-primary hover:underline" onClick={() => setShown(shown + 50)}>Show more</button></li>}
            </ul>
          )}
        </Card>
      </div>
      <p className="mt-3 text-xs text-mute">{db.customers.length} customers · {db.events.length} history entries · signature preview: {db.customers[0] ? fullName(db.customers[0]) : "no customers yet"}</p>
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
  const { db, update, mode, weakPass, persisted } = useStore();
  const real = mode === "workspace";
  const https = typeof window !== "undefined" && (window.location.protocol === "https:" || window.location.hostname === "localhost");
  const backupAge = db.settings.lastBackup ? daysAgo(db.settings.lastBackup) : null;
  const auto: { ok: boolean; label: string; detail: string }[] = [
    { ok: https, label: "Secure connection", detail: https ? "The page is loaded over HTTPS." : "The page is not loaded over HTTPS. Do not enter data." },
    { ok: real, label: "Encrypted workspace", detail: real ? "Data is stored encrypted with AES-256." : "This is the demo; nothing is stored." },
    { ok: real && !weakPass, label: "Passphrase strength", detail: !real ? "Not applicable in the demo." : weakPass ? "Weak. Change it below." : "Passed the strength check." },
    { ok: backupAge !== null && backupAge <= 7, label: "Recent backup", detail: backupAge === null ? "No backup downloaded yet." : `Last backup ${backupAge === 0 ? "today" : `${backupAge} days ago`}.` },
    { ok: db.settings.autoLockMin <= 15, label: "Automatic lock", detail: `Locks after ${db.settings.autoLockMin} minutes without activity, also after the computer wakes from sleep.` },
    { ok: persisted === true, label: "Browser keeps the data", detail: persisted === true ? "The browser will not clear this site's data on its own." : persisted === false ? "The browser may clear this data if disk space runs low. Keep backups current; using the app regularly usually changes this." : "This browser does not report it. Keep backups current." },
  ];
  const done = auto.filter((a) => a.ok).length + MANUAL.filter((m) => db.settings.checks[m.key]).length;
  const total = auto.length + MANUAL.length;
  return (
    <Card title="Security checklist" className="lg:col-span-2" action={<StatusChip tone={done === total ? "good" : "warn"}>{done} of {total} done</StatusChip>}>
      <div className="grid gap-x-8 gap-y-1 px-5 pb-5 pt-3 md:grid-cols-2">
        <div>
          <h3 className="label mb-2">Checked by the app</h3>
          <ul className="space-y-2">
            {auto.map((a) => (
              <li key={a.label} className="flex gap-2 text-sm">
                {a.ok ? <CircleCheck className="mt-0.5 h-4 w-4 shrink-0 text-good" aria-label="OK" /> : <CircleAlert className="mt-0.5 h-4 w-4 shrink-0 text-warn" aria-label="Needs attention" />}
                <span><span className="text-white">{a.label}</span><span className="block text-xs text-mute">{a.detail}</span></span>
              </li>
            ))}
          </ul>
          <p className="mt-3 text-xs text-mute">App version {process.env.NEXT_PUBLIC_BUILD ?? "local"}, built {process.env.NEXT_PUBLIC_BUILT_AT ?? ""}. A notice appears whenever the version changes.</p>
        </div>
        <div>
          <h3 className="label mb-2">Only you can check these</h3>
          <ul className="space-y-2">
            {MANUAL.map((m) => (
              <li key={m.key}>
                <label className="flex cursor-pointer gap-2 text-sm">
                  <input type="checkbox" className="mt-0.5 h-4 w-4 shrink-0 accent-[#2b8cee]" checked={Boolean(db.settings.checks[m.key])} onChange={() => update((d) => { d.settings.checks[m.key] = !d.settings.checks[m.key]; }, `Security checklist: ${db.settings.checks[m.key] ? "unticked" : "ticked"} "${m.label}"`)} />
                  <span><span className="text-white">{m.label}</span><span className="block text-xs text-mute">{m.how}</span></span>
                </label>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </Card>
  );
}
