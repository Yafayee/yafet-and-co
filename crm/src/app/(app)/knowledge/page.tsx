"use client";

import { BookOpen, ShieldAlert } from "lucide-react";
import { Card, PageHeader, StatusChip } from "@/components/ui";
import { GUIDES, RULES } from "@/lib/knowledge";
import { hasProduct } from "@/lib/rules";
import { useStore } from "@/lib/store";
import { PRODUCTS, type Product } from "@/lib/types";

function List({ label, items }: { label: string; items: string[] }) {
  return (
    <div>
      <h3 className="label">{label}</h3>
      <ul className="mt-1 list-disc space-y-1 pl-4 text-sm text-ink-2">{items.map((x) => <li key={x}>{x}</li>)}</ul>
    </div>
  );
}

export default function KnowledgePage() {
  const { db } = useStore();
  const known = PRODUCTS.filter((p) => GUIDES[p]);
  const missing = PRODUCTS.filter((p) => !GUIDES[p]);
  const holders = (p: Product) => db.customers.filter((c) => hasProduct(c, p)).length;

  return (
    <>
      <PageHeader title="Product guide" subtitle="What the system knows about each product and the rules for talking about it." />

      <Card title="Rules for every message and conversation" action={<ShieldAlert className="h-5 w-5 text-warn" aria-hidden />}>
        <ul className="grid gap-x-6 gap-y-3 px-5 pb-5 pt-3 md:grid-cols-2">
          {RULES.map((r) => (
            <li key={r.title}>
              <span className="text-sm font-medium text-white">{r.title}</span>
              <p className="text-sm text-ink-2">{r.text}</p>
              <p className="mt-0.5 text-xs text-mute">Source: {r.source}</p>
            </li>
          ))}
        </ul>
      </Card>

      <div className="mt-4 grid grid-cols-1 gap-4">
        {known.map((p) => {
          const g = GUIDES[p]!;
          return (
            <Card key={p} title={g.title} action={<StatusChip tone="info">{holders(p)} {holders(p) === 1 ? "customer has" : "customers have"} it</StatusChip>}>
              <div className="px-5 pb-5 pt-2">
                <p className="text-sm text-ink">{g.summary}</p>
                <div className="mt-4 grid gap-5 md:grid-cols-2">
                  <List label="Who it fits" items={g.fits} />
                  <List label="Questions to ask" items={g.ask} />
                  <List label="Points you can make" items={g.say} />
                  <List label="Do not say" items={g.never} />
                </div>
                <p className="mt-4 text-xs text-mute">Source: {g.source}</p>
              </div>
            </Card>
          );
        })}
      </div>

      <Card title="No material loaded yet" className="mt-4" action={<BookOpen className="h-5 w-5 text-mute" aria-hidden />}>
        <div className="px-5 pb-5 pt-3">
          <p className="text-sm text-ink-2">These products are recognised and recommended by the general rules, but the guide has no product details for them until material is provided.</p>
          <div className="mt-3 flex flex-wrap gap-1.5">{missing.map((p) => <span key={p} className="chip">{p}</span>)}</div>
        </div>
      </Card>
    </>
  );
}
