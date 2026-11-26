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
  /** Strict extractions (lot 2+): protocol written by the extractor for measured values. */
  protocol?: string | null;
  /** Optional published dispersion (ADR-0009). */
  uncertainty?: Measurement['uncertainty'];
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
interface Decisions {
  schemaVersion: '1.0.0';
  decisions: Record<string, Decision>;
  /** Corrections of source metadata (e.g. permalink), reason mandatory. */
  sourcePatches?: Record<string, { url?: string; version?: string; reason: string }>;
}

const readJson = <T>(rel: string): T => JSON.parse(readFileSync(join(ROOT, rel), 'utf8')) as T;
const rawFiles = readdirSync(join(ROOT, P.rawDir)).filter((f) => /^m00-.*\.json$/.test(f)).sort();
const verdictFiles = readdirSync(join(ROOT, P.rawDir)).filter((f) => /^verify-.*\.json$/.test(f)).sort();
// Any other JSON in data/raw would be silently ignored: refuse instead (review G4/G5 MAJ-3).
const unknownRaw = readdirSync(join(ROOT, P.rawDir)).filter((f) => f.endsWith('.json') && !/^(m00-|verify-)/.test(f));
if (unknownRaw.length) throw new Error(`data/raw: unrecognised files ${unknownRaw.join(', ')} (expected m00-*.json extractions or verify-*.json verdicts)`);
const decisionsFile = readJson<Decisions>('data/curated/decisions.json');
const decisions = decisionsFile.decisions;
const sourcePatches = decisionsFile.sourcePatches ?? {};

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

/** A value can never be null/NaN: fail loudly instead of coercing to 0 (review M-9). */
function requireNumber(v: unknown, id: string): number {
  if (typeof v !== 'number' || !Number.isFinite(v)) throw new Error(`${id}: value must be a finite number, got ${String(v)}`);
  return v;
}

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
    const sp = sourcePatches[slug(s.id)];
    if (sp) {
      const last = sources[sources.length - 1]!;
      sources[sources.length - 1] = { ...last, url: sp.url ?? last.url, version: sp.version ?? last.version, accessNotes: `${last.accessNotes} | Curation: ${sp.reason}` };
    }
  }
  for (const it of raw.items) {
    const v = verdicts.get(it.id);
    const d = decisions[it.id];
    const fix = (v?.fix ?? {}) as Record<string, unknown>;
    let status: VerificationStatus = v ? STATUS[v.verdict] : 'pending';
    const why: string[] = [v ? `verdict ${v.verdict} (${v.file})` : 'no verdict'];
    const patch = (d?.patch ?? {}) as Record<string, unknown>;
    /** Precedence: manual decision > verifier fix > raw extraction (explicit null wins). */
    const pick = (key: string, rawValue: unknown): unknown =>
      Object.hasOwn(patch, key) ? patch[key] : Object.hasOwn(fix, key) ? fix[key] : rawValue;
    const quantityKind = (patch['quantityKind'] as QuantityKind | undefined) ?? kindFor(it);
    const unit = String(pick('unit', it.unit));
    const provenanceType = pick('provenanceType', it.provenanceType) as ProvenanceType;
    const calc = it.calculation;
    const calculation = calc === null || calc === undefined ? null
      : typeof calc === 'string' ? { formula: calc, inputs: [...calc.matchAll(/[a-z0-9]+(?:-[a-z0-9]+)+/g)].map((m) => m[0]).filter((x) => x !== it.id && allItemIds.has(x)) }
      : { formula: calc.formula, inputs: calc.inputs.filter((x) => allItemIds.has(x) || x.startsWith('src:')).map((x) => (x.startsWith('src:') ? `src:${slug(x.slice(4))}` : x)) };
    // Inputs must be extracted items or explicit references to a cited source
    // ('src:<id>'); nothing is filled in automatically (review M-2/M-3).
    if (calculation && Object.hasOwn(patch, 'calculationInputs')) calculation.inputs = patch['calculationInputs'] as string[];
    if (calculation && Object.hasOwn(patch, 'calculationFormula')) calculation.formula = String(patch['calculationFormula']);
    // Never synthesised: a measured value needs an explicitly written protocol
    // (decisions.json), otherwise validate:data fails (review M-1).
    const protocol = (pick('protocol', it.protocol ?? null) ?? null) as string | null;
    if (!isKnownUnit(unit)) { status = 'rejected'; why.push(`unit ${unit} unknown`); }
    if (d?.status) { status = d.status; why.push(`decision: ${d.reason}`); }
    phenomena.push({
      id: it.id,
      domain: (patch['domain'] as Domain | undefined) ?? it.domain,
      quantityKind,
      label: { fr: String(pick('labelFr', v?.labelFr ?? it.labelFr)), en: String(pick('labelEn', v?.labelEn ?? it.labelEn)) },
      description: null,
    });
    measurements.push({
      id: `${it.id}-m1`,
      phenomenonId: it.id,
      configuration: (patch['configuration'] as string | undefined) ?? null,
      value: requireNumber(pick('value', it.value), it.id),
      unit,
      low: (pick('low', it.low ?? null) ?? null) as number | null,
      high: (pick('high', it.high ?? null) ?? null) as number | null,
      // The verifier's bilingual conditions already integrate its 'conditions' fix.
      conditions: { fr: String(pick('conditionsFr', v?.conditionsFr ?? it.conditions)), en: String(pick('conditionsEn', v?.conditionsEn ?? it.conditions)) },
      protocol,
      provenanceType,
      verificationStatus: status,
      // A source used as a calculation input is cited too (it carries part of the value).
      sourceIds: [...new Set([slug(it.sourceId), ...(calculation?.inputs ?? []).filter((x) => x.startsWith('src:')).map((x) => x.slice(4))])],
      locator: String(pick('locator', it.locator)),
      quote: clip(pick('quote', it.quote) as string | null),
      era: Object.hasOwn(patch, 'era') ? (patch['era'] as number | null) : parseEra(pick('era', it.era)),
      uncertainty: (pick('uncertainty', it.uncertainty ?? null) ?? null) as Measurement['uncertainty'],
      statistics: null,
      calculation: calculation ? { formula: calculation.formula, inputs: calculation.inputs.map((i) => (i.startsWith('src:') ? i : `${i}-m1`)) } : null,
      rawRef: `data/raw/${f}#${it.id}`,
      notes: clip([pick('confidenceNotes', it.confidenceNotes) as string | null, v?.notes ? `Verifier: ${v.notes}` : null, d ? `Decision: ${d.reason}` : null].filter(Boolean).join(' | ') || null, 1000),
    });
    // Bound wording in the excerpt without an encoded bound → flagged for review.
    const lowV = pick('low', it.low ?? null), highV = pick('high', it.high ?? null);
    if (/\b(up to|down to|at least|more than|less than|no less than|below|above)\b|[≤≥<>]/i.test(String(pick('quote', it.quote) ?? '')) && lowV === null && highV === null && patch['boundChecked'] !== true) {
      why.push('WARNING: bound wording in the excerpt but no low/high encoded');
    }
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
    const bad = m.calculation.inputs.filter((i) => !i.startsWith('src:') && byId.get(i)?.verificationStatus !== 'qualified');
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
