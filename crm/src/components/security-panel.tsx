"use client";

import { Copy, Fingerprint, LifeBuoy, Printer } from "lucide-react";
import { useState } from "react";
import { Card, StatusChip, Toggle } from "@/components/ui";
import { passkeysPossible } from "@/lib/passkey";
import { useStore } from "@/lib/store";
import { t } from "@/lib/i18n";

/** Recovery code, passkey as a second factor, and the privacy screen. */
export function SecurityPanel() {
  const s = useStore();
  const { db, update, security } = s;
  const [code, setCode] = useState("");
  const [pass, setPass] = useState("");
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [busy, setBusy] = useState(false);
  const [confirmRemove, setConfirmRemove] = useState(false);
  const can = passkeysPossible();

  const act = async (fn: () => Promise<void>) => { setBusy(true); setMsg(null); try { await fn(); } catch { setMsg({ ok: false, text: "That did not work. Try again." }); } setBusy(false); };
  const newCode = () => act(async () => { setCode(await s.createRecoveryCode()); });
  const printCode = () => {
    const w = window.open("", "_blank", "width=520,height=360");
    if (!w) return;
    w.document.title = "Recovery code";
    const p = (text: string, style: string) => { const el = w.document.createElement("p"); el.textContent = text; el.setAttribute("style", style); w.document.body.appendChild(el); };
    p(t("CP Consulting CRM: recovery code"), "font:600 16px sans-serif");
    p(code, "font:700 20px monospace;letter-spacing:2px");
    p(t("Keep this paper locked away. Anyone who has it and a copy of the stored data or of a backup file can open the customer data."), "font:13px sans-serif");
    w.print();
  };
  const passkeyOn = () => act(async () => {
    const r = await s.enablePasskey(pass);
    setMsg(r === "ok" ? { ok: true, text: "Passkey switched on. From now on, unlocking needs the passphrase and the passkey." }
      : r === "wrong" ? { ok: false, text: "The current passphrase is not right." }
      : r === "unsupported" ? { ok: false, text: "This device or browser cannot provide a passkey for encryption. Use a current Chrome, Edge or Safari, or a hardware security key." }
      : r === "norecovery" ? { ok: false, text: "Create a recovery code first. It is the only way back in if the passkey is lost." }
      : { ok: false, text: "The passkey was not created." });
    if (r === "ok") setPass("");
  });
  const passkeyOff = () => act(async () => {
    const r = await s.disablePasskey(pass);
    setMsg(r === "ok" ? { ok: true, text: "Passkey switched off. The passphrase alone opens the workspace again." }
      : r === "passkey" ? { ok: false, text: "The passkey was not confirmed." } : { ok: false, text: "The current passphrase is not right." });
    if (r === "ok") setPass("");
  });

  return (
    <Card title={t("Extra protection")} className="lg:col-span-2" action={<StatusChip tone={security.passkey ? "good" : security.recovery ? "info" : "warn"}>{security.passkey ? t("Two factors") : t("Passphrase only")}</StatusChip>}>
      <div className="grid gap-x-8 gap-y-6 px-5 pb-5 pt-3 md:grid-cols-2">
        <section className="space-y-3">
          <h3 className="flex items-center gap-2 text-sm font-semibold text-white"><LifeBuoy className="h-4 w-4 text-primary" aria-hidden /> {t("Recovery code")} <StatusChip tone={security.recovery ? "good" : "warn"}>{security.recovery ? t("Set up") : t("Not set up")}</StatusChip></h3>
          <p className="text-xs text-mute">{t("A code that opens the workspace and your backup files if you forget the passphrase or lose the passkey. It is shown once and stored nowhere. Write it on paper and lock it away, separate from the computer.")}</p>
          {code ? (
            <div className="rounded-md border border-accent/40 bg-night-2/60 p-3" role="status">
              <p className="break-all font-mono text-base font-bold tracking-wider text-white" data-testid="recovery-code">{code}</p>
              <p className="mt-2 text-xs text-warn">{t("Write it down now. It will not be shown again. Older backup files do not know this code; download a new backup afterwards.")}</p>
              <div className="mt-3 flex flex-wrap gap-2">
                <button className="btn" onClick={printCode}><Printer className="h-4 w-4" /> {t("Print")}</button>
                <button className="btn" onClick={() => navigator.clipboard?.writeText(code)}><Copy className="h-4 w-4" /> {t("Copy")}</button>
                <button className="btn btn-primary" onClick={() => setCode("")}>{t("I have written it down")}</button>
              </div>
            </div>
          ) : (
            <div className="flex flex-wrap gap-2">
              <button className="btn btn-primary" disabled={busy} onClick={newCode}>{security.recovery ? t("Replace the recovery code") : t("Create a recovery code")}</button>
              {security.recovery && !security.passkey && (confirmRemove
                ? <button className="btn btn-danger" disabled={busy} onClick={() => act(async () => { await s.removeRecoveryCode(); setConfirmRemove(false); })}>{t("Really remove")}</button>
                : <button className="btn" onClick={() => setConfirmRemove(true)}>{t("Remove")}</button>)}
            </div>
          )}
        </section>

        <section className="space-y-3">
          <h3 className="flex items-center gap-2 text-sm font-semibold text-white"><Fingerprint className="h-4 w-4 text-primary" aria-hidden /> {t("Passkey as a second factor")} <StatusChip tone={security.passkey ? "good" : "mute"}>{security.passkey ? t("On") : t("Off")}</StatusChip></h3>
          <p className="text-xs text-mute">{t("With a passkey (fingerprint, face, device PIN or a hardware security key) the data can only be opened with the passphrase and that passkey together. A stolen copy of the data or of a backup file is then useless, even if someone learns the passphrase.")}</p>
          {!can && <p className="text-xs text-warn">{t("This browser does not offer passkeys here.")}</p>}
          <div className="flex flex-wrap gap-2">
            <input type="password" className="input max-w-64" aria-label={t("Current passphrase")} placeholder={t("Current passphrase")} autoComplete="current-password" value={pass} onChange={(e) => setPass(e.target.value)} />
            {security.passkey
              ? <button className="btn" disabled={busy || !pass} onClick={passkeyOff}>{t("Switch passkey off")}</button>
              : <button className="btn btn-primary" disabled={busy || !pass || !can || !security.recovery} onClick={passkeyOn}>{t("Switch passkey on")}</button>}
          </div>
          {!security.passkey && !security.recovery && <p className="text-xs text-mute">{t("Create a recovery code first. It is the only way back in if the passkey is lost.")}</p>}
          {security.passkey && <p className="text-xs text-mute">{t("Backup files made from now on also need the passkey, or the recovery code.")}</p>}
          {msg && <p className={`text-sm ${msg.ok ? "text-good" : "text-bad"}`} role="status">{t(msg.text)}</p>}
        </section>

        <section className="md:col-span-2 border-t border-line/60 pt-4">
          <Toggle checked={Boolean(db.settings.privacyScreen)} onChange={() => update((d) => { d.settings.privacyScreen = !d.settings.privacyScreen; }, `Privacy screen switched ${db.settings.privacyScreen ? "off" : "on"}`)}
            label={<span>{t("Privacy screen")}<span className="block text-xs text-mute">{t("Hides the customer data as soon as you switch to another window or program, so it cannot be read over your shoulder or in a screen share.")}</span></span>} />
        </section>
      </div>
    </Card>
  );
}
