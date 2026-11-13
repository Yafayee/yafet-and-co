"use client";

import { Check, Plus } from "lucide-react";
import Link from "next/link";
import { useMemo, useState, type FormEvent } from "react";
import { Avatar, Card, ChannelChip, Empty, PageHeader, StatusChip } from "@/components/ui";
import { logEvent } from "@/lib/actions";
import { addDays, fmtDayMonth, relative, toIso, todayIso } from "@/lib/dates";
import { fullName, initials } from "@/lib/rules";
import { uid } from "@/lib/send";
import { useStore } from "@/lib/store";
import { CHANNELS, CHANNEL_LABEL, PRODUCTS, type Channel, type Product } from "@/lib/types";

export default function InboxPage() {
  const { db, update } = useStore();
  const byId = useMemo(() => new Map(db.customers.map((c) => [c.id, c])), [db]);
  const sorted = useMemo(() => [...db.customers].sort((a, b) => fullName(a).localeCompare(fullName(b))), [db]);
  const replies = db.events.filter((e) => e.kind === "reply" && byId.has(e.customerId)).sort((a, b) => b.ts - a.ts);
  const open = replies.filter((r) => !r.handled);
  const tasks = [...db.tasks].filter((t) => byId.has(t.customerId)).sort((a, b) => Number(a.done) - Number(b.done) || a.due.localeCompare(b.due));
  const [form, setForm] = useState({ customerId: "", channel: "email" as Channel, text: "", interest: "" });
  const [task, setTask] = useState({ customerId: "", title: "", due: toIso(addDays(new Date(), 3)) });

  const handle = (id: string) => update((d) => { const e = d.events.find((x) => x.id === id); if (e) e.handled = true; });
  const makeTask = (id: string) => update((d) => {
    const e = d.events.find((x) => x.id === id); if (!e) return;
    e.handled = true;
    d.tasks.unshift({ id: uid(), customerId: e.customerId, title: e.interest ? `Follow up on ${e.interest}` : "Follow up on reply", due: toIso(addDays(new Date(), 2)), done: false });
  });
  const submitReply = (e: FormEvent) => {
    e.preventDefault();
    if (!form.customerId || !form.text.trim()) return;
    update((d) => logEvent(d, { customerId: form.customerId, kind: "reply", channel: form.channel, text: form.text.trim(), interest: (form.interest || undefined) as Product | undefined, handled: false }), `Logged a reply from ${fullName(byId.get(form.customerId)!)}`);
    setForm({ ...form, text: "", interest: "" });
  };
  const submitTask = (e: FormEvent) => {
    e.preventDefault();
    if (!task.customerId || !task.title.trim()) return;
    update((d) => { d.tasks.unshift({ id: uid(), customerId: task.customerId, title: task.title.trim(), due: task.due, done: false }); });
    setTask({ ...task, title: "" });
  };
  const picker = (value: string, onChange: (v: string) => void) => (
    <select className="input" aria-label="Customer" value={value} onChange={(e) => onChange(e.target.value)} required>
      <option value="">Choose customer</option>
      {sorted.map((c) => <option key={c.id} value={c.id}>{fullName(c)}{c.city ? `, ${c.city}` : ""}</option>)}
    </select>
  );

  return (
    <>
      <PageHeader title="Replies and tasks" subtitle="What customers answered, and what you still need to do." />
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-5">
        <Card title={`New replies (${open.length})`} className="lg:col-span-3">
          <form onSubmit={submitReply} className="grid grid-cols-1 gap-2 px-5 pt-3 sm:grid-cols-3">
            {picker(form.customerId, (v) => setForm({ ...form, customerId: v }))}
            <select className="input" aria-label="Channel" value={form.channel} onChange={(e) => setForm({ ...form, channel: e.target.value as Channel })}>{CHANNELS.map((ch) => <option key={ch} value={ch}>via {CHANNEL_LABEL[ch]}</option>)}</select>
            <select className="input" aria-label="Interested in" value={form.interest} onChange={(e) => setForm({ ...form, interest: e.target.value })}><option value="">No product interest</option>{PRODUCTS.map((p) => <option key={p} value={p}>Interested in {p}</option>)}</select>
            <input className="input sm:col-span-2" aria-label="Reply text" placeholder="What the customer answered" value={form.text} onChange={(e) => setForm({ ...form, text: e.target.value })} required />
            <button className="btn btn-primary"><Plus className="h-4 w-4" /> Log reply</button>
          </form>
          {open.length === 0 ? <Empty>No unanswered replies.</Empty> : (
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
                      {r.interest && <StatusChip tone="info">Interested: {r.interest}</StatusChip>}
                      <span className="flex-1" />
                      <button className="btn" onClick={() => handle(r.id)}><Check className="h-4 w-4" /> Mark handled</button>
                      <button className="btn btn-primary" onClick={() => makeTask(r.id)}><Plus className="h-4 w-4" /> Create task</button>
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </Card>

        <Card title={`Tasks (${tasks.filter((t) => !t.done).length} open)`} className="lg:col-span-2">
          <form onSubmit={submitTask} className="grid grid-cols-1 gap-2 px-5 pt-3">
            {picker(task.customerId, (v) => setTask({ ...task, customerId: v }))}
            <div className="flex gap-2">
              <input className="input min-w-0 flex-1" aria-label="Task" placeholder="New task" value={task.title} onChange={(e) => setTask({ ...task, title: e.target.value })} required />
              <input type="date" aria-label="Due date" className="input !w-auto" value={task.due} onChange={(e) => setTask({ ...task, due: e.target.value })} />
            </div>
            <button className="btn"><Plus className="h-4 w-4" /> Add task</button>
          </form>
          {tasks.length === 0 ? <Empty>No tasks.</Empty> : (
            <ul className="space-y-1 px-3 pb-4 pt-3">
              {tasks.map((t) => {
                const c = byId.get(t.customerId)!;
                const late = !t.done && t.due < todayIso();
                return (
                  <li key={t.id}>
                    <label className="flex cursor-pointer items-start gap-3 rounded-md px-2 py-2 hover:bg-white/5">
                      <input type="checkbox" className="mt-1 h-4 w-4 accent-[#2b8cee]" checked={t.done} onChange={() => update((d) => { const x = d.tasks.find((y) => y.id === t.id); if (x) x.done = !x.done; })} />
                      <span className="min-w-0 flex-1">
                        <span className={`block text-sm ${t.done ? "text-mute line-through" : "text-white"}`}>{t.title}</span>
                        <span className={`block text-xs ${late ? "text-bad" : "text-mute"}`}>{fullName(c)} · due {fmtDayMonth(t.due)}{late ? " · overdue" : ""}</span>
                      </span>
                    </label>
                  </li>
                );
              })}
            </ul>
          )}
        </Card>
      </div>
    </>
  );
}
