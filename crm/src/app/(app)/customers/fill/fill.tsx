"use client";

import { ArrowLeft, Check, Search } from "lucide-react";
import Link from "next/link";
import { useMemo, useState } from "react";
import { Empty, PageHeader, Pager, StatusChip } from "@/components/ui";
import { auditName, logEvent } from "@/lib/actions";
import { todayIso } from "@/lib/dates";
import { fullName, hasProduct, productsOf } from "@/lib/rules";
import { uid } from "@/lib/send";
import { useStore } from "@/lib/store";
import { CHANNEL_LABEL, type Consent, type Customer, type Product } from "@/lib/types";
import { t } from "@/lib/i18n";

const PER_PAGE = 20;
const CONSENTS: (keyof Consent)[] = ["email", "whatsapp", "sms", "marketing"];

/** What is still open on a profile, as short labels. */
function open(c: Customer): string[] {
  const out: string[] = [];
  if (c.policies.length === 0 && c.kind !== "prospect") out.push("Products");
  if (!CONSENTS.some((k) => c.consent[k])) out.push("Consent");
  if (c.ownsCar === "unknown" && !hasProduct(c, "Car")) out.push("Car");
  if (c.housing === "unknown") out.push("Home");
  if (c.children === "unknown") out.push("Children");
  if (c.marital === "unknown") out.push("Marital status");
  if (c.employment === "unknown") out.push("Work");
  return out;
}

/**
 * Completing many profiles quickly: every customer is one block with the
 * products, the agreed channels and the main personal facts as simple
 * switches. Each change is saved at once.
 */
