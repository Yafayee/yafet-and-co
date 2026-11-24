"use client";

import { ArrowLeft, Baby, Briefcase, Cake, CalendarCheck, Car, Download, Home, Mail, MapPin, MessageSquareReply, Pencil, Phone, PhoneCall, Plus, Settings2, StickyNote, Printer, Trash2, UserRound, Users, Wallet } from "lucide-react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useState, type FormEvent } from "react";
import { Composer } from "@/components/composer";
import { CustomerForm } from "@/components/customer-form";
import { Avatar, Card, ChannelIcon, ConfidenceChip, OppStatusChip, StatusChip, Toggle } from "@/components/ui";
import { auditName, deleteCustomer, logEvent, setOpp } from "@/lib/actions";
import { guideFor } from "@/lib/knowledge";
import { addDays, age, daysToBirthday, daysUntil, eur, fmtDate, toIso, todayIso } from "@/lib/dates";
import { assess, canMarket, coverage, daysSinceMarketing, missingFacts, eventsOf, fullName, initials, lifeStage, opportunitiesFor, templateFor, productsOf } from "@/lib/rules";
import { download, sendLink, uid } from "@/lib/send";
import { useStore } from "@/lib/store";
import { CHANNELS, CHANNEL_LABEL, INCOME_LABEL, type Channel, type Consent, type CrmEvent, type Customer, type OppStatus, type Product } from "@/lib/types";
import { t } from "@/lib/i18n";

/** The fields the edit form owns. Consent, policies and notes are edited elsewhere and must not be overwritten by it. */
const FORM_FIELDS = ["firstName", "lastName", "email", "phone", "dob", "street", "postcode", "city", "language", "occupation", "ownsCar", "housing", "children", "kids", "income", "marital", "employment", "interests", "preferredChannel", "customerNo", "kind"] as const;

const KIND_ICON = { sent: Mail, reply: MessageSquareReply, call: PhoneCall, meeting: CalendarCheck, note: StickyNote, system: Settings2 };

