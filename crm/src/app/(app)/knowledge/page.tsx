"use client";

import { BookOpen, GraduationCap, ShieldAlert, Sparkles, Trash2, TrendingUp } from "lucide-react";
import { useMemo, useState, type FormEvent, type ReactNode } from "react";
import { Card, ConfidenceChip, PageHeader, StatusChip } from "@/components/ui";
import { MODEL, readDocument, toCondition, toConfidence, toGuide, type Proposal } from "@/lib/ai";
import { todayIso } from "@/lib/dates";
import { GUIDES, RULES } from "@/lib/knowledge";
import { hasProduct, learned, matches as matchesNow, productsOf } from "@/lib/rules";
import { uid } from "@/lib/send";
import { useStore } from "@/lib/store";
import type { Condition, Confidence, DB, Guide, Product } from "@/lib/types";

const lines = (s: string) => s.split("\n").map((x) => x.trim()).filter(Boolean);

function List({ label, items }: { label: string; items: string[] }) {
  if (items.length === 0) return null;
  return (
    <div>
      <h3 className="label">{label}</h3>
      <ul className="mt-1 list-disc space-y-1 pl-4 text-sm text-ink-2">{items.map((x) => <li key={x}>{x}</li>)}</ul>
    </div>
  );
}

function GuideBody({ g }: { g: Guide }) {
  return (
    <>
      <p className="text-sm text-ink">{g.summary}</p>
      <div className="mt-4 grid gap-5 md:grid-cols-2">
        <List label="Who it fits" items={g.fits} />
        <List label="Questions to ask" items={g.ask} />
        <List label="Points you can make" items={g.say} />
        <List label="Do not say" items={g.never} />
      </div>
      <p className="mt-4 text-xs text-mute">Source: {g.source}</p>
    </>
  );
}

function describe(w: Condition): string {
  const parts: string[] = [];
  if (w.has.length) parts.push(`has ${w.has.join(" and ")}`);
  if (w.lacks.length) parts.push(`without ${w.lacks.join(" and ")}`);
  if (w.ageMin !== null || w.ageMax !== null) parts.push(`aged ${w.ageMin ?? "any"} to ${w.ageMax ?? "any"}`);
  if (w.housing !== "any") parts.push({ rent: "rents", owner: "owns without a home loan", mortgage: "owns with a home loan", unknown: "home not known" }[w.housing]);
  if (w.children !== "any") parts.push(w.children === "yes" ? "has children" : "no children");
  if (w.ownsCar !== "any") parts.push(w.ownsCar === "yes" ? "owns a car" : "no car");
  return parts.length ? parts.join(", ") : "every customer without the product";
}

/** Adds a product to the taught list if it is not known yet. */
function ensureProduct(d: DB, name: Product, de: string, en: string) {
  if (!productsOf(d).includes(name)) d.knowledge.products.push({ name, de: de.trim() || name, en: en.trim() || name.toLowerCase() });
}

type Kind = "guide" | "rec" | "rule" | "avoid";
const blankCondition = (): Condition => ({ has: [], lacks: [], ageMin: null, ageMax: null, housing: "any", children: "any", ownsCar: "any" });

