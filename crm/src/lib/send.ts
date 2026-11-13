import type { Channel, Customer, TemplateText } from "./types";

/** Digits only, with country code, as wa.me expects. */
const waNumber = (phone: string) => phone.replace(/[^\d]/g, "");

/**
 * Sending without a server: each link opens the user's own mail program,
 * WhatsApp or SMS app with the message filled in. No message passes through
 * any third-party service of ours and there is no per-message fee.
 */
export function sendLink(c: Customer, channel: Channel, t: TemplateText): string {
  if (channel === "email") return `mailto:${encodeURIComponent(c.email)}?subject=${encodeURIComponent(t.subject)}&body=${encodeURIComponent(t.body)}`;
  if (channel === "whatsapp") return `https://wa.me/${waNumber(c.phone)}?text=${encodeURIComponent(t.body)}`;
  return `sms:${c.phone.replace(/\s/g, "")}?&body=${encodeURIComponent(t.body)}`;
}

export function download(name: string, content: string, type = "text/plain") {
  const url = URL.createObjectURL(new Blob([content], { type }));
  const a = document.createElement("a");
  a.href = url; a.download = name; document.body.appendChild(a); a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 2000);
}

export function toCsv(rows: (string | number)[][]): string {
  const cell = (v: string | number) => { const s = String(v ?? ""); return /[";\n,]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s; };
  return "﻿" + rows.map((r) => r.map(cell).join(";")).join("\r\n");
}

export const uid = () => (typeof crypto !== "undefined" && crypto.randomUUID ? crypto.randomUUID().slice(0, 12) : Math.random().toString(36).slice(2, 14));