export function FillIn() {
  const { db, update } = useStore();
  const products = productsOf(db);
  const [q, setQ] = useState("");
  const [only, setOnly] = useState(true);
  const [page, setPage] = useState(1);
  // The list is fixed when the screen opens, so a profile does not jump away while it is being completed.
  const [order] = useState(() => [...db.customers].sort((a, b) => open(b).length - open(a).length || a.lastName.localeCompare(b.lastName)).map((c) => ({ id: c.id, incomplete: open(c).length > 0 })));

  const byId = useMemo(() => new Map(db.customers.map((c) => [c.id, c] as const)), [db.customers]);
  const rows = useMemo(() => {
    const needle = q.trim().toLowerCase();
    return order.filter((o) => (!only || o.incomplete)).map((o) => byId.get(o.id)).filter((c): c is Customer => Boolean(c))
      .filter((c) => !needle || `${fullName(c)} ${c.email} ${c.customerNo ?? ""} ${c.city}`.toLowerCase().includes(needle));
  }, [order, only, q, byId]);
  const pages = Math.max(1, Math.ceil(rows.length / PER_PAGE));
  const shown = rows.slice((Math.min(page, pages) - 1) * PER_PAGE, Math.min(page, pages) * PER_PAGE);
  const left = db.customers.filter((c) => open(c).length > 0).length;

  const edit = (id: string, fn: (c: Customer) => void) => update((d) => { const x = d.customers.find((y) => y.id === id); if (x) fn(x); });
  const toggleProduct = (c: Customer, p: Product) => edit(c.id, (x) => {
    const held = x.policies.filter((y) => y.product === p);
    if (held.length === 0) x.policies.push({ id: uid(), product: p, number: "", since: "", premium: 0, until: "" });
    // A policy that already carries a number, premium or end date is only removed on the profile itself.
    else if (held.every((y) => !y.number && !y.premium && !y.until)) x.policies = x.policies.filter((y) => y.product !== p);
  });
  const toggleConsent = (c: Customer, k: keyof Consent) => {
    const label = k === "marketing" ? "product offers" : CHANNEL_LABEL[k];
    update((d) => {
      const x = d.customers.find((y) => y.id === c.id);
      if (!x) return;
      x.consent[k] = !x.consent[k]; x.consentUpdated = todayIso(); x.consentSource = "Changed by hand";
      logEvent(d, { customerId: c.id, kind: "system", text: `Consent for ${label} ${x.consent[k] ? "given" : "withdrawn"}.` });
    }, `Consent for ${label} ${c.consent[k] ? "withdrawn" : "given"}: ${auditName(c)}`);
  };
  const locked = (c: Customer, p: Product) => c.policies.some((y) => y.product === p && (y.number || y.premium || y.until));

  const pick = <K extends "ownsCar" | "housing" | "children" | "marital" | "employment" | "kind">(c: Customer, k: K, label: string, options: [string, string][]) => (
    <label className="block min-w-36 flex-1"><span className="label">{t(label)}</span>
      {/* Recorded birth years mean there are children; that answer is changed on the profile, together with the years. */}
      <select className="input mt-1" disabled={k === "children" && c.kids.length > 0} title={k === "children" && c.kids.length > 0 ? t("Birth years of children are recorded. Change this on the profile.") : undefined} value={k === "children" && c.kids.length > 0 ? "yes" : (c[k] as string | undefined) ?? ""} onChange={(e) => edit(c.id, (x) => { (x as unknown as Record<string, unknown>)[k] = e.target.value || undefined; })}>
        {options.map(([v, l]) => <option key={v} value={v}>{t(l)}</option>)}
      </select>
    </label>
  );

  return (
    <>
      <PageHeader title={t("Complete profiles")} subtitle={t("{n} of {m} profiles still have something open. Every change is saved at once.", { n: left, m: db.customers.length })}>
        <Link href="/customers/" className="btn btn-outline"><ArrowLeft className="h-4 w-4" /> {t("Back to customers")}</Link>
      </PageHeader>

      <div className="mb-4 flex flex-wrap items-center gap-3">
        <div className="relative min-w-56 flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-mute" aria-hidden />
          <input className="input !pl-9" type="search" placeholder={t("Search name, email, customer number")} aria-label={t("Search")} value={q} onChange={(e) => { setQ(e.target.value); setPage(1); }} />
        </div>
        <label className="flex cursor-pointer items-center gap-2 text-sm text-ink-2">
          <input type="checkbox" className="h-4 w-4 accent-[#2b8cee]" checked={only} onChange={(e) => { setOnly(e.target.checked); setPage(1); }} />
          {t("Only profiles with something open")}
        </label>
      </div>

      {shown.length === 0 ? <Empty>{t("Nothing to complete")}. {t("Every profile shown by this filter has its products, consent and personal facts filled in.")}</Empty> : (
        <div className="flex flex-col gap-4">
          {shown.map((c) => {
            const todo = open(c);
            return (
              <section key={c.id} className="card p-4 sm:p-5" data-testid="fill-row">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="min-w-0">
                    <Link href={`/customers/view/?id=${c.id}`} className="font-semibold text-white hover:underline">{fullName(c)}</Link>
                    <span className="ml-2 text-xs text-mute">{[c.customerNo, c.city, c.email].filter(Boolean).join(" · ")}</span>
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    {c.kind === "prospect" && <StatusChip tone="info">{t("Prospect")}</StatusChip>}
                    {todo.length === 0 ? <StatusChip tone="good"><Check className="mr-1 inline h-3 w-3" />{t("Complete")}</StatusChip> : <StatusChip tone="warn">{t("Open: {list}", { list: todo.map((x) => t(x)).join(", ") })}</StatusChip>}
                  </div>
                </div>

                <div className="mt-3">
                  <span className="label">{t("Has these products with us")}</span>
                  <div className="mt-1.5 flex flex-wrap gap-1.5">
                    {products.map((p) => {
                      const on = hasProduct(c, p);
                      return (
                        <button key={p} type="button" aria-pressed={on} disabled={on && locked(c, p)} title={on && locked(c, p) ? t("This policy has details. Remove it on the profile.") : undefined} onClick={() => toggleProduct(c, p)}
                          className={`rounded-full border px-2.5 py-1 text-xs font-medium transition-colors ${on ? "border-primary bg-primary/20 text-white" : "border-line text-ink-2 hover:border-primary/60 hover:text-white"} disabled:cursor-not-allowed`}>
                          {on && <Check className="mr-1 inline h-3 w-3" aria-hidden />}{t(p)}
                        </button>
                      );
                    })}
                  </div>
                </div>

                <div className="mt-3">
                  <span className="label">{t("Agreed to be contacted by")}</span>
                  <div className="mt-1.5 flex flex-wrap gap-1.5">
                    {CONSENTS.map((k) => (
                      <button key={k} type="button" aria-pressed={c.consent[k]} onClick={() => toggleConsent(c, k)}
                        className={`rounded-full border px-2.5 py-1 text-xs font-medium transition-colors ${c.consent[k] ? "border-good/70 bg-good/15 text-white" : "border-line text-ink-2 hover:border-good/60 hover:text-white"}`}>
                        {c.consent[k] && <Check className="mr-1 inline h-3 w-3" aria-hidden />}{k === "marketing" ? t("Product offers (marketing)") : t(CHANNEL_LABEL[k])}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="mt-3 flex flex-wrap gap-3">
                  {pick(c, "kind", "Customer or prospect", [["", "Not known"], ["customer", "Customer"], ["prospect", "Prospect (no contract yet)"]])}
                  {pick(c, "ownsCar", "Owns a car", [["unknown", "Not known"], ["yes", "Yes"], ["no", "No"]])}
                  {pick(c, "housing", "Home", [["unknown", "Not known"], ["rent", "Rents"], ["owner", "Owns, no home loan"], ["mortgage", "Owns, with a home loan"]])}
                  {pick(c, "children", "Children", [["unknown", "Not known"], ["yes", "Yes"], ["no", "No"]])}
                  {pick(c, "marital", "Marital status", [["unknown", "Not known"], ["single", "Single"], ["partner", "Lives with a partner"], ["married", "Married"]])}
                  {pick(c, "employment", "Work", [["unknown", "Not known"], ["employed", "Employed"], ["self", "Self-employed"], ["student", "Student or apprentice"], ["retired", "Retired"]])}
                </div>
              </section>
            );
          })}
          <Pager page={Math.min(page, pages)} pages={pages} onPage={setPage} />
        </div>
      )}
    </>
  );
}
