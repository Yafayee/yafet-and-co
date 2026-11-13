"use client";

import { FileSpreadsheet, ShieldCheck, Upload } from "lucide-react";
import { useState, type ChangeEvent } from "react";
import { Card, PageHeader, StatusChip } from "@/components/ui";

const FIELDS = ["First name", "Last name", "Email", "Phone", "Date of birth", "City", "Products", "Email consent", "SMS consent", "WhatsApp consent", "Marketing consent", "Notes", "Do not import"];
const HINTS: [RegExp, string][] = [
  [/vor|first|given/i, "First name"], [/nach|last|sur|family/i, "Last name"], [/mail/i, "Email"], [/tel|phone|mobil|handy/i, "Phone"],
  [/geb|birth|dob/i, "Date of birth"], [/ort|city|stadt/i, "City"], [/produ|vertr|polic|sparte/i, "Products"], [/market|werb/i, "Marketing consent"], [/notiz|note|bemerk/i, "Notes"],
];
const guess = (h: string) => HINTS.find(([re]) => re.test(h))?.[1] ?? "Do not import";

function parse(text: string): string[][] {
  const first = text.split(/\r?\n/)[0] ?? "";
  const sep = (first.match(/;/g)?.length ?? 0) > (first.match(/,/g)?.length ?? 0) ? ";" : ",";
  return text.split(/\r?\n/).filter((l) => l.trim()).map((line) => {
    const cells: string[] = []; let cur = ""; let quoted = false;
    for (let i = 0; i < line.length; i++) {
      const ch = line[i];
      if (ch === '"') { if (quoted && line[i + 1] === '"') { cur += '"'; i++; } else quoted = !quoted; }
      else if (ch === sep && !quoted) { cells.push(cur.trim()); cur = ""; }
      else cur += ch;
    }
    cells.push(cur.trim());
    return cells;
  });
}

export default function ImportPage() {
  const [file, setFile] = useState("");
  const [rows, setRows] = useState<string[][]>([]);
  const [map, setMap] = useState<string[]>([]);
  const [error, setError] = useState("");

  const onFile = async (e: ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (!f) return;
    setError("");
    const data = parse(await f.text());
    if (data.length < 2) { setError("This file has no data rows. Export your list as CSV with a header row and try again."); setRows([]); return; }
    setFile(f.name); setRows(data); setMap(data[0].map(guess));
  };

  const header = rows[0] ?? [];
  const body = rows.slice(1);
  const emailCol = map.indexOf("Email");
  const emails = emailCol >= 0 ? body.map((r) => (r[emailCol] ?? "").toLowerCase()).filter(Boolean) : [];
  const dupes = emails.length - new Set(emails).size;
  const noConsent = !map.some((m) => m.endsWith("consent"));
  const step = rows.length === 0 ? 1 : 2;

  return (
    <>
      <PageHeader title="Import customers" subtitle="Upload a CSV export. Each row becomes a customer profile." />

      <ol className="mb-4 grid grid-cols-2 gap-2 sm:grid-cols-4">
        {["Upload file", "Match columns", "Check and fix", "Create profiles"].map((s, i) => (
          <li key={s} className={`rounded-md border px-3 py-2 text-sm ${i + 1 === step ? "border-primary/60 bg-primary/10 text-white" : i + 1 < step ? "border-good/40 text-good" : "border-line text-mute"}`}>
            <span className="mr-1 font-semibold">{i + 1}</span> {s}
          </li>
        ))}
      </ol>

      <Card>
        <div className="p-5">
          <label className="flex cursor-pointer flex-col items-center gap-3 rounded-xl border border-dashed border-line px-4 py-10 text-center hover:border-primary/60 hover:bg-primary/5">
            {file ? <FileSpreadsheet className="h-8 w-8 text-teal" /> : <Upload className="h-8 w-8 text-primary" />}
            <span className="text-sm text-white">{file ? `${file} · ${body.length} rows` : "Choose a CSV file"}</span>
            <span className="text-xs text-mute">Comma or semicolon separated, first row as column names</span>
            <input type="file" accept=".csv,text/csv" className="sr-only" onChange={onFile} />
            <span className="btn btn-outline">{file ? "Choose another file" : "Browse"}</span>
          </label>
          <p className="mt-3 flex items-center gap-2 text-xs text-mute"><ShieldCheck className="h-4 w-4 text-good" /> In this preview the file is read in your browser only. It is not uploaded or stored.</p>
          {error && <p className="mt-3 text-sm text-bad" role="alert">{error}</p>}
        </div>
      </Card>

      {rows.length > 0 && (
        <Card title="Match columns" className="mt-4" action={<span className="text-xs text-mute">first 5 rows shown</span>}>
          <div className="flex flex-wrap gap-2 px-5 pt-3">
            <StatusChip tone="info">{body.length} rows</StatusChip>
            <StatusChip tone={dupes ? "warn" : "good"}>{dupes ? `${dupes} duplicate emails` : "No duplicate emails"}</StatusChip>
            {noConsent && <StatusChip tone="warn">No consent column: profiles will be created with messaging switched off</StatusChip>}
          </div>
          <div className="mt-3 overflow-x-auto pb-3">
            <table className="w-full">
              <thead>
                <tr>{header.map((h, i) => (
                  <th key={i} className="th min-w-[150px] align-top">
                    <span className="mb-1 block text-ink">{h || `Column ${i + 1}`}</span>
                    <select className="input !py-1 text-xs" aria-label={`Field for column ${h}`} value={map[i]} onChange={(e) => setMap((m) => m.map((x, k) => (k === i ? e.target.value : x)))}>
                      {FIELDS.map((f) => <option key={f}>{f}</option>)}
                    </select>
                  </th>
                ))}</tr>
              </thead>
              <tbody>
                {body.slice(0, 5).map((r, i) => <tr key={i}>{header.map((_, k) => <td key={k} className={`td ${map[k] === "Do not import" ? "text-mute" : ""}`}>{r[k]}</td>)}</tr>)}
              </tbody>
            </table>
          </div>
          <div className="flex flex-wrap items-center justify-between gap-3 border-t border-line/60 px-5 py-4">
            <p className="text-xs text-mute">Creating profiles needs the secure database, which is the next build step.</p>
            <button className="btn btn-primary" disabled>Create {body.length} profiles</button>
          </div>
        </Card>
      )}
    </>
  );
}
