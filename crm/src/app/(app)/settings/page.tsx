"use client";

import { useState } from "react";
import { Card, PageHeader, StatusChip, Toggle } from "@/components/ui";
import { auditLog } from "@/lib/data";

const ROLES = [
  { role: "Administrator", can: "Everything, including users, exports and deletion" },
  { role: "Representative", can: "Own customers, approvals, campaigns" },
  { role: "Assistant", can: "View and edit profiles; cannot export, delete or approve" },
];

export default function SettingsPage() {
  const [cap, setCap] = useState(30);
  const [from, setFrom] = useState("09:00");
  const [to, setTo] = useState("18:00");
  const [s, setS] = useState({ birthday: true, holiday: true, followUp: true, approval: true, weekend: false });
  const flip = (k: keyof typeof s) => setS((v) => ({ ...v, [k]: !v[k] }));

  return (
    <>
      <PageHeader title="Settings" subtitle="Sending rules, access and the activity record." />
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <Card title="Sending rules">
          <div className="space-y-4 px-5 pb-5 pt-3">
            <label className="block">
              <span className="label">Minimum days between product messages to one customer</span>
              <input type="number" min={7} max={365} className="input mt-1 max-w-32" value={cap} onChange={(e) => setCap(Number(e.target.value))} />
            </label>
            <div>
              <span className="label">Send only between</span>
              <div className="mt-1 flex items-center gap-2">
                <input type="time" aria-label="From" className="input max-w-32" value={from} onChange={(e) => setFrom(e.target.value)} />
                <span className="text-mute">and</span>
                <input type="time" aria-label="To" className="input max-w-32" value={to} onChange={(e) => setTo(e.target.value)} />
              </div>
            </div>
            <Toggle checked={s.weekend} onChange={() => flip("weekend")} label="Send product messages at weekends" />
          </div>
        </Card>

        <Card title="Automation">
          <div className="space-y-4 px-5 pb-5 pt-3">
            <Toggle checked={s.birthday} onChange={() => flip("birthday")} label="Birthday greetings" />
            <Toggle checked={s.holiday} onChange={() => flip("holiday")} label="Holiday greetings (Christmas, Easter, New Year)" />
            <Toggle checked={s.followUp} onChange={() => flip("followUp")} label="Draft a follow-up one week after a birthday greeting" />
            <Toggle checked={s.approval} onChange={() => flip("approval")} label="Product messages need my approval" />
            <p className="text-xs text-mute">Opt-outs always apply at once and cannot be switched off.</p>
          </div>
        </Card>

        <Card title="Roles and access">
          <div className="mt-2 overflow-x-auto pb-2">
            <table className="w-full min-w-[420px]">
              <thead><tr><th className="th">Role</th><th className="th">Can do</th></tr></thead>
              <tbody>{ROLES.map((r) => <tr key={r.role}><td className="td font-medium text-white">{r.role}</td><td className="td text-ink-2">{r.can}</td></tr>)}</tbody>
            </table>
          </div>
          <div className="flex flex-wrap gap-2 px-5 pb-5 pt-1">
            <StatusChip tone="good">Two-factor sign-in required</StatusChip>
            <StatusChip tone="good">Data stored in the EU</StatusChip>
          </div>
        </Card>

        <Card title="Activity record" action={<span className="text-xs text-mute">most recent</span>}>
          <ul className="px-5 pb-5 pt-3">
            {auditLog.map((a, i) => (
              <li key={i} className="flex flex-wrap gap-x-3 border-t border-line/50 py-2 text-sm first:border-t-0">
                <span className="w-36 shrink-0 text-xs tabular-nums text-mute">{a.time}</span>
                <span className="min-w-0 flex-1 basis-48 text-ink-2"><span className="text-white">{a.user}</span> · {a.action}</span>
              </li>
            ))}
          </ul>
        </Card>
      </div>
    </>
  );
}
