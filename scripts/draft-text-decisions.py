#!/usr/bin/env python3
"""REMEDIATION-02, AUD02-002: one-off draft of data/publication/text-decisions.json.

Input: the findings of policy PUB-1 (scripts/lib/corpus.ts, dumped to .cache/r02/findings.json).
Each finding gets a PROPOSED decision from the rules below, tagged `basis: rule:<name>`;
the maintainer then reviews the list and overrides by hand (`basis: review`) where needed
(REVIEW below). Re-running keeps the reviewed entries. This is not a legal review.
Usage: python3 -I scripts/draft-text-decisions.py  (findings dumped by the corpus pipeline to .cache/r02/findings.json)
History: written for REMEDIATION-02 (archived copy: docs/audits/AUDIT-02/remediation/); maintained here since R1.
"""
import json, re, sys
FINDINGS = '.cache/r02/findings.json'
OUT = 'data/publication/text-decisions.json'
WORDS = lambda t: len(re.findall(r"[\w]+", t))
# Reviewed overrides: (scope, field, text) -> (decision, ground, note)
REVIEW = {
 ('measurement:pcie5-lane-rate-m1','conditions.en','32 GT/s raw bit rate'): ('publish','fact','Specification value and its standard name.'),
 ('measurement:pcie6-lane-rate-m1','conditions.en','64 GT/s raw data rate'): ('publish','fact','Specification value and its standard name.'),
 ('measurement:usb-low-speed-rate-m1','conditions.en','limited-capability low-speed signaling mode'): ('publish','term','Name of the signalling mode defined by the specification.'),
 ('measurement:b200-nvlink-gpu-to-gpu-m1','conditions.en','NVLink, GPU-to-GPU bandwidth; 1.8 TB/s'): ('publish','fact','Interface name, metric and value.'),
 ('measurement:ngc-inp-hemt-25nm-fmax-m1','protocol','extrapolating the data to unity gain'): ('publish','fact','Standard name of the fMAX extraction method (extrapolation of gain to unity), needed to state the protocol.'),
 ('measurement:ntp-lan-typical-accuracy-m1','conditions.en','up to a few milliseconds on WANs'): ('publish','fact','Short factual bound restated in the conditions; the full sentence stays withheld.'),
 ('measurement:wifi7-max-throughput-m1','conditions.en',"a maximum throughput of 'at least' 30 Gbps"): ('publish','fact','Design target and its qualifier; the qualifier is quoted to keep its exact meaning.'),
 ('measurement:top500-2026-11-r5-jupiter-booster-rmax-m1','conditions.en','EuroHPC/FZJ, Germany); 4,801,344'): ('publish','fact','Site, country and core count from the list entry.'),
 ('measurement:top500-2026-11-r5-jupiter-booster-rpeak-m1','conditions.en','EuroHPC/FZJ, Germany); 4,801,344'): ('publish','fact','Site, country and core count from the list entry.'),
 ('measurement:top500-1993-06-r1-cm5-rmax-m1','conditions.fr','1 : CM-5/1024, Thinking Machines Corporation (Los Alamos National Laboratory'): ('publish','fact','Rank, system, vendor and site from the list entry.'),
 ('measurement:top500-1993-06-r1-cm5-rmax-m1','conditions.en','1: CM-5/1024, Thinking Machines Corporation (Los Alamos National Laboratory'): ('publish','fact','Rank, system, vendor and site from the list entry.'),
 ('measurement:top500-2008-06-r1-roadrunner-rmax-m1','conditions.fr','Voltaire Infiniband, IBM (DOE/NNSA/LANL'): ('publish','fact','Interconnect, vendor and site from the list entry.'),
 ('measurement:top500-2008-06-r1-roadrunner-rmax-m1','conditions.en','Voltaire Infiniband, IBM (DOE/NNSA/LANL'): ('publish','fact','Interconnect, vendor and site from the list entry.'),
 ('measurement:hbm3-samsung-stack-bandwidth-m1','conditions.en',"with processing speeds 'up to' 6"): ('publish','fact','Rate with its qualifier.'),
 ('measurement:linux-kpti-entry-exit-cost-haswell-m1','conditions.en',"is 'on the order of 400–500 cycles'"): ('redact','third-party-excerpt','Six-word quoted passage, already redacted in rc2: kept redacted (no review decision publishes what rc2 withheld). The value itself stays in the value field.'),
 ('measurement:hbm3e-micron-stack-bandwidth-m1','conditions.en',"'more than' 1.2 TB/s"): ('publish','fact','Bandwidth with its qualifier (found once overlaps crossing quoted spans were merged).'),
 # R1 lot 2026-11-27 (ADR-0012).
 ('measurement:ind-led-lamp-lifetime-m1','conditions.en',"lamps 'appear to be capable of at least 25,000 hours of operation'"): ('redact','third-party-excerpt','Ten-word passage of the source sentence: withheld (source redistribution unknown); the value stays in the value field.'),
 # The five residuals named in AUD02-002 (REMEDIATION-01 register: withheldStillPublicInCandidate).
 ('measurement:mi300x-fp64-vector-peak-m1','locator',"'Peak-performance capabilities of the MI300X for different data types'"): ('publish','locating-label','Residual 5/5. Table caption, needed to find the value; it is also the (withheld) quote, which is only the caption: no running text is reproduced.'),
 ('measurement:solidigm-ps1010-random-read-latency-m1','locator',"'Latency Random Rating (Read / Write)'"): ('publish','locating-label','Residual 2/5. Row label of the specification block; the withheld quote is that label plus the values.'),
 ('measurement:solidigm-ps1010-random-write-latency-m1','locator',"'Latency Random Rating (Read / Write)'"): ('publish','locating-label','Residual 3/5. Row label of the specification block; the withheld quote is that label plus the values.'),
 ('measurement:exos-15e900-average-latency-m1','locator',"'Average Latency (ms)'"): ('publish','locating-label','Residual 4/5. Row label of the specification table; the withheld quote is that label.'),
 ('measurement:human-voluntary-blink-closing-phase-m1','notes',"'76 ± 2'"): ('publish','fact','Residual 1/5. Table cell (mean ± s.e. in ms): a number, not wording. The statement field itself stays withheld.'),
 ('measurement:human-voluntary-blink-closing-phase-m1','uncertainty.locator','"our values are mean ± s.e."'): ('publish','locating-label','Caption fragment that types the dispersion (s.e.); needed to read the uncertainty.'),
 ('measurement:human-voluntary-blink-closing-phase-m1','uncertainty.locator','"This study (2013), 600 fps, n=25"'): ('publish','locating-label','Row label of Table 1.'),
}
def rule(f):
  scope, field, text, kind = f['scope'], f['field'], f['text'], f['kind']
  n = WORDS(text)
  if kind == 'overlap': return None
  if field in ('locator', 'uncertainty.locator') or field.endswith('.locator'):
    return ('publish', 'locating-label', 'rule:locator-label')
  if scope.startswith('source:') and field == 'license':
    return ('publish', 'attribution', 'rule:licence-notice')
  if scope.startswith('source:') and field == 'accessNotes' and n <= 8:
    return ('publish', 'locating-label', 'rule:access-label')
  if n >= 6:
    return ('redact', 'third-party-excerpt', 'rule:quoted-6-words')
  return ('publish', 'term', 'rule:short-term')
