"use client";

import { Check, ShieldCheck, X } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { Avatar, ChannelChip, Empty, PageHeader, StatusChip } from "@/components/ui";
import { customerById, drafts as initial, fullName, initials } from "@/lib/data";
import { daysAgo } from "@/lib/dates";

export default function Approvals() {
  const [items, setItems] = useState(initial);
  const [done, setDone] = useState({ approved: 0, rejected: 0 });
  const edit = (id: string, body: string) => setItems((xs) => xs.map((x) => (x.id === id ? { ...x, body } : x)));
  const close = (id: string, kind: "approved" | "rejected") => {
    setItems((xs) => xs.filter((x) => x.id !== id));
    setDone((d) => ({ ...d, [kind]: d[kind] + 1 }));
  };

  return (
    <>
      <PageHeader title="Approvals" subtitle="Product messages wait here until you approve them. Greetings go out on their own.">
        <button className="btn btn-primary" disabled={items.length === 0} onClick={() => { setDone((d) => ({ ...d, approved: d.approved + items.length })); setItems([]); }}>
          <Check className="h-4 w-4" /> Approve all {items.length || ""}
        </button>
      </PageHeader>

      {(done.approved > 0 || done.rejected > 0) && (
        <div className="mb-4 rounded-md border border-good/30 bg-good/5 px-3 py-2 text-sm text-good" role="status">
          {done.approved} approved, {done.rejected} rejected in this session.
        </div>
      )}

      {items.length === 0 ? (
        <div className="card"><Empty>Nothing is waiting for approval.</Empty></div>
      ) : (
        <div className="space-y-4">
          {items.map((d) => {
            const c = customerById(d.customerId)!;
            const gap = daysAgo(c.lastContact);
            return (
              <article key={d.id} className="card p-5">
                <div className="flex flex-wrap items-center gap-3">
                  <Avatar text={initials(c)} />
                  <div className="min-w-0 flex-1 basis-48">
                    <Link href={`/customers/${c.id}`} className="font-medium text-white hover:underline">{fullName(c)}</Link>
                    <p className="text-xs text-mute">{d.kind} · {d.product}</p>
                  </div>
                  <ChannelChip channel={d.channel} />
                </div>

                <p className="mt-3 text-sm text-ink-2"><span className="text-mute">Why: </span>{d.reason}</p>

                {d.channel === "email" && <p className="mt-3 text-sm"><span className="label">Subject </span><span className="text-ink">{d.subject}</span></p>}
                <textarea className="input mt-2 min-h-40 leading-relaxed" aria-label={`Message to ${fullName(c)}`} value={d.body} onChange={(e) => edit(d.id, e.target.value)} />

                <div className="mt-3 flex flex-wrap items-center gap-2">
                  <StatusChip tone="good"><ShieldCheck className="h-3 w-3" /> Marketing consent on file</StatusChip>
                  <StatusChip tone={gap >= 30 ? "good" : "warn"}>{gap >= 30 ? `Last contact ${gap} days ago` : `Contacted ${gap} days ago: inside the 30-day limit`}</StatusChip>
                  <span className="flex-1" />
                  <button className="btn btn-danger" onClick={() => close(d.id, "rejected")}><X className="h-4 w-4" /> Reject</button>
                  <button className="btn btn-primary" onClick={() => close(d.id, "approved")}><Check className="h-4 w-4" /> Approve and schedule</button>
                </div>
              </article>
            );
          })}
        </div>
      )}
    </>
  );
}