function TeachByHand() {
  const { db, update } = useStore();
  const products = productsOf(db);
  const [kind, setKind] = useState<Kind>("guide");
  const [product, setProduct] = useState(products[0]);
  const [newName, setNewName] = useState({ name: "", de: "", en: "" });
  const [g, setG] = useState({ summary: "", fits: "", ask: "", say: "", never: "", source: "" });
  const [rec, setRec] = useState<{ reason: string; confidence: Confidence; when: Condition }>({ reason: "", confidence: "medium", when: blankCondition() });
  const [rule, setRule] = useState({ title: "", text: "", source: "" });
  const [phrase, setPhrase] = useState("");
  const [done, setDone] = useState("");
  const isNew = product === "__new";
  const name = isNew ? newName.name.trim() : product;
  const setWhen = (patch: Partial<Condition>) => setRec((r) => ({ ...r, when: { ...r.when, ...patch } }));
  const multi = (value: Product[], onChange: (v: Product[]) => void, label: string) => (
    <label className="block"><span className="label">{label}</span>
      <select multiple className="input mt-1 h-28" value={value} onChange={(e) => onChange([...e.target.selectedOptions].map((o) => o.value))}>
        {products.map((p) => <option key={p}>{p}</option>)}
      </select>
    </label>
  );

  const submit = (e: FormEvent) => {
    e.preventDefault();
    if (kind === "guide" || kind === "rec") { if (!name) return; }
    if (kind === "guide") {
      update((d) => {
        ensureProduct(d, name, newName.de, newName.en);
        d.knowledge.guides.push({ id: uid(), product: name, addedAt: todayIso(), title: name, summary: g.summary.trim(), fits: lines(g.fits), ask: lines(g.ask), say: lines(g.say), never: lines(g.never), source: g.source.trim() || "Entered by hand" });
      }, `Taught product knowledge for ${name}`);
      setG({ summary: "", fits: "", ask: "", say: "", never: "", source: "" });
    } else if (kind === "rec") {
      if (!rec.reason.trim()) return;
      update((d) => {
        ensureProduct(d, name, newName.de, newName.en);
        d.knowledge.recs.push({ id: uid(), product: name, confidence: rec.confidence, reason: rec.reason.trim(), when: rec.when, source: "Entered by hand" });
      }, `Taught a recommendation rule for ${name}`);
      setRec({ reason: "", confidence: "medium", when: blankCondition() });
    } else if (kind === "rule") {
      if (!rule.title.trim() || !rule.text.trim()) return;
      update((d) => { d.knowledge.rules.push({ id: uid(), title: rule.title.trim(), text: rule.text.trim(), source: rule.source.trim() || "Entered by hand" }); }, `Taught the rule "${rule.title.trim()}"`);
      setRule({ title: "", text: "", source: "" });
    } else {
      if (!phrase.trim()) return;
      update((d) => { for (const x of lines(phrase.replace(/,/g, "\n"))) if (!d.knowledge.avoid.includes(x)) d.knowledge.avoid.push(x); }, "Added phrases to avoid");
      setPhrase("");
    }
    if (isNew) { setProduct(name); setNewName({ name: "", de: "", en: "" }); }
    setDone("Added. It applies from now on."); setTimeout(() => setDone(""), 4000);
  };

  const area = (label: string, value: string, onChange: (v: string) => void) => (
    <label className="block"><span className="label">{label} (one per line)</span><textarea className="input mt-1 min-h-20" value={value} onChange={(e) => onChange(e.target.value)} /></label>
  );

  return (
    <form onSubmit={submit} className="space-y-4">
      <div className="flex flex-wrap gap-1 rounded-lg border border-line bg-night-2/50 p-1" role="tablist">
        {([["guide", "Product knowledge"], ["rec", "When to recommend"], ["rule", "Rule to follow"], ["avoid", "Words to avoid"]] as [Kind, string][]).map(([k, label]) => (
          <button key={k} type="button" role="tab" aria-selected={kind === k} onClick={() => setKind(k)} className={`rounded-md px-3 py-1.5 text-sm font-medium ${kind === k ? "bg-primary text-white" : "text-ink-2 hover:bg-white/5"}`}>{label}</button>
        ))}
      </div>

      {(kind === "guide" || kind === "rec") && (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <label className="block"><span className="label">Product</span>
            <select className="input mt-1" value={product} onChange={(e) => setProduct(e.target.value)}>
              {products.map((p) => <option key={p}>{p}</option>)}
              <option value="__new">New product</option>
            </select>
          </label>
          {isNew && (
            <>
              <label className="block"><span className="label">Name</span><input className="input mt-1" value={newName.name} onChange={(e) => setNewName({ ...newName, name: e.target.value })} placeholder="Travel insurance" required /></label>
              <label className="block"><span className="label">German, as in a sentence</span><input className="input mt-1" value={newName.de} onChange={(e) => setNewName({ ...newName, de: e.target.value })} placeholder="Reiseversicherung" /></label>
              <label className="block"><span className="label">English, as in a sentence</span><input className="input mt-1" value={newName.en} onChange={(e) => setNewName({ ...newName, en: e.target.value })} placeholder="travel insurance" /></label>
            </>
          )}
        </div>
      )}

      {kind === "guide" && (
        <>
          <label className="block"><span className="label">What it is, in two or three sentences</span><textarea className="input mt-1 min-h-20" value={g.summary} onChange={(e) => setG({ ...g, summary: e.target.value })} required /></label>
          <div className="grid gap-3 md:grid-cols-2">
            {area("Who it fits", g.fits, (v) => setG({ ...g, fits: v }))}
            {area("Questions to ask", g.ask, (v) => setG({ ...g, ask: v }))}
            {area("Points you can make", g.say, (v) => setG({ ...g, say: v }))}
            {area("Do not say", g.never, (v) => setG({ ...g, never: v }))}
          </div>
          <label className="block"><span className="label">Source (document name and date)</span><input className="input mt-1" value={g.source} onChange={(e) => setG({ ...g, source: e.target.value })} /></label>
        </>
      )}

      {kind === "rec" && (
        <>
          <div className="grid gap-3 md:grid-cols-[2fr_1fr]">
            <label className="block"><span className="label">Reason shown to you</span><input className="input mt-1" value={rec.reason} onChange={(e) => setRec({ ...rec, reason: e.target.value })} placeholder="Travels often but has no travel cover." required /></label>
            <label className="block"><span className="label">Fit</span>
              <select className="input mt-1" value={rec.confidence} onChange={(e) => setRec({ ...rec, confidence: e.target.value as Confidence })}><option value="high">Strong fit</option><option value="medium">Possible fit</option><option value="low">Ask first</option></select>
            </label>
          </div>
          <p className="text-sm text-ink-2">Suggest it to customers who do not have the product and who match all of the following. Leave a field open to ignore it.</p>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {multi(rec.when.has, (v) => setWhen({ has: v }), "Already has (hold Ctrl to pick several)")}
            {multi(rec.when.lacks, (v) => setWhen({ lacks: v }), "Does not have")}
            <div className="space-y-3">
              <label className="block"><span className="label">Age from</span><input type="number" min={0} max={120} className="input mt-1" value={rec.when.ageMin ?? ""} onChange={(e) => setWhen({ ageMin: e.target.value === "" ? null : Number(e.target.value) })} /></label>
              <label className="block"><span className="label">Age to</span><input type="number" min={0} max={120} className="input mt-1" value={rec.when.ageMax ?? ""} onChange={(e) => setWhen({ ageMax: e.target.value === "" ? null : Number(e.target.value) })} /></label>
            </div>
            <div className="space-y-3">
              <label className="block"><span className="label">Home</span><select className="input mt-1" value={rec.when.housing} onChange={(e) => setWhen({ housing: e.target.value as Condition["housing"] })}><option value="any">Any</option><option value="rent">Rents</option><option value="owner">Owns, no home loan</option><option value="mortgage">Owns, with a home loan</option></select></label>
              <label className="block"><span className="label">Children</span><select className="input mt-1" value={rec.when.children} onChange={(e) => setWhen({ children: e.target.value as Condition["children"] })}><option value="any">Any</option><option value="yes">Yes</option><option value="no">No</option></select></label>
              <label className="block"><span className="label">Car</span><select className="input mt-1" value={rec.when.ownsCar} onChange={(e) => setWhen({ ownsCar: e.target.value as Condition["ownsCar"] })}><option value="any">Any</option><option value="yes">Owns a car</option><option value="no">No car</option></select></label>
            </div>
          </div>
          <p className="text-sm text-ink-2">Matches <span className="font-semibold text-white">{name ? db.customers.filter((c) => !hasProduct(c, name) && matchesNow(c, rec.when)).length : 0}</span> of your customers today.</p>
        </>
      )}

      {kind === "rule" && (
        <div className="grid gap-3 md:grid-cols-2">
          <label className="block"><span className="label">Short title</span><input className="input mt-1" value={rule.title} onChange={(e) => setRule({ ...rule, title: e.target.value })} required /></label>
          <label className="block"><span className="label">Source</span><input className="input mt-1" value={rule.source} onChange={(e) => setRule({ ...rule, source: e.target.value })} placeholder="OVB guideline, 2026" /></label>
          <label className="block md:col-span-2"><span className="label">The rule</span><textarea className="input mt-1 min-h-20" value={rule.text} onChange={(e) => setRule({ ...rule, text: e.target.value })} required /></label>
        </div>
      )}

      {kind === "avoid" && (
        <label className="block"><span className="label">Words or phrases that must not appear in a message (one per line)</span><textarea className="input mt-1 min-h-20" value={phrase} onChange={(e) => setPhrase(e.target.value)} placeholder={"steuerfrei\nbeste Rendite"} required /></label>
      )}

      <div className="flex flex-wrap items-center gap-3">
        <button className="btn btn-primary">Add to the system</button>
        {done && <span className="text-sm text-good" role="status">{done}</span>}
      </div>
    </form>
  );
}


