/**
 * Publication policy PUB-1 (REMEDIATION-02 / AUD02-002; ADR-0011 amended).
 *
 * Replaces the REMEDIATION-01 heuristic (strip quotes, redact quoted passages of 6+ words in
 * three fields) by an explicit, traceable policy:
 *
 * 1. Explicit public fields. Every section of the public corpus is built from a field table
 *    (PUBLIC_FIELDS). A field missing from the table makes the build fail: nothing is published
 *    by default. Each field has a class:
 *      - `fact`   identifiers, enums, numbers, URLs, dates: copied;
 *      - `ref`    bibliographic reference (title, publisher, author, version): copied;
 *      - `text`   wording written by the maintainer (conditions, notes, protocol, locators,
 *                 group notes, licence notes…): copied, but scanned (point 3);
 *      - `third`  verbatim third-party text (quote, uncertainty statement): published only when
 *                 the scope is open (point 2), otherwise null.
 * 2. Open scope. A value is open when every cited source has redistribution `allowed` and is not
 *    under review; a source when it is itself open; a group when all its members are open.
 *    Phenomena, observers, scenarios and withheld entries are never open (always scanned).
 * 3. Text-by-text decisions. In a non-open scope, every finding in a `text` field needs an
 *    explicit decision in data/publication/text-decisions.json, keyed by (scope, field, exact text):
 *      - `quoted`  any span between quotation marks, whatever its length;
 *      - `overlap` any run of OVERLAP_WORDS+ consecutive words shared, without quotation marks,
 *                  with a third-party text of the same scope (curated quote, uncertainty
 *                  statement, raw quote).
 *    A decision either redacts the span (REDACTION) or publishes it on a stated ground. A finding
 *    without decision, or a decision matching no finding, makes the build fail.
 * 4. Global check. After projection, no run of OVERLAP_WORDS words of any withheld third-party
 *    text may appear anywhere in the public corpus, except inside a span decided `publish`.
 *    The same check runs on the built site (scripts/check-public-text.ts).
 *
 * Curated data is never modified. This is a precautionary publication policy, not a legal
 * conclusion: decisions are the maintainer's, and await human (legal) review (SOURCE-RIGHTS.md).
 */
import type { Evidence, NormalizedMeasurement } from './index';

export const POLICY_ID = 'PUB-1';
export const OVERLAP_WORDS = 6;
/** Former REMEDIATION-01 threshold; still the length above which the decisions redact quoted passages in notes. */
export const MIN_REDACTED_WORDS = 6;
export const REDACTION = '[…]';

/**
 * Sources declared `allowed` whose declaration is doubtful and awaits human
 * review (SOURCE-RIGHTS.md): treated as not established for publication.
 * - src-nasa-voyager-where: no licence on the page and credit "NASA/JPL-Caltech";
 *   JPL is operated by Caltech, so U.S.-government-work status is not established.
 */
export const ALLOWED_UNDER_REVIEW: ReadonlySet<string> = new Set(['src-nasa-voyager-where']);

export type FieldClass = 'fact' | 'ref' | 'text' | 'third';
export type FieldSpec = FieldClass | { readonly [k: string]: FieldSpec } | readonly ['[]', FieldSpec];

const I18N = { fr: 'text', en: 'text' } as const;
export const PUBLIC_FIELDS: { readonly [section: string]: FieldSpec } = {
  measurement: {
    id: 'fact', phenomenonId: 'fact', configuration: 'text', value: 'fact', unit: 'fact', low: 'fact', high: 'fact',
    conditions: I18N, protocol: 'text', provenanceType: 'fact', verificationStatus: 'fact', sourceIds: 'fact',
    locator: 'text', quote: 'third', era: 'fact',
    uncertainty: { type: 'fact', value: 'fact', low: 'fact', high: 'fact', level: 'fact', sampleCount: 'fact', statement: 'third', locator: 'text' },
    statistics: { sampleCount: 'fact', sampleCountNote: 'text', method: 'text', quantiles: 'fact' },
    calculation: { formula: 'fact', inputs: 'fact' },
    rawRef: 'fact', notes: 'text', quantityKind: 'fact', valueSI: 'fact', lowSI: 'fact', highSI: 'fact',
    uncertaintySI: 'fact', quantilesSI: 'fact',
  },
  source: {
    id: 'fact', title: 'ref', author: 'ref', publisher: 'ref', url: 'fact', doi: 'fact', publishedDate: 'fact', version: 'ref',
    accessedAt: 'fact', license: 'text', redistribution: 'fact', accessNotes: 'text', verificationStatus: 'fact',
  },
  group: { id: 'fact', kind: 'fact', quantityKind: 'fact', label: I18N, members: 'fact', comparability: 'fact',
    protocolEvidence: { sourceId: 'fact', locator: 'text', statement: 'third' }, note: I18N },
  phenomenon: { id: 'fact', domain: 'fact', quantityKind: 'fact', label: I18N, description: I18N },
  observer: { id: 'fact', kind: 'fact', measurementId: 'fact', frequencyHz: 'fact', label: I18N, assumptions: I18N, referenceSI: 'fact' },
  scenario: {
    id: 'fact', label: I18N, description: I18N, excluded: I18N,
    resources: ['[]', { id: 'fact', kind: 'fact', capacity: 'fact', capacityAssumption: I18N }],
    tasks: ['[]', { id: 'fact', measurementId: 'fact', resourceId: 'fact', dependsOn: 'fact' }],
  },
  withheld: { id: 'fact', label: I18N, status: 'fact', reason: 'text' },
};

