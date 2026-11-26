"use client";

import { Check, Plus } from "lucide-react";
import Link from "next/link";
import { useMemo, useState, type FormEvent } from "react";
import { Avatar, Card, ChannelChip, Empty, PageHeader, StatusChip } from "@/components/ui";
import { logEvent } from "@/lib/actions";
import { addDays, relative, toIso } from "@/lib/dates";
import { fullName, initials, productsOf } from "@/lib/rules";
import { uid } from "@/lib/send";
import { useStore } from "@/lib/store";
import { CHANNELS, CHANNEL_LABEL, type Channel, type Product } from "@/lib/types";
import { t } from "@/lib/i18n";
import { AgendaForm, AgendaItem, byWhen, exportAgenda } from "@/components/agenda";

export default function InboxPage() {
  const { db, update } = useStore();
  const products = productsOf(db);
  const byId = useMemo(() => new Map(db.customers.map((c) => [c.id, c])), [db]);
  const sorted = useMemo(() => [...db.customers].sort((a, b) => fullName(a).localeCompare(fullName(b))), [db]);
  const replies = db.events.filter((e) => e.kind === "reply" && byId.has(e.customerId)).sort((a, b) => b.ts - a.ts);
  const open = replies.filter((r) => !r.handled);
  const tasks = [...db.tasks].filter((x) => byId.has(x.customerId)).sort((a, b) => Number(a.done) - Number(b.done) || byWhen(a, b));
  const [form, setForm] = useState({ customerId: "", channel: "email" as Channel, text: "", interest: "" });

  const handle = (id: string) => update((d) => { const e = d.events.find((x) => x.id === id); if (e) e.handled = true; });
  const makeTask = (id: string) => update((d) => {
    const e = d.events.find((x) => x.id === id); if (!e) return;
    e.handled = true;
    d.tasks.unshift({ id: uid(), customerId: e.customerId, title: e.interest ? `Follow up on ${e.interest}` : t("Follow up on reply"), due: toIso(addDays(new Date(), 2)), done: false });
  });
  const submitReply = (e: FormEvent) => {
    e.preventDefault();
    if (!form.customerId || !form.text.trim()) return;
    update((d) => logEvent(d, { customerId: form.customerId, kind: "reply", channel: form.channel, text: form.text.trim(), interest: (form.interest || undefined) as Product | undefined, handled: false }), `Logged a reply from ${fullName(byId.get(form.customerId)!)}`);
    setForm({ ...form, text: "", interest: "" });
  };
  const picker = (value: string, onChange: (v: string) => void) => (
    <select className="input" aria-label={t("Customer")} value={value} onChange={(e) => onChange(e.target.value)} required>
      <option value="">{t("Choose customer")}</option>
      {sorted.map((c) => <option key={c.id} value={c.id}>{fullName(c)}{c.city ? `, ${c.city}` : ""}</option>)}
    </select>
  );

  return (
    <>
      <PageHeader title={t("Replies and tasks")} subtitle={t("What customers answered, and what you still need to do.")} />
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-5">
        <Card title={t(`New replies (${open.length})`)} className="lg:col-span-3">
          <form onSubmit={submitReply} className="grid grid-cols-1 gap-2 px-5 pt-3 sm:grid-cols-3">
            {picker(form.customerId, (v) => setForm({ ...form, customerId: v }))}
            <select className="input" aria-label={t("Channel")} value={form.channel} onChange={(e) => setForm({ ...form, channel: e.target.value as Channel })}>{CHANNELS.map((ch) => <option key={ch} value={ch}>via {CHANNEL_LABEL[ch]}</option>)}</select>
            <select className="input" aria-label={t("Interested in")} value={form.interest} onChange={(e) => setForm({ ...form, interest: e.target.value })}><option value="">{t("No product interest")}</option>{products.map((p) => <option key={p} value={p}>{t("Interested in")} {t(p)}</option>)}</select>
            <input className="input sm:col-span-2" aria-label={t("Reply text")} placeholder={t("What the customer answered")} value={form.text} onChange={(e) => setForm({ ...form, text: e.target.value })} required />
            <button className="btn btn-primary"><Plus className="h-4 w-4" /> {t("Log reply")}</button>
          </form>
          {open.length === 0 ? <Empty>{t("No unanswered replies.")}</Empty> : (
            <ul className="space-y-3 px-5 pb-5 pt-4">
              {open.map((r) => {
                const c = byId.get(r.customerId)!;
                return (
                  <li key={r.id} className="rounded-lg border border-line/70 bg-night-2/40 p-4">
                    <div className="flex flex-wrap items-center gap-3">
                      <Avatar text={initials(c)} />
                      <div className="min-w-0 flex-1 basis-40">
                        <Link href={`/customers/view/?id=${c.id}`} className="font-medium text-white hover:underline">{fullName(c)}</Link>
                        <p className="text-xs text-mute">{relative(r.date)}</p>
                      </div>
                      {r.channel && <ChannelChip channel={r.channel} />}
                    </div>
                    <p className="mt-3 text-sm text-ink">{r.text}</p>
                    <div className="mt-3 flex flex-wrap items-center gap-2">
                      {r.interest && <StatusChip tone="info">{t("Interested: {p}", { p: t(r.interest) })}</StatusChip>}
                      <span className="flex-1" />
                      <button className="btn" onClick={() => handle(r.id)}><Check className="h-4 w-4" /> {t("Mark handled")}</button>
                      <button className="btn btn-primary" onClick={() => makeTask(r.id)}><Plus className="h-4 w-4" /> {t("Create task")}</button>
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </Card>

        <Card title={t("Appointments and tasks ({n} open)", { n: tasks.filter((x) => !x.done).length })} className="lg:col-span-2"
          action={tasks.some((x) => !x.done) ? <button className="text-xs text-primary hover:underline" onClick={() => exportAgenda(tasks.filter((x) => !x.done).map((task) => ({ task, customer: byId.get(task.customerId) })))}>{t("All open to calendar")}</button> : undefined}>
          <div className="px-5 pt-3"><AgendaForm customers={sorted} /></div>
          {tasks.length === 0 ? <Empty>{t("No tasks.")}</Empty> : (
            <ul className="space-y-0.5 px-3 pb-4 pt-3">
              {tasks.map((task) => <AgendaItem key={task.id} task={task} customer={byId.get(task.customerId)} />)}
            </ul>
          )}
        </Card>
      </div>
    </>
  );
}
