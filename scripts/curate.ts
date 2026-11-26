/**
 * curate — deterministic derivation of data/curated/* from immutable raw
 * extraction records + independent verification verdicts + explicit manual
 * decisions (ADR-0005). Never edit data/curated/{sources,phenomena,measurements}
 * by hand: edit data/curated/decisions.json and re-run `npm run curate`.
 */
import { readFileSync, writeFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import { ROOT, P } from './lib/corpus';
import type { Domain, Evidence, Measurement, Phenomenon, ProvenanceType, VerificationStatus } from '@chronosilicon/ontology';
import { isKnownUnit, type QuantityKind } from '@chronosilicon/metrology';

interface RawSource {
  id: string; title: string; author: string | null; publisher: string; url: string; doi: string | null;
  publishedDate: string | null; version: string | null; license: string; redistribution: Evidence['redistribution'];
  accessNotes: string;
}
interface RawItem {
  id: string; labelEn: string; labelFr: string; domain: Domain; quantityKind: string; value: number; unit: string;
  low: number | null; high: number | null; conditions: string; provenanceType: ProvenanceType;
  calculation: null | string | { formula: string; inputs: string[] }; sourceId: string; locator: string; quote: string | null;
  era: string | number | null; confidenceNotes: string | null;
}
interface RawFile { accessedAt: string; sources: RawSource[]; items: RawItem[] }
type VerdictKind = 'confirmed' | 'confirmed_with_fix' | 'mismatch' | 'unreachable' | 'inadequate';
interface Verdict {
  id: string; verdict: VerdictKind; checkedUrl: string | null; evidence: string | null; notes: string | null;
  fix: Partial<Record<'conditions' | 'provenanceType' | 'locator' | 'labelFr' | 'labelEn' | 'quote' | 'era' | 'unit' | 'value' | 'low' | 'high', unknown>> | null;
  labelFr: string; labelEn: string; conditionsFr: string; conditionsEn: string;
}
interface Decision {
  /** Overrides the verdict-derived status; reason mandatory. */
  status?: VerificationStatus;
  reason: string;
  patch?: Partial<Pick<Measurement, 'protocol' | 'configuration' | 'notes' | 'unit' | 'value' | 'low' | 'high' | 'locator' | 'era'>> & {
    quantityKind?: QuantityKind; domain?: Domain; provenanceType?: ProvenanceType;
  };
}
interface Decisions { schemaVersion: '1.0.0'; decisions: Record<string, Decision> }

const readJson = <T>(rel: string): T => JSON.parse(readFileSync(join(ROOT, rel), 'utf8')) as T;
const rawFiles = readdirSync(join(ROOT, P.rawDir)).filter((f) => /^m00-.*\.json$/.test(f)).sort();
const verdictFiles = readdirSync(join(ROOT, P.rawDir)).filter((f) => /^verify-.*\.json$/.test(f)).sort();
const decisions = readJson<Decisions>('data/curated/decisions.json').decisions;

const STATUS: Record<VerdictKind, VerificationStatus> = {
  confirmed: 'qualified', confirmed_with_fix: 'qualified', unreachable: 'pending', inadequate: 'contested', mismatch: 'rejected',
};

const verdicts = new Map<string, Verdict & { file: string }>();
for (const f of verdictFiles) {
  for (const v of readJson<{ verdicts: Verdict[] }>(`${P.rawDir}/${f}`).verdicts) {
    if (verdicts.has(v.id)) throw new Error(`duplicate verdict for ${v.id}`);
    verdicts.set(v.id, { ...v, file: f });
  }
}

/** Kind from unit: transfers/s and cycle counts are separate dimensions. */
function kindFor(item: RawItem): QuantityKind {
  if (item.unit === 'cycles') return 'cycle_count';
  if (item.unit === 'GT/s' || item.unit === 'MT/s') return 'transfer_rate';
  return item.quantityKind as QuantityKind;
}
const parseEra = (e: unknown): number | null => {
  const m = String(e ?? '').match(/(1[89]\d\d|20\d\d)/);
  return m ? Number(m[1]) : null;
};
const clip = (s: string | null, n = 300) => (s && s.length > n ? s.slice(0, n - 1) + '…' : s);

/** Stable ids must match ^[a-z0-9-]+ ; dots etc. are mapped to '-'. */
const slug = (id: string) => id.toLowerCase().replace(/[^a-z0-9-]/g, '-');
const allItemIds = new Set(rawFiles.flatMap((f) => readJson<RawFile>(`${P.rawDir}/${f}`).items.map((i) => i.id)));

const sources: Evidence[] = [];
const phenomena: Phenomenon[] = [];
const measurements: Measurement[] = [];
const report: string[] = [];
const seenSrc = new Set<string>();

for (const f of rawFiles) {
  const raw = readJson<RawFile>(`${P.rawDir}/${f}`);
  for (const s of raw.sources) {
    if (seenSrc.has(slug(s.id))) throw new Error(`source id collision ${s.id}`);
    seenSrc.add(slug(s.id));
    sources.push({
      id: slug(s.id), title: s.title, author: s.author ?? null, publisher: s.publisher, url: s.url, doi: s.doi ?? null,
      publishedDate: s.publishedDate === null || s.publishedDate === undefined ? null : String(s.publishedDate),
      version: s.version ?? null, accessedAt: raw.accessedAt, license: s.license, redistribution: s.redistribution,
      accessNotes: s.accessNotes, verificationStatus: 'pending',
    });
  }
  for (const it of raw.items) {
    const v = verdicts.get(it.id);
    const d = decisions[it.id];
    const fix = (v?.fix ?? {}) as Record<string, unknown>;
    let status: VerificationStatus = v ? STATUS[v.verdict] : 'pending';
    const why: string[] = [v ? `verdict ${v.verdict} (${v.file})` : 'no verdict'];
    const patch = d?.patch ?? {};
    const quantityKind = patch.quantityKind ?? kindFor(it);
    const unit = String(patch.unit ?? fix['unit'] ?? it.unit);
    const provenanceType = (patch.provenanceType ?? fix['provenanceType'] ?? it.provenanceType) as ProvenanceType;
    const calc = it.calculation;
    const calculation = calc === null || calc === undefined ? null
      : typeof calc === 'string' ? { formula: calc, inputs: [...calc.matchAll(/[a-z0-9]+(?:-[a-z0-9]+)+/g)].map((m) => m[0]).filter((x) => x !== it.id && allItemIds.has(x)) }
      : { formula: calc.formula, inputs: calc.inputs.filter((x) => allItemIds.has(x)) };
    // Inputs documented in the same source but not extracted as separate items.
    if (calculation && calculation.inputs.length === 0) calculation.inputs.push('const:documented-in-cited-source');
    const protocol = provenanceType === 'measured' ? (patch.protocol ?? `As reported by the source: ${v?.conditionsEn ?? it.conditions}`) : (patch.protocol ?? null);
    if (!isKnownUnit(unit)) { status = 'rejected'; why.push(`unit ${unit} unknown`); }
    if (d?.status) { status = d.status; why.push(`decision: ${d.reason}`); }
    phenomena.push({
      id: it.id,
      domain: patch.domain ?? it.domain,
      quantityKind,
      label: { fr: String(fix['labelFr'] ?? v?.labelFr ?? it.labelFr), en: String(fix['labelEn'] ?? v?.labelEn ?? it.labelEn) },
      description: null,
    });
    measurements.push({
      id: `${it.id}-m1`,
      phenomenonId: it.id,
      configuration: patch.configuration ?? null,
      value: Number(patch.value ?? fix['value'] ?? it.value),
      unit,
      low: (patch.low ?? fix['low'] ?? it.low ?? null) as number | null,
      high: (patch.high ?? fix['high'] ?? it.high ?? null) as number | null,
      conditions: { fr: v?.conditionsFr ?? it.conditions, en: v?.conditionsEn ?? it.conditions },
      protocol,
      provenanceType,
      verificationStatus: status,
      sourceIds: [slug(it.sourceId)],
      locator: String(patch.locator ?? fix['locator'] ?? it.locator),
      quote: clip((fix['quote'] as string | undefined) ?? it.quote),
      era: patch.era ?? parseEra(fix['era'] ?? it.era),
      uncertainty: null,
      statistics: null,
      calculation: calculation ? { formula: calculation.formula, inputs: calculation.inputs.map((i) => (i.startsWith('const:') ? i : `${i}-m1`)) } : null,
      rawRef: `data/raw/${f}#${it.id}`,
      notes: clip([it.confidenceNotes, v?.notes ? `Verifier: ${v.notes}` : null, d ? `Decision: ${d.reason}` : null].filter(Boolean).join(' | ') || null, 1000),
    });
    report.push(`${it.id}\t${status}\t${why.join('; ')}`);
  }
}

// A calculated value is qualified only if every input is qualified (fixpoint).
const byId = new Map(measurements.map((m) => [m.id, m]));
let changed = true;
while (changed) {
  changed = false;
  for (const m of measurements) {
    if (m.verificationStatus !== 'qualified' || !m.calculation) continue;
    const bad = m.calculation.inputs.filter((i) => !i.startsWith('const:') && byId.get(i)?.verificationStatus !== 'qualified');
    if (bad.length) {
      (m as { verificationStatus: VerificationStatus }).verificationStatus = 'pending';
      report.push(`${m.phenomenonId}\tpending\tcalculation inputs not qualified: ${bad.join(', ')}`);
      changed = true;
    }
  }
}
// A source is qualified if at least one qualified value was confirmed in it.
const qualifiedSrc = new Set(measurements.filter((m) => m.verificationStatus === 'qualified').flatMap((m) => m.sourceIds));
for (const s of sources) (s as { verificationStatus: VerificationStatus }).verificationStatus = qualifiedSrc.has(s.id) ? 'qualified' : 'pending';

const w = (rel: string, data: unknown) => writeFileSync(join(ROOT, rel), JSON.stringify(data, null, 2) + '\n');
w(P.sources, { schemaVersion: '1.0.0', sources });
w(P.phenomena, { schemaVersion: '1.0.0', phenomena });
w(P.measurements, { schemaVersion: '1.0.0', measurements });
writeFileSync(join(ROOT, 'data/curated/CURATION_REPORT.tsv'), 'item\tstatus\treason\n' + report.join('\n') + '\n');
const count = (s: VerificationStatus) => measurements.filter((m) => m.verificationStatus === s).length;
console.log(`curate OK: ${measurements.length} measurements — qualified ${count('qualified')}, pending ${count('pending')}, contested ${count('contested')}, rejected ${count('rejected')}; ${sources.length} sources (${qualifiedSrc.size} qualified)`);