export type DecisionGround =
  | 'locating-label' | 'term' | 'attribution' | 'fact' | 'maintainer-wording' | 'third-party-excerpt';
export interface TextDecision {
  readonly scope: string;
  readonly field: string;
  readonly text: string;
  readonly kind: 'quoted' | 'overlap';
  readonly decision: 'publish' | 'redact';
  readonly ground: DecisionGround;
  readonly note?: string;
}
export interface Finding { scope: string; field: string; text: string; kind: 'quoted' | 'overlap'; decision: TextDecision | null }

/** Quoted spans: “…”, "…", « … », and '…' when the opening quote starts a word (not an apostrophe). */
const QUOTED = /“([^”]+)”|"([^"]+)"|«\s*([^»]+?)\s*»|(?<=^|[\s([])'([^']+)'(?=$|[\s.,;:)\]])/g;
const WORD = /[\p{L}\p{N}]+/gu;

export function quotedSpans(text: string): Array<{ full: string; inner: string; words: number; start: number; end: number }> {
  const out: Array<{ full: string; inner: string; words: number; start: number; end: number }> = [];
  for (const m of text.matchAll(QUOTED)) {
    const inner = (m[1] ?? m[2] ?? m[3] ?? m[4] ?? '').trim();
    out.push({ full: m[0], inner, words: inner.split(/\s+/).filter(Boolean).length, start: m.index, end: m.index + m[0].length });
  }
  return out;
}

function tokens(text: string): Array<{ w: string; start: number; end: number }> {
  return [...text.matchAll(WORD)].map((m) => ({ w: m[0].toLowerCase(), start: m.index, end: m.index + m[0].length }));
}

export function grams(texts: readonly string[], k = OVERLAP_WORDS): Set<string> {
  const out = new Set<string>();
  for (const t of texts) {
    const w = tokens(t).map((x) => x.w);
    for (let i = 0; i + k <= w.length; i++) out.add(w.slice(i, i + k).join(' '));
  }
  return out;
}

/** Maximal runs of the text covered by shared k-grams, as [start, end) character ranges. */
export function overlapSpans(text: string, g: ReadonlySet<string>, k = OVERLAP_WORDS): Array<{ start: number; end: number }> {
  if (g.size === 0) return [];
  const t = tokens(text);
  const covered = new Array<boolean>(t.length).fill(false);
  for (let i = 0; i + k <= t.length; i++) {
    if (g.has(t.slice(i, i + k).map((x) => x.w).join(' '))) for (let j = i; j < i + k; j++) covered[j] = true;
  }
  const out: Array<{ start: number; end: number }> = [];
  for (let i = 0; i < t.length; i++) {
    if (!covered[i]) continue;
    let j = i;
    while (j + 1 < t.length && covered[j + 1]) j++;
    out.push({ start: t[i]!.start, end: t[j]!.end });
    i = j;
  }
  return out;
}

export const decisionKey = (scope: string, field: string, text: string) => `${scope}\u0000${field}\u0000${text}`;

interface Ctx {
  scope: string; open: boolean; thirdParty: Set<string>;
  decisions: ReadonlyMap<string, TextDecision>; used: Set<string>;
  findings: Finding[]; problems: string[]; redacted: string[];
}