function TeachWithAi() {
  const { db, update, mode } = useStore();
  const products = productsOf(db);
  const [key, setKey] = useState(db.knowledge.apiKey);
  const [file, setFile] = useState<File | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [result, setResult] = useState<{ p: Proposal; source: string } | null>(null);
  const [off, setOff] = useState<Set<string>>(new Set());
  const [done, setDone] = useState("");
  const flip = (id: string) => setOff((s) => { const n = new Set(s); if (n.has(id)) n.delete(id); else n.add(id); return n; });

  const run = async (e: FormEvent) => {
    e.preventDefault();
    if (!file || !key.trim()) return;
    setBusy(true); setError(""); setResult(null); setDone(""); setOff(new Set());
    if (key.trim() !== db.knowledge.apiKey) update((d) => { d.knowledge.apiKey = key.trim(); }, "Saved an AI key in the workspace");
    try { setResult({ p: await readDocument(key.trim(), file, products), source: `${file.name}, read ${todayIso()}` }); }
    catch (err) { setError(err instanceof Error ? err.message : "Reading the document failed."); }
    setBusy(false);
  };

  const add = () => {
    if (!result) return;
    const { p, source } = result;
    const known0 = [...products, ...p.products.filter((_, i) => !off.has(`p${i}`)).map((x) => x.name.trim())];
    const n = p.products.filter((_, i) => !off.has(`p${i}`)).length
      + p.recommendations.filter((x, i) => !off.has(`r${i}`) && known0.includes(x.product.trim())).length
      + p.conduct_rules.filter((_, i) => !off.has(`c${i}`)).length
      + p.phrases_to_avoid.filter((x, i) => !off.has(`a${i}`) && !db.knowledge.avoid.includes(x)).length;
    update((d) => {
      p.products.forEach((x, i) => { if (off.has(`p${i}`)) return; ensureProduct(d, x.name.trim(), x.german_name, x.english_phrase); d.knowledge.guides.push({ ...toGuide(x, source), id: uid(), product: x.name.trim(), addedAt: todayIso() }); });
      const known = productsOf(d);
      p.recommendations.forEach((x, i) => { if (off.has(`r${i}`) || !known.includes(x.product.trim())) return; d.knowledge.recs.push({ id: uid(), product: x.product.trim(), confidence: toConfidence(x.fit), reason: x.reason, when: toCondition(x, known), source }); });
      p.conduct_rules.forEach((x, i) => { if (off.has(`c${i}`)) return; d.knowledge.rules.push({ id: uid(), title: x.title, text: x.text, source }); });
      p.phrases_to_avoid.forEach((x, i) => { if (off.has(`a${i}`) || d.knowledge.avoid.includes(x)) return; d.knowledge.avoid.push(x); });
    }, `Learned from document ${file?.name ?? ""}`);
    setResult(null); setDone(`${n} ${n === 1 ? "item" : "items"} added from the document.`);
  };

  const Item = ({ id, children }: { id: string; children: ReactNode }) => (
    <label className="flex cursor-pointer items-start gap-3 rounded-md border border-line/70 bg-night-2/40 p-3">
      <input type="checkbox" className="mt-1 h-4 w-4 shrink-0 accent-[#2b8cee]" checked={!off.has(id)} onChange={() => flip(id)} />
      <span className="min-w-0 flex-1 text-sm text-ink-2">{children}</span>
    </label>
  );

  return (
    <div className="space-y-4">
      <div className="rounded-md border border-line bg-night-2/50 px-3 py-2 text-sm text-ink-2">
        Optional and paid. The document is sent to Anthropic&apos;s Claude ({MODEL}) with your own API key, and you review the result before anything is added. Reading one brochure usually costs a few cents. Customer data is never sent. Do not upload documents that contain customer data.
      </div>
      <form onSubmit={run} className="grid gap-3 md:grid-cols-2">
        <label className="block"><span className="label">Anthropic API key (kept in your encrypted workspace)</span><input type="password" className="input mt-1" value={key} onChange={(e) => setKey(e.target.value)} placeholder="sk-ant-..." autoComplete="off" required /></label>
        <label className="block"><span className="label">Document (PDF or text)</span><input type="file" accept=".pdf,.txt,.md,application/pdf,text/plain" className="input mt-1" onChange={(e) => setFile(e.target.files?.[0] ?? null)} required /></label>
        <div className="flex flex-wrap items-center gap-3 md:col-span-2">
          <button className="btn btn-primary" disabled={busy || !file || !key.trim()}><Sparkles className="h-4 w-4" /> {busy ? "Reading, this can take a minute" : "Read document"}</button>
          {db.knowledge.apiKey && <button type="button" className="text-xs text-mute hover:text-bad hover:underline" onClick={() => { update((d) => { d.knowledge.apiKey = ""; }, "Removed the AI key"); setKey(""); }}>Remove saved key</button>}
          {mode === "demo" && <span className="text-xs text-warn">In the demo the key is not saved.</span>}
        </div>
      </form>
      {error && <p className="text-sm text-bad" role="alert">{error}</p>}
      {done && <p className="text-sm text-good" role="status">{done}</p>}

      {result && (
        <div className="space-y-3 border-t border-line/60 pt-4">
          <h3 className="text-base font-semibold text-white">Review what was found</h3>
          <p className="text-sm text-ink-2">Untick anything that is wrong. An AI can misread a document, so check the rules against the original.</p>
          {result.p.products.map((x, i) => <Item key={`p${i}`} id={`p${i}`}><span className="font-medium text-white">Product: {x.name}</span>{!products.includes(x.name.trim()) && <span className="ml-2"><StatusChip tone="info">new</StatusChip></span>}<span className="mt-1 block">{x.summary}</span><span className="mt-1 block text-xs text-mute">{x.fits.length} fits · {x.ask.length} questions · {x.say.length} points · {x.never.length} things not to say</span></Item>)}
          {result.p.recommendations.map((x, i) => <Item key={`r${i}`} id={`r${i}`}><span className="font-medium text-white">Recommend {x.product}</span> when the customer {describe(toCondition(x, [...products, ...result.p.products.map((y) => y.name.trim())]))}.<span className="mt-1 block">{x.reason}</span></Item>)}
          {result.p.conduct_rules.map((x, i) => <Item key={`c${i}`} id={`c${i}`}><span className="font-medium text-white">Rule: {x.title}</span><span className="mt-1 block">{x.text}</span></Item>)}
          {result.p.phrases_to_avoid.map((x, i) => <Item key={`a${i}`} id={`a${i}`}>Avoid the phrase <span className="font-medium text-white">{x}</span> in messages.</Item>)}
          {result.p.products.length + result.p.recommendations.length + result.p.conduct_rules.length + result.p.phrases_to_avoid.length === 0
            ? <p className="text-sm text-mute">Nothing usable was found in this document.</p>
            : <button className="btn btn-primary" onClick={add}>Add the ticked items</button>}
        </div>
      )}
    </div>
  );
}

