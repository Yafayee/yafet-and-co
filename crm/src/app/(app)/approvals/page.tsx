"use client";

import { ShieldCheck, X } from "lucide-react";
import Link from "next/link";
import { useMemo, useState } from "react";
import { Composer } from "@/components/composer";
import { Avatar, ConfidenceChip, Empty, PageHeader, StatusChip } from "@/components/ui";
import { auditName, setOpp } from "@/lib/actions";
import { daysAgo } from "@/lib/dates";
import { fullName, initials, lastContact, suggestions } from "@/lib/rules";
import { useStore } from "@/lib/store";
import { t } from "@/lib/i18n";

export default function Approvals() {
  const { db, update } = useStore();
  const { list: everything, heldBack } = useMemo(() => suggestions(db), [db]);
  const list0 = everything;
  const [show, setShow] = useState(15);
  const [product, setProduct] = useState("");
  const [fit, setFit] = useState("");
  const all = list0;
  const offered = [...new Set(all.map((x) => x.opportunity.product))];
  const list = all.filter((x) => (!product || x.opportunity.product === product) && (!fit || x.opportunity.confidence === fit));

  return (
    <>
      <PageHeader title={t("Approvals")} subtitle={t("Product messages the system suggests. Nothing goes out until you send it.")} />

      {heldBack > 0 && (
        <div className="mb-4 rounded-md border border-line bg-night-2/50 px-3 py-2 text-sm text-ink-2">
          {heldBack} more {heldBack === 1 ? "customer is" : "customers are"} held back: they received a product message in the last {db.settings.capDays} days.
        </div>
      )}

      {all.length > 0 && (
        <div className="mb-4 flex flex-wrap items-center gap-2">
          <select className="input !w-auto" aria-label={t("Product")} value={product} onChange={(e) => { setProduct(e.target.value); setShow(15); }}>
            <option value="">{t("All products")} ({all.length})</option>
            {offered.map((p) => <option key={p} value={p}>{t(p)} ({all.filter((x) => x.opportunity.product === p).length})</option>)}
          </select>
          <select className="input !w-auto" aria-label={t("Fit")} value={fit} onChange={(e) => { setFit(e.target.value); setShow(15); }}>
            <option value="">{t("Any fit")}</option><option value="high">{t("Strong fit")}</option><option value="medium">{t("Possible fit")}</option><option value="low">{t("Low priority")}</option>
          </select>
          <span className="text-sm text-mute">{t("{n} shown", { n: list.length })}</span>
        </div>
      )}

      {list.length === 0 ? (
        <div className="card"><Empty>{t("Nothing is waiting. Suggestions appear for customers who agreed to product offers and have an open opportunity.")}</Empty></div>
      ) : (
        <div className="space-y-4">
          {list.slice(0, show).map((s) => {
            const c = s.customer;
            const gap = daysAgo(lastContact(db, c.id));
            return (
              <article key={s.id} className="card p-5">
                <div className="flex flex-wrap items-center gap-3">
                  <Avatar text={initials(c)} />
                  <div className="min-w-0 flex-1 basis-48">
                    <Link href={`/customers/view/?id=${c.id}`} className="font-medium text-white hover:underline">{fullName(c)}</Link>
                    <p className="text-xs text-mute">{t(s.kind)} · {t(s.opportunity.product)}</p>
                  </div>
                  <ConfidenceChip level={s.opportunity.confidence} />
                  <button className="btn btn-danger" onClick={() => update((d) => setOpp(d, c.id, s.opportunity.product, "dismissed"), `Dismissed ${s.opportunity.product} suggestion for ${auditName(c)}`)}><X className="h-4 w-4" /> {t("Dismiss")}</button>
                </div>
                <p className="mt-3 text-sm text-ink-2"><span className="text-mute">{t("Why:")} </span>{t(s.opportunity.reason)}</p>
                <div className="mt-2 flex flex-wrap gap-2">
                  <StatusChip tone="good"><ShieldCheck className="h-3 w-3" /> {t("Agreed to product offers")}</StatusChip>
                  <StatusChip tone="mute">{gap === null ? t("No contact recorded") : t("Last contact {n} days ago", { n: gap })}</StatusChip>
                </div>
                <div className="mt-3">
                  <Composer key={s.id} customer={c} text={s.text} purpose="marketing" product={s.opportunity.product} label={s.kind === "Question" ? t("Car question sent") : `${s.kind} sent: ${s.opportunity.product}`} />
                </div>
              </article>
            );
          })}
          {list.length > show && <button className="btn w-full" onClick={() => setShow(show + 15)}>{t("Show more ({n} remaining)", { n: list.length - show })}</button>}
        </div>
      )}
    </>
  );
}
