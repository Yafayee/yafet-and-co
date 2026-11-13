"use client";

import { Plus } from "lucide-react";
import { useState, type FormEvent } from "react";
import { ChannelChip, PageHeader, StatusChip } from "@/components/ui";
import { campaigns as initial, customers } from "@/lib/data";
import { fmtDate } from "@/lib/dates";
import { CHANNELS, CHANNEL_LABEL, type Campaign, type Channel } from "@/lib/types";

const TONE = { Scheduled: "info", Running: "good", Completed: "mute", Draft: "warn" } as const;
const AUDIENCES: Record<string, (ch: Channel[]) => number> = {
  "All customers with channel consent": (ch) => customers.filter((c) => ch.some((k) => c.consent[k])).length,
  "Customers with marketing consent": (ch) => customers.filter((c) => c.consent.marketing && ch.some((k) => c.consent[k])).length,
  "Car owners without a car policy": (ch) => customers.filter((c) => c.consent.marketing && c.ownsCar === "yes" && !c.policies.some((p) => p.product === "Car") && ch.some((k) => c.consent[k])).length,
};

export default function CampaignsPage() {
  const [list, setList] = useState<Campaign[]>(initial);
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [occasion, setOccasion] = useState("Christmas");
  const [audience, setAudience] = useState(Object.keys(AUDIENCES)[0]);
  const [channels, setChannels] = useState<Channel[]>(["email"]);
  const [date, setDate] = useState("2026-12-22");
  const reach = AUDIENCES[audience](channels);

  const submit = (e: FormEvent) => {
    e.preventDefault();
    if (!name.trim() || channels.length === 0) return;
    setList((l) => [{ id: `k${Date.now()}`, name: name.trim(), occasion, channels, audience, status: "Draft", date, recipients: reach, delivered: 0, replied: 0 }, ...l]);
    setOpen(false); setName("");
  };

  return (
    <>
      <PageHeader title="Campaigns" subtitle="Greetings and product messages sent to a group of customers.">
        <button className="btn btn-primary" onClick={() => setOpen(!open)}><Plus className="h-4 w-4" /> New campaign</button>
      </PageHeader>

      {open && (
        <form onSubmit={submit} className="card mb-4 grid grid-cols-1 gap-4 p-5 sm:grid-cols-2">
          <label className="block sm:col-span-2"><span className="label">Name</span><input className="input mt-1" value={name} onChange={(e) => setName(e.target.value)} placeholder="New Year greetings 2027" required /></label>
          <label className="block"><span className="label">Occasion</span>
            <select className="input mt-1" value={occasion} onChange={(e) => setOccasion(e.target.value)}>{["Christmas", "New Year", "Easter", "Product", "Other"].map((o) => <option key={o}>{o}</option>)}</select>
          </label>
          <label className="block"><span className="label">Send date</span><input type="date" className="input mt-1" value={date} onChange={(e) => setDate(e.target.value)} required /></label>
          <label className="block"><span className="label">Audience</span>
            <select className="input mt-1" value={audience} onChange={(e) => setAudience(e.target.value)}>{Object.keys(AUDIENCES).map((a) => <option key={a}>{a}</option>)}</select>
          </label>
          <fieldset><legend className="label">Channels</legend>
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
            <p className="text-sm text-ink-2">Reaches <span className="font-semibold text-white">{reach}</span> customers who agreed to {channels.length ? "these channels" : "a channel (pick at least one)"}.</p>
            <div className="flex gap-2">
              <button type="button" className="btn" onClick={() => setOpen(false)}>Cancel</button>
              <button type="submit" className="btn btn-primary" disabled={channels.length === 0}>Save as draft</button>
            </div>
          </div>
        </form>
      )}

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        {list.map((k) => (
          <article key={k.id} className="card p-5">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <h2 className="text-base font-semibold text-white">{k.name}</h2>
                <p className="mt-0.5 text-xs text-mute">{k.occasion} · {k.status === "Completed" ? "sent" : k.status === "Running" ? "running since" : "planned for"} {fmtDate(k.date)}</p>
              </div>
              <StatusChip tone={TONE[k.status]}>{k.status}</StatusChip>
            </div>
            <p className="mt-3 text-sm text-ink-2">{k.audience}</p>
            <div className="mt-3 flex flex-wrap gap-1.5">{k.channels.map((ch) => <ChannelChip key={ch} channel={ch} />)}</div>
            <dl className="mt-4 grid grid-cols-3 gap-2 border-t border-line/60 pt-3 text-center">
              {[["Recipients", k.recipients], ["Delivered", k.delivered], ["Replied", k.replied]].map(([l, v]) => (
                <div key={l}><dt className="label">{l}</dt><dd className="text-lg font-semibold tabular-nums text-white">{k.status === "Draft" || k.status === "Scheduled" ? (l === "Recipients" ? v : "–") : v}</dd></div>
              ))}
            </dl>
          </article>
        ))}
      </div>
    </>
  );
}