export function Profile() {
  const { db, update } = useStore();
  const products = productsOf(db);
  const router = useRouter();
  const id = useSearchParams().get("id") ?? "";
  const c = db.customers.find((x) => x.id === id);
  const [editing, setEditing] = useState(false);
  const [openDraft, setOpenDraft] = useState<string | null>(null);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [log, setLog] = useState<{ kind: CrmEvent["kind"]; channel: Channel; text: string; interest: string }>({ kind: "call", channel: "email", text: "", interest: "" });
  const [task, setTask] = useState({ title: "", due: toIso(addDays(new Date(), 3)) });
  const [policy, setPolicy] = useState<{ product: Product; number: string; premium: string; until: string } | null>(null);

  if (!c) {
    return (
      <div className="card p-8 text-center">
        <p className="text-ink-2">{t("This customer profile does not exist.")}</p>
        <Link href="/customers/" className="btn btn-primary mt-4">{t("Back to customers")}</Link>
      </div>
    );
  }

  const opps = opportunitiesFor(db, c);
  const check = assess(db, c);
  const offers = check.filter((a) => a.status === "offer");
  const asks = check.filter((a) => a.status === "ask");
  const questions = missingFacts(c);
  const timeline = eventsOf(db, c.id);
  const tasks = db.tasks.filter((t) => t.customerId === c.id);
  const total = c.policies.reduce((s, p) => s + p.premium, 0);
  const cov = coverage(db, c);
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
      <Link href="/customers/" className="mb-4 inline-flex items-center gap-1 text-sm text-primary hover:underline"><ArrowLeft className="h-4 w-4" /> {t("All customers")}</Link>

      <div className="card mb-4 flex flex-wrap items-center gap-4 p-5">
        <Avatar text={initials(c)} size="h-14 w-14 text-lg" />
        <div className="min-w-0 flex-1 basis-56">
          <h1 className="text-2xl font-bold text-white">{fullName(c)}</h1>
          <p className="text-sm text-mute">{[c.occupation, t(lifeStage(c)), t("speaks {lang}", { lang: c.language === "de" ? t("German") : t("English") })].filter(Boolean).join(" · ")}</p>
          <div className="mt-2 flex flex-wrap gap-1.5">
            <StatusChip tone={cov.pct >= 60 ? "good" : cov.pct >= 30 ? "warn" : "mute"}>{t("Cover {a} of {b}", { a: cov.held, b: cov.of })}</StatusChip>
            {c.kind === "prospect" && <StatusChip tone="info">{t("Prospect")}</StatusChip>}
            {!c.email && !c.phone && <StatusChip tone="bad">{t("No contact details")}</StatusChip>}
            {bday === 0 && <StatusChip tone="info">{t("Birthday today")}</StatusChip>}
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          {c.email && <a className="btn" href={db.settings.emailVia === "gmail" ? sendLink(c, "email", { subject: "", body: "" }, db.settings) : `mailto:${c.email}`} target={db.settings.emailVia === "gmail" ? "_blank" : undefined} rel="noopener noreferrer"><Mail className="h-4 w-4" /> {t("Email")}</a>}
          {c.phone && <a className="btn" href={`tel:${c.phone.replace(/\s/g, "")}`}><Phone className="h-4 w-4" /> {t("Call")}</a>}
          <Link className="btn" href={`/customers/print/?id=${c.id}`}><Printer className="h-4 w-4" /> {t("Summary")}</Link>
          <button className="btn" onClick={() => setEditing(!editing)}><Pencil className="h-4 w-4" /> {t("Edit")}</button>
        </div>
      </div>

      {editing && <CustomerForm initial={c} isNew={false} existing={db.customers} onCancel={() => setEditing(false)} onSave={(next) => { mutate((x) => { for (const k of FORM_FIELDS) (x as unknown as Record<string, unknown>)[k] = next[k]; }, `Edited profile ${auditName(c)}`); setEditing(false); }} />}

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <div className="flex flex-col gap-4">
          <Card title={t("Contact")}>
            <dl className="space-y-2.5 px-5 pb-5 pt-3 text-sm">
              <Row icon={<Mail className="h-4 w-4" />} label={t("Email")}>{c.email || "Not known"}</Row>
              <Row icon={<Phone className="h-4 w-4" />} label={t("Phone")}>{c.phone || "Not known"}</Row>
              <Row icon={<MapPin className="h-4 w-4" />} label={t("Address")}>{[c.street, [c.postcode, c.city].filter(Boolean).join(" ")].filter(Boolean).join(", ") || "Not known"}</Row>
              {(c.customerNo || c.since) && <Row icon={<Users className="h-4 w-4" />} label={t("Customer number")}>{[c.customerNo, c.since ? t("since {date}", { date: fmtDate(c.since) }) : ""].filter(Boolean).join(", ")}</Row>}
              <Row icon={<Cake className="h-4 w-4" />} label={t("Born")}>{c.dob ? (bday === 0 ? t("{date} (age {n}, birthday today)", { date: fmtDate(c.dob), n: years ?? 0 }) : t("{date} (age {n}, birthday in {d} days)", { date: fmtDate(c.dob), n: years ?? 0, d: bday ?? 0 })) : t("Not known")}</Row>
              <Row icon={<Car className="h-4 w-4" />} label={t("Car")}>{c.ownsCar === "yes" ? t("Owns a car") : c.ownsCar === "no" ? t("No car") : t("Not known")}</Row>
              <Row icon={<Users className="h-4 w-4" />} label={t("Marital status")}>{{ single: t("Single"), partner: t("Lives with a partner"), married: t("Married"), unknown: t("Not known") }[c.marital]}</Row>
              <Row icon={<Briefcase className="h-4 w-4" />} label={t("Work")}>{{ employed: t("Employed"), self: t("Self-employed"), student: t("Student or apprentice"), retired: t("Retired"), unknown: t("Not known") }[c.employment]}{c.occupation ? ` (${c.occupation})` : ""}</Row>
              <Row icon={<Home className="h-4 w-4" />} label={t("Home")}>{{ rent: t("Rents"), owner: t("Owns, no home loan"), mortgage: t("Owns, with a home loan"), unknown: t("Not known") }[c.housing]}</Row>
              <Row icon={<Baby className="h-4 w-4" />} label={t("Children")}>{c.kids.length ? t("{n} (aged {ages})", { n: c.kids.length, ages: c.kids.map((y) => new Date().getFullYear() - y).sort((a, b) => a - b).join(", ") }) : c.children === "yes" ? t("Yes, ages not known") : c.children === "no" ? "No" : t("Not known")}</Row>
              <Row icon={<Wallet className="h-4 w-4" />} label={t("Net income per month")}>{t(INCOME_LABEL[c.income])}</Row>
              <Row icon={<UserRound className="h-4 w-4" />} label={t("Interests")}>{c.interests.join(", ") || "None recorded"}</Row>
            </dl>
          </Card>

          <Card title={t("Consent and preferences")}>
            <div className="space-y-3 px-5 pb-5 pt-3">
              {CHANNELS.map((ch) => <Toggle key={ch} checked={c.consent[ch]} onChange={() => toggle(ch)} label={<span className="flex items-center gap-2"><ChannelIcon channel={ch} /> {CHANNEL_LABEL[ch]}</span>} />)}
              <div className="border-t border-line/60 pt-3"><Toggle checked={c.consent.marketing} onChange={() => toggle("marketing")} label={t("Product offers (marketing)")} /></div>
              <p className="text-xs text-mute">
                {t("Preferred channel: {ch}.", { ch: t(CHANNEL_LABEL[c.preferredChannel]) })} {c.consentUpdated ? t("Last changed {date}.", { date: fmtDate(c.consentUpdated) }) : t("No consent recorded yet.")} {t("Switch on only what the customer has actually agreed to.")}
              </p>
            </div>
          </Card>

          <Card title={t("Notes")}>
            <div className="px-5 pb-5 pt-3">
              <textarea key={c.id} className="input min-h-24" aria-label={t("Notes")} defaultValue={c.notes} onBlur={(e) => { if (e.target.value !== c.notes) mutate((x) => { x.notes = e.target.value; }); }} placeholder={t("Background, preferences, family situation")} />
            </div>
          </Card>

          <Card title={t("Tasks")}>
            <div className="px-5 pb-5 pt-3">
              <ul className="space-y-1">
                {tasks.map((task) => (
                  <li key={task.id} className="flex items-start gap-2">
                    <input type="checkbox" aria-label={task.title} className="mt-1 h-4 w-4 accent-[#2b8cee]" checked={task.done} onChange={() => update((d) => { const x = d.tasks.find((y) => y.id === task.id); if (x) x.done = !x.done; })} />
                    <span className={`flex-1 text-sm ${task.done ? "text-mute line-through" : "text-ink"}`}>{task.title}<span className="block text-xs text-mute">{t("due {date}", { date: fmtDate(task.due) })}</span></span>
                    <button className="pt-0.5 text-mute hover:text-bad" aria-label={t("Delete task")} onClick={() => update((d) => { d.tasks = d.tasks.filter((y) => y.id !== task.id); })}><Trash2 className="h-4 w-4" /></button>
                  </li>
                ))}
              </ul>
              <form onSubmit={submitTask} className="mt-3 flex flex-wrap gap-2">
                <input className="input min-w-0 flex-1 basis-40" aria-label={t("New task")} placeholder={t("New task")} value={task.title} onChange={(e) => setTask({ ...task, title: e.target.value })} />
                <input type="date" aria-label={t("Due date")} className="input !w-auto" value={task.due} onChange={(e) => setTask({ ...task, due: e.target.value })} />
                <button className="btn" aria-label={t("Add task")}><Plus className="h-4 w-4" /></button>
              </form>
            </div>
          </Card>

          <Card title={t("Data protection")}>
            <div className="space-y-2 px-5 pb-5 pt-3">
              <button className="btn w-full" onClick={exportData}><Download className="h-4 w-4" /> {t("Export this customer's data")}</button>
              {confirmDelete ? (
                <div className="rounded-md border border-bad/40 bg-bad/10 p-3 text-sm text-ink">
                  {t("Delete this profile with its policies, history and tasks? This cannot be undone.")}
                  <div className="mt-2 flex gap-2"><button className="btn btn-danger" onClick={remove}>{t("Yes, delete")}</button><button className="btn" onClick={() => setConfirmDelete(false)}>{t("Cancel")}</button></div>
                </div>
              ) : <button className="btn btn-danger w-full" onClick={() => setConfirmDelete(true)}><Trash2 className="h-4 w-4" /> {t("Delete profile")}</button>}
            </div>
          </Card>
        </div>

        <div className="flex flex-col gap-4 lg:col-span-2">
          <Card title={t("Policies and products")} action={<span className="text-xs text-mute">{total > 0 ? t("{amount} per month in total", { amount: eur(total) }) : ""}</span>}>
            {c.policies.length > 0 && (
              <div className="mt-2 overflow-x-auto">
                <table className="w-full min-w-[620px]">
                  <thead><tr><th className="th">{t("Product")}</th><th className="th">{t("Policy number")}</th><th className="th">{t("Since")}</th><th className="th">{t("Ends or renews")}</th><th className="th text-right">{t("Premium / month")}</th><th className="th" /></tr></thead>
                  <tbody>
                    {c.policies.map((p) => (
                      <tr key={p.id}>
                        <td className="td font-medium text-white">{t(p.product)}</td>
                        <td className="td tabular-nums text-ink-2">{p.number || "–"}</td>
                        <td className="td text-ink-2">{p.since ? fmtDate(p.since) : "–"}</td>
                        <td className="td">
                          <input type="date" className="input !w-auto !py-1 text-xs" aria-label={t(`End date of ${p.product} policy`)} value={p.until ?? ""} onChange={(e) => mutate((x) => { const q = x.policies.find((y) => y.id === p.id); if (q) q.until = e.target.value; })} />
                          {(() => { const d = p.until ? daysUntil(p.until) : null; return d === null ? null : d < 0 ? <span className="mt-1 block text-xs text-bad">{t("ended {n} days ago", { n: -d })}</span> : d <= 90 ? <span className="mt-1 block text-xs text-warn">{t("ends in {n} days", { n: d })}</span> : null; })()}
                        </td>
                        <td className="td text-right tabular-nums">{p.premium ? eur(p.premium) : "–"}</td>
                        <td className="td text-right"><button className="text-mute hover:text-bad" aria-label={t(`Remove ${p.product} policy`)} onClick={() => mutate((x) => { x.policies = x.policies.filter((q) => q.id !== p.id); }, `Removed ${p.product} policy from ${auditName(c)}`)}><Trash2 className="h-4 w-4" /></button></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
            <div className="px-5 pb-5 pt-3">
              {policy ? (
                <form className="flex flex-wrap items-end gap-2" onSubmit={(e) => { e.preventDefault(); mutate((x) => { x.policies.push({ id: uid(), product: policy.product, number: policy.number.trim(), since: todayIso(), until: policy.until, premium: Number(policy.premium.replace(",", ".")) || 0 }); }, `Added ${policy.product} policy to ${auditName(c)}`); setPolicy(null); }}>
                  <label className="block"><span className="label">{t("Product")}</span><select className="input mt-1" value={policy.product} onChange={(e) => setPolicy({ ...policy, product: e.target.value as Product })}>{products.map((p) => <option key={p} value={p}>{t(p)}</option>)}</select></label>
                  <label className="block"><span className="label">{t("Policy number")}</span><input className="input mt-1" value={policy.number} onChange={(e) => setPolicy({ ...policy, number: e.target.value })} /></label>
                  <label className="block"><span className="label">{t("Premium / month (€)")}</span><input className="input mt-1 max-w-28" inputMode="decimal" value={policy.premium} onChange={(e) => setPolicy({ ...policy, premium: e.target.value })} /></label>
                  <label className="block"><span className="label">{t("Ends or renews")}</span><input type="date" className="input mt-1" value={policy.until} onChange={(e) => setPolicy({ ...policy, until: e.target.value })} /></label>
                  <button className="btn btn-primary">{t("Add")}</button><button type="button" className="btn" onClick={() => setPolicy(null)}>{t("Cancel")}</button>
                </form>
              ) : <button className="btn" onClick={() => setPolicy({ product: products.find((p) => !c.policies.some((q) => q.product === p)) ?? "Health", number: "", premium: "", until: "" })}><Plus className="h-4 w-4" /> {t("Add policy")}</button>}
            </div>
          </Card>

          <Card title={t("Cover check")} action={<span className="text-xs text-mute">{t("{h} held · {o} to offer · {q} to find out", { h: check.filter((a) => a.status === "has").length, o: offers.length, q: asks.length })}</span>}>
            <div className="px-5 pb-5 pt-3">
              {offers[0] && (
                <p className="mb-3 rounded-md border border-primary/40 bg-primary/10 px-3 py-2 text-sm text-ink">
                  <span className="font-semibold text-white">{t("Best next offer: {p}.", { p: t(offers[0].product) })}</span> {t(offers[0].reason)}
                </p>
              )}
              <ul className="grid gap-2 sm:grid-cols-2">
                {check.map((a) => (
                  <li key={a.product} className={`rounded-lg border p-3 ${a.status === "offer" ? "border-line bg-night-2/50" : "border-line/50 bg-night-2/20"}`}>
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <span className={`text-sm font-medium ${a.status === "skip" ? "text-mute" : "text-white"}`}>{t(a.product)}</span>
                      {a.status === "has" && <StatusChip tone="good">{t("Has it")}</StatusChip>}
                      {a.status === "offer" && <ConfidenceChip level={a.confidence ?? "low"} />}
                      {a.status === "ask" && <StatusChip tone="info">{t("Find out")}</StatusChip>}
                      {a.status === "skip" && <StatusChip tone="mute">{t("Not needed now")}</StatusChip>}
                    </div>
                    <p className={`mt-1 text-xs ${a.status === "skip" || a.status === "has" ? "text-mute" : "text-ink-2"}`}>{t(a.reason)}</p>
                  </li>
                ))}
              </ul>
              {questions.length > 0 && (
                <div className="mt-4 border-t border-line/60 pt-3">
                  <h3 className="label">{t("Ask at the next contact, then update the profile with Edit")}</h3>
                  <ul className="mt-1 list-disc space-y-1 pl-4 text-sm text-ink-2">{questions.map((q) => <li key={q}>{t(q)}</li>)}</ul>
                </div>
              )}
            </div>
          </Card>

          <Card title={t("Recommended next steps")}>
            <div className="space-y-3 px-5 pb-5 pt-3">
              {opps.length === 0 && <p className="text-sm text-mute">{t("No recommendation. Nothing in this profile points to a missing cover.")}</p>}
              {opps.map((o) => {
                const allowed = canMarket(c);
                const asking = o.product === "Car" && c.ownsCar === "unknown";
                return (
                  <div key={o.key} className="rounded-lg border border-line/70 bg-night-2/40 p-4">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-medium text-white">{t(o.product)}</span>
                      <ConfidenceChip level={o.confidence} />
                      <OppStatusChip status={o.status} />
                      <span className="flex-1" />
                      <select className="input !w-auto !py-1 text-xs" aria-label={t(`Status of ${o.product} opportunity`)} value={o.status} onChange={(e) => update((d) => setOpp(d, c.id, o.product, e.target.value as OppStatus), `${o.product} opportunity set to ${e.target.value}: ${auditName(c)}`)}>
                        <option value="open">{t("Open")}</option><option value="contacted">{t("Contacted")}</option><option value="won">{t("Won: policy signed")}</option><option value="dismissed">{t("Dismissed")}</option>
                      </select>
                    </div>
                    <p className="mt-1 text-sm text-ink-2">{t(o.reason)}</p>
                    {guideFor(db, o.product) && (
                      <details className="mt-2 text-sm">
                        <summary className="cursor-pointer text-primary hover:underline">{t("Talking points")}</summary>
                        <div className="mt-2 grid gap-3 sm:grid-cols-2">
                          <div><span className="label">{t("Ask")}</span><ul className="mt-1 list-disc space-y-1 pl-4 text-ink-2">{guideFor(db, o.product)!.ask.map((x) => <li key={x}>{x}</li>)}</ul></div>
                          <div><span className="label">{t("Do not say")}</span><ul className="mt-1 list-disc space-y-1 pl-4 text-ink-2">{guideFor(db, o.product)!.never.map((x) => <li key={x}>{x}</li>)}</ul></div>
                        </div>
                      </details>
                    )}
                    {o.status === "open" && !allowed && <p className="mt-2 text-xs text-mute">{t("No consent for product offers, or no agreed channel. Raise this in person or by phone.")}</p>}
                    {o.status === "open" && allowed && capped && <p className="mt-2 text-xs text-warn">{t("A product message went out {n} days ago. The limit is one every {cap} days.", { n: sinceMarketing ?? 0, cap: db.settings.capDays })}</p>}
                    {o.status === "open" && allowed && !capped && (
                      <button className="btn btn-outline mt-3" onClick={() => setOpenDraft(openDraft === o.key ? null : o.key)}>{openDraft === o.key ? t("Hide message") : t("Write message")}</button>
                    )}
                    {allowed && !capped && openDraft === o.key && (
                      <div className="mt-3 rounded-md border border-line/70 bg-night/70 p-3">
                        <Composer key={o.key} customer={c} text={templateFor(db, asking ? "carQuestion" : "offer", c, o.product)} purpose="marketing" product={o.product} label={asking ? t("Car question sent") : `Product offer sent: ${o.product}`} />
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </Card>

          <Card title={t("Communication history")}>
            <form onSubmit={submitLog} className="flex flex-wrap items-end gap-2 px-5 pt-3">
              <label className="block"><span className="label">{t("Log")}</span>
                <select className="input mt-1" value={log.kind} onChange={(e) => setLog({ ...log, kind: e.target.value as CrmEvent["kind"] })}>
                  <option value="call">{t("Phone call")}</option><option value="meeting">{t("Meeting")}</option><option value="reply">{t("Customer reply")}</option><option value="note">{t("Note")}</option>
                </select>
              </label>
              {log.kind === "reply" && (
                <>
                  <label className="block"><span className="label">{t("Via")}</span><select className="input mt-1" value={log.channel} onChange={(e) => setLog({ ...log, channel: e.target.value as Channel })}>{CHANNELS.map((ch) => <option key={ch} value={ch}>{CHANNEL_LABEL[ch]}</option>)}</select></label>
                  <label className="block"><span className="label">{t("Interested in")}</span><select className="input mt-1" value={log.interest} onChange={(e) => setLog({ ...log, interest: e.target.value })}><option value="">{t("Nothing specific")}</option>{products.map((p) => <option key={p} value={p}>{t(p)}</option>)}</select></label>
                </>
              )}
              <input className="input min-w-0 flex-1 basis-56" aria-label={t("What happened")} placeholder={log.kind === "reply" ? t("What the customer wrote") : t("What was discussed")} value={log.text} onChange={(e) => setLog({ ...log, text: e.target.value })} />
              <button className="btn btn-primary">{t("Add")}</button>
            </form>
            {timeline.length === 0 ? <p className="px-5 pb-5 pt-4 text-sm text-mute">{t("No history yet.")}</p> : (
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
                        <span className="block text-sm text-ink">{e.text}{e.interest ? ` ${t("(interested in {p})", { p: t(e.interest) })}` : ""}</span>
                        <span className="block text-xs text-mute">{fmtDate(e.date)}{e.channel ? ` · ${CHANNEL_LABEL[e.channel]}` : ""}</span>
                        {e.body && <details className="mt-1 text-xs text-mute"><summary className="cursor-pointer hover:text-ink">{t("Show message")}</summary><p className="mt-1 whitespace-pre-line text-ink-2">{e.body}</p></details>}
                      </span>
                      {e.kind !== "system" && <button className="self-start pt-1 text-mute opacity-60 hover:text-bad hover:opacity-100" aria-label={t("Remove this entry")} onClick={() => update((d) => { d.events = d.events.filter((x) => x.id !== e.id); }, `Removed a history entry of ${auditName(c)}`)}><Trash2 className="h-4 w-4" /></button>}
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
