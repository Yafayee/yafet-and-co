import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "CP Consulting CRM",
  description: "Customer relationship and communication platform",
  robots: { index: false, follow: false },
  referrer: "no-referrer",
};

// Built into the page itself so it also applies on hosts that cannot send
// security headers (such as GitHub Pages). The page may load code only from
// its own site and may send data only to its own site and, for the optional
// document reader, to the Anthropic API. Not applied in development, where
// the dev server needs looser rules. After the build, scripts/harden.mjs
// replaces 'unsafe-inline' for scripts by the fingerprints of the page's own
// inline scripts, so injected scripts cannot run.
const CSP = [
  "default-src 'self'",
  "script-src 'self' 'unsafe-inline'",
  "style-src 'self'",
  "style-src-attr 'unsafe-inline'",
  "img-src 'self' data: blob:",
  "font-src 'self' data:",
  "worker-src 'self' blob:",
  "connect-src 'self' https://api.anthropic.com",
  "object-src 'none'",
  "frame-src 'none'",
  "media-src 'none'",
  "manifest-src 'self'",
  "base-uri 'self'",
  "form-action 'self'",
].join("; ");

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className="h-full antialiased">
      <head>{process.env.NODE_ENV === "production" && <meta httpEquiv="Content-Security-Policy" content={CSP} />}</head>
      <body>{children}</body>
    </html>
  );
}