function scanText(text: string, field: string, ctx: Ctx): string {
  const quoted = quotedSpans(text);
  const spans: Array<{ start: number; end: number; kind: 'quoted' | 'overlap' }> = quoted.map((q) => ({ start: q.start, end: q.end, kind: 'quoted' }));
  for (const o of overlapSpans(text, ctx.thirdParty)) {
    if (!quoted.some((q) => q.start <= o.start && o.end <= q.end)) spans.push({ ...o, kind: 'overlap' });
  }
  spans.sort((a, b) => a.start - b.start);
  // Intersecting ranges (an overlap crossing a quoted span) become ONE finding over their union,
  // of kind `overlap`: nothing is skipped silently.
  const merged: typeof spans = [];
  for (const s of spans) {
    const last = merged[merged.length - 1];
    if (last && s.start < last.end) {
      last.end = Math.max(last.end, s.end);
      if (s.kind === 'overlap') last.kind = 'overlap';
    } else merged.push({ ...s });
  }
  let out = '';
  let at = 0;
  let changed = false;
  for (const s of merged) {
    const span = text.slice(s.start, s.end);
    const key = decisionKey(ctx.scope, field, span);
    const d = ctx.decisions.get(key) ?? null;
    ctx.findings.push({ scope: ctx.scope, field, text: span, kind: s.kind, decision: d });
    if (!d) ctx.problems.push(`undecided ${s.kind} text in ${ctx.scope} ${field}: ${JSON.stringify(span)}`);
    else {
      ctx.used.add(key);
      if (d.kind !== s.kind) ctx.problems.push(`decision kind ${d.kind} != finding ${s.kind} for ${ctx.scope} ${field}: ${JSON.stringify(span)}`);
    }
    out += text.slice(at, s.start);
    if (d?.decision === 'redact') { out += REDACTION; changed = true; } else out += span;
    at = s.end;
  }
  out += text.slice(at);
  if (changed) ctx.redacted.push(field);
  return out;
}

function project(value: unknown, spec: FieldSpec, path: string, ctx: Ctx): unknown {
  if (value === null || value === undefined) return value;
  if (Array.isArray(spec)) {
    if (!Array.isArray(value)) throw new Error(`${ctx.scope} ${path}: expected an array`);
    return value.map((v, i) => project(v, spec[1], `${path}[${i}]`, ctx));
  }
  if (typeof spec === 'object') {
    if (typeof value !== 'object' || Array.isArray(value)) throw new Error(`${ctx.scope} ${path}: expected an object`);
    const out: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(value as Record<string, unknown>)) {
      const sub = (spec as Record<string, FieldSpec>)[k];
      const p = path ? `${path}.${k}` : k;
      if (sub === undefined) throw new Error(`publication policy ${POLICY_ID}: field "${p}" of ${ctx.scope} is not in PUBLIC_FIELDS (nothing is published by default)`);
      out[k] = project(v, sub, p, ctx);
    }
    return out;
  }
  if (spec === 'third') {
    if (ctx.open) return value;
    ctx.redacted.push(path);
    return null;
  }
  if (spec === 'text' && !ctx.open) {
    if (typeof value !== 'string') throw new Error(`${ctx.scope} ${path}: expected text`);
    return scanText(value, path, ctx);
  }
  return value;
}

export interface PublicationInput {
  readonly measurements: readonly NormalizedMeasurement[];
  readonly sources: readonly Evidence[];
  readonly groups: readonly { readonly id: string; readonly members: readonly string[] }[];
  readonly phenomena: readonly object[];
  readonly observers: readonly object[];
  readonly scenarios: readonly object[];
  readonly withheld: readonly { readonly id: string }[];
  /** Raw (data/raw) quotes by measurement id, qualified or not. */
  readonly rawQuotes: ReadonlyMap<string, readonly string[]>;
  /** Curated quotes of withheld (non-qualified) values, by id. */
  readonly withheldQuotes: ReadonlyMap<string, readonly string[]>;
  readonly decisions: readonly TextDecision[];
}
export interface PublicationOutput {
  measurements: NormalizedMeasurement[];
  sources: Evidence[];
  groups: unknown[];
  phenomena: unknown[];
  observers: unknown[];
  scenarios: unknown[];
  withheld: unknown[];
  findings: Finding[];
  problems: string[];
  /** For the built-site check (scripts/check-public-text.ts). */
  check: { withheldTexts: string[]; approvedSpans: string[]; openTexts: string[] };
}

export function isOpenSource(s: Evidence | undefined): boolean {
  return !!s && s.redistribution === 'allowed' && !ALLOWED_UNDER_REVIEW.has(s.id);
}

