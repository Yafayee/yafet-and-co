// Runs after `next build`. Replaces the general "inline scripts allowed" rule
// in every exported page by the exact fingerprints (SHA-256) of the inline
// scripts that page really contains. A script injected into the page by any
// other means then does not run. The rule is also moved to the very top of
// the page so that it applies to everything that follows.
import { createHash } from "node:crypto";
import { readdirSync, readFileSync, statSync, writeFileSync } from "node:fs";
import { join } from "node:path";

const OUT = new URL("../out/", import.meta.url).pathname;
const pages = [];
const walk = (dir) => { for (const f of readdirSync(dir)) { const p = join(dir, f); if (statSync(p).isDirectory()) walk(p); else if (p.endsWith(".html")) pages.push(p); } };
walk(OUT);

const META = /<meta http-equiv="Content-Security-Policy" content="([^"]*)"\s*\/?>/i;
let done = 0;
for (const page of pages) {
  let html = readFileSync(page, "utf8");
  const m = META.exec(html);
  if (!m) throw new Error(`No Content-Security-Policy in ${page}`);
  const hashes = new Set();
  for (const s of html.matchAll(/<script(?![^>]*\bsrc=)[^>]*>([\s\S]*?)<\/script>/g)) {
    if (s[1]) hashes.add(`'sha256-${createHash("sha256").update(s[1], "utf8").digest("base64")}'`);
  }
  if (/\son[a-z]+\s*=\s*["']/i.test(html.replace(/<script[\s\S]*?<\/script>/g, ""))) throw new Error(`Inline event handler found in ${page}`);
  const policy = m[1].replace(/&#x27;|&#39;|&apos;/g, "'").replace("script-src 'self' 'unsafe-inline'", `script-src 'self' ${[...hashes].join(" ")}`.trim());
  if (policy.includes("script-src 'self' 'unsafe-inline'") || /script-src [^;]*unsafe-(inline|eval)/.test(policy) || !policy.includes("script-src 'self'")) throw new Error(`Could not tighten the policy in ${page}`);
  html = html.replace(m[0], "");
  if (!html.includes("<head>")) throw new Error(`No <head> in ${page}`);
  html = html.replace("<head>", `<head><meta http-equiv="Content-Security-Policy" content="${policy}"/>`);
  writeFileSync(page, html);
  done++;
}
console.log(`Content-Security-Policy tightened in ${done} pages.`);
