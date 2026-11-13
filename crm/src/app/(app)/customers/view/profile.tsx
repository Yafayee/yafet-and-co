"use client";

import { ArrowLeft, Baby, Cake, CalendarCheck, Car, Download, Home, Mail, MapPin, MessageSquareReply, Pencil, Phone, PhoneCall, Plus, Settings2, StickyNote, Trash2, UserRound } from "lucide-react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useState, type FormEvent } from "react";
import { Composer } from "@/components/composer";
import { CustomerForm } from "@/components/customer-form";
import { Avatar, Card, ChannelIcon, ConfidenceChip, OppStatusChip, StatusChip, Toggle } from "@/components/ui";
import { auditName, deleteCustomer, logEvent, setOpp } from "@/lib/actions";
import { GUIDES } from "@/lib/knowledge";
import { addDays, age, daysToBirthday, fmtDate, toIso, todayIso } from "@/lib/dates";
import { canMarket, coverage, daysSinceMarketing, eventsOf, fullName, initials, lifeStage, opportunitiesFor, templateFor } from "@/lib/rules";
import { download, uid } from "@/lib/send";
import { useStore } from "@/lib/store";
import { CHANNELS, CHANNEL_LABEL, PRODUCTS, type Channel, type Consent, type CrmEvent, type Customer, type OppStatus, type Product } from "@/lib/types";

const KIND_ICON = { sent: Mail, reply: MessageSquareReply, call: PhoneCall, meeting: CalendarCheck, note: StickyNote, system: Settings2 };

