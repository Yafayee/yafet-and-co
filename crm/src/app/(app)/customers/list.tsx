"use client";

import { Search, Upload, UserPlus } from "lucide-react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useMemo, useState } from "react";
import { blankCustomer, CustomerForm } from "@/components/customer-form";
import { Avatar, ChannelIcon, ConfidenceChip, Empty, PageHeader, Pager } from "@/components/ui";
import { logEvent } from "@/lib/actions";
import { daysAgo, daysToBirthday, daysUntil, fmtDayMonth, relative } from "@/lib/dates";
import { coverage, fullName, hasProduct, initials, lifeStage, opportunitiesFor, productsOf } from "@/lib/rules";
import { useStore } from "@/lib/store";
import { CHANNELS, CHANNEL_LABEL, type Product } from "@/lib/types";
import { t } from "@/lib/i18n";

const PER_PAGE = 50;
const STAGES = ["Starting out", "Building", "Pre-retirement", "Retired", "Age not known"];

export function CustomerList() {
  const { db, update } = useStore();
  const products = productsOf(db);
  const params = useSearchParams();
  const router = useRouter();
  const [q, setQ] = useState("");
  const [product, setProduct] = useState("");
  const [missing, setMissing] = useState("");
  const [consent, setConsent] = useState("");
  const [stage, setStage] = useState("");
  const [extra, setExtra] = useState(params.get("view") === "renewals" ? "renewals" : params.get("view") === "opportunities" ? "opp" : "");
  const [page, setPage] = useState(1);
  const [sort, setSort] = useState("name");
  const [adding, setAdding] = useState(params.get("new") === "1");

  const all = useMemo(() => {
    const last = new Map<string, string>();
    for (const e of db.events) if (e.kind !== "system" && e.date > (last.get(e.customerId) ?? "")) last.set(e.customerId, e.date);
    return db.customers
      .map((c) => ({ c, opp: opportunitiesFor(db, c).find((o) => o.status === "open"), last: last.get(c.id) ?? "", text: `${fullName(c)} ${c.email} ${c.phone} ${c.city} ${c.postcode} ${c.interests.join(" ")} ${c.policies.map((p) => p.number).join(" ")}`.toLowerCase() }))
      .sort((a, b) => a.c.lastName.localeCompare(b.c.lastName) || a.c.firstName.localeCompare(b.c.firstName));
  }, [db]);

  const rows = useMemo(() => {
    const needle = q.trim().toLowerCase();
    return all.filter(({ c, opp, last, text }) => {
      if (needle && !text.includes(needle)) return false;
      if (product && !hasProduct(c, product as Product)) return false;
      if (missing && hasProduct(c, missing as Product)) return false;
      if (consent === "marketing" && !c.consent.marketing) return false;
      if (consent === "none" && c.consent.marketing) return false;
      if (stage && lifeStage(c) !== stage) return false;
      if (extra === "opp" && !opp) return false;
      if (extra === "quiet") { const d = daysAgo(last); if (d !== null && d <= 365) return false; }
      if (extra === "nocontact" && (c.email || c.phone)) return false;
      if (extra === "renewals" && !c.policies.some((x) => { const d = x.until ? daysUntil(x.until) : null; return d !== null && d <= 90 && d >= -60; })) return false;
      return true;
    });
  }, [all, q, product, missing, consent, stage, extra]);

  const sorted = useMemo(() => {
    if (sort === "name") return rows;
    const far = 99999;
    const key = (r: (typeof rows)[number]) =>
      sort === "birthday" ? daysToBirthday(r.c.dob) ?? far
      : sort === "contact" ? -(daysAgo(r.last) ?? far) // longest without contact first
      : sort === "cover" ? coverage(db, r.c).pct
      : r.c.policies.length ? Math.min(...r.c.policies.map((p) => { const d = p.until ? daysUntil(p.until) : null; return d === null || d < -60 ? far : d; })) : far;
    return [...rows].map((r) => ({ r, k: key(r) })).sort((a, b) => a.k - b.k).map((x) => x.r);
  }, [rows, sort, db]);
  const pages = Math.max(1, Math.ceil(rows.length / PER_PAGE));
  const current = Math.min(page, pages);
  const shown = sorted.slice((current - 1) * PER_PAGE, current * PER_PAGE);
  const filter = <T,>(set: (v: T) => void) => (v: T) => { set(v); setPage(1); };

  return (
    <>
      <PageHeader title={t("Customers")} subtitle={t(`${rows.length} of ${db.customers.length} profiles`)}>
        <button className="btn btn-primary" onClick={() => setAdding(true)}><UserPlus className="h-4 w-4" /> {t("Add customer")}</button>
        <Link href="/import/" className="btn btn-outline"><Upload className="h-4 w-4" /> {t("Import")}</Link>
      </PageHeader>

      {adding && (
        <CustomerForm initial={blankCustomer()} isNew existing={db.customers} onCancel={() => setAdding(false)} onSave={(c) => {
          update((d) => { d.customers.push(c); logEvent(d, { customerId: c.id, kind: "system", text: t("Profile created by hand.") }); }, `Created profile ${fullName(c)}`);
          router.push(`/customers/view/?id=${c.id}`);
        }} />
      )}

      <div className="card mb-4 grid grid-cols-1 gap-3 p-4 sm:grid-cols-2 lg:grid-cols-3">
        <label className="relative block">
          <span className="sr-only">{t("Search")}</span>
          <Search className="pointer-events-none absolute left-3 top-2.5 h-4 w-4 text-mute" aria-hidden />
          <input className="input !pl-9" placeholder={t("Search name, email, phone, city, policy number")} value={q} onChange={(e) => filter(setQ)(e.target.value)} />
        </label>
        <select className="input" aria-label={t("Has product")} value={product} onChange={(e) => filter(setProduct)(e.target.value)}>
          <option value="">{t("Has any product")}</option>
          {products.map((p) => <option key={p} value={p}>{t("Has {p}", { p: t(p) })}</option>)}
        </select>
        <select className="input" aria-label={t("Missing product")} value={missing} onChange={(e) => filter(setMissing)(e.target.value)}>
          <option value="">{t("Missing: no filter")}</option>
          {products.map((p) => <option key={p} value={p}>{t("Without {p}", { p: t(p) })}</option>)}
        </select>
        <select className="input" aria-label={t("Marketing consent")} value={consent} onChange={(e) => filter(setConsent)(e.target.value)}>
          <option value="">{t("Any consent")}</option>
          <option value="marketing">{t("Agreed to product offers")}</option>
          <option value="none">{t("Not agreed to product offers")}</option>
        </select>
        <select className="input" aria-label={t("Life stage")} value={stage} onChange={(e) => filter(setStage)(e.target.value)}>
          <option value="">{t("Any life stage")}</option>
          {STAGES.map((s) => <option key={s} value={s}>{t(s)}</option>)}
        </select>
        <select className="input" aria-label={t("More filters")} value={extra} onChange={(e) => filter(setExtra)(e.target.value)}>
          <option value="">{t("More: no filter")}</option>
          <option value="opp">{t("With an open opportunity")}</option>
          <option value="quiet">{t("No contact for a year")}</option>
          <option value="nocontact">{t("No email and no phone")}</option>
          <option value="renewals">{t("A policy ends within 90 days")}</option>
        </select>
        <select className="input" aria-label={t("Sort by")} value={sort} onChange={(e) => filter(setSort)(e.target.value)}>
          <option value="name">{t("Sort: name")}</option>
          <option value="birthday">{t("Sort: next birthday")}</option>
          <option value="contact">{t("Sort: longest without contact")}</option>
          <option value="cover">{t("Sort: lowest cover first")}</option>
          <option value="ending">{t("Sort: policy ending soonest")}</option>
        </select>
      </div>

      <div className="card overflow-hidden">
        {rows.length === 0 ? (
          <Empty>{db.customers.length === 0 ? t("No customers yet. Import a list or add one by hand.") : t("No customers match these filters.")}</Empty>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[900px]">
              <thead>
                <tr>
                  <th className="th">{t("Customer")}</th><th className="th">{t("Products")}</th><th className="th">{t("Cover")}</th><th className="th">{t("Consent")}</th>
                  <th className="th">{t("Birthday")}</th><th className="th">{t("Opportunity")}</th><th className="th">{t("Last contact")}</th>
                </tr>
              </thead>
              <tbody>
                {shown.map(({ c, opp, last }) => {
                  const b = daysToBirthday(c.dob);
                  const cov = coverage(db, c);
                  return (
                    <tr key={c.id} className="hover:bg-white/[0.03]">
                      <td className="td">
                        <Link href={`/customers/view/?id=${c.id}`} className="flex items-center gap-3">
                          <Avatar text={initials(c)} />
                          <span>
                            <span className="block font-medium text-white hover:underline">{fullName(c)}</span>
                            <span className="block text-xs text-mute">{[c.city, c.email || c.phone].filter(Boolean).join(" · ") || "No contact details"}</span>
                          </span>
                        </Link>
                      </td>
                      <td className="td"><div className="flex max-w-[220px] flex-wrap gap-1">{c.policies.length ? c.policies.map((p) => <span key={p.id} className="chip">{t(p.product)}</span>) : <span className="text-mute">{t("None")}</span>}</div></td>
                      <td className="td whitespace-nowrap tabular-nums text-ink-2">{t("{a} of {b}", { a: cov.held, b: cov.of })}</td>
                      <td className="td">
                        <div className="flex items-center gap-2">
                          {CHANNELS.map((ch) => (
                            <span key={ch} title={t(`${CHANNEL_LABEL[ch]}: ${c.consent[ch] ? "agreed" : "not agreed"}`)} className={c.consent[ch] ? "text-good" : "text-line"}>
                              <ChannelIcon channel={ch} /><span className="sr-only">{CHANNEL_LABEL[ch]} {c.consent[ch] ? "agreed" : "not agreed"}</span>
                            </span>
                          ))}
                          <span className={`text-xs ${c.consent.marketing ? "text-good" : "text-mute"}`}>{c.consent.marketing ? t("Offers") : t("Service only")}</span>
                        </div>
                      </td>
                      <td className="td whitespace-nowrap">{b === null ? <span className="text-mute">{t("Not known")}</span> : <>{fmtDayMonth(c.dob)}<span className="block text-xs text-mute">{b === 0 ? t("today") : t("in {n} days", { n: b })}</span></>}</td>
                      <td className="td">{opp ? <span className="flex flex-col items-start gap-1"><span className="text-sm">{t(opp.product)}</span><ConfidenceChip level={opp.confidence} /></span> : <span className="text-mute">{t("None")}</span>}</td>
                      <td className="td whitespace-nowrap text-ink-2">{relative(last)}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
        <Pager page={current} pages={pages} onPage={setPage} />
      </div>
    </>
  );
}
