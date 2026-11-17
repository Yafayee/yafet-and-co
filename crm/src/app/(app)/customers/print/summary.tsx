"use client";

import { ArrowLeft, Printer } from "lucide-react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import type { ReactNode } from "react";
import { age, daysUntil, eur, fmtDate, todayIso } from "@/lib/dates";
import { assess, eventsOf, fullName, lifeStage, missingFacts } from "@/lib/rules";
import { useStore } from "@/lib/store";
import { CHANNELS, CHANNEL_LABEL, INCOME_LABEL } from "@/lib/types";
import { t } from "@/lib/i18n";

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
  if (!c) return <main className="p-8 text-center text-ink-2">{t("This customer profile does not exist.")} <Link href="/customers/" className="text-primary underline">{t("Back to customers")}</Link></main>;

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
        <Link href={`/customers/view/?id=${c.id}`} className="inline-flex items-center gap-1 text-sm text-primary hover:underline"><ArrowLeft className="h-4 w-4" /> {t("Back to the profile")}</Link>
        <button className="btn btn-primary" onClick={print}><Printer className="h-4 w-4" /> {t("Print or save as PDF")}</button>
      </div>
      <p className="mx-auto mb-4 max-w-[800px] rounded-md border border-warn/30 bg-warn/5 px-3 py-2 text-xs text-warn print:hidden">{t("A printed page or saved PDF is not encrypted. Keep it with you and destroy it after the meeting.")}</p>

      <article className="mx-auto max-w-[800px] rounded-lg bg-white p-8 text-slate-900 shadow-xl print:max-w-none print:rounded-none print:p-0 print:shadow-none">
        <header className="flex flex-wrap items-end justify-between gap-2 border-b-2 border-slate-800 pb-3">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-widest text-slate-500">{t("CP Consulting · Customer summary")}</p>
            <h1 className="mt-1 font-[family-name:var(--font-display)] text-2xl font-bold text-slate-900">{fullName(c)}</h1>
          </div>
          <p className="text-[12px] text-slate-500">{fmtDate(todayIso())} · confidential</p>
        </header>

        <div className="grid gap-x-8 sm:grid-cols-2 print:grid-cols-2">
          <Block title={t("Contact")}>
            <dl className="space-y-0.5">
              <Fact label={t("Email")}>{c.email || "Not known"}</Fact>
              <Fact label={t("Phone")}>{c.phone || "Not known"}</Fact>
              <Fact label={t("Address")}>{[c.street, [c.postcode, c.city].filter(Boolean).join(" ")].filter(Boolean).join(", ") || "Not known"}</Fact>
              <Fact label={t("May contact by")}>{consent.join(", ") || "No channel agreed"}</Fact>
              <Fact label={t("Product offers")}>{c.consent.marketing ? t("Agreed") : t("Not agreed: raise in person only")}</Fact>
            </dl>
          </Block>
          <Block title={t("Situation")}>
            <dl className="space-y-0.5">
              <Fact label={t("Born")}>{c.dob ? `${fmtDate(c.dob)} (age ${years})` : t("Not known")}</Fact>
              <Fact label={t("Life stage")}>{lifeStage(c)}</Fact>
              <Fact label={t("Marital status")}>{{ single: t("Single"), partner: t("Lives with a partner"), married: t("Married"), unknown: t("Not known") }[c.marital]}</Fact>
              <Fact label={t("Children")}>{c.kids.length ? `${c.kids.length} (aged ${c.kids.map((y) => new Date().getFullYear() - y).sort((a, b) => a - b).join(", ")})` : c.children === "yes" ? t("Yes, ages not known") : c.children === "no" ? "No" : t("Not known")}</Fact>
              <Fact label={t("Work")}>{{ employed: t("Employed"), self: t("Self-employed"), student: t("Student or apprentice"), retired: t("Retired"), unknown: t("Not known") }[c.employment]}{c.occupation ? ` (${c.occupation})` : ""}</Fact>
              <Fact label={t("Net income")}>{t(INCOME_LABEL[c.income])}</Fact>
              <Fact label={t("Home")}>{{ rent: t("Rents"), owner: t("Owns, no home loan"), mortgage: t("Owns, with a home loan"), unknown: t("Not known") }[c.housing]}</Fact>
              <Fact label={t("Car")}>{c.ownsCar === "yes" ? t("Owns a car") : c.ownsCar === "no" ? t("No car") : t("Not known")}</Fact>
            </dl>
          </Block>
        </div>

        <Block title={`Policies with us${total ? ` · ${eur(total)} per month` : ""}`}>
          {c.policies.length === 0 ? <p className="text-slate-500">{t("None recorded.")}</p> : (
            <table className="w-full border-collapse">
              <thead><tr className="text-left text-slate-500"><th className="py-1 pr-3 font-medium">{t("Product")}</th><th className="py-1 pr-3 font-medium">{t("Number")}</th><th className="py-1 pr-3 font-medium">{t("Since")}</th><th className="py-1 pr-3 font-medium">{t("Ends or renews")}</th><th className="py-1 text-right font-medium">{t("Premium / month")}</th></tr></thead>
              <tbody>
                {c.policies.map((p) => { const d = p.until ? daysUntil(p.until) : null; return (
                  <tr key={p.id} className="border-t border-slate-200">
                    <td className="py-1 pr-3 font-medium">{t(p.product)}</td><td className="py-1 pr-3">{p.number || "–"}</td><td className="py-1 pr-3">{p.since ? fmtDate(p.since) : "–"}</td>
                    <td className="py-1 pr-3">{p.until ? fmtDate(p.until) : "–"}{d !== null && d < 0 ? " (ended)" : d !== null && d <= 90 ? ` (in ${d} days)` : ""}</td>
                    <td className="py-1 text-right">{p.premium ? eur(p.premium) : "–"}</td>
                  </tr>
                ); })}
              </tbody>
            </table>
          )}
        </Block>

        <Block title={t("What to offer")}>
          {offers.length === 0 ? <p className="text-slate-500">{t("Nothing to offer from the current rules.")}</p> : (
            <ol className="space-y-1.5">
              {offers.slice(0, 5).map((a, i) => (
                <li key={a.product} className="flex gap-2">
                  <span className="w-5 shrink-0 font-bold text-slate-500">{i + 1}.</span>
                  <span><span className="font-semibold">{t(a.product)}</span> <span className="text-slate-500">({t(PRIORITY[a.confidence ?? "low"])})</span><span className="block text-slate-700">{t(a.reason)}</span></span>
                </li>
              ))}
            </ol>
          )}
          {offers.length > 5 && <p className="mt-1 text-slate-500">And {offers.length - 5} more with lower priority: {offers.slice(5).map((a) => a.product).join(", ")}.</p>}
        </Block>

        <div className="grid gap-x-8 sm:grid-cols-2 print:grid-cols-2">
          <Block title={t("Questions to ask")}>
            {questions.length === 0 ? <p className="text-slate-500">{t("The profile is complete.")}</p> : <ul className="list-disc space-y-0.5 pl-4">{questions.map((q) => <li key={q}>{t(q)}</li>)}</ul>}
          </Block>
          <Block title={t("Open tasks")}>
            {tasks.length === 0 ? <p className="text-slate-500">{t("None.")}</p> : <ul className="list-disc space-y-0.5 pl-4">{tasks.map((t) => <li key={t.id}>{t.title} <span className="text-slate-500">(due {fmtDate(t.due)})</span></li>)}</ul>}
          </Block>
        </div>

        <Block title={t("Recent contact")}>
          {history.length === 0 ? <p className="text-slate-500">{t("No contact recorded.")}</p> : <ul className="space-y-0.5">{history.map((e) => <li key={e.id}><span className="text-slate-500">{fmtDate(e.date)}:</span> {e.text}</li>)}</ul>}
        </Block>

        {c.notes && <Block title={t("Notes")}><p className="whitespace-pre-line">{c.notes}</p></Block>}

        <Block title={t("Notes from this meeting")}><div className="h-14 rounded border border-dashed border-slate-300" /></Block>

        <p className="mt-3 border-t border-slate-200 pt-2 text-[10px] leading-tight text-slate-500">{t("The suggestions follow general rules and are a starting point for the conversation, not advice. Figures and terms come only from the official product documents.")}</p>
      </article>
    </main>
  );
}
