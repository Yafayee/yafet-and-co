"use client";

import { Plus, Send, Trash2 } from "lucide-react";
import Link from "next/link";
import { useState, type FormEvent } from "react";
import { ChannelChip, Empty, PageHeader, StatusChip } from "@/components/ui";
import { fmtDate, todayIso } from "@/lib/dates";
import { audienceLabel, audienceMembers } from "@/lib/rules";
import { uid } from "@/lib/send";
import { useStore } from "@/lib/store";
import { CHANNELS, CHANNEL_LABEL, PRODUCTS, type Audience, type Channel, type Product } from "@/lib/types";

export default function CampaignsPage() {
  const { db, update } = useStore();
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [templateKey, setTemplateKey] = useState("christmas");
  const [product, setProduct] = useState<Product>("Car");
  const [audience, setAudience] = useState<Audience>("all");
  const [channels, setChannels] = useState<Channel[]>(["email", "whatsapp"]);
  const [date, setDate] = useState(todayIso());
  const templates = Object.entries(db.settings.templates).filter(([k]) => !["birthday", "carQuestion", "followUp"].includes(k));
  const purpose = db.settings.templates[templateKey]?.purpose ?? "holiday";
  const isOffer = purpose === "marketing";
  const effectiveAudience: Audience = isOffer ? (audience === "all" || audience === "marketing" ? `missing:${product}` : audience) : audience;
  const reach = audienceMembers(db, effectiveAudience, channels, purpose).length;

  const submit = (e: FormEvent) => {
    e.preventDefault();
    if (!name.trim() || channels.length === 0) return;
    update((d) => { d.campaigns.unshift({ id: uid(), name: name.trim(), templateKey, product: isOffer ? product : undefined, audience: effectiveAudience, channels, date, createdAt: todayIso(), sentTo: [] }); }, `Created campaign "${name.trim()}"`);
    setOpen(false); setName("");
  };

  return (
    <>
      <PageHeader title="Campaigns" subtitle="Greetings and product messages for a group of customers.">
        <button className="btn btn-primary" onClick={() => setOpen(!open)}><Plus className="h-4 w-4" /> New campaign</button>
      </PageHeader>

      {open && (
        <form onSubmit={submit} className="card mb-4 grid grid-cols-1 gap-4 p-5 sm:grid-cols-2">
          <label className="block sm:col-span-2"><span className="label">Name</span><input className="input mt-1" value={name} onChange={(e) => setName(e.target.value)} placeholder="Christmas greetings" required /></label>
          <label className="block"><span className="label">Message</span>
            <select className="input mt-1" value={templateKey} onChange={(e) => setTemplateKey(e.target.value)}>{templates.map(([k, t]) => <option key={k} value={k}>{t.label}</option>)}</select>
          </label>
          <label className="block"><span className="label">Planned date</span><input type="date" className="input mt-1" value={date} onChange={(e) => setDate(e.target.value)} required /></label>
          {isOffer ? (
            <>
              <label className="block"><span className="label">Product</span><select className="input mt-1" value={product} onChange={(e) => { setProduct(e.target.value as Product); setAudience(`missing:${e.target.value as Product}`); }}>{PRODUCTS.map((p) => <option key={p}>{p}</option>)}</select></label>
              <div className="text-sm text-ink-2"><span className="label block">Audience</span><span className="mt-2 block">Customers who agreed to product offers and do not have {product}.</span></div>
            </>
          ) : (
            <label className="block"><span className="label">Audience</span>
              <select className="input mt-1" value={audience} onChange={(e) => setAudience(e.target.value as Audience)}>
                <option value="all">{audienceLabel("all")}</option><option value="marketing">{audienceLabel("marketing")}</option>
                {PRODUCTS.map((p) => <option key={p} value={`has:${p}`}>{audienceLabel(`has:${p}`)}</option>)}
              </select>
            </label>
          )}
          <fieldset className={isOffer ? "sm:col-span-2" : ""}><legend className="label">Channels</legend>
            <div className="mt-2 flex flex-wrap gap-4">
              {CHANNELS.map((ch) => (
                <label key={ch} className="flex items-center gap-2 text-sm text-ink">
                  <input type="checkbox" className="h-4 w-4 accent-[#2b8cee]" checked={channels.includes(ch)} onChange={() => setChannels((c) => (c.includes(ch) ? c.filter((x) => x !== ch) : [...c, ch]))} />
                  {CHANNEL_LABEL[ch]}
                </label>
              ))}
            </div>
          </fieldset>
          <div className="flex flex-wrap items-center justify-between gap-3 sm:col-span-2">
            <p className="text-sm text-ink-2">{channels.length ? <>Reaches <span className="font-semibold text-white">{reach}</span> {reach === 1 ? "customer" : "customers"} who agreed to these channels.</> : "Pick at least one channel."}</p>
            <div className="flex gap-2">
              <button type="button" className="btn" onClick={() => setOpen(false)}>Cancel</button>
              <button type="submit" className="btn btn-primary" disabled={channels.length === 0}>Create campaign</button>
            </div>
          </div>
        </form>
      )}

      {db.campaigns.length === 0 ? <div className="card"><Empty>No campaigns yet. Create one for Christmas, Easter or a product.</Empty></div> : (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          {db.campaigns.map((k) => {
            const p = db.settings.templates[k.templateKey]?.purpose ?? "holiday";
            const members = audienceMembers(db, k.audience, k.channels, p);
            const pending = members.filter((c) => !k.sentTo.includes(c.id)).length;
            const status = pending === 0 && k.sentTo.length > 0 ? "Completed" : k.sentTo.length > 0 ? "In progress" : k.date > todayIso() ? "Scheduled" : "Ready to send";
            const tone = { Completed: "mute", "In progress": "good", Scheduled: "info", "Ready to send": "warn" } as const;
            return (
              <article key={k.id} className="card flex flex-col p-5">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <h2 className="text-base font-semibold text-white">{k.name}</h2>
                    <p className="mt-0.5 text-xs text-mute">{db.settings.templates[k.templateKey]?.label ?? "Message"}{k.product ? `: ${k.product}` : ""} · {fmtDate(k.date)}</p>
                  </div>
                  <StatusChip tone={tone[status]}>{status}</StatusChip>
                </div>
                <p className="mt-3 text-sm text-ink-2">{audienceLabel(k.audience)}</p>
                <div className="mt-3 flex flex-wrap gap-1.5">{k.channels.map((ch) => <ChannelChip key={ch} channel={ch} />)}</div>
                <dl className="mt-4 grid grid-cols-2 gap-2 border-t border-line/60 pt-3 text-center">
                  <div><dt className="label">Sent</dt><dd className="text-lg font-semibold tabular-nums text-white">{k.sentTo.length}</dd></div>
                  <div><dt className="label">Still to send</dt><dd className="text-lg font-semibold tabular-nums text-white">{pending}</dd></div>
                </dl>
                <div className="mt-4 flex gap-2">
                  <Link href={`/queue/?c=${k.id}`} className={`btn flex-1 ${pending ? "btn-primary" : ""}`}><Send className="h-4 w-4" /> {pending ? "Open send list" : "View"}</Link>
                  <button className="btn btn-danger" aria-label={`Delete campaign ${k.name}`} onClick={() => update((d) => { d.campaigns = d.campaigns.filter((x) => x.id !== k.id); }, `Deleted campaign "${k.name}"`)}><Trash2 className="h-4 w-4" /></button>
                </div>
              </article>
            );
          })}
        </div>
      )}
    </>
  );
}