export default function KnowledgePage() {
  const { db, update } = useStore();
  const [tab, setTab] = useState<"hand" | "ai">("hand");
  const products = productsOf(db);
  const k = db.knowledge;
  const stats = useMemo(() => [...learned(db).entries()].sort((a, b) => b[1].suggested - a[1].suggested), [db]);
  const holders = (p: Product) => db.customers.filter((c) => hasProduct(c, p)).length;
  const taught = new Set(k.guides.map((g) => g.product));
  const builtIn = products.filter((p) => GUIDES[p] && !taught.has(p));
  const missing = products.filter((p) => !GUIDES[p] && !taught.has(p));
  const remove = (what: string, fn: (d: DB) => void) => update(fn, `Removed ${what} from the product guide`);
  const Del = ({ label, onClick }: { label: string; onClick: () => void }) => <button className="text-mute hover:text-bad" aria-label={label} onClick={onClick}><Trash2 className="h-4 w-4" /></button>;

  return (
    <>
      <PageHeader title="Product guide" subtitle="What the system knows about each product, the rules for talking about it, and how to teach it more." />

      <Card title="Teach the system" action={<GraduationCap className="h-5 w-5 text-primary" aria-hidden />}>
        <div className="px-5 pb-5 pt-3">
          <div className="mb-4 flex flex-wrap gap-2">
            <button className={`btn ${tab === "hand" ? "btn-outline" : ""}`} onClick={() => setTab("hand")}>Add by hand (free)</button>
            <button className={`btn ${tab === "ai" ? "btn-outline" : ""}`} onClick={() => setTab("ai")}><Sparkles className="h-4 w-4" /> Read a document with AI</button>
          </div>
          {tab === "hand" ? <TeachByHand /> : <TeachWithAi />}
        </div>
      </Card>

      <Card title="Learned from your results" className="mt-4" action={<TrendingUp className="h-5 w-5 text-teal" aria-hidden />}>
        <div className="px-5 pb-5 pt-3">
          <p className="text-sm text-ink-2">Every opportunity you mark as won or dismissed teaches the ranking. After five decisions for a product, one that is won at least half the time is ranked higher, and one that is won 15% of the time or less is ranked lower.</p>
          {stats.length === 0 ? <p className="mt-3 text-sm text-mute">No outcomes recorded yet. Set the status of opportunities as you work and this fills in.</p> : (
            <div className="mt-3 overflow-x-auto">
              <table className="w-full min-w-[520px]">
                <thead><tr><th className="th">Product</th><th className="th text-right">Contacted</th><th className="th text-right">Won</th><th className="th text-right">Dismissed</th><th className="th">Effect on ranking</th></tr></thead>
                <tbody>
                  {stats.map(([p, l]) => (
                    <tr key={p}><td className="td font-medium text-white">{p}</td><td className="td text-right tabular-nums">{l.contacted}</td><td className="td text-right tabular-nums">{l.won}</td><td className="td text-right tabular-nums">{l.dismissed}</td>
                      <td className="td">{l.shift === 1 ? <StatusChip tone="good">Ranked higher</StatusChip> : l.shift === -1 ? <StatusChip tone="warn">Ranked lower</StatusChip> : <span className="text-sm text-mute">{l.won + l.dismissed >= 5 ? "No change" : `Needs ${5 - l.won - l.dismissed} more decisions`}</span>}</td></tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </Card>

      <Card title="Rules for every message and conversation" className="mt-4" action={<ShieldAlert className="h-5 w-5 text-warn" aria-hidden />}>
        <ul className="grid gap-x-6 gap-y-3 px-5 pb-4 pt-3 md:grid-cols-2">
          {k.rules.map((r) => (
            <li key={r.id} className="flex gap-2">
              <div className="min-w-0 flex-1"><span className="text-sm font-medium text-white">{r.title}</span> <StatusChip tone="info">taught</StatusChip><p className="text-sm text-ink-2">{r.text}</p><p className="mt-0.5 text-xs text-mute">Source: {r.source}</p></div>
              <Del label={`Remove rule ${r.title}`} onClick={() => remove(`rule "${r.title}"`, (d) => { d.knowledge.rules = d.knowledge.rules.filter((x) => x.id !== r.id); })} />
            </li>
          ))}
          {RULES.map((r) => (
            <li key={r.title}><span className="text-sm font-medium text-white">{r.title}</span><p className="text-sm text-ink-2">{r.text}</p><p className="mt-0.5 text-xs text-mute">Source: {r.source}</p></li>
          ))}
        </ul>
        {k.avoid.length > 0 && (
          <div className="border-t border-line/60 px-5 py-4">
            <h3 className="label">Words the message check flags</h3>
            <div className="mt-2 flex flex-wrap gap-1.5">{k.avoid.map((x) => <span key={x} className="chip">{x}<button className="ml-1 text-mute hover:text-bad" aria-label={`Remove ${x}`} onClick={() => remove(`phrase "${x}"`, (d) => { d.knowledge.avoid = d.knowledge.avoid.filter((y) => y !== x); })}>×</button></span>)}</div>
          </div>
        )}
      </Card>

      {k.recs.length > 0 && (
        <Card title="Recommendation rules you taught" className="mt-4">
          <ul className="space-y-2 px-5 pb-5 pt-3">
            {k.recs.map((r) => (
              <li key={r.id} className="flex items-start gap-3 rounded-md border border-line/70 bg-night-2/40 p-3">
                <div className="min-w-0 flex-1 text-sm text-ink-2"><span className="font-medium text-white">{r.product}</span> <ConfidenceChip level={r.confidence} /><span className="mt-1 block">When the customer {describe(r.when)}.</span><span className="block">{r.reason}</span><span className="mt-0.5 block text-xs text-mute">Source: {r.source}</span></div>
                <Del label={`Remove recommendation rule for ${r.product}`} onClick={() => remove(`a recommendation rule for ${r.product}`, (d) => { d.knowledge.recs = d.knowledge.recs.filter((x) => x.id !== r.id); })} />
              </li>
            ))}
          </ul>
        </Card>
      )}

      <div className="mt-4 grid grid-cols-1 gap-4">
        {k.guides.map((g) => (
          <Card key={g.id} title={g.title} action={<span className="flex items-center gap-2"><StatusChip tone="info">taught {g.addedAt}</StatusChip><Del label={`Remove guide ${g.title}`} onClick={() => remove(`the guide for ${g.product}`, (d) => { d.knowledge.guides = d.knowledge.guides.filter((x) => x.id !== g.id); })} /></span>}>
            <div className="px-5 pb-5 pt-2"><GuideBody g={g} /></div>
          </Card>
        ))}
        {builtIn.map((p) => (
          <Card key={p} title={GUIDES[p]!.title} action={<StatusChip tone="mute">{holders(p)} {holders(p) === 1 ? "customer has" : "customers have"} it</StatusChip>}>
            <div className="px-5 pb-5 pt-2"><GuideBody g={GUIDES[p]!} /></div>
          </Card>
        ))}
      </div>

      {missing.length > 0 && (
        <Card title="No material yet" className="mt-4" action={<BookOpen className="h-5 w-5 text-mute" aria-hidden />}>
          <div className="px-5 pb-5 pt-3">
            <p className="text-sm text-ink-2">These products are recommended by the general rules, but the guide has no details for them. Teach them above.</p>
            <div className="mt-3 flex flex-wrap gap-1.5">{missing.map((p) => <span key={p} className="chip">{p}</span>)}</div>
          </div>
        </Card>
      )}
    </>
  );
}
