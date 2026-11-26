import type { Channel, Customer, TemplateText } from "./types";

/** Digits only, with country code, as wa.me expects. */
const waNumber = (phone: string) => phone.replace(/[^\d]/g, "");

/**
 * Sending without a server: each link opens the user's own mail program,
 * WhatsApp or SMS app with the message filled in. No message passes through
 * any third-party service of ours and there is no per-message fee.
 */
export const DEFAULT_WEBMAIL = "https://webmail.ovb.at/webmail/";
/** The webmail address to open; only https addresses are accepted. */
export const webmailUrl = (s?: { webmailUrl?: string }) => { const u = s?.webmailUrl?.trim(); return u && /^https:\/\/[^\s"'<>]+$/i.test(u) ? u : DEFAULT_WEBMAIL; };

/**
 * The webmail address with the message attached the way IceWarp accepts mail
 * links ("?mailto=" followed by a standard mail link). A webmail that does not
 * understand it simply opens as usual, and the copy buttons remain.
 */
export function webmailCompose(s: { webmailUrl?: string } | undefined, to: string, t: TemplateText): string {
  const base = webmailUrl(s);
  const link = `mailto:${encodeURIComponent(to)}?subject=${encodeURIComponent(t.subject)}&body=${encodeURIComponent(t.body)}`;
  // Built with URL so that an existing query or "#…" part of the configured address stays intact.
  const u = new URL(base);
  u.searchParams.set("mailto", link);
  return u.toString();
}

export function sendLink(c: Customer, channel: Channel, t: TemplateText, via?: { emailVia?: "default" | "gmail" | "webmail"; gmailAddress?: string }): string {
  if (channel === "email" && via?.emailVia === "gmail") {
    // Opens Gmail's own "new message" window with everything filled in. Naming the
    // address makes Gmail use that account when several are signed in.
    const from = via.gmailAddress?.trim();
    return `https://mail.google.com/mail/?${from ? `authuser=${encodeURIComponent(from)}&` : ""}view=cm&fs=1&to=${encodeURIComponent(c.email)}&su=${encodeURIComponent(t.subject)}&body=${encodeURIComponent(t.body)}`;
  }
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
