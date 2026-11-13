"use client";

import { ExternalLink, Pencil } from "lucide-react";
import { useState } from "react";
import { recordSent } from "@/lib/actions";
import { checkMessage } from "@/lib/compliance";
import { allowedChannels, fullName } from "@/lib/rules";
import { sendLink } from "@/lib/send";
import { useStore } from "@/lib/store";
import { CHANNEL_LABEL, type Channel, type Customer, type DB, type Product, type Purpose, type TemplateText } from "@/lib/types";
import { ChannelIcon } from "./ui";

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
  const { update } = useStore();
  const options = allowedChannels(customer).filter((ch) => !channels || channels.includes(ch));
  const [channel, setChannel] = useState<Channel | undefined>(options[0]);
  const [subject, setSubject] = useState(text.subject);
  const [body, setBody] = useState(text.body);
  const [editing, setEditing] = useState(!collapsed);

  if (!channel) return <p className="text-sm text-mute">No agreed channel with contact details for this customer.</p>;
  const href = sendLink(customer, channel, { subject, body });
  const warnings = checkMessage(`${channel === "email" ? subject : ""}\n${body}`);
  const onSend = () => update((d) => { recordSent(d, { customer, channel, purpose, label, body, product, campaignId }); also?.(d); }, `${label} to ${fullName(customer)} via ${CHANNEL_LABEL[channel]}`);

  return (
    <div>
      {editing ? (
        <div className="space-y-2">
          {channel === "email" && <input className="input" aria-label="Subject" value={subject} onChange={(e) => setSubject(e.target.value)} />}
          <textarea className="input min-h-36 leading-relaxed" aria-label={`Message to ${fullName(customer)}`} value={body} onChange={(e) => setBody(e.target.value)} />
        </div>
      ) : (
        <p className="line-clamp-2 text-sm text-ink-2">{body}</p>
      )}
      {warnings.length > 0 && (
        <ul className="mt-2 space-y-1 rounded-md border border-warn/30 bg-warn/5 px-3 py-2 text-xs text-warn" role="status">
          {warnings.map((w) => <li key={w}>{w}</li>)}
        </ul>
      )}
      <div className="mt-3 flex flex-wrap items-center gap-2">
        {options.length > 1 ? (
          <select className="input !w-auto" aria-label="Channel" value={channel} onChange={(e) => setChannel(e.target.value as Channel)}>
            {options.map((ch) => <option key={ch} value={ch}>{CHANNEL_LABEL[ch]}</option>)}
          </select>
        ) : <span className="chip"><ChannelIcon channel={channel} className="h-3 w-3" /> {CHANNEL_LABEL[channel]}</span>}
        {collapsed && <button className="btn" onClick={() => setEditing(!editing)}><Pencil className="h-4 w-4" /> {editing ? "Hide" : "Edit"}</button>}
        <span className="flex-1" />
        <a className="btn btn-primary" href={href} target={channel === "whatsapp" ? "_blank" : undefined} rel="noopener noreferrer" onClick={onSend}>
          <ExternalLink className="h-4 w-4" /> Send via {CHANNEL_LABEL[channel]}
        </a>
      </div>
    </div>
  );
}
