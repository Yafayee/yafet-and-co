"use client";

import { Check, Copy, ExternalLink, Pencil } from "lucide-react";
import { useState } from "react";
import { recordSent } from "@/lib/actions";
import { checkMessage } from "@/lib/compliance";
import { allowedChannels, fullName } from "@/lib/rules";
import { sendLink, webmailUrl } from "@/lib/send";
import { useStore } from "@/lib/store";
import { CHANNEL_LABEL, type Channel, type Customer, type DB, type Product, type Purpose, type TemplateText } from "@/lib/types";
import { ChannelIcon } from "./ui";
import { t } from "@/lib/i18n";

/**
 * Shows a drafted message and opens it in the user's own email, WhatsApp or
 * SMS app. Clicking Send records the message in the customer's history.
 */
export function Composer({ customer, text, purpose, label, product, campaignId, channels, collapsed = false, also }: {
  customer: Customer; text: TemplateText; purpose: Purpose; label: string;
  product?: Product; campaignId?: string; channels?: Channel[]; collapsed?: boolean;
  /** Extra change to make in the same save, e.g. marking an opportunity as contacted. */
  also?: (d: DB) => void;
}) {
  const { db, update } = useStore();
  const options = allowedChannels(customer).filter((ch) => !channels || channels.includes(ch));
  const [channel, setChannel] = useState<Channel | undefined>(options[0]);
  const [subject, setSubject] = useState(text.subject);
  const [body, setBody] = useState(text.body);
  const [editing, setEditing] = useState(!collapsed);
  const [webmail, setWebmail] = useState(false);
  const [copied, setCopied] = useState("");

  if (!channel) return <p className="text-sm text-mute">{t("No agreed channel with contact details for this customer.")}</p>;
  const href = sendLink(customer, channel, { subject, body }, db.settings);
  const newTab = channel === "whatsapp" || (channel === "email" && db.settings.emailVia === "gmail");
  const warnings = checkMessage(`${channel === "email" ? subject : ""}\n${body}`, db.knowledge.avoid);
  const viaWebmail = channel === "email" && db.settings.emailVia === "webmail";
  const copy = (what: string, value: string) => { navigator.clipboard?.writeText(value).then(() => setCopied(what), () => setCopied("")); };
  const onSend = () => update((d) => { recordSent(d, { customer, channel, purpose, label, body, product, campaignId }); also?.(d); }, `${label} to ${fullName(customer)} via ${CHANNEL_LABEL[channel]}`);

  return (
    <div>
      {editing ? (
        <div className="space-y-2">
          {channel === "email" && <input className="input" aria-label={t("Subject")} value={subject} onChange={(e) => setSubject(e.target.value)} />}
          <textarea className="input min-h-36 leading-relaxed" aria-label={t(`Message to ${fullName(customer)}`)} value={body} onChange={(e) => setBody(e.target.value)} />
        </div>
      ) : (
        <p className="line-clamp-2 text-sm text-ink-2">{body}</p>
      )}
      {warnings.length > 0 && (
        <ul className="mt-2 space-y-1 rounded-md border border-warn/30 bg-warn/5 px-3 py-2 text-xs text-warn" role="status">
          {warnings.map((w) => <li key={w}>{t(w)}</li>)}
        </ul>
      )}
      <div className="mt-3 flex flex-wrap items-center gap-2">
        {options.length > 1 ? (
          <select className="input !w-auto" aria-label={t("Channel")} value={channel} onChange={(e) => setChannel(e.target.value as Channel)}>
            {options.map((ch) => <option key={ch} value={ch}>{CHANNEL_LABEL[ch]}</option>)}
          </select>
        ) : <span className="chip"><ChannelIcon channel={channel} className="h-3 w-3" /> {CHANNEL_LABEL[channel]}</span>}
        {collapsed && <button className="btn" onClick={() => setEditing(!editing)}><Pencil className="h-4 w-4" /> {editing ? t("Hide") : t("Edit")}</button>}
        <span className="flex-1" />
        {viaWebmail ? (
          <button type="button" className="btn btn-primary" onClick={() => { setWebmail(true); copy("to", customer.email); }}>
            <ExternalLink className="h-4 w-4" /> {t("Send via company webmail")}
          </button>
        ) : (
          <a className="btn btn-primary" href={href} target={newTab ? "_blank" : undefined} rel="noopener noreferrer" onClick={onSend}>
            <ExternalLink className="h-4 w-4" /> {t("Send via {ch}", { ch: t(CHANNEL_LABEL[channel]) })}
          </a>
        )}
      </div>
      {viaWebmail && webmail && (
        // The company webmail cannot be filled in from outside, so the three parts are copied one by one.
        <div className="mt-3 rounded-md border border-primary/40 bg-night-2/60 p-3 text-sm" data-testid="webmail-panel">
          <p className="text-ink-2">{t("Open your company webmail, click New message, then paste these three parts. The address is already copied.")}</p>
          <div className="mt-2 flex flex-wrap gap-2">
            <a className="btn btn-primary" href={webmailUrl(db.settings)} target="_blank" rel="noopener noreferrer"><ExternalLink className="h-4 w-4" /> {t("Open company webmail")}</a>
            {([["to", "Copy address", customer.email], ["subject", "Copy subject", subject], ["body", "Copy text", body]] as const).map(([k, l, v]) => (
              <button key={k} type="button" className="btn" onClick={() => copy(k, v)}>{copied === k ? <Check className="h-4 w-4 text-good" /> : <Copy className="h-4 w-4" />} {t(l)}</button>
            ))}
          </div>
          <div className="mt-3 flex flex-wrap items-center gap-2 border-t border-line/60 pt-3">
            <span className="text-xs text-mute">{t("When you have sent it in the webmail:")}</span>
            <button type="button" className="btn" onClick={() => { onSend(); setWebmail(false); }}><Check className="h-4 w-4" /> {t("Mark as sent")}</button>
            <button type="button" className="text-xs text-mute hover:underline" onClick={() => setWebmail(false)}>{t("Cancel")}</button>
          </div>
        </div>
      )}
    </div>
  );
}
