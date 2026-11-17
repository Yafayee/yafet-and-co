"use client";

import { ArrowLeft, Printer } from "lucide-react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import type { ReactNode } from "react";
import { age, daysUntil, eur, fmtDate, todayIso } from "@/lib/dates";
import { assess, eventsOf, fullName, lifeStage, missingFacts } from "@/lib/rules";
import { useStore } from "@/lib/store";
import { CHANNELS, CHANNEL_LABEL, INCOME_LABEL } from "@/lib/types";

const PRIORITY = { high: "Strong fit", medium: "Possible fit", low: "Low priority" };

function Block({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="mt-4 break-inside-avoid">
      <h2 className="border-b border-slate-300 pb-1 text-[13px] font-bold uppercase tracking-wide text-slate-600">{title}</h2>
      <div className="mt-2 text-[13px] leading-snug">{children}</div>
    </section>
  );
}
const Fact = ({ label, children }: { label: string; children: ReactNode }) => (
  <div className="flex gap-2"><dt className="w-32 shrink-0 text-slate-500">{label}</dt><dd className="min-w-0 flex-1 break-words">{children}</dd></div>
);

/** A one-page, light-coloured customer summary to print or save as PDF before a meeting. */
export function Summary() {
  const { db, update } = useStore();
  const id = useSearchParams().get("id") ?? "";
  const c = db.customers.find((x) => x.id === id);
  if (!c) return <main className="p-8 text-center text-ink-2">This customer profile does not exist. <Link href="/customers/" className="text-primary underline">Back to customers</Link></main>;

  const check = assess(db, c);
  const offers = check.filter((a) => a.status === "offer");
  const questions = missingFacts(c);
  const tasks = db.tasks.filter((t) => t.customerId === c.id && !t.done);
  const history = eventsOf(db, c.id).filter((e) => e.kind !== "system").slice(0, 4);
  const years = age(c.dob);
  const total = c.policies.reduce((s, p) => s + p.premium, 0);
  const consent = CHANNELS.filter((ch) => c.consent[ch]).map((ch) => CHANNEL_LABEL[ch]);
  const print = () => { update(() => {}, `Printed summary of ${fullName(c)} (${c.id})`); setTimeout(() => window.print(), 50); };

  return (
    <main className="min-h-screen px-4 py-6 print:p-0">
      <div className="mx-auto mb-4 flex max-w-[800px] flex-wrap items-center justify-between gap-3 print:hidden">
        <Link href={`/customers/view/?id=${c.id}`} className="inline-flex items-center gap-1 text-sm text-primary hover:underline"><ArrowLeft className="h-4 w-4" /> Back to the profile</Link>
        <button className="btn btn-primary" onClick={print}><Printer className="h-4 w-4" /> Print or save as PDF</button>
      </div>
      <p className="mx-auto mb-4 max-w-[800px] rounded-md border border-warn/30 bg-warn/5 px-3 py-2 text-xs text-warn print:hidden">A printed page or saved PDF is not encrypted. Keep it with you and destroy it after the meeting.</p>

      <article className="mx-auto max-w-[800px] rounded-lg bg-white p-8 text-slate-900 shadow-xl print:max-w-none print:rounded-none print:p-0 print:shadow-none">
        <header className="flex flex-wrap items-end justify-between gap-2 border-b-2 border-slate-800 pb-3">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-widest text-slate-500">CP Consulting · Customer summary</p>
            <h1 className="mt-1 font-[family-name:var(--font-display)] text-2xl font-bold text-slate-900">{fullName(c)}</h1>
          </div>
          <p className="text-[12px] text-slate-500">{fmtDate(todayIso())} · confidential</p>
        </header>

        <div className="grid gap-x-8 sm:grid-cols-2 print:grid-cols-2">
          <Block title="Contact">
            <dl className="space-y-0.5">
              <Fact label="Email">{c.email || "Not known"}</Fact>
              <Fact label="Phone">{c.phone || "Not known"}</Fact>
              <Fact label="Address">{[c.street, [c.postcode, c.city].filter(Boolean).join(" ")].filter(Boolean).join(", ") || "Not known"}</Fact>
              <Fact label="May contact by">{consent.join(", ") || "No channel agreed"}</Fact>
              <Fact label="Product offers">{c.consent.marketing ? "Agreed" : "Not agreed: raise in person only"}</Fact>
            </dl>
          </Block>
          <Block title="Situation">
            <dl className="space-y-0.5">
              <Fact label="Born">{c.dob ? `${fmtDate(c.dob)} (age ${years})` : "Not known"}</Fact>
              <Fact label="Life stage">{lifeStage(c)}</Fact>
              <Fact label="Marital status">{{ single: "Single", partner: "Lives with a partner", married: "Married", unknown: "Not known" }[c.marital]}</Fact>
              <Fact label="Children">{c.kids.length ? `${c.kids.length} (aged ${c.kids.map((y) => new Date().getFullYear() - y).sort((a, b) => a - b).join(", ")})` : c.children === "yes" ? "Yes, ages not known" : c.children === "no" ? "No" : "Not known"}</Fact>
              <Fact label="Work">{{ employed: "Employed", self: "Self-employed", student: "Student or apprentice", retired: "Retired", unknown: "Not known" }[c.employment]}{c.occupation ? ` (${c.occupation})` : ""}</Fact>
              <Fact label="Net income">{INCOME_LABEL[c.income]}</Fact>
              <Fact label="Home">{{ rent: "Rents", owner: "Owns, no home loan", mortgage: "Owns, with a home loan", unknown: "Not known" }[c.housing]}</Fact>
              <Fact label="Car">{c.ownsCar === "yes" ? "Owns a car" : c.ownsCar === "no" ? "No car" : "Not known"}</Fact>
            </dl>
          </Block>
        </div>

        <Block title={`Policies with us${total ? ` · ${eur(total)} per month` : ""}`}>
          {c.policies.length === 0 ? <p className="text-slate-500">None recorded.</p> : (
            <table className="w-full border-collapse">
              <thead><tr className="text-left text-slate-500"><th className="py-1 pr-3 font-medium">Product</th><th className="py-1 pr-3 font-medium">Number</th><th className="py-1 pr-3 font-medium">Since</th><th className="py-1 pr-3 font-medium">Ends or renews</th><th className="py-1 text-right font-medium">Premium / month</th></tr></thead>
              <tbody>
                {c.policies.map((p) => { const d = p.until ? daysUntil(p.until) : null; return (
                  <tr key={p.id} className="border-t border-slate-200">
                    <td className="py-1 pr-3 font-medium">{p.product}</td><td className="py-1 pr-3">{p.number || "–"}</td><td className="py-1 pr-3">{p.since ? fmtDate(p.since) : "–"}</td>
                    <td className="py-1 pr-3">{p.until ? fmtDate(p.until) : "–"}{d !== null && d < 0 ? " (ended)" : d !== null && d <= 90 ? ` (in ${d} days)` : ""}</td>
                    <td className="py-1 text-right">{p.premium ? eur(p.premium) : "–"}</td>
                  </tr>
                ); })}
              </tbody>
            </table>
          )}
        </Block>

        <Block title="What to offer">
          {offers.length === 0 ? <p className="text-slate-500">Nothing to offer from the current rules.</p> : (
            <ol className="space-y-1.5">
              {offers.slice(0, 5).map((a, i) => (
                <li key={a.product} className="flex gap-2">
                  <span className="w-5 shrink-0 font-bold text-slate-500">{i + 1}.</span>
                  <span><span className="font-semibold">{a.product}</span> <span className="text-slate-500">({PRIORITY[a.confidence ?? "low"]})</span><span className="block text-slate-700">{a.reason}</span></span>
                </li>
              ))}
            </ol>
          )}
          {offers.length > 5 && <p className="mt-1 text-slate-500">And {offers.length - 5} more with lower priority: {offers.slice(5).map((a) => a.product).join(", ")}.</p>}
        </Block>

        <div className="grid gap-x-8 sm:grid-cols-2 print:grid-cols-2">
          <Block title="Questions to ask">
            {questions.length === 0 ? <p className="text-slate-500">The profile is complete.</p> : <ul className="list-disc space-y-0.5 pl-4">{questions.map((q) => <li key={q}>{q}</li>)}</ul>}
          </Block>
          <Block title="Open tasks">
            {tasks.length === 0 ? <p className="text-slate-500">None.</p> : <ul className="list-disc space-y-0.5 pl-4">{tasks.map((t) => <li key={t.id}>{t.title} <span className="text-slate-500">(due {fmtDate(t.due)})</span></li>)}</ul>}
          </Block>
        </div>

        <Block title="Recent contact">
          {history.length === 0 ? <p className="text-slate-500">No contact recorded.</p> : <ul className="space-y-0.5">{history.map((e) => <li key={e.id}><span className="text-slate-500">{fmtDate(e.date)}:</span> {e.text}</li>)}</ul>}
        </Block>

        {c.notes && <Block title="Notes"><p className="whitespace-pre-line">{c.notes}</p></Block>}

        <Block title="Notes from this meeting"><div className="h-14 rounded border border-dashed border-slate-300" /></Block>

        <p className="mt-3 border-t border-slate-200 pt-2 text-[10px] leading-tight text-slate-500">The suggestions follow general rules and are a starting point for the conversation, not advice. Figures and terms come only from the official product documents.</p>
      </article>
    </main>
  );
}
