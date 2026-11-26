/** JSON/CSV export with units, versions and sources (CS-02 F07/F08). */
import type { NormalizedMeasurement } from '@chronosilicon/ontology';
import { BASE_UNIT } from '@chronosilicon/metrology';
import { toSubjective, clockedObserver } from '@chronosilicon/observers';
import { corpus, phenomenonOf, sourceById } from './corpus';
import type { Lang } from './i18n';

export interface ExportContext {
  readonly appVersion: string;
  readonly commit: string;
  readonly frequencyHz: number;
  readonly lang: Lang;
}

function subjectiveFor(m: NormalizedMeasurement, f: number): number | null {
  return m.quantityKind === 'duration' ? toSubjective(m.valueSI, clockedObserver(f)).subjectiveSeconds : null;
}

export function buildJsonExport(ms: readonly NormalizedMeasurement[], ctx: ExportContext): string {
  const usedSources = new Set(ms.flatMap((m) => m.sourceIds));
  return JSON.stringify(
    {
      generator: 'CHRONOSILICON',
      appVersion: ctx.appVersion,
      commit: ctx.commit,
      corpusVersion: corpus.corpusVersion,
      schemaVersion: corpus.schemaVersion,
      observer: { kind: 'clocked', frequencyHz: ctx.frequencyHz, tauSeconds: 1 },
      units: BASE_UNIT,
      measurements: ms.map((m) => ({
        ...m,
        label: phenomenonOf(m).label,
        domain: phenomenonOf(m).domain,
        siUnit: BASE_UNIT[m.quantityKind],
        subjectiveSeconds: subjectiveFor(m, ctx.frequencyHz),
      })),
      sources: corpus.sources.filter((s) => usedSources.has(s.id)),
    },
    null,
    2,
  );
}

const CSV_COLUMNS = [
  'id', 'label', 'domain', 'quantityKind', 'value', 'unit', 'valueSI', 'siUnit', 'low', 'high',
  'subjectiveSeconds', 'observerFrequencyHz', 'configuration', 'conditions', 'provenanceType',
  'verificationStatus', 'sourceIds', 'sourceUrls', 'locator', 'era', 'corpusVersion', 'appVersion',
] as const;

export function csvEscape(v: unknown): string {
  if (v === null || v === undefined) return '';
  if (typeof v === 'number') return String(v);
  const s = String(v);
  // Neutralise spreadsheet formula injection (any string starting with = + - @ tab CR), then quote.
  const safe = /^[=+\-@\t\r]/.test(s) ? `'${s}` : s;
  return /[",\n\r;]/.test(safe) ? `"${safe.replace(/"/g, '""')}"` : safe;
}

export function buildCsvExport(ms: readonly NormalizedMeasurement[], ctx: ExportContext): string {
  const rows = ms.map((m) => {
    const p = phenomenonOf(m);
    const row: Record<(typeof CSV_COLUMNS)[number], unknown> = {
      id: m.id,
      label: p.label[ctx.lang],
      domain: p.domain,
      quantityKind: m.quantityKind,
      value: m.value,
      unit: m.unit,
      valueSI: m.valueSI,
      siUnit: BASE_UNIT[m.quantityKind],
      low: m.low,
      high: m.high,
      subjectiveSeconds: subjectiveFor(m, ctx.frequencyHz),
      observerFrequencyHz: ctx.frequencyHz,
      configuration: m.configuration,
      conditions: m.conditions[ctx.lang],
      provenanceType: m.provenanceType,
      verificationStatus: m.verificationStatus,
      sourceIds: m.sourceIds.join(' '),
      sourceUrls: m.sourceIds.map((s) => sourceById.get(s)?.url ?? '').join(' '),
      locator: m.locator,
      era: m.era,
      corpusVersion: corpus.corpusVersion,
      appVersion: ctx.appVersion,
    };
    return CSV_COLUMNS.map((c) => csvEscape(row[c])).join(',');
  });
  return [CSV_COLUMNS.join(','), ...rows].join('\r\n') + '\r\n';
}

export function download(filename: string, content: string, mime: string): void {
  const blob = new Blob([content], { type: mime });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.append(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
