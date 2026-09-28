"""Pick best Supertonic voice + best take per line from eval scores; copy to lines_final/."""
import json, re, shutil, os, collections
rows = [l.split('\t') for l in open('st3_takes.tsv').read().splitlines()]
scores = [json.loads(l) for l in open('st3_scores.jsonl') if l.strip()]
assert len(scores) == len(rows), (len(scores), len(rows))
by = collections.defaultdict(lambda: collections.defaultdict(list))
for (path, lang, text), s in zip(rows, scores):
    m = re.search(r'/F(\d)/(\w+)_(\d)\.wav', path)
    v, lid = 'F' + m.group(1), m.group(2)
    s['path'] = path; s['lang'] = lang; s['text'] = text
    by[v][lid].append(s)

def take_score(s):
    # intelligibility first (CER), then naturalness (MOS)
    return s['mos'] - 4.0 * min(s['cer'], 1.0)

summary = {}
for v, lines in sorted(by.items()):
    best = {lid: max(ts, key=take_score) for lid, ts in lines.items()}
    de = [b for b in best.values() if b['lang'] == 'de']; en = [b for b in best.values() if b['lang'] == 'en']
    mean = lambda xs, k: sum(x[k] for x in xs) / len(xs)
    summary[v] = dict(score=round(mean(list(best.values()), 'mos') - 4 * mean(list(best.values()), 'cer'), 3),
                      mos_de=round(mean(de, 'mos'), 3), mos_en=round(mean(en, 'mos'), 3),
                      cer_de=round(mean(de, 'cer'), 3), cer_en=round(mean(en, 'cer'), 3), best=best)
    print(v, {k: summary[v][k] for k in ('score', 'mos_de', 'mos_en', 'cer_de', 'cer_en')})
win = max(summary, key=lambda v: summary[v]['score'])
print('WINNER', win)
os.makedirs('lines_final', exist_ok=True)
for lid, b in summary[win]['best'].items():
    shutil.copy(b['path'], f'lines_final/{lid}.wav')
    print(f"  {lid:6s} cer={b['cer']:.3f} mos={b['mos']:.2f}  heard: {b['transcript']!r}")
json.dump({v: {k: x for k, x in s.items() if k != 'best'} for v, s in summary.items()} | {'winner': win}, open('st3_summary.json', 'w'), indent=1)
