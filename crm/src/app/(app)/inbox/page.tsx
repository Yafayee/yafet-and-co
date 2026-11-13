"use client";

import { Check, Plus } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { Avatar, Card, ChannelChip, Empty, PageHeader, StatusChip } from "@/components/ui";
import { customerById, fullName, initials, replies as initialReplies, tasks as initialTasks } from "@/lib/data";
import { addDays, fmtDayMonth, iso, relative, TODAY } from "@/lib/dates";

export default function InboxPage() {
  const [replies, setReplies] = useState(initialReplies);
  const [tasks, setTasks] = useState(initialTasks);
  const open = replies.filter((r) => !r.handled);
  const handled = replies.filter((r) => r.handled);

  const makeTask = (id: string) => {
    const r = replies.find((x) => x.id === id)!;
    setTasks((ts) => [{ id: `t-${id}`, customerId: r.customerId, title: r.interest ? `Follow up on ${r.interest}` : "Follow up on reply", due: iso(addDays(TODAY, 2)), done: false }, ...ts]);
    setReplies((rs) => rs.map((x) => (x.id === id ? { ...x, handled: true } : x)));
  };

  return (
    <>
      <PageHeader title="Replies and tasks" subtitle="Customer responses from every channel, and what you still need to do." />
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-5">
        <Card title={`New replies (${open.length})`} className="lg:col-span-3">
          {open.length === 0 ? <Empty>All replies are handled.</Empty> : (
            <ul className="space-y-3 px-5 pb-5 pt-3">
              {open.map((r) => {
                const c = customerById(r.customerId)!;
                return (
                  <li key={r.id} className="rounded-lg border border-line/70 bg-night-2/40 p-4">
                    <div className="flex flex-wrap items-center gap-3">
                      <Avatar text={initials(c)} />
                      <div className="min-w-0 flex-1 basis-40">
                        <Link href={`/customers/${c.id}`} className="font-medium text-white hover:underline">{fullName(c)}</Link>
                        <p className="text-xs text-mute">{relative(r.date)}</p>
                      </div>
                      <ChannelChip channel={r.channel} />
                    </div>
                    <p className="mt-3 text-sm text-ink">{r.text}</p>
                    <div className="mt-3 flex flex-wrap items-center gap-2">
                      {r.interest && <StatusChip tone="info">Interested: {r.interest}</StatusChip>}
                      <span className="flex-1" />
                      <button className="btn" onClick={() => setReplies((rs) => rs.map((x) => (x.id === r.id ? { ...x, handled: true } : x)))}><Check className="h-4 w-4" /> Mark handled</button>
                      <button className="btn btn-primary" onClick={() => makeTask(r.id)}><Plus className="h-4 w-4" /> Create task</button>
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
          {handled.length > 0 && (
            <div className="border-t border-line/60 px-5 py-4">
              <h3 className="label mb-2">Handled</h3>
              <ul className="space-y-2">
                {handled.map((r) => (
                  <li key={r.id} className="text-sm text-mute"><span className="text-ink-2">{fullName(customerById(r.customerId)!)}</span>: {r.text}</li>
                ))}
              </ul>
            </div>
          )}
        </Card>

        <Card title={`Tasks (${tasks.filter((t) => !t.done).length} open)`} className="lg:col-span-2">
          <ul className="space-y-1 px-3 pb-4 pt-3">
            {tasks.map((t) => {
              const c = customerById(t.customerId)!;
              const late = !t.done && t.due < iso(TODAY);
              return (
                <li key={t.id}>
                  <label className="flex cursor-pointer items-start gap-3 rounded-md px-2 py-2 hover:bg-white/5">
                    <input type="checkbox" className="mt-1 h-4 w-4 accent-[#2b8cee]" checked={t.done} onChange={() => setTasks((ts) => ts.map((x) => (x.id === t.id ? { ...x, done: !x.done } : x)))} />
                    <span className="min-w-0 flex-1">
                      <span className={`block text-sm ${t.done ? "text-mute line-through" : "text-white"}`}>{t.title}</span>
                      <span className="block text-xs text-mute">{fullName(c)} · due {fmtDayMonth(t.due)}{late ? " · overdue" : ""}</span>
                    </span>
                  </label>
                </li>
              );
            })}
          </ul>
        </Card>
      </div>
    </>
  );
}
