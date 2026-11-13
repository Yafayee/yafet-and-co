"use client";

import { ArrowLeft, Download } from "lucide-react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useMemo, useState } from "react";
import { Composer } from "@/components/composer";
import { Avatar, Empty, PageHeader } from "@/components/ui";
import { recordSent } from "@/lib/actions";
import { audienceLabel, audienceMembers, bestChannel, birthdaysDue, fullName, initials, templateFor } from "@/lib/rules";
import { download, toCsv } from "@/lib/send";
import { useStore } from "@/lib/store";

export function Queue() {
  const { db, update } = useStore();
  const key = useSearchParams().get("c") ?? "";
  const [show, setShow] = useState(25);
  const [confirm, setConfirm] = useState(false);
  const campaign = db.campaigns.find((k) => k.id === key);
  const isBirthday = key === "birthday";

  const q = useMemo(() => {
    if (isBirthday) return { title: "Birthday greetings", subtitle: "Customers whose birthday is today or was in the last three days.", template: "birthday", purpose: "birthday" as const, channels: undefined, product: undefined, total: 0, pending: birthdaysDue(db), label: "Birthday greeting sent" };
    if (!campaign) return null;
    const purpose = db.settings.templates[campaign.templateKey]?.purpose ?? "holiday";
    const members = audienceMembers(db, campaign.audience, campaign.channels, purpose);
    return { title: campaign.name, subtitle: audienceLabel(campaign.audience), template: campaign.templateKey, purpose, channels: campaign.channels, product: campaign.product, total: members.length, pending: members.filter((c) => !campaign.sentTo.includes(c.id)), label: `${campaign.name} sent` };
  }, [db, campaign, isBirthday]);

  if (!q) return <div className="card p-8 text-center"><p className="text-ink-2">This campaign does not exist.</p><Link href="/campaigns/" className="btn btn-primary mt-4">Back to campaigns</Link></div>;

  const emailPending = q.pending.filter((c) => bestChannel(c, q.channels) === "email");
  const exportMerge = () => {
    const rows = [["First name", "Last name", "Email", "Subject", "Message"], ...emailPending.map((c) => { const t = templateFor(db, q.template, c, q.product); return [c.firstName, c.lastName, c.email, t.subject, t.body]; })];
    download(`${q.title.replace(/[^\w-]+/g, "-")}-email-list.csv`, toCsv(rows), "text/csv");
    update(() => {}, `Exported email list for "${q.title}" (${emailPending.length} recipients)`);
  };
  const markAll = () => {
    update((d) => { for (const c of emailPending) recordSent(d, { customer: c, channel: "email", purpose: q.purpose, label: q.label, body: templateFor(d, q.template, c, q.product).body, product: q.product, campaignId: campaign?.id }); }, `Marked ${emailPending.length} emails as sent for "${q.title}"`);
    setConfirm(false);
  };

  return (
    <>
      <Link href={isBirthday ? "/" : "/campaigns/"} className="mb-4 inline-flex items-center gap-1 text-sm text-primary hover:underline"><ArrowLeft className="h-4 w-4" /> {isBirthday ? "Dashboard" : "All campaigns"}</Link>
      <PageHeader title={q.title} subtitle={`${q.subtitle.replace(/\.$/, "")}. ${q.pending.length} still to send${q.total ? ` of ${q.total}` : ""}.`}>
        {emailPending.length > 1 && <button className="btn" onClick={exportMerge}><Download className="h-4 w-4" /> Email list for mail merge ({emailPending.length})</button>}
      </PageHeader>

      <div className="mb-4 rounded-md border border-line bg-night-2/50 px-3 py-2 text-sm text-ink-2">
        Each Send button opens your own email, WhatsApp or SMS app with the message filled in, and records it in the customer&apos;s history. For many emails at once, download the list and send it with a mail merge.
        {emailPending.length > 1 && (confirm
          ? <span className="mt-2 flex flex-wrap items-center gap-2">Record all {emailPending.length} emails as sent? <button className="btn btn-primary" onClick={markAll}>Yes, they were sent</button><button className="btn" onClick={() => setConfirm(false)}>Cancel</button></span>
          : <button className="ml-1 text-primary hover:underline" onClick={() => setConfirm(true)}>I sent the emails by mail merge.</button>)}
      </div>

      {q.pending.length === 0 ? <div className="card"><Empty>Everyone in this list has been sent their message.</Empty></div> : (
        <div className="space-y-3">
          {q.pending.slice(0, show).map((c) => (
            <article key={c.id} className="card p-4">
              <div className="mb-2 flex items-center gap-3">
                <Avatar text={initials(c)} />
                <Link href={`/customers/view/?id=${c.id}`} className="font-medium text-white hover:underline">{fullName(c)}</Link>
              </div>
              <Composer key={c.id} collapsed customer={c} text={templateFor(db, q.template, c, q.product)} purpose={q.purpose} product={q.product} campaignId={campaign?.id} channels={q.channels} label={q.label} />
            </article>
          ))}
          {q.pending.length > show && <button className="btn w-full" onClick={() => setShow(show + 25)}>Show more ({q.pending.length - show} remaining)</button>}
        </div>
      )}
    </>
  );
}
