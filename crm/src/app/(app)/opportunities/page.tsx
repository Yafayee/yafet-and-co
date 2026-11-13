"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { Avatar, ConfidenceChip, Empty, PageHeader, Pager, StatusChip } from "@/components/ui";
import { auditName, setOpp } from "@/lib/actions";
import { fmtDate } from "@/lib/dates";
import { allOpportunities, canMarket, fullName, initials, productsOf } from "@/lib/rules";
import { useStore } from "@/lib/store";
import { type OppStatus } from "@/lib/types";

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
  const counts = useMemo(() => Object.fromEntries(TABS.map((t) => [t.key, all.filter((o) => o.status === t.key).length])), [all]);
  const rank = { high: 0, medium: 1, low: 2 };
  const rows = all.filter((o) => o.status === tab && (!product || o.product === product) && (!fit || o.confidence === fit)).sort((a, b) => rank[a.confidence] - rank[b.confidence]);
  const pages = Math.max(1, Math.ceil(rows.length / PER_PAGE));
  const current = Math.min(page, pages);
  const wonThisYear = all.filter((o) => o.status === "won" && o.statusDate?.startsWith(String(new Date().getFullYear()))).length;

  return (
    <>
      <PageHeader title="Opportunities" subtitle={`Covers a customer may be missing, found by the rules. ${wonThisYear} won this year.`} />
      <div className="mb-4 flex flex-wrap items-center gap-2">
        <div className="flex flex-wrap gap-1 rounded-lg border border-line bg-night-2/50 p-1" role="tablist">
          {TABS.map((t) => (
            <button key={t.key} role="tab" aria-selected={tab === t.key} onClick={() => { setTab(t.key); setPage(1); }}
              className={`rounded-md px-3 py-1.5 text-sm font-medium ${tab === t.key ? "bg-primary text-white" : "text-ink-2 hover:bg-white/5"}`}>
              {t.label} <span className="tabular-nums opacity-80">{counts[t.key]}</span>
            </button>
          ))}
        </div>
        <span className="flex-1" />
        <select className="input !w-auto" aria-label="Product" value={product} onChange={(e) => { setProduct(e.target.value); setPage(1); }}>
          <option value="">All products</option>{products.map((p) => <option key={p}>{p}</option>)}
        </select>
        <select className="input !w-auto" aria-label="Fit" value={fit} onChange={(e) => { setFit(e.target.value); setPage(1); }}>
          <option value="">Any fit</option><option value="high">Strong fit</option><option value="medium">Possible fit</option><option value="low">Ask first</option>
        </select>
      </div>

      <div className="card overflow-hidden">
        {rows.length === 0 ? <Empty>Nothing here.</Empty> : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[760px]">
              <thead><tr><th className="th">Customer</th><th className="th">Product</th><th className="th">Why</th><th className="th">Fit</th><th className="th">Status</th></tr></thead>
              <tbody>
                {rows.slice((current - 1) * PER_PAGE, current * PER_PAGE).map((o) => {
                  const c = byId.get(o.customerId)!;
                  return (
                    <tr key={o.key} className="hover:bg-white/[0.03]">
                      <td className="td"><Link href={`/customers/view/?id=${c.id}`} className="flex items-center gap-3"><Avatar text={initials(c)} /><span className="font-medium text-white hover:underline">{fullName(c)}</span></Link></td>
                      <td className="td whitespace-nowrap">{o.product}</td>
                      <td className="td text-ink-2">{o.reason}{o.statusDate ? <span className="block text-xs text-mute">since {fmtDate(o.statusDate)}</span> : null}{o.status === "open" && !canMarket(c) ? <span className="mt-1 block"><StatusChip tone="mute">Raise in person</StatusChip></span> : null}</td>
                      <td className="td"><ConfidenceChip level={o.confidence} /></td>
                      <td className="td">
                        <select className="input !w-auto !py-1 text-xs" aria-label={`Status for ${fullName(c)}, ${o.product}`} value={o.status} onChange={(e) => update((d) => setOpp(d, c.id, o.product, e.target.value as OppStatus), `${o.product} opportunity set to ${e.target.value}: ${auditName(c)}`)}>
                          <option value="open">Open</option><option value="contacted">Contacted</option><option value="won">Won: policy signed</option><option value="dismissed">Dismissed</option>
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
