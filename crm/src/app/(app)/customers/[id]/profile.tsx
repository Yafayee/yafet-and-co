"use client";

import { ArrowLeft, Cake, CalendarCheck, Car, Mail, MapPin, Phone, PhoneCall, Settings2, UserRound } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { Avatar, Card, ChannelIcon, ConfidenceChip, StatusChip, Toggle } from "@/components/ui";
import { customerById, fullName, initials, opportunitiesFor, timelineFor } from "@/lib/data";
import { age, daysToBirthday, fmtDate } from "@/lib/dates";
import { draftFor } from "@/lib/rules";
import { CHANNELS, CHANNEL_LABEL, type Consent } from "@/lib/types";

export function Profile({ id }: { id: string }) {
  const c = customerById(id)!;
  const [consent, setConsent] = useState<Consent>(c.consent);
  const [notes, setNotes] = useState(c.notes);
  const [openDraft, setOpenDraft] = useState<string | null>(null);
  const opps = opportunitiesFor(c.id);
  const timeline = timelineFor(c);
  const total = c.policies.reduce((s, p) => s + p.premium, 0);
  const toggle = (k: keyof Consent) => setConsent((v) => ({ ...v, [k]: !v[k] }));
  const kindIcon = { sent: Mail, reply: Mail, call: PhoneCall, meeting: CalendarCheck, system: Settings2 };

  return (
    <>
      <Link href="/customers" className="mb-4 inline-flex items-center gap-1 text-sm text-primary hover:underline"><ArrowLeft className="h-4 w-4" /> All customers</Link>

      <div className="card mb-4 flex flex-wrap items-center gap-4 p-5">
        <Avatar text={initials(c)} size="h-14 w-14 text-lg" />
        <div className="min-w-0 flex-1 basis-56">
          <h1 className="text-2xl font-bold text-white">{fullName(c)}</h1>
          <p className="text-sm text-mute">{c.occupation} · customer since {fmtDate(c.policies.map((p) => p.since).sort()[0])} · speaks {c.language === "de" ? "German" : "English"}</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <a className="btn" href={`mailto:${c.email}`}><Mail className="h-4 w-4" /> Email</a>
          <a className="btn" href={`tel:${c.phone.replace(/\s/g, "")}`}><Phone className="h-4 w-4" /> Call</a>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <div className="flex flex-col gap-4">
          <Card title="Contact">
            <dl className="space-y-2.5 px-5 pb-5 pt-3 text-sm">
              <Row icon={<Mail className="h-4 w-4" />} label="Email">{c.email}</Row>
              <Row icon={<Phone className="h-4 w-4" />} label="Phone">{c.phone}</Row>
              <Row icon={<MapPin className="h-4 w-4" />} label="City">{c.city}</Row>
              <Row icon={<Cake className="h-4 w-4" />} label="Born">{fmtDate(c.dob)} (age {age(c.dob)}, birthday {daysToBirthday(c.dob) === 0 ? "today" : `in ${daysToBirthday(c.dob)} days`})</Row>
              <Row icon={<Car className="h-4 w-4" />} label="Car">{c.ownsCar === "yes" ? "Owns a car" : c.ownsCar === "no" ? "No car" : "Not known"}</Row>
              <Row icon={<UserRound className="h-4 w-4" />} label="Interests">{c.interests.join(", ")}</Row>
            </dl>
          </Card>

          <Card title="Consent and preferences">
            <div className="space-y-3 px-5 pb-5 pt-3">
              {CHANNELS.map((ch) => (
                <Toggle key={ch} checked={consent[ch]} onChange={() => toggle(ch)} label={<span className="flex items-center gap-2"><ChannelIcon channel={ch} /> {CHANNEL_LABEL[ch]}</span>} />
              ))}
              <div className="border-t border-line/60 pt-3">
                <Toggle checked={consent.marketing} onChange={() => toggle("marketing")} label="Product offers (marketing)" />
              </div>
              <p className="text-xs text-mute">Preferred channel: {CHANNEL_LABEL[c.preferredChannel]}. Without a tick, nothing is sent on that channel.</p>
            </div>
          </Card>

          <Card title="Notes">
            <div className="px-5 pb-5 pt-3">
              <textarea className="input min-h-24" aria-label="Notes" value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Background, preferences, family situation" />
            </div>
          </Card>
        </div>

        <div className="flex flex-col gap-4 lg:col-span-2">
          <Card title="Policies and products" action={<span className="text-xs text-mute">€{total} per month in total</span>}>
            <div className="mt-2 overflow-x-auto pb-2">
              <table className="w-full min-w-[440px]">
                <thead><tr><th className="th">Product</th><th className="th">Policy number</th><th className="th">Since</th><th className="th text-right">Premium / month</th></tr></thead>
                <tbody>
                  {c.policies.map((p) => (
                    <tr key={p.number}><td className="td font-medium text-white">{p.product}</td><td className="td tabular-nums text-ink-2">{p.number}</td><td className="td text-ink-2">{fmtDate(p.since)}</td><td className="td text-right tabular-nums">€{p.premium}</td></tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>

          <Card title="Recommended next steps">
            <div className="space-y-3 px-5 pb-5 pt-3">
              {opps.length === 0 && <p className="text-sm text-mute">No open recommendation. Cover looks complete for this profile.</p>}
              {opps.map((o) => {
                const allowed = consent.marketing && consent[c.preferredChannel];
                const d = draftFor(c, o);
                return (
                  <div key={o.id} className="rounded-lg border border-line/70 bg-night-2/40 p-4">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-medium text-white">{o.product}</span>
                      <ConfidenceChip level={o.confidence} />
                      {!allowed && <StatusChip tone="mute">No marketing consent: raise in person</StatusChip>}
                    </div>
                    <p className="mt-1 text-sm text-ink-2">{o.reason}</p>
                    {allowed && (
                      <button className="btn btn-outline mt-3" onClick={() => setOpenDraft(openDraft === o.id ? null : o.id)}>
                        {openDraft === o.id ? "Hide draft" : "Show drafted message"}
                      </button>
                    )}
                    {allowed && openDraft === o.id && (
                      <div className="mt-3 rounded-md border border-line/70 bg-night/70 p-3 text-sm">
                        <div className="mb-1 flex items-center gap-2 text-xs text-mute"><ChannelIcon channel={d.channel} className="h-3 w-3" /> {CHANNEL_LABEL[d.channel]}{d.channel === "email" ? ` · ${d.subject}` : ""}</div>
                        <p className="whitespace-pre-line text-ink-2">{d.body}</p>
                        <Link href="/approvals" className="mt-2 inline-block text-xs text-primary hover:underline">Edit and approve in Approvals</Link>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </Card>

          <Card title="Communication history">
            <ol className="px-5 pb-5 pt-3">
              {timeline.map((e, i) => {
                const I = kindIcon[e.kind];
                return (
                  <li key={i} className="relative flex gap-3 pb-4 last:pb-0">
                    {i < timeline.length - 1 && <span className="absolute left-[15px] top-8 h-[calc(100%-2rem)] w-px bg-line/70" aria-hidden />}
                    <span className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full border ${e.kind === "reply" ? "border-teal/60 text-teal" : "border-line text-mute"} bg-night`}>
                      {e.channel ? <ChannelIcon channel={e.channel} /> : <I className="h-4 w-4" />}
                    </span>
                    <span className="pt-1">
                      <span className="block text-sm text-ink">{e.text}</span>
                      <span className="block text-xs text-mute">{fmtDate(e.date)}{e.channel ? ` · ${CHANNEL_LABEL[e.channel]}` : ""}</span>
                    </span>
                  </li>
                );
              })}
            </ol>
          </Card>
        </div>
      </div>
    </>
  );
}

function Row({ icon, label, children }: { icon: React.ReactNode; label: string; children: React.ReactNode }) {
  return (
    <div className="flex gap-3">
      <span className="mt-0.5 text-mute">{icon}</span>
      <div className="min-w-0"><dt className="label">{label}</dt><dd className="break-words text-ink">{children}</dd></div>
    </div>
  );
}
