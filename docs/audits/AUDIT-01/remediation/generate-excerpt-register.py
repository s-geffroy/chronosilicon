#!/usr/bin/env python3
"""AUD-012/017 excerpt register (REMEDIATION-01). Read-only; standard library.
Run from the repository root: python3 -I docs/audits/AUDIT-01/remediation/generate-excerpt-register.py
Lists every verbatim third-party text held by the project, where it is held, the
declared redistribution of its sources, and whether it was public at the audit
baseline and is public in the release candidate (data/validated/corpus.json).
Quoted-span detection mirrors packages/ontology/src/publication.ts (>= 6 words)."""
import csv, json, os, re, subprocess

ROOT = os.getcwd()
OUT = os.path.join(ROOT, 'docs/audits/AUDIT-01/remediation')
QUOTED = re.compile(r"“([^”]+)”|\"([^\"]+)\"|«\s*([^»]+?)\s*»|(?:(?<=^)|(?<=[\s(\[]))'([^']+)'(?=$|[\s.,;:)\]])")
UNDER_REVIEW = {'src-nasa-voyager-where'}

def load(rel, rev=None):
    if rev:
        return json.loads(subprocess.run(['git', 'show', f'{rev}:{rel}'], cwd=ROOT, capture_output=True, text=True, check=True).stdout)
    with open(os.path.join(ROOT, rel), encoding='utf-8') as f:
        return json.load(f)

cur = load('data/curated/measurements.json')['measurements']
src = {s['id']: s for s in load('data/sources/sources.json')['sources']}
base = {m['id']: m for m in load('data/validated/corpus.json', 'audit-01-baseline')['measurements']}
rc = {m['id']: m for m in load('data/validated/corpus.json')['measurements']}

def spans(text):
    for m in QUOTED.finditer(text or ''):
        inner = next(g for g in m.groups() if g is not None).strip()
        if len(inner.split()) >= 6:
            yield inner

rows = []
for m in cur:
    texts = []
    if m.get('quote'): texts.append(('quote', m['quote']))
    if m.get('uncertainty'): texts.append(('uncertainty.statement', m['uncertainty']['statement']))
    for f in ('notes', 'protocol'):
        for s in spans(m.get(f)): texts.append((f + ' (quoted span)', s))
    for lang in ('fr', 'en'):
        for s in spans(m['conditions'][lang]): texts.append((f'conditions.{lang} (quoted span)', s))
    reds = [src.get(s, {}).get('redistribution', '?') for s in m['sourceIds']]
    open_ = all(r == 'allowed' and s not in UNDER_REVIEW for s, r in zip(m['sourceIds'], reds))
    for field, text in texts:
        b = base.get(m['id']); r = rc.get(m['id'])
        def public_in(c):
            if c is None: return 'not published (value not qualified)'
            blob = json.dumps(c, ensure_ascii=False)
            return 'yes' if json.dumps(text, ensure_ascii=False)[1:-1] in blob else 'no'
        rows.append({
            'measurementId': m['id'], 'field': field, 'words': len(text.split()), 'chars': len(text),
            'sourceIds': ' '.join(m['sourceIds']), 'redistribution': ' '.join(reds),
            'licenceDeclared': ' || '.join(src.get(s, {}).get('license', '?') for s in m['sourceIds']),
            'underReview': ' '.join(s for s in m['sourceIds'] if s in UNDER_REVIEW),
            'policy': 'publish' if open_ else 'withhold',
            'publicAtBaseline': public_in(b), 'publicInCandidate': public_in(r),
            'alsoHeldIn': f"data/raw ({m['rawRef']}); data/curated/measurements.json; Git history",
        })
cols = list(rows[0].keys())
with open(os.path.join(OUT, 'EXCERPT-REGISTER.csv'), 'w', encoding='utf-8', newline='') as f:
    w = csv.DictWriter(f, fieldnames=cols, lineterminator='\r\n'); w.writeheader(); w.writerows(rows)

raw = {}
for name in sorted(os.listdir(os.path.join(ROOT, 'data/raw'))):
    if not name.endswith('.json'): continue
    text = open(os.path.join(ROOT, 'data/raw', name), encoding='utf-8').read()
    raw[name] = len(re.findall(r'"(?:quote|excerpt|sourceQuote|evidenceQuote|verifiedQuote)"\s*:\s*"', text))
summary = {
    'rows': len(rows),
    'byPolicy': {p: sum(1 for r in rows if r['policy'] == p) for p in ('publish', 'withhold')},
    'withheldButPublicAtBaseline': sum(1 for r in rows if r['policy'] == 'withhold' and r['publicAtBaseline'] == 'yes'),
    'withheldStillPublicInCandidate': [f"{r['measurementId']} {r['field']}" for r in rows if r['policy'] == 'withhold' and r['publicInCandidate'] == 'yes'],
    'rawFilesQuoteFields': raw,
}
print(json.dumps(summary, ensure_ascii=False, indent=1))
