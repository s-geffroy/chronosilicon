/** Shared corpus pipeline: schema validation, invariants, normalisation. */
import { readFileSync, readdirSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { Ajv2020 } from 'ajv/dist/2020.js';
import {
  SCHEMA_VERSION, checkInvariants, checkV2Invariants, normalize, resolveObservers,
  type Corpus, type Evidence, type Group, type Measurement, type ObserverDef, type Phenomenon,
} from '@chronosilicon/ontology';

export const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..', '..');
export const P = {
  sources: 'data/sources/sources.json',
  phenomena: 'data/curated/phenomena.json',
  measurements: 'data/curated/measurements.json',
  groups: 'data/curated/groups.json',
  observers: 'data/curated/observers.json',
  corpus: 'data/validated/corpus.json',
  rawDir: 'data/raw',
  rawManifest: 'data/raw/MANIFEST.sha256',
} as const;

export const sha256 = (buf: Buffer | string) => createHash('sha256').update(buf).digest('hex');
const read = (rel: string) => readFileSync(join(ROOT, rel));
const readJson = (rel: string): unknown => JSON.parse(read(rel).toString('utf8'));

export function makeAjv(): Ajv2020 {
  const ajv = new Ajv2020({ allErrors: true, strict: true });
  for (const f of readdirSync(join(ROOT, 'schemas')).filter((f) => f.endsWith('.schema.json')).sort()) {
    ajv.addSchema(readJson(`schemas/${f}`) as object);
  }
  return ajv;
}

export interface PipelineResult {
  readonly errors: string[];
  readonly corpus: Corpus | null;
  readonly stats: Record<string, number>;
}

/** Runs schema validation + invariants and builds the qualified corpus. */
export function runPipeline(): PipelineResult {
  const ajv = makeAjv();
  const errors: string[] = [];
  const load = <T>(rel: string, schemaId: string): T | null => {
    const data = readJson(rel);
    const validate = ajv.getSchema(`https://chronosilicon.local/schemas/${schemaId}`);
    if (!validate) throw new Error(`schema ${schemaId} missing`);
    if (!validate(data)) {
      for (const e of validate.errors ?? []) errors.push(`${rel}${e.instancePath}: ${e.message ?? 'invalid'}`);
      return null;
    }
    return data as T;
  };
  const s = load<{ sources: Evidence[] }>(P.sources, 'sources.schema.json');
  const ph = load<{ phenomena: Phenomenon[] }>(P.phenomena, 'phenomena.schema.json');
  const ms = load<{ measurements: Measurement[] }>(P.measurements, 'measurements.schema.json');
  const gr = load<{ groups: Group[] }>(P.groups, 'groups.schema.json');
  const ob = load<{ observers: ObserverDef[] }>(P.observers, 'observers.schema.json');
  errors.push(...checkRawManifest());
  if (!s || !ph || !ms || !gr || !ob) return { errors, corpus: null, stats: {} };
  errors.push(...checkInvariants({ sources: s.sources, phenomena: ph.phenomena, measurements: ms.measurements }));
  if (errors.length) return { errors, corpus: null, stats: {} };

  const qualified = ms.measurements.filter((m) => m.verificationStatus === 'qualified');
  const normalized = normalize(ph.phenomena, qualified);
  errors.push(...checkV2Invariants(gr.groups, ob.observers, normalized));
  if (errors.length) return { errors, corpus: null, stats: {} };
  const usedPh = new Set(qualified.map((m) => m.phenomenonId));
  const usedSrc = new Set(qualified.flatMap((m) => m.sourceIds));
  const inputs: Record<string, string> = {};
  for (const rel of [P.sources, P.phenomena, P.measurements, P.groups, P.observers]) inputs[rel] = sha256(read(rel));
  const corpus: Corpus = {
    schemaVersion: SCHEMA_VERSION,
    corpusVersion: `0.2.0+${sha256(Object.values(inputs).join('')).slice(0, 12)}`,
    inputs,
    phenomena: ph.phenomena.filter((p) => usedPh.has(p.id)),
    measurements: normalized,
    sources: s.sources.filter((x) => usedSrc.has(x.id)),
    groups: gr.groups,
    observers: resolveObservers(ob.observers, normalized),
  };
  const count = (st: string) => ms.measurements.filter((m) => m.verificationStatus === st).length;
  return {
    errors,
    corpus,
    stats: {
      sources: s.sources.length,
      phenomena: ph.phenomena.length,
      measurements: ms.measurements.length,
      qualified: count('qualified'),
      pending: count('pending'),
      contested: count('contested'),
      rejected: count('rejected'),
      qualifiedPhenomena: usedPh.size,
      groups: gr.groups.length,
      observers: ob.observers.length,
    },
  };
}

/** data/raw is immutable: every raw file must match its recorded checksum. */
export function checkRawManifest(): string[] {
  const errors: string[] = [];
  const lines = read(P.rawManifest).toString('utf8').split('\n').filter((l) => l.trim() && !l.startsWith('#'));
  const listed = new Map(lines.map((l) => { const [h, f] = l.trim().split(/\s+/); return [f!, h!]; }));
  const files = readdirSync(join(ROOT, P.rawDir)).filter((f) => f.endsWith('.json'));
  for (const f of files) {
    const h = listed.get(f);
    if (!h) errors.push(`raw file ${f} not listed in MANIFEST.sha256`);
    else if (h !== sha256(read(`${P.rawDir}/${f}`))) errors.push(`raw file ${f} modified (checksum mismatch)`);
  }
  for (const f of listed.keys()) if (!files.includes(f)) errors.push(`raw file ${f} listed but missing`);
  return errors;
}

export const serialize = (c: Corpus) => JSON.stringify(c, null, 2) + '\n';
