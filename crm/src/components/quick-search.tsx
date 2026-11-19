"use client";

import { Search } from "lucide-react";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import { t } from "@/lib/i18n";
import { fullName } from "@/lib/rules";
import { useStore } from "@/lib/store";

/** Find a customer from any screen by name, email, phone or policy number. */
export function QuickSearch({ onPick }: { onPick?: () => void }) {
  const { db } = useStore();
  const router = useRouter();
  const [q, setQ] = useState("");
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(0);
  const digits = q.replace(/\D/g, "");
  const hits = useMemo(() => {
    const needle = q.trim().toLowerCase();
    if (needle.length < 2) return [];
    return db.customers
      .filter((c) => `${fullName(c)} ${c.lastName} ${c.firstName} ${c.email} ${c.policies.map((p) => p.number).join(" ")}`.toLowerCase().includes(needle) || (digits.length >= 4 && c.phone.replace(/\D/g, "").includes(digits)))
      .slice(0, 8);
  }, [db.customers, q, digits]);
  const go = (id: string) => { setQ(""); setOpen(false); onPick?.(); router.push(`/customers/view/?id=${id}`); };

  return (
    <div className="relative w-full max-w-sm">
      <Search className="pointer-events-none absolute left-3 top-2.5 h-4 w-4 text-mute" aria-hidden />
      <input
        className="input !pl-9" type="search" role="combobox" aria-expanded={open && hits.length > 0} aria-controls="quick-search-list" aria-label={t("Find a customer")}
        placeholder={t("Find a customer")} value={q}
        onChange={(e) => { setQ(e.target.value); setOpen(true); setActive(0); }}
        onFocus={() => setOpen(true)} onBlur={() => setTimeout(() => setOpen(false), 150)}
        onKeyDown={(e) => {
          if (e.key === "ArrowDown") { e.preventDefault(); setActive((a) => Math.min(a + 1, hits.length - 1)); }
          else if (e.key === "ArrowUp") { e.preventDefault(); setActive((a) => Math.max(a - 1, 0)); }
          else if (e.key === "Enter" && hits[active]) { e.preventDefault(); go(hits[active].id); }
          else if (e.key === "Escape") { setOpen(false); }
        }}
      />
      {open && q.trim().length >= 2 && (
        <ul id="quick-search-list" role="listbox" className="absolute left-0 right-0 top-full z-40 mt-1 max-h-80 overflow-y-auto rounded-lg border border-line bg-night p-1 shadow-xl">
          {hits.length === 0 ? <li className="px-3 py-2 text-sm text-mute">{t("No customer found.")}</li> : hits.map((c, i) => (
            <li key={c.id} role="option" aria-selected={i === active}>
              <button type="button" className={`block w-full rounded-md px-3 py-2 text-left ${i === active ? "bg-primary/20" : "hover:bg-white/5"}`} onMouseDown={(e) => e.preventDefault()} onClick={() => go(c.id)}>
                <span className="block text-sm font-medium text-white">{fullName(c)}</span>
                <span className="block truncate text-xs text-mute">{[c.city, c.email || c.phone].filter(Boolean).join(" · ") || t("No contact details")}</span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
