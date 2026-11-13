"use client";

import { Cake, CheckCheck, Clock, Target, Upload, UserPlus, Users } from "lucide-react";
import Link from "next/link";
import { useMemo } from "react";
import { Avatar, Card, ChannelChip, ChannelIcon, ConfidenceChip, Empty, PageHeader, StatTile, StatusChip } from "@/components/ui";
import { WeeklyChart } from "@/components/weekly-chart";
import { addDays, age, daysAgo, daysToBirthday, longToday, relative, toIso } from "@/lib/dates";
import { allOpportunities, allowedChannels, birthdaysDue, canMarket, fullName, initials, lastContact, suggestions } from "@/lib/rules";
import { useStore } from "@/lib/store";
import { CHANNELS, type Channel } from "@/lib/types";

export default function Dashboard() {
  const { db } = useStore();
  const v = useMemo(() => {
    const byId = new Map(db.customers.map((c) => [c.id, c]));
    const birthdays = db.customers.map((c) => ({ c, in: daysToBirthday(c.dob) })).filter((x): x is { c: typeof x.c; in: number } => x.in !== null && x.in <= 30).sort((a, b) => a.in - b.in);
    const opps = allOpportunities(db).filter((o) => o.status === "open");
    const strong = opps.filter((o) => o.confidence === "high");
    const quiet = db.customers.filter((c) => { const d = daysAgo(lastContact(db, c.id)); return d === null || d > 365; }).length;
    const replies = db.events.filter((e) => e.kind === "reply" && !e.handled).sort((a, b) => b.ts - a.ts);
    // Twelve weekly buckets ending this week.
    const start = addDays(new Date(), -83);
    const weeks = Array.from({ length: 12 }, (_, i) => ({ week: toIso(addDays(start, i * 7)), sent: 0 }));
    const stats: Record<Channel, { sent: number; replied: number }> = { email: { sent: 0, replied: 0 }, whatsapp: { sent: 0, replied: 0 }, sms: { sent: 0, replied: 0 } };
    for (const e of db.events) {
      const d = daysAgo(e.date);
      if (d === null || d > 83 || !e.channel) continue;
      if (e.kind === "sent") { weeks[Math.min(11, Math.floor((83 - d) / 7))].sent++; stats[e.channel].sent++; }
      if (e.kind === "reply") stats[e.channel].replied++;
    }
    return { byId, birthdays, opps, strong, quiet, replies, weeks, stats, due: birthdaysDue(db).length, pending: suggestions(db).list.length };
  }, [db]);

  if (db.customers.length === 0) {
    return (
      <>
        <PageHeader title="Dashboard" subtitle={longToday()} />
        <div className="card p-8 text-center">
          <Users className="mx-auto h-10 w-10 text-primary" aria-hidden />
          <h2 className="mt-4 text-xl font-bold text-white">Your workspace is ready</h2>
          <p className="mx-auto mt-2 max-w-md text-sm text-ink-2">Import your customer list from Excel or CSV. Each row becomes a profile, and the system starts finding birthdays, opportunities and messages to send.</p>
          <div className="mt-6 flex flex-wrap justify-center gap-3">
            <Link href="/import/" className="btn btn-primary"><Upload className="h-4 w-4" /> Import customers</Link>
            <Link href="/customers/?new=1" className="btn"><UserPlus className="h-4 w-4" /> Add one by hand</Link>
          </div>
        </div>
      </>
    );
  }

  const sentTotal = CHANNELS.reduce((s, ch) => s + v.stats[ch].sent, 0);
  return (
    <>
      <PageHeader title="Dashboard" subtitle={longToday()}>
        {v.due > 0 && <Link href="/queue/?c=birthday" className="btn btn-accent"><Cake className="h-4 w-4" /> Send {v.due} birthday {v.due === 1 ? "greeting" : "greetings"}</Link>}
        {v.pending > 0 && <Link href="/approvals/" className="btn btn-primary"><CheckCheck className="h-4 w-4" /> Review {v.pending} {v.pending === 1 ? "message" : "messages"}</Link>}
      </PageHeader>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-5">
        <StatTile label="Customers" value={db.customers.length} note={`${db.customers.filter(canMarket).length} agreed to offers`} icon={<Users className="h-5 w-5" />} />
        <StatTile label="Open opportunities" value={v.opps.length} note={`${v.strong.length} strong fits`} icon={<Target className="h-5 w-5" />} />
        <StatTile label="Awaiting approval" value={v.pending} note="drafted messages" icon={<CheckCheck className="h-5 w-5" />} />
        <StatTile label="Birthdays, next 30 days" value={v.birthdays.length} note={`${v.birthdays.filter((b) => b.in <= 7).length} this week`} icon={<Cake className="h-5 w-5" />} />
        <StatTile label="No contact for a year" value={v.quiet} note="none recorded here" icon={<Clock className="h-5 w-5" />} />
      </div>

      <div className="mt-4 grid grid-cols-1 gap-4 lg:grid-cols-3">
        <Card title="Messages sent per week" className="lg:col-span-2" action={<span className="text-xs text-mute">{sentTotal} in 12 weeks</span>}>
          <WeeklyChart data={v.weeks} />
        </Card>

        <Card title="Upcoming birthdays" action={<span className="text-xs text-mute">next 30 days</span>}>
          {v.birthdays.length === 0 ? <Empty>No birthdays in the next 30 days.</Empty> : (
            <ul className="mt-2 max-h-64 overflow-y-auto px-2 pb-3">
              {v.birthdays.map(({ c, in: d }) => {
                const ch = allowedChannels(c)[0];
                const a = age(c.dob);
                return (
                  <li key={c.id}>
                    <Link href={`/customers/view/?id=${c.id}`} className="flex items-center gap-3 rounded-md px-3 py-2 hover:bg-white/5">
                      <Avatar text={initials(c)} />
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-sm font-medium text-white">{fullName(c)}</span>
                        <span className="block text-xs text-mute">{d === 0 ? "Today" : d === 1 ? "Tomorrow" : `In ${d} days`}{a !== null ? ` · turns ${d === 0 ? a : a + 1}` : ""}</span>
                      </span>
                      {ch ? <StatusChip tone="good"><ChannelIcon channel={ch} className="h-3 w-3" /> Can greet</StatusChip> : <StatusChip tone="mute">No consent</StatusChip>}
                    </Link>
                  </li>
                );
              })}
            </ul>
          )}
        </Card>
      </div>

      <div className="mt-4 grid grid-cols-1 gap-4 lg:grid-cols-3">
        <Card title="Strongest opportunities" className="lg:col-span-2" action={<Link href="/opportunities/" className="text-xs text-primary hover:underline">All opportunities</Link>}>
          {v.strong.length === 0 ? <Empty>No strong opportunities right now.</Empty> : (
            <ul className="mt-2 px-2 pb-3">
              {v.strong.slice(0, 7).map((o) => {
                const c = v.byId.get(o.customerId)!;
                return (
                  <li key={o.key}>
                    <Link href={`/customers/view/?id=${c.id}`} className="flex flex-wrap items-center gap-x-3 gap-y-1 rounded-md px-3 py-2 hover:bg-white/5">
                      <Avatar text={initials(c)} />
                      <span className="min-w-0 flex-1 basis-48">
                        <span className="block text-sm font-medium text-white">{fullName(c)} · {o.product}</span>
                        <span className="block text-xs text-mute">{o.reason}</span>
                      </span>
                      <ConfidenceChip level={o.confidence} />
                      {!canMarket(c) && <StatusChip tone="mute">Raise in person</StatusChip>}
                    </Link>
                  </li>
                );
              })}
            </ul>
          )}
        </Card>

        <Card title="New replies" action={<Link href="/inbox/" className="text-xs text-primary hover:underline">Open inbox</Link>}>
          {v.replies.length === 0 ? <Empty>No unanswered replies.</Empty> : (
            <ul className="mt-2 px-2 pb-3">
              {v.replies.slice(0, 5).map((x) => {
                const c = v.byId.get(x.customerId);
                if (!c) return null;
                return (
                  <li key={x.id}>
                    <Link href="/inbox/" className="block rounded-md px-3 py-2 hover:bg-white/5">
                      <span className="flex items-center justify-between gap-2">
                        <span className="truncate text-sm font-medium text-white">{fullName(c)}</span>
                        <span className="shrink-0 text-xs text-mute">{relative(x.date)}</span>
                      </span>
                      <span className="mt-0.5 line-clamp-2 text-xs text-ink-2">{x.text}</span>
                      {x.interest && <span className="mt-1.5 inline-block"><StatusChip tone="info">Interested: {x.interest}</StatusChip></span>}
                    </Link>
                  </li>
                );
              })}
            </ul>
          )}
        </Card>
      </div>

      <Card title="Channel performance" className="mt-4" action={<span className="text-xs text-mute">last 12 weeks</span>}>
        <div className="mt-2 overflow-x-auto pb-2">
          <table className="w-full">
            <thead><tr><th className="th">Channel</th><th className="th text-right">Sent</th><th className="th text-right">Replies logged</th><th className="th text-right">Reply rate</th></tr></thead>
            <tbody>
              {CHANNELS.map((ch) => (
                <tr key={ch}>
                  <td className="td"><ChannelChip channel={ch} /></td>
                  <td className="td text-right tabular-nums">{v.stats[ch].sent}</td>
                  <td className="td text-right tabular-nums">{v.stats[ch].replied}</td>
                  <td className="td text-right tabular-nums">{v.stats[ch].sent ? `${Math.round((v.stats[ch].replied / v.stats[ch].sent) * 100)}%` : "–"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    </>
  );
}
