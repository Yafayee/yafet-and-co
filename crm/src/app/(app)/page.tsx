import { Cake, CheckCheck, MessagesSquare, Target, Users } from "lucide-react";
import Link from "next/link";
import { Avatar, Card, ChannelChip, ChannelIcon, ConfidenceChip, PageHeader, StatTile, StatusChip } from "@/components/ui";
import { WeeklyChart } from "@/components/weekly-chart";
import { channelStats, customerById, customers, drafts, fullName, initials, opportunities, replies, weeklySent } from "@/lib/data";
import { age, daysToBirthday, fmtDayMonth, relative } from "@/lib/dates";
import { CHANNEL_LABEL } from "@/lib/types";

export default function Dashboard() {
  const birthdays = customers
    .map((c) => ({ c, in: daysToBirthday(c.dob) }))
    .filter((x) => x.in <= 30)
    .sort((a, b) => a.in - b.in);
  const sent = channelStats.reduce((s, x) => s + x.sent, 0);
  const replied = channelStats.reduce((s, x) => s + x.replied, 0);
  const top = opportunities.filter((o) => o.confidence === "high").slice(0, 7);
  const openReplies = replies.filter((x) => !x.handled);

  return (
    <>
      <PageHeader title="Dashboard" subtitle="Friday, 13 November 2026">
        <Link href="/approvals" className="btn btn-primary"><CheckCheck className="h-4 w-4" /> Review {drafts.length} messages</Link>
      </PageHeader>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-5">
        <StatTile label="Customers" value={customers.length} note="sample profiles" icon={<Users className="h-5 w-5" />} />
        <StatTile label="Open opportunities" value={opportunities.length} note={`${opportunities.filter((o) => o.confidence === "high").length} strong fits`} icon={<Target className="h-5 w-5" />} />
        <StatTile label="Awaiting approval" value={drafts.length} note="drafted messages" icon={<CheckCheck className="h-5 w-5" />} />
        <StatTile label="Birthdays, next 30 days" value={birthdays.length} note={`${birthdays.filter((b) => b.in <= 7).length} this week`} icon={<Cake className="h-5 w-5" />} />
        <StatTile label="Reply rate" value={`${Math.round((replied / sent) * 100)}%`} note={`${replied} of ${sent} messages`} icon={<MessagesSquare className="h-5 w-5" />} />
      </div>

      <div className="mt-4 grid grid-cols-1 gap-4 lg:grid-cols-3">
        <Card title="Messages sent per week" className="lg:col-span-2">
          <WeeklyChart data={weeklySent} />
        </Card>

        <Card title="Upcoming birthdays" action={<span className="text-xs text-mute">next 30 days</span>}>
          <ul className="mt-2 max-h-64 overflow-y-auto px-2 pb-3">
            {birthdays.map(({ c, in: d }) => {
              const ok = c.consent[c.preferredChannel];
              return (
                <li key={c.id}>
                  <Link href={`/customers/${c.id}`} className="flex items-center gap-3 rounded-md px-3 py-2 hover:bg-white/5">
                    <Avatar text={initials(c)} />
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-sm font-medium text-white">{fullName(c)}</span>
                      <span className="block text-xs text-mute">
                        {d === 0 ? "Today" : d === 1 ? "Tomorrow" : `In ${d} days`} · turns {age(c.dob) + 1}
                      </span>
                    </span>
                    {ok ? <StatusChip tone="good"><ChannelIcon channel={c.preferredChannel} className="h-3 w-3" /> Scheduled</StatusChip> : <StatusChip tone="mute">No consent</StatusChip>}
                  </Link>
                </li>
              );
            })}
          </ul>
        </Card>
      </div>

      <div className="mt-4 grid grid-cols-1 gap-4 lg:grid-cols-3">
        <Card title="Strongest opportunities" className="lg:col-span-2" action={<Link href="/customers?view=opportunities" className="text-xs text-primary hover:underline">All customers</Link>}>
          <ul className="mt-2 px-2 pb-3">
            {top.map((o) => {
              const c = customerById(o.customerId)!;
              return (
                <li key={o.id}>
                  <Link href={`/customers/${c.id}`} className="flex flex-wrap items-center gap-x-3 gap-y-1 rounded-md px-3 py-2 hover:bg-white/5">
                    <Avatar text={initials(c)} />
                    <span className="min-w-0 flex-1 basis-48">
                      <span className="block text-sm font-medium text-white">{fullName(c)} · {o.product}</span>
                      <span className="block text-xs text-mute">{o.reason}</span>
                    </span>
                    <ConfidenceChip level={o.confidence} />
                    {!o.canContact && <StatusChip tone="mute">Raise in person</StatusChip>}
                  </Link>
                </li>
              );
            })}
          </ul>
        </Card>

        <Card title="New replies" action={<Link href="/inbox" className="text-xs text-primary hover:underline">Open inbox</Link>}>
          <ul className="mt-2 px-2 pb-3">
            {openReplies.map((x) => {
              const c = customerById(x.customerId)!;
              return (
                <li key={x.id}>
                  <Link href="/inbox" className="block rounded-md px-3 py-2 hover:bg-white/5">
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
        </Card>
      </div>

      <Card title="Channel performance" className="mt-4" action={<span className="text-xs text-mute">last 12 weeks</span>}>
        <div className="mt-2 overflow-x-auto pb-2">
          <table className="w-full">
            <thead>
              <tr><th className="th">Channel</th><th className="th text-right">Sent</th><th className="th text-right max-sm:hidden">Delivered</th><th className="th text-right">Replied</th><th className="th text-right">Reply rate</th></tr>
            </thead>
            <tbody>
              {channelStats.map((s) => (
                <tr key={s.channel}>
                  <td className="td"><ChannelChip channel={s.channel} /><span className="sr-only">{CHANNEL_LABEL[s.channel]}</span></td>
                  <td className="td text-right tabular-nums">{s.sent}</td>
                  <td className="td text-right tabular-nums max-sm:hidden">{s.delivered}</td>
                  <td className="td text-right tabular-nums">{s.replied}</td>
                  <td className="td text-right tabular-nums">{Math.round((s.replied / s.sent) * 100)}%</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
      <p className="mt-3 text-xs text-mute">Birthdays shown until {fmtDayMonth("2026-12-13")}. Greetings only go to customers who agreed to that channel.</p>
    </>
  );
}
