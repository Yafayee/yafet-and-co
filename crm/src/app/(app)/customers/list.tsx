"use client";

import { Search, Upload } from "lucide-react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useMemo, useState } from "react";
import { Avatar, ChannelIcon, ConfidenceChip, Empty, PageHeader } from "@/components/ui";
import { customers, fullName, initials, opportunitiesFor } from "@/lib/data";
import { daysToBirthday, fmtDayMonth, relative } from "@/lib/dates";
import { CHANNELS, CHANNEL_LABEL, PRODUCTS } from "@/lib/types";

export function CustomerList() {
  const params = useSearchParams();
  const [q, setQ] = useState("");
  const [product, setProduct] = useState("");
  const [missing, setMissing] = useState("");
  const [consent, setConsent] = useState("");
  const [onlyOpp, setOnlyOpp] = useState(params.get("view") === "opportunities");

  const rows = useMemo(() => {
    const needle = q.trim().toLowerCase();
    return customers
      .map((c) => ({ c, opps: opportunitiesFor(c.id) }))
      .filter(({ c, opps }) => {
        if (needle && !`${fullName(c)} ${c.email} ${c.phone} ${c.city} ${c.interests.join(" ")}`.toLowerCase().includes(needle)) return false;
        if (product && !c.policies.some((p) => p.product === product)) return false;
        if (missing && c.policies.some((p) => p.product === missing)) return false;
        if (consent === "marketing" && !c.consent.marketing) return false;
        if (consent === "none" && c.consent.marketing) return false;
        if (onlyOpp && opps.length === 0) return false;
        return true;
      });
  }, [q, product, missing, consent, onlyOpp]);

  return (
    <>
      <PageHeader title="Customers" subtitle={`${rows.length} of ${customers.length} profiles`}>
        <Link href="/import" className="btn btn-outline"><Upload className="h-4 w-4" /> Import customers</Link>
      </PageHeader>

      <div className="card mb-4 grid grid-cols-1 gap-3 p-4 sm:grid-cols-2 lg:grid-cols-[1.4fr_1fr_1fr_1fr_auto]">
        <label className="relative block">
          <span className="sr-only">Search</span>
          <Search className="pointer-events-none absolute left-3 top-2.5 h-4 w-4 text-mute" aria-hidden />
          <input className="input !pl-9" placeholder="Search name, email, phone, city, interest" value={q} onChange={(e) => setQ(e.target.value)} />
        </label>
        <select className="input" aria-label="Has product" value={product} onChange={(e) => setProduct(e.target.value)}>
          <option value="">Has any product</option>
          {PRODUCTS.map((p) => <option key={p} value={p}>Has {p}</option>)}
        </select>
        <select className="input" aria-label="Missing product" value={missing} onChange={(e) => setMissing(e.target.value)}>
          <option value="">Missing: no filter</option>
          {PRODUCTS.map((p) => <option key={p} value={p}>Without {p}</option>)}
        </select>
        <select className="input" aria-label="Marketing consent" value={consent} onChange={(e) => setConsent(e.target.value)}>
          <option value="">Any consent</option>
          <option value="marketing">Marketing consent given</option>
          <option value="none">No marketing consent</option>
        </select>
        <label className="flex items-center gap-2 text-sm text-ink-2">
          <input type="checkbox" className="h-4 w-4 accent-[#2b8cee]" checked={onlyOpp} onChange={(e) => setOnlyOpp(e.target.checked)} />
          With opportunity
        </label>
      </div>

      <div className="card overflow-hidden">
        {rows.length === 0 ? (
          <Empty>No customers match these filters.</Empty>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[860px]">
              <thead>
                <tr>
                  <th className="th">Customer</th><th className="th">Products</th><th className="th">Consent</th>
                  <th className="th">Birthday</th><th className="th">Opportunity</th><th className="th">Last contact</th>
                </tr>
              </thead>
              <tbody>
                {rows.map(({ c, opps }) => (
                  <tr key={c.id} className="hover:bg-white/[0.03]">
                    <td className="td">
                      <Link href={`/customers/${c.id}`} className="flex items-center gap-3">
                        <Avatar text={initials(c)} />
                        <span>
                          <span className="block font-medium text-white hover:underline">{fullName(c)}</span>
                          <span className="block text-xs text-mute">{c.city} · {c.email}</span>
                        </span>
                      </Link>
                    </td>
                    <td className="td"><div className="flex max-w-[220px] flex-wrap gap-1">{c.policies.map((p) => <span key={p.number} className="chip">{p.product}</span>)}</div></td>
                    <td className="td">
                      <div className="flex items-center gap-2">
                        {CHANNELS.map((ch) => (
                          <span key={ch} title={`${CHANNEL_LABEL[ch]}: ${c.consent[ch] ? "agreed" : "not agreed"}`} className={c.consent[ch] ? "text-good" : "text-line"}>
                            <ChannelIcon channel={ch} />
                            <span className="sr-only">{CHANNEL_LABEL[ch]} {c.consent[ch] ? "agreed" : "not agreed"}</span>
                          </span>
                        ))}
                        <span className={`text-xs ${c.consent.marketing ? "text-good" : "text-mute"}`}>{c.consent.marketing ? "Marketing" : "Service only"}</span>
                      </div>
                    </td>
                    <td className="td whitespace-nowrap">{fmtDayMonth(c.dob)}<span className="block text-xs text-mute">{daysToBirthday(c.dob) === 0 ? "today" : `in ${daysToBirthday(c.dob)} days`}</span></td>
                    <td className="td">{opps[0] ? <span className="flex flex-col items-start gap-1"><span className="text-sm">{opps[0].product}</span><ConfidenceChip level={opps[0].confidence} /></span> : <span className="text-mute">None</span>}</td>
                    <td className="td whitespace-nowrap text-ink-2">{relative(c.lastContact)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </>
  );
}
