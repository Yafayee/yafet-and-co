"use client";

import { CheckCircle2, Download, FileSpreadsheet, ShieldCheck, Upload } from "lucide-react";
import Link from "next/link";
import { useMemo, useState, type ChangeEvent } from "react";
import { Card, PageHeader, StatusChip } from "@/components/ui";
import { logEvent } from "@/lib/actions";
import { convert, FIELDS, guessMapping, readFile, TEMPLATE_CSV, type Cell, type Field } from "@/lib/importer";
import { productsOf } from "@/lib/rules";
import { download, toCsv } from "@/lib/send";
import { useStore } from "@/lib/store";

const show = (v: Cell) => (v instanceof Date ? v.toISOString().slice(0, 10) : v === null || v === undefined ? "" : String(v));

export default function ImportPage() {
  const { db, update, mode } = useStore();
  const [file, setFile] = useState("");
  const [rows, setRows] = useState<Cell[][]>([]);
  const [map, setMap] = useState<Field[]>([]);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState<{ created: number; updated: number } | null>(null);
  const [overwrite, setOverwrite] = useState(false);

  const onFile = async (e: ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    e.target.value = "";
    if (!f) return;
    setError(""); setDone(null); setBusy(true);
    try {
      const data = await readFile(f);
      if (data.length < 2) { setError("This file has no data rows. It needs a first row with column names and at least one customer row."); setRows([]); setFile(""); }
      else { setFile(f.name); setRows(data); setMap(guessMapping(data[0].map(show))); }
    } catch (err) { setError(err instanceof Error ? err.message : "This file could not be read."); setRows([]); setFile(""); }
    setBusy(false);
  };

  const header = (rows[0] ?? []).map(show);
  const body = useMemo(() => rows.slice(1), [rows]);
  const result = useMemo(() => (body.length ? convert(body, map, db.customers, file, overwrite, productsOf(db)) : null), [body, map, db, file, overwrite]);
  const hasName = map.includes("Last name") || map.includes("Full name") || map.includes("First name");
  const step = done ? 4 : rows.length === 0 ? 1 : 2;

  const apply = () => {
    if (!result) return;
    update((d) => {
      for (const c of result.create) { d.customers.push(c); logEvent(d, { customerId: c.id, kind: "system", text: `Profile created from import (${file}).` }); }
      for (const u of result.update) { const i = d.customers.findIndex((x) => x.id === u.id); if (i >= 0) { d.customers[i] = u; logEvent(d, { customerId: u.id, kind: "system", text: `Profile updated from import (${file}).` }); } }
    }, `Imported ${file}: ${result.create.length} created, ${result.update.length} updated`);
    setDone({ created: result.create.length, updated: result.update.length });
    setRows([]); setFile("");
  };

  return (
    <>
      <PageHeader title="Import customers" subtitle="Upload an Excel or CSV list. Each person becomes a profile.">
        <button className="btn" onClick={() => download("customer-import-template.csv", TEMPLATE_CSV, "text/csv")}><Download className="h-4 w-4" /> Template file</button>
      </PageHeader>

      <ol className="mb-4 grid grid-cols-2 gap-2 sm:grid-cols-4">
        {["Upload file", "Match columns and check", "Create profiles", "Done"].map((s, i) => (
          <li key={s} className={`rounded-md border px-3 py-2 text-sm ${i + 1 === step ? "border-primary/60 bg-primary/10 text-white" : i + 1 < step ? "border-good/40 text-good" : "border-line text-mute"}`}>
            <span className="mr-1 font-semibold">{i + 1}</span> {s}
          </li>
        ))}
      </ol>

      {done && (
        <div className="card mb-4 flex flex-wrap items-center gap-4 p-5">
          <CheckCircle2 className="h-8 w-8 text-good" aria-hidden />
          <div className="min-w-0 flex-1 basis-56">
            <h2 className="text-base font-semibold text-white">Import finished</h2>
            <p className="text-sm text-ink-2">{done.created} {done.created === 1 ? "profile" : "profiles"} created, {done.updated} updated.{mode === "demo" ? " This is the demo, so they are not saved." : ""}</p>
          </div>
          <Link href="/customers/" className="btn btn-primary">View customers</Link>
        </div>
      )}

      <Card>
        <div className="p-5">
          <label className="flex cursor-pointer flex-col items-center gap-3 rounded-xl border border-dashed border-line px-4 py-10 text-center hover:border-primary/60 hover:bg-primary/5">
            {file ? <FileSpreadsheet className="h-8 w-8 text-teal" /> : <Upload className="h-8 w-8 text-primary" />}
            <span className="text-sm text-white">{busy ? "Reading file" : file ? `${file} · ${body.length} rows` : "Choose an Excel (.xlsx) or CSV file"}</span>
            <span className="text-xs text-mute">First row must hold the column names. German or English names are recognised.</span>
            <input type="file" accept=".csv,.xlsx,.txt,text/csv,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" className="sr-only" onChange={onFile} />
            <span className="btn btn-outline">{file ? "Choose another file" : "Browse"}</span>
          </label>
          <p className="mt-3 flex items-start gap-2 text-xs text-mute"><ShieldCheck className="h-4 w-4 shrink-0 text-good" /> The file is read on this device only. It is never uploaded to a server.</p>
          {error && <p className="mt-3 text-sm text-bad" role="alert">{error}</p>}
        </div>
      </Card>

      {result && (
        <>
          <Card title="Match columns" className="mt-4" action={<span className="text-xs text-mute">first 5 rows shown</span>}>
            <div className="mt-3 overflow-x-auto pb-3">
              <table className="w-full">
                <thead>
                  <tr>{header.map((h, i) => (
                    <th key={i} className="th min-w-[160px] align-top">
                      <span className="mb-1 block text-ink">{h || `Column ${i + 1}`}</span>
                      <select className="input !py-1 text-xs" aria-label={`Field for column ${h}`} value={map[i]} onChange={(e) => setMap((m) => m.map((x, k) => (k === i ? (e.target.value as Field) : x)))}>
                        {FIELDS.map((f) => <option key={f}>{f}</option>)}
                      </select>
                    </th>
                  ))}</tr>
                </thead>
                <tbody>
                  {body.slice(0, 5).map((r, i) => <tr key={i}>{header.map((_, k) => <td key={k} className={`td ${map[k] === "Do not import" ? "text-mute" : ""}`}>{show(r[k])}</td>)}</tr>)}
                </tbody>
              </table>
            </div>
          </Card>

          <Card title="Check before creating" className="mt-4">
            <div className="flex flex-wrap gap-2 px-5 pt-3">
              <StatusChip tone="good">{result.create.length} new {result.create.length === 1 ? "profile" : "profiles"}</StatusChip>
              <StatusChip tone="info">{result.update.length} existing profiles updated</StatusChip>
              {result.merged > 0 && <StatusChip tone="info">{result.merged} {result.merged === 1 ? "row" : "rows"} merged into the same person</StatusChip>}
              {result.skipped > 0 && <StatusChip tone="warn">{result.skipped} {result.skipped === 1 ? "row" : "rows"} skipped</StatusChip>}
              <StatusChip tone={result.issues.length ? "warn" : "good"}>{result.issues.length ? `${result.issues.length} notes` : "No problems found"}</StatusChip>
            </div>
            {!hasName && <p className="mx-5 mt-3 rounded-md border border-bad/40 bg-bad/10 px-3 py-2 text-sm text-bad">Match at least one column to a name field (First name, Last name or Full name).</p>}
            {!result.consentMapped && (
              <p className="mx-5 mt-3 rounded-md border border-warn/30 bg-warn/5 px-3 py-2 text-sm text-warn">
                No consent column is matched. Profiles will be created with all messaging switched off, and you can switch it on per customer once they have agreed.
              </p>
            )}
            {result.consentMapped && result.update.length > 0 && (
              <label className="mx-5 mt-3 flex items-start gap-2 text-sm text-ink-2">
                <input type="checkbox" className="mt-0.5 h-4 w-4 accent-[#2b8cee]" checked={overwrite} onChange={(e) => setOverwrite(e.target.checked)} />
                <span>Replace the consent already recorded for the {result.update.length} existing profiles with the values in this file. Leave this off unless the file is newer than what is in the system; otherwise an opt-out could be undone.</span>
              </label>
            )}
            {result.issues.length > 0 && (
              <div className="px-5 pt-3">
                <ul className="max-h-48 space-y-1 overflow-y-auto rounded-md border border-line/70 bg-night/60 p-3 text-xs text-ink-2">
                  {result.issues.slice(0, 100).map((x, i) => <li key={i}><span className="tabular-nums text-mute">Row {x.row}:</span> {x.message}</li>)}
                  {result.issues.length > 100 && <li className="text-mute">and {result.issues.length - 100} more</li>}
                </ul>
                <button className="mt-2 text-xs text-primary hover:underline" onClick={() => download("import-notes.csv", toCsv([["Row", "Note"], ...result.issues.map((x) => [x.row, x.message])]), "text/csv")}>Download all notes</button>
              </div>
            )}
            <div className="mt-4 flex flex-wrap items-center justify-between gap-3 border-t border-line/60 px-5 py-4">
              <p className="text-xs text-mute">People already in the system (same email, or same name and date of birth) are updated, not duplicated.</p>
              <button className="btn btn-primary" disabled={!hasName || result.create.length + result.update.length === 0} onClick={apply}>
                Create {result.create.length} and update {result.update.length} profiles
              </button>
            </div>
          </Card>
        </>
      )}
    </>
  );
}