findings = json.load(open(FINDINGS))['findings']
out, missing = [], []
for f in findings:
  k = (f['scope'], f['field'], f['text'])
  if k in REVIEW:
    d, g, note = REVIEW[k]; e = dict(scope=k[0], field=k[1], text=k[2], kind=f['kind'], decision=d, ground=g, basis='review', note=note)
  else:
    r = rule(f)
    if r is None: missing.append(k); continue
    e = dict(scope=k[0], field=k[1], text=k[2], kind=f['kind'], decision=r[0], ground=r[1], basis=r[2])
  out.append(e)
seen=set(); uniq=[]
for e in out:
  key=(e['scope'],e['field'],e['text'])
  if key in seen: continue
  seen.add(key); uniq.append(e)
doc = {
  '_comment': 'Publication policy PUB-1 (REMEDIATION-02, AUD02-002; ADR-0011 amended; SOURCE-RIGHTS.md). One decision per text finding in a non-open scope: quoted span (any length) or unquoted run of 6+ words shared with a third-party text. basis = rule:<name> (proposed by draft-text-decisions.py, then read by the maintainer) or review (decided case by case). This is a precautionary maintainer decision, not a legal opinion; it awaits human review.',
  'schemaVersion': 1, 'policy': 'PUB-1', 'decidedAt': '2026-11-27',
  'decisions': sorted(uniq, key=lambda e: (e['scope'], e['field'], e['text'])),
}
json.dump(doc, open(OUT, 'w'), ensure_ascii=False, indent=1); open(OUT, 'a').write('\n')
print('decisions', len(uniq), 'missing', missing)