export function applyPublicationPolicy(input: PublicationInput): PublicationOutput {
  const src = new Map(input.sources.map((s) => [s.id, s]));
  const openM = (m: NormalizedMeasurement) => m.sourceIds.every((id) => isOpenSource(src.get(id)));
  const third = (m: NormalizedMeasurement): string[] =>
    [m.quote, m.uncertainty?.statement ?? null, ...(input.rawQuotes.get(m.id) ?? [])].filter((x): x is string => !!x);
  const byId = new Map(input.measurements.map((m) => [m.id, m]));
  const decisions = new Map<string, TextDecision>();
  const problems: string[] = [];
  for (const d of input.decisions) {
    const k = decisionKey(d.scope, d.field, d.text);
    if (decisions.has(k)) problems.push(`duplicate decision for ${d.scope} ${d.field}: ${JSON.stringify(d.text)}`);
    decisions.set(k, d);
  }
  const used = new Set<string>();
  const findings: Finding[] = [];
  const ctx = (scope: string, open: boolean, texts: string[]): Ctx =>
    ({ scope, open, thirdParty: grams(texts), decisions, used, findings, problems, redacted: [] });

  const measurements = input.measurements.map((m) => {
    const c = ctx(`measurement:${m.id}`, openM(m), third(m));
    const rest: Record<string, unknown> = { ...m };
    delete rest.excerpt; // recomputed below
    const v = project(rest, PUBLIC_FIELDS.measurement!, '', c) as NormalizedMeasurement;
    return { ...v, excerpt: c.open ? { status: 'published' as const } : { status: 'withheld' as const, reason: 'redistribution-not-established' as const, redacted: c.redacted } };
  });
  const sources = input.sources.map((s) => {
    const citing = input.measurements.filter((m) => m.sourceIds.includes(s.id)).flatMap(third);
    return project(s, PUBLIC_FIELDS.source!, '', ctx(`source:${s.id}`, isOpenSource(s), citing)) as Evidence;
  });
  const groups = input.groups.map((g) => {
    const ms = g.members.map((id) => byId.get(id)).filter((m): m is NormalizedMeasurement => !!m);
    return project(g, PUBLIC_FIELDS.group!, '', ctx(`group:${g.id}`, ms.length === g.members.length && ms.every(openM), ms.flatMap(third)));
  });
  const plain = (section: string, xs: readonly object[]) =>
    xs.map((x) => project(x, PUBLIC_FIELDS[section]!, '', ctx(`${section}:${(x as { id: string }).id}`, false, [])));
  const phenomena = plain('phenomenon', input.phenomena);
  const observers = plain('observer', input.observers);
  const scenarios = plain('scenario', input.scenarios);
  const withheld = input.withheld.map((w) =>
    project(w, PUBLIC_FIELDS.withheld!, '', ctx(`withheld:${w.id}`, false, [...(input.withheldQuotes.get(w.id) ?? []), ...(input.rawQuotes.get(w.id) ?? [])])));

  for (const [k, d] of decisions) if (!used.has(k)) problems.push(`stale decision (matches no finding) for ${d.scope} ${d.field}: ${JSON.stringify(d.text)}`);

  // 4. Global check over everything published.
  const withheldTexts = [
    ...input.measurements.filter((m) => !openM(m)).flatMap(third),
    ...[...input.withheldQuotes.values()].flat(),
    ...input.withheld.flatMap((w) => input.rawQuotes.get(w.id) ?? []),
  ];
  const approved = findings.filter((f) => f.decision?.decision === 'publish').map((f) => f.text);
  const openTexts = input.measurements.filter(openM).flatMap(third);
  const out = { measurements, sources, groups, phenomena, observers, scenarios, withheld };
  problems.push(...leaks(JSON.stringify(out), withheldTexts, approved, openTexts));
  return { ...out, findings, problems, check: { withheldTexts, approvedSpans: approved, openTexts } };
}

/**
 * Runs of OVERLAP_WORDS words of `withheldTexts` found in `published`, outside approved spans.
 * Runs that also belong to a published (open) excerpt are not leaks.
 */
export function leaks(published: string, withheldTexts: readonly string[], approved: readonly string[], openTexts: readonly string[] = []): string[] {
  const g = grams(withheldTexts);
  for (const x of grams(openTexts)) g.delete(x);
  const ok = grams(approved);
  const out: string[] = [];
  const t = tokens(published).map((x) => x.w);
  for (let i = 0; i + OVERLAP_WORDS <= t.length; i++) {
    const s = t.slice(i, i + OVERLAP_WORDS).join(' ');
    if (g.has(s) && !ok.has(s)) out.push(`withheld third-party wording published: "${s}"`);
  }
  return [...new Set(out)];
}
