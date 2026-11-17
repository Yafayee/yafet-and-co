"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { Avatar, ConfidenceChip, Empty, PageHeader, Pager, StatusChip } from "@/components/ui";
import { auditName, setOpp } from "@/lib/actions";
import { fmtDate } from "@/lib/dates";
import { allOpportunities, canMarket, fullName, initials, productsOf } from "@/lib/rules";
import { useStore } from "@/lib/store";
import { type OppStatus } from "@/lib/types";
import { t } from "@/lib/i18n";

const TABS: { key: OppStatus; label: string }[] = [{ key: "open", label: "Open" }, { key: "contacted", label: "Contacted" }, { key: "won", label: "Won" }, { key: "dismissed", label: "Dismissed" }];
const PER_PAGE = 40;

export default function OpportunitiesPage() {
  const { db, update } = useStore();
  const products = productsOf(db);
  const [tab, setTab] = useState<OppStatus>("open");
  const [product, setProduct] = useState("");
  const [fit, setFit] = useState("");
  const [page, setPage] = useState(1);
  const all = useMemo(() => allOpportunities(db), [db]);
  const byId = useMemo(() => new Map(db.customers.map((c) => [c.id, c])), [db]);
  const counts = useMemo(() => Object.fromEntries(TABS.map((tab) => [tab.key, all.filter((o) => o.status === tab.key).length])), [all]);
  const rank = { high: 0, medium: 1, low: 2 };
  const rows = all.filter((o) => o.status === tab && (!product || o.product === product) && (!fit || o.confidence === fit)).sort((a, b) => rank[a.confidence] - rank[b.confidence]);
  const pages = Math.max(1, Math.ceil(rows.length / PER_PAGE));
  const current = Math.min(page, pages);
  const wonThisYear = all.filter((o) => o.status === "won" && o.statusDate?.startsWith(String(new Date().getFullYear()))).length;

  return (
    <>
      <PageHeader title={t("Opportunities")} subtitle={t(`Covers a customer may be missing, found by the rules. ${wonThisYear} won this year.`)} />
      <div className="mb-4 flex flex-wrap items-center gap-2">
        <div className="flex flex-wrap gap-1 rounded-lg border border-line bg-night-2/50 p-1" role="tablist">
          {TABS.map((x) => (
            <button key={x.key} role="tab" aria-selected={tab === x.key} onClick={() => { setTab(x.key); setPage(1); }}
              className={`rounded-md px-3 py-1.5 text-sm font-medium ${tab === x.key ? "bg-primary text-white" : "text-ink-2 hover:bg-white/5"}`}>
              {t(x.label)} <span className="tabular-nums opacity-80">{counts[x.key]}</span>
            </button>
          ))}
        </div>
        <span className="flex-1" />
        <select className="input !w-auto" aria-label={t("Product")} value={product} onChange={(e) => { setProduct(e.target.value); setPage(1); }}>
          <option value="">{t("All products")}</option>{products.map((p) => <option key={p} value={p}>{t(p)}</option>)}
        </select>
        <select className="input !w-auto" aria-label={t("Fit")} value={fit} onChange={(e) => { setFit(e.target.value); setPage(1); }}>
          <option value="">{t("Any fit")}</option><option value="high">{t("Strong fit")}</option><option value="medium">{t("Possible fit")}</option><option value="low">{t("Ask first")}</option>
        </select>
      </div>

      <div className="card overflow-hidden">
        {rows.length === 0 ? <Empty>{t("Nothing here.")}</Empty> : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[760px]">
              <thead><tr><th className="th">{t("Customer")}</th><th className="th">{t("Product")}</th><th className="th">{t("Why")}</th><th className="th">{t("Fit")}</th><th className="th">{t("Status")}</th></tr></thead>
              <tbody>
                {rows.slice((current - 1) * PER_PAGE, current * PER_PAGE).map((o) => {
                  const c = byId.get(o.customerId)!;
                  return (
                    <tr key={o.key} className="hover:bg-white/[0.03]">
                      <td className="td"><Link href={`/customers/view/?id=${c.id}`} className="flex items-center gap-3"><Avatar text={initials(c)} /><span className="font-medium text-white hover:underline">{fullName(c)}</span></Link></td>
                      <td className="td whitespace-nowrap">{t(o.product)}</td>
                      <td className="td text-ink-2">{t(o.reason)}{o.statusDate ? <span className="block text-xs text-mute">since {fmtDate(o.statusDate)}</span> : null}{o.status === "open" && !canMarket(c) ? <span className="mt-1 block"><StatusChip tone="mute">{t("Raise in person")}</StatusChip></span> : null}</td>
                      <td className="td"><ConfidenceChip level={o.confidence} /></td>
                      <td className="td">
                        <select className="input !w-auto !py-1 text-xs" aria-label={t(`Status for ${fullName(c)}, ${o.product}`)} value={o.status} onChange={(e) => update((d) => setOpp(d, c.id, o.product, e.target.value as OppStatus), `${o.product} opportunity set to ${e.target.value}: ${auditName(c)}`)}>
                          <option value="open">{t("Open")}</option><option value="contacted">{t("Contacted")}</option><option value="won">{t("Won: policy signed")}</option><option value="dismissed">{t("Dismissed")}</option>
                        </select>
                      </td>
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