export function Profile() {
  const { db, update } = useStore();
  const router = useRouter();
  const id = useSearchParams().get("id") ?? "";
  const c = db.customers.find((x) => x.id === id);
  const [editing, setEditing] = useState(false);
  const [openDraft, setOpenDraft] = useState<string | null>(null);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [log, setLog] = useState<{ kind: CrmEvent["kind"]; channel: Channel; text: string; interest: string }>({ kind: "call", channel: "email", text: "", interest: "" });
  const [task, setTask] = useState({ title: "", due: toIso(addDays(new Date(), 3)) });
  const [policy, setPolicy] = useState<{ product: Product; number: string; premium: string } | null>(null);

  if (!c) {
    return (
      <div className="card p-8 text-center">
        <p className="text-ink-2">This customer profile does not exist.</p>
        <Link href="/customers/" className="btn btn-primary mt-4">Back to customers</Link>
      </div>
    );
  }

  const opps = opportunitiesFor(db, c);
  const timeline = eventsOf(db, c.id);
  const tasks = db.tasks.filter((t) => t.customerId === c.id);
  const total = c.policies.reduce((s, p) => s + p.premium, 0);
  const cov = coverage(c);
  const years = age(c.dob);
  const bday = daysToBirthday(c.dob);
  const sinceMarketing = daysSinceMarketing(db.events, c.id);
  const capped = sinceMarketing !== null && sinceMarketing < db.settings.capDays;
  const mutate = (fn: (x: Customer) => void, audit?: string) => update((d) => { const x = d.customers.find((y) => y.id === c.id); if (x) fn(x); }, audit);

  const toggle = (k: keyof Consent) => {
    const label = k === "marketing" ? "product offers" : CHANNEL_LABEL[k];
    update((d) => {
      const x = d.customers.find((y) => y.id === c.id)!;
      x.consent[k] = !x.consent[k]; x.consentUpdated = todayIso(); x.consentSource = "Changed by hand";
      logEvent(d, { customerId: c.id, kind: "system", text: `Consent for ${label} ${x.consent[k] ? "given" : "withdrawn"}.` });
    }, `Consent for ${label} ${c.consent[k] ? "withdrawn" : "given"}: ${auditName(c)}`);
  };

  const submitLog = (e: FormEvent) => {
    e.preventDefault();
    if (!log.text.trim()) return;
    const isReply = log.kind === "reply";
    update((d) => logEvent(d, { customerId: c.id, kind: log.kind, text: log.text.trim(), channel: isReply ? log.channel : undefined, interest: isReply && log.interest ? (log.interest as Product) : undefined, handled: isReply ? false : undefined }), `Logged ${log.kind} for ${auditName(c)}`);
    setLog({ ...log, text: "", interest: "" });
  };
  const submitTask = (e: FormEvent) => {
    e.preventDefault();
    if (!task.title.trim()) return;
    update((d) => { d.tasks.unshift({ id: uid(), customerId: c.id, title: task.title.trim(), due: task.due, done: false }); });
    setTask({ ...task, title: "" });
  };
  const exportData = () => {
    download(`customer-${c.lastName || c.id}.json`, JSON.stringify({ exportedAt: new Date().toISOString(), profile: c, history: timeline, tasks }, null, 2), "application/json");
    update(() => {}, `Exported data of ${auditName(c)}`);
  };
  const remove = () => { update((d) => deleteCustomer(d, c.id), `Deleted profile and history of ${auditName(c)}`); router.push("/customers/"); };

  return (
    <>
      <Link href="/customers/" className="mb-4 inline-flex items-center gap-1 text-sm text-primary hover:underline"><ArrowLeft className="h-4 w-4" /> All customers</Link>

      <div className="card mb-4 flex flex-wrap items-center gap-4 p-5">
        <Avatar text={initials(c)} size="h-14 w-14 text-lg" />
        <div className="min-w-0 flex-1 basis-56">
          <h1 className="text-2xl font-bold text-white">{fullName(c)}</h1>
          <p className="text-sm text-mute">{[c.occupation, lifeStage(c), `speaks ${c.language === "de" ? "German" : "English"}`].filter(Boolean).join(" · ")}</p>
          <div className="mt-2 flex flex-wrap gap-1.5">
            <StatusChip tone={cov.pct >= 60 ? "good" : cov.pct >= 30 ? "warn" : "mute"}>Cover {cov.held} of {cov.of}</StatusChip>
            {!c.email && !c.phone && <StatusChip tone="bad">No contact details</StatusChip>}
            {bday === 0 && <StatusChip tone="info">Birthday today</StatusChip>}
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          {c.email && <a className="btn" href={`mailto:${c.email}`}><Mail className="h-4 w-4" /> Email</a>}
          {c.phone && <a className="btn" href={`tel:${c.phone.replace(/\s/g, "")}`}><Phone className="h-4 w-4" /> Call</a>}
          <button className="btn" onClick={() => setEditing(!editing)}><Pencil className="h-4 w-4" /> Edit</button>
        </div>
      </div>

      {editing && <CustomerForm initial={c} isNew={false} onCancel={() => setEditing(false)} onSave={(next) => { mutate((x) => Object.assign(x, next), `Edited profile ${auditName(c)}`); setEditing(false); }} />}

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <div className="flex flex-col gap-4">
          <Card title="Contact">
            <dl className="space-y-2.5 px-5 pb-5 pt-3 text-sm">
              <Row icon={<Mail className="h-4 w-4" />} label="Email">{c.email || "Not known"}</Row>
              <Row icon={<Phone className="h-4 w-4" />} label="Phone">{c.phone || "Not known"}</Row>
              <Row icon={<MapPin className="h-4 w-4" />} label="Address">{[c.street, [c.postcode, c.city].filter(Boolean).join(" ")].filter(Boolean).join(", ") || "Not known"}</Row>
              <Row icon={<Cake className="h-4 w-4" />} label="Born">{c.dob ? `${fmtDate(c.dob)} (age ${years}, birthday ${bday === 0 ? "today" : `in ${bday} days`})` : "Not known"}</Row>
              <Row icon={<Car className="h-4 w-4" />} label="Car">{c.ownsCar === "yes" ? "Owns a car" : c.ownsCar === "no" ? "No car" : "Not known"}</Row>
              <Row icon={<Home className="h-4 w-4" />} label="Home">{{ rent: "Rents", owner: "Owns, no home loan", mortgage: "Owns, with a home loan", unknown: "Not known" }[c.housing]}</Row>
              <Row icon={<Baby className="h-4 w-4" />} label="Children">{c.children === "yes" ? "Yes" : c.children === "no" ? "No" : "Not known"}</Row>
              <Row icon={<UserRound className="h-4 w-4" />} label="Interests">{c.interests.join(", ") || "None recorded"}</Row>
            </dl>
          </Card>

          <Card title="Consent and preferences">
            <div className="space-y-3 px-5 pb-5 pt-3">
              {CHANNELS.map((ch) => <Toggle key={ch} checked={c.consent[ch]} onChange={() => toggle(ch)} label={<span className="flex items-center gap-2"><ChannelIcon channel={ch} /> {CHANNEL_LABEL[ch]}</span>} />)}
              <div className="border-t border-line/60 pt-3"><Toggle checked={c.consent.marketing} onChange={() => toggle("marketing")} label="Product offers (marketing)" /></div>
              <p className="text-xs text-mute">
                Preferred channel: {CHANNEL_LABEL[c.preferredChannel]}. {c.consentUpdated ? `Last changed ${fmtDate(c.consentUpdated)}${c.consentSource ? ` (${c.consentSource})` : ""}.` : "No consent recorded yet."} Switch on only what the customer has actually agreed to.
              </p>
            </div>
          </Card>

          <Card title="Notes">
            <div className="px-5 pb-5 pt-3">
              <textarea key={c.id} className="input min-h-24" aria-label="Notes" defaultValue={c.notes} onBlur={(e) => { if (e.target.value !== c.notes) mutate((x) => { x.notes = e.target.value; }); }} placeholder="Background, preferences, family situation" />
            </div>
          </Card>

          <Card title="Tasks">
            <div className="px-5 pb-5 pt-3">
              <ul className="space-y-1">
                {tasks.map((t) => (
                  <li key={t.id} className="flex items-start gap-2">
                    <input type="checkbox" aria-label={t.title} className="mt-1 h-4 w-4 accent-[#2b8cee]" checked={t.done} onChange={() => update((d) => { const x = d.tasks.find((y) => y.id === t.id); if (x) x.done = !x.done; })} />
                    <span className={`flex-1 text-sm ${t.done ? "text-mute line-through" : "text-ink"}`}>{t.title}<span className="block text-xs text-mute">due {fmtDate(t.due)}</span></span>
                  </li>
                ))}
              </ul>
              <form onSubmit={submitTask} className="mt-3 flex flex-wrap gap-2">
                <input className="input min-w-0 flex-1 basis-40" aria-label="New task" placeholder="New task" value={task.title} onChange={(e) => setTask({ ...task, title: e.target.value })} />
                <input type="date" aria-label="Due date" className="input !w-auto" value={task.due} onChange={(e) => setTask({ ...task, due: e.target.value })} />
                <button className="btn" aria-label="Add task"><Plus className="h-4 w-4" /></button>
              </form>
            </div>
          </Card>

          <Card title="Data protection">
            <div className="space-y-2 px-5 pb-5 pt-3">
              <button className="btn w-full" onClick={exportData}><Download className="h-4 w-4" /> Export this customer&apos;s data</button>
              {confirmDelete ? (
                <div className="rounded-md border border-bad/40 bg-bad/10 p-3 text-sm text-ink">
                  Delete this profile with its policies, history and tasks? This cannot be undone.
                  <div className="mt-2 flex gap-2"><button className="btn btn-danger" onClick={remove}>Yes, delete</button><button className="btn" onClick={() => setConfirmDelete(false)}>Cancel</button></div>
                </div>
              ) : <button className="btn btn-danger w-full" onClick={() => setConfirmDelete(true)}><Trash2 className="h-4 w-4" /> Delete profile</button>}
            </div>
          </Card>
        </div>

        <div className="flex flex-col gap-4 lg:col-span-2">
          <Card title="Policies and products" action={<span className="text-xs text-mute">{total > 0 ? `€${total} per month in total` : ""}</span>}>
            {c.policies.length > 0 && (
              <div className="mt-2 overflow-x-auto">
                <table className="w-full min-w-[460px]">
                  <thead><tr><th className="th">Product</th><th className="th">Policy number</th><th className="th">Since</th><th className="th text-right">Premium / month</th><th className="th" /></tr></thead>
                  <tbody>
                    {c.policies.map((p) => (
                      <tr key={p.id}>
                        <td className="td font-medium text-white">{p.product}</td>
                        <td className="td tabular-nums text-ink-2">{p.number || "–"}</td>
                        <td className="td text-ink-2">{p.since ? fmtDate(p.since) : "–"}</td>
                        <td className="td text-right tabular-nums">{p.premium ? `€${p.premium}` : "–"}</td>
                        <td className="td text-right"><button className="text-mute hover:text-bad" aria-label={`Remove ${p.product} policy`} onClick={() => mutate((x) => { x.policies = x.policies.filter((q) => q.id !== p.id); }, `Removed ${p.product} policy from ${auditName(c)}`)}><Trash2 className="h-4 w-4" /></button></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
            <div className="px-5 pb-5 pt-3">
              {policy ? (
                <form className="flex flex-wrap items-end gap-2" onSubmit={(e) => { e.preventDefault(); mutate((x) => { x.policies.push({ id: uid(), product: policy.product, number: policy.number.trim(), since: todayIso(), premium: Number(policy.premium.replace(",", ".")) || 0 }); }, `Added ${policy.product} policy to ${auditName(c)}`); setPolicy(null); }}>
                  <label className="block"><span className="label">Product</span><select className="input mt-1" value={policy.product} onChange={(e) => setPolicy({ ...policy, product: e.target.value as Product })}>{PRODUCTS.map((p) => <option key={p}>{p}</option>)}</select></label>
                  <label className="block"><span className="label">Policy number</span><input className="input mt-1" value={policy.number} onChange={(e) => setPolicy({ ...policy, number: e.target.value })} /></label>
                  <label className="block"><span className="label">Premium / month (€)</span><input className="input mt-1 max-w-28" inputMode="decimal" value={policy.premium} onChange={(e) => setPolicy({ ...policy, premium: e.target.value })} /></label>
                  <button className="btn btn-primary">Add</button><button type="button" className="btn" onClick={() => setPolicy(null)}>Cancel</button>
                </form>
              ) : <button className="btn" onClick={() => setPolicy({ product: PRODUCTS.find((p) => !c.policies.some((q) => q.product === p)) ?? "Health", number: "", premium: "" })}><Plus className="h-4 w-4" /> Add policy</button>}
            </div>
          </Card>

          <Card title="Recommended next steps">
            <div className="space-y-3 px-5 pb-5 pt-3">
              {opps.length === 0 && <p className="text-sm text-mute">No recommendation. Nothing in this profile points to a missing cover.</p>}
              {opps.map((o) => {
                const allowed = canMarket(c);
                const asking = o.product === "Car" && c.ownsCar === "unknown";
                return (
                  <div key={o.key} className="rounded-lg border border-line/70 bg-night-2/40 p-4">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-medium text-white">{o.product}</span>
                      <ConfidenceChip level={o.confidence} />
                      <OppStatusChip status={o.status} />
                      <span className="flex-1" />
                      <select className="input !w-auto !py-1 text-xs" aria-label={`Status of ${o.product} opportunity`} value={o.status} onChange={(e) => update((d) => setOpp(d, c.id, o.product, e.target.value as OppStatus), `${o.product} opportunity set to ${e.target.value}: ${auditName(c)}`)}>
                        <option value="open">Open</option><option value="contacted">Contacted</option><option value="won">Won: policy signed</option><option value="dismissed">Dismissed</option>
                      </select>
                    </div>
                    <p className="mt-1 text-sm text-ink-2">{o.reason}</p>
                    {GUIDES[o.product] && (
                      <details className="mt-2 text-sm">
                        <summary className="cursor-pointer text-primary hover:underline">Talking points</summary>
                        <div className="mt-2 grid gap-3 sm:grid-cols-2">
                          <div><span className="label">Ask</span><ul className="mt-1 list-disc space-y-1 pl-4 text-ink-2">{GUIDES[o.product]!.ask.map((x) => <li key={x}>{x}</li>)}</ul></div>
                          <div><span className="label">Do not say</span><ul className="mt-1 list-disc space-y-1 pl-4 text-ink-2">{GUIDES[o.product]!.never.map((x) => <li key={x}>{x}</li>)}</ul></div>
                        </div>
                      </details>
                    )}
                    {o.status === "open" && !allowed && <p className="mt-2 text-xs text-mute">No consent for product offers, or no agreed channel. Raise this in person or by phone.</p>}
                    {o.status === "open" && allowed && capped && <p className="mt-2 text-xs text-warn">A product message went out {sinceMarketing} days ago. The limit is one every {db.settings.capDays} days.</p>}
                    {o.status === "open" && allowed && (
                      <button className="btn btn-outline mt-3" onClick={() => setOpenDraft(openDraft === o.key ? null : o.key)}>{openDraft === o.key ? "Hide message" : "Write message"}</button>
                    )}
                    {allowed && openDraft === o.key && (
                      <div className="mt-3 rounded-md border border-line/70 bg-night/70 p-3">
                        <Composer key={o.key} customer={c} text={templateFor(db, asking ? "carQuestion" : "offer", c, o.product)} purpose="marketing" product={o.product} label={asking ? "Car question sent" : `Product offer sent: ${o.product}`} />
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </Card>

          <Card title="Communication history">
            <form onSubmit={submitLog} className="flex flex-wrap items-end gap-2 px-5 pt-3">
              <label className="block"><span className="label">Log</span>
                <select className="input mt-1" value={log.kind} onChange={(e) => setLog({ ...log, kind: e.target.value as CrmEvent["kind"] })}>
                  <option value="call">Phone call</option><option value="meeting">Meeting</option><option value="reply">Customer reply</option><option value="note">Note</option>
                </select>
              </label>
              {log.kind === "reply" && (
                <>
                  <label className="block"><span className="label">Via</span><select className="input mt-1" value={log.channel} onChange={(e) => setLog({ ...log, channel: e.target.value as Channel })}>{CHANNELS.map((ch) => <option key={ch} value={ch}>{CHANNEL_LABEL[ch]}</option>)}</select></label>
                  <label className="block"><span className="label">Interested in</span><select className="input mt-1" value={log.interest} onChange={(e) => setLog({ ...log, interest: e.target.value })}><option value="">Nothing specific</option>{PRODUCTS.map((p) => <option key={p}>{p}</option>)}</select></label>
                </>
              )}
              <input className="input min-w-0 flex-1 basis-56" aria-label="What happened" placeholder={log.kind === "reply" ? "What the customer wrote" : "What was discussed"} value={log.text} onChange={(e) => setLog({ ...log, text: e.target.value })} />
              <button className="btn btn-primary">Add</button>
            </form>
            {timeline.length === 0 ? <p className="px-5 pb-5 pt-4 text-sm text-mute">No history yet.</p> : (
              <ol className="px-5 pb-5 pt-4">
                {timeline.map((e, i) => {
                  const I = KIND_ICON[e.kind];
                  return (
                    <li key={e.id} className="group relative flex gap-3 pb-4 last:pb-0">
                      {i < timeline.length - 1 && <span className="absolute left-[15px] top-8 h-[calc(100%-2rem)] w-px bg-line/70" aria-hidden />}
                      <span className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full border ${e.kind === "reply" ? "border-teal/60 text-teal" : "border-line text-mute"} bg-night`}>
                        {e.channel ? <ChannelIcon channel={e.channel} /> : <I className="h-4 w-4" />}
                      </span>
                      <span className="min-w-0 flex-1 pt-1">
                        <span className="block text-sm text-ink">{e.text}{e.interest ? ` (interested in ${e.interest})` : ""}</span>
                        <span className="block text-xs text-mute">{fmtDate(e.date)}{e.channel ? ` · ${CHANNEL_LABEL[e.channel]}` : ""}</span>
                        {e.body && <details className="mt-1 text-xs text-mute"><summary className="cursor-pointer hover:text-ink">Show message</summary><p className="mt-1 whitespace-pre-line text-ink-2">{e.body}</p></details>}
                      </span>
                      {e.kind !== "system" && <button className="self-start pt-1 text-mute opacity-60 hover:text-bad hover:opacity-100" aria-label="Remove this entry" onClick={() => update((d) => { d.events = d.events.filter((x) => x.id !== e.id); }, `Removed a history entry of ${auditName(c)}`)}><Trash2 className="h-4 w-4" /></button>}
                    </li>
                  );
                })}
              </ol>
            )}
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
