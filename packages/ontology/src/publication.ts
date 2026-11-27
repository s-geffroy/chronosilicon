/**
 * Public view of the corpus (REMEDIATION-01, AUD-012/017, ADR-0011).
 *
 * Conservative rule: verbatim third-party text is published only when EVERY
 * source cited by the value has redistribution `allowed`. Otherwise:
 *  - `quote` and `uncertainty.statement` are withheld (null);
 *  - quoted passages of MIN_REDACTED_WORDS words or more inside `notes`,
 *    `protocol` and `conditions` are replaced by REDACTION.
 * Facts (value, unit, conditions, locator, source title and URL) stay published.
 * Locators keep table and section titles: they are needed to find the value.
 * Curated data is never modified; this is a pure projection for publication.
 * This is a precautionary policy, not a legal conclusion.
 */
import type { Evidence, NormalizedMeasurement } from './index';

export const MIN_REDACTED_WORDS = 6;

/**
 * Sources declared `allowed` whose declaration is doubtful and awaits human
 * review (SOURCE-RIGHTS.md): treated as not established for publication.
 * - src-nasa-voyager-where: no licence on the page and credit "NASA/JPL-Caltech";
 *   JPL is operated by Caltech, so U.S.-government-work status is not established.
 */
export const ALLOWED_UNDER_REVIEW: ReadonlySet<string> = new Set(['src-nasa-voyager-where']);
export const REDACTION = '[…]';

/** Quoted spans: “…”, "…", « … », and '…' when the opening quote starts a word (not an apostrophe). */
const QUOTED = /“([^”]+)”|"([^"]+)"|«\s*([^»]+?)\s*»|(?<=^|[\s([])'([^']+)'(?=$|[\s.,;:)\]])/g;

export function quotedSpans(text: string): Array<{ full: string; inner: string; words: number }> {
  const out: Array<{ full: string; inner: string; words: number }> = [];
  for (const m of text.matchAll(QUOTED)) {
    const inner = (m[1] ?? m[2] ?? m[3] ?? m[4] ?? '').trim();
    out.push({ full: m[0], inner, words: inner.split(/\s+/).filter(Boolean).length });
  }
  return out;
}

function redactText(text: string): { text: string; changed: boolean } {
  let changed = false;
  const t = text.replace(QUOTED, (full: string, a?: string, b?: string, c?: string, d?: string) => {
    const inner = (a ?? b ?? c ?? d ?? '').trim();
    if (inner.split(/\s+/).filter(Boolean).length < MIN_REDACTED_WORDS) return full;
    changed = true;
    return REDACTION;
  });
  return { text: t, changed };
}

export function publicView(measurements: readonly NormalizedMeasurement[], sources: readonly Evidence[]): NormalizedMeasurement[] {
  const redistribution = new Map(sources.map((s) => [s.id, s.redistribution]));
  const open = (id: string) => redistribution.get(id) === 'allowed' && !ALLOWED_UNDER_REVIEW.has(id);
  return measurements.map((m) => {
    if (m.sourceIds.every(open)) return { ...m, excerpt: { status: 'published' } };
    const redacted: string[] = [];
    const quote = m.quote === null ? null : (redacted.push('quote'), null);
    const uncertainty = m.uncertainty === null ? null : (redacted.push('uncertainty.statement'), { ...m.uncertainty, statement: null });
    const field = (name: string, v: string | null): string | null => {
      if (v === null) return null;
      const r = redactText(v);
      if (r.changed) redacted.push(name);
      return r.text;
    };
    const notes = field('notes', m.notes);
    const protocol = field('protocol', m.protocol);
    const fr = field('conditions.fr', m.conditions.fr)!;
    const en = field('conditions.en', m.conditions.en)!;
    return {
      ...m,
      quote,
      uncertainty,
      notes,
      protocol,
      conditions: { fr, en },
      excerpt: { status: 'withheld', reason: 'redistribution-not-established', redacted },
    };
  });
}
