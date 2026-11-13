import { Mail, MessageCircle, MessageSquareText } from "lucide-react";
import type { ReactNode } from "react";
import { CHANNEL_LABEL, type Channel, type Confidence, type OppStatus } from "@/lib/types";

export function PageHeader({ title, subtitle, children }: { title: string; subtitle?: string; children?: ReactNode }) {
  return (
    <div className="mb-6 flex flex-wrap items-end justify-between gap-3">
      <div>
        <h1 className="text-2xl font-bold text-white sm:text-3xl">{title}</h1>
        {subtitle && <p className="mt-1 text-sm text-mute">{subtitle}</p>}
      </div>
      {children && <div className="flex flex-wrap gap-2">{children}</div>}
    </div>
  );
}

export function Card({ title, action, children, className = "" }: { title?: string; action?: ReactNode; children: ReactNode; className?: string }) {
  return (
    <section className={`card ${className}`}>
      {title && (
        <div className="flex items-center justify-between gap-3 px-5 pt-4">
          <h2 className="text-base font-semibold text-white">{title}</h2>
          {action}
        </div>
      )}
      {children}
    </section>
  );
}

export function StatTile({ label, value, note, icon }: { label: string; value: string | number; note?: string; icon: ReactNode }) {
  return (
    <div className="card flex items-start justify-between gap-3 p-5">
      <div className="min-w-0">
        <div className="label">{label}</div>
        <div className="mt-1 font-[family-name:var(--font-display)] text-3xl font-bold text-white">{value}</div>
        {note && <div className="mt-1 text-xs text-mute">{note}</div>}
      </div>
      <div className="rounded-lg border border-line bg-night-2/70 p-2 text-primary">{icon}</div>
    </div>
  );
}

export function ChannelIcon({ channel, className = "h-4 w-4" }: { channel: Channel; className?: string }) {
  const I = channel === "email" ? Mail : channel === "sms" ? MessageSquareText : MessageCircle;
  return <I className={className} aria-hidden />;
}

export function ChannelChip({ channel }: { channel: Channel }) {
  return (
    <span className="chip">
      <ChannelIcon channel={channel} className="h-3 w-3" />
      {CHANNEL_LABEL[channel]}
    </span>
  );
}

export function Avatar({ text, size = "h-9 w-9 text-xs" }: { text: string; size?: string }) {
  return (
    <span className={`inline-flex shrink-0 items-center justify-center rounded-full border border-line bg-night-2 font-semibold text-ink ${size}`}>
      {text}
    </span>
  );
}

const CONF: Record<Confidence, string> = {
  high: "border-good/40 text-good",
  medium: "border-warn/40 text-warn",
  low: "border-line text-mute",
};
const CONF_LABEL: Record<Confidence, string> = { high: "Strong fit", medium: "Possible fit", low: "Ask first" };

export function ConfidenceChip({ level }: { level: Confidence }) {
  return <span className={`chip ${CONF[level]}`}>{CONF_LABEL[level]}</span>;
}

export function StatusChip({ tone, children }: { tone: "good" | "warn" | "bad" | "info" | "mute"; children: ReactNode }) {
  const cls = { good: "border-good/40 text-good", warn: "border-warn/40 text-warn", bad: "border-bad/40 text-bad", info: "border-primary/50 text-primary", mute: "border-line text-mute" }[tone];
  return <span className={`chip ${cls}`}>{children}</span>;
}

export function Empty({ children }: { children: ReactNode }) {
  return <div className="px-5 py-10 text-center text-sm text-mute">{children}</div>;
}

export function Toggle({ checked, onChange, label }: { checked: boolean; onChange: () => void; label: ReactNode }) {
  return (
    <label className="flex cursor-pointer items-center justify-between gap-3 text-sm text-ink">
      <span>{label}</span>
      <span className="relative inline-flex">
        <input type="checkbox" className="peer sr-only" checked={checked} onChange={onChange} />
        <span className="h-5 w-9 rounded-full bg-line transition-colors peer-checked:bg-primary peer-focus-visible:ring-2 peer-focus-visible:ring-white/60" />
        <span className="absolute left-0.5 top-0.5 h-4 w-4 rounded-full bg-white transition-transform peer-checked:translate-x-4" />
      </span>
    </label>
  );
}

const OPP_TONE: Record<OppStatus, "info" | "warn" | "good" | "mute"> = { open: "info", contacted: "warn", won: "good", dismissed: "mute" };
const OPP_LABEL: Record<OppStatus, string> = { open: "Open", contacted: "Contacted", won: "Won", dismissed: "Dismissed" };
export function OppStatusChip({ status }: { status: OppStatus }) {
  return <StatusChip tone={OPP_TONE[status]}>{OPP_LABEL[status]}</StatusChip>;
}

export function Pager({ page, pages, onPage }: { page: number; pages: number; onPage: (p: number) => void }) {
  if (pages <= 1) return null;
  return (
    <div className="flex items-center justify-between gap-3 border-t border-line/60 px-4 py-3 text-sm text-ink-2">
      <button className="btn" disabled={page <= 1} onClick={() => onPage(page - 1)}>Previous</button>
      <span>Page {page} of {pages}</span>
      <button className="btn" disabled={page >= pages} onClick={() => onPage(page + 1)}>Next</button>
    </div>
  );
}
