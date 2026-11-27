#!/usr/bin/env python3
"""Regenerates CORPUS-INVENTORY.json and SOURCES-REGISTER.csv (AUDIT-01 evidence).

Read-only on the repository data; standard library only.
Usage, from the repository root:  python3 -I docs/audits/AUDIT-01/evidence/generate-inventories.py
"""
import csv, collections, hashlib, json, os, sys

ROOT = os.getcwd()
OUT = os.path.join(ROOT, 'docs', 'audits', 'AUDIT-01', 'evidence')

def load(rel):
    with open(os.path.join(ROOT, rel), encoding='utf-8') as f:
        return json.load(f)

def sha(rel):
    with open(os.path.join(ROOT, rel), 'rb') as f:
        return hashlib.sha256(f.read()).hexdigest()

meas = load('data/curated/measurements.json')['measurements']
phen = {p['id']: p for p in load('data/curated/phenomena.json')['phenomena']}
srcs = load('data/sources/sources.json')['sources']
corpus = load('data/validated/corpus.json')
published = {m['id'] for m in corpus['measurements']}

def count(it):
    return dict(sorted(collections.Counter(it).items()))

items = []
for m in meas:
    p = phen.get(m['phenomenonId'], {})
    u, st = m.get('uncertainty'), m.get('statistics')
    items.append({
        'id': m['id'],
        'phenomenonId': m['phenomenonId'],
        'labelEn': (p.get('label') or {}).get('en'),
        'domain': p.get('domain'),
        'quantityKind': p.get('quantityKind'),
        'value': m['value'], 'unit': m['unit'], 'low': m.get('low'), 'high': m.get('high'),
        'provenanceType': m['provenanceType'],
        'verificationStatus': m['verificationStatus'],
        'publishedOnSite': m['id'] in published,
        'hasProtocol': bool(m.get('protocol')),
        'calculated': m.get('calculation') is not None,
        'uncertaintyType': u['type'] if u else None,
        'statisticsQuantiles': [q['p'] for q in st['quantiles']] if st else None,
        'statisticsN': st['sampleCount'] if st else None,
        'era': m.get('era'),
        'sourceIds': m['sourceIds'],
        'locator': m.get('locator'),
        'rawRef': m.get('rawRef'),
    })

inventory = {
    'description': 'AUDIT-01 corpus inventory: every curated candidate value, published or not. Derived from data/curated/*.json; not a new data source.',
    'generatedBy': 'docs/audits/AUDIT-01/evidence/generate-inventories.py',
    'corpusVersion': corpus['corpusVersion'],
    'schemaVersion': corpus['schemaVersion'],
    'inputFilesSha256': {rel: sha(rel) for rel in [
        'data/sources/sources.json', 'data/curated/phenomena.json', 'data/curated/measurements.json',
        'data/curated/decisions.json', 'data/curated/groups.json', 'data/curated/observers.json',
        'data/curated/scenarios.json', 'data/validated/corpus.json', 'data/raw/MANIFEST.sha256']},
    'totals': {
        'candidates': len(items),
        'publishedOnSite': sum(i['publishedOnSite'] for i in items),
        'byVerificationStatus': count(i['verificationStatus'] for i in items),
        'qualifiedByProvenance': count(i['provenanceType'] for i in items if i['verificationStatus'] == 'qualified'),
        'qualifiedByDomain': count(i['domain'] for i in items if i['verificationStatus'] == 'qualified'),
        'qualifiedByQuantityKind': count(i['quantityKind'] for i in items if i['verificationStatus'] == 'qualified'),
        'qualifiedWithUncertainty': sum(1 for i in items if i['verificationStatus'] == 'qualified' and i['uncertaintyType']),
        'qualifiedWithStatistics': sum(1 for i in items if i['verificationStatus'] == 'qualified' and i['statisticsQuantiles']),
        'sources': len(srcs),
        'sourcesWithQualifiedValue': len({s for i in items if i['verificationStatus'] == 'qualified' for s in i['sourceIds'] if not s.startswith('src:')} & {s['id'] for s in srcs}),
        'sourcesByRedistribution': count(s.get('redistribution') for s in srcs),
        'groups': len(corpus['groups']), 'observers': len(corpus['observers']), 'scenarios': len(corpus['scenarios']),
        'withheld': len(corpus['withheld']),
    },
    'withheld': [{'id': w['id'], 'status': w['status'], 'reason': w['reason']} for w in corpus['withheld']],
    'groups': [{'id': g['id'], 'kind': g.get('kind'), 'comparability': g.get('comparability'), 'members': len(g.get('members', []))} for g in corpus['groups']],
    'observers': [o['id'] for o in corpus['observers']],
    'scenarios': [s['id'] for s in corpus['scenarios']],
    'measurements': items,
}
with open(os.path.join(OUT, 'CORPUS-INVENTORY.json'), 'w', encoding='utf-8') as f:
    json.dump(inventory, f, ensure_ascii=False, indent=1)
    f.write('\n')

used = collections.defaultdict(lambda: collections.Counter())
for i in items:
    for s in i['sourceIds']:
        used[s][i['verificationStatus']] += 1
cols = ['id', 'title', 'author', 'publisher', 'url', 'doi', 'publishedDate', 'version', 'accessedAt',
        'license', 'redistribution', 'verificationStatus', 'valuesQualified', 'valuesOther', 'accessNotes']
with open(os.path.join(OUT, 'SOURCES-REGISTER.csv'), 'w', encoding='utf-8', newline='') as f:
    w = csv.DictWriter(f, fieldnames=cols, extrasaction='ignore', lineterminator='\r\n')
    w.writeheader()
    for s in srcs:
        row = dict(s)
        row['valuesQualified'] = used[s['id']]['qualified']
        row['valuesOther'] = sum(v for k, v in used[s['id']].items() if k != 'qualified')
        w.writerow(row)
print(json.dumps(inventory['totals'], ensure_ascii=False, indent=1))
