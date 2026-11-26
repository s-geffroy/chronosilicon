/**
 * Shareable state serialised in the URL hash (#/route?k=v). Only validated
 * parameters are read back; anything invalid falls back to the default and is
 * never trusted (CS-10). No personal data.
 */
import { DOMAINS, type Domain, type ProvenanceType } from '@chronosilicon/ontology';
import { LANGS, type Lang } from './i18n';

export const ROUTES = ['timeline', 'converter', 'architecture', 'observers', 'simulation', 'immersion', 'comparison', 'laboratory', 'about'] as const;
export type Route = (typeof ROUTES)[number];
export type Level = 'explore' | 'technical' | 'scientific';
export const LEVELS: readonly Level[] = ['explore', 'technical', 'scientific'];
export type Axis = 'physical' | 'subjective';
export type View = 'chart' | 'table';
export const PROVENANCES: readonly ProvenanceType[] = ['measured', 'documented', 'calculated', 'estimated'];

export interface UrlState {
  route: Route;
  lang: Lang;
  level: Level;
  frequencyHz: number;
  axis: Axis;
  view: View;
  domains: Domain[] | null; // null = all
  provenance: ProvenanceType[] | null; // null = all
  selected: string | null;
  /** Comparison/hierarchy group (validated id). */
  group: string | null;
  /** Duration observed in the observers space (validated id). */
  observed: string | null;
  /** Simulation scenario (validated id). */
  scenario: string | null;
  /** Capacity override for the scenario's first resource (1..64). */
  capacity: number | null;
}

export const DEFAULT_STATE: Readonly<UrlState> = Object.freeze({
  route: 'timeline',
  lang: 'fr',
  level: 'explore',
  frequencyHz: 4e9,
  axis: 'subjective',
  view: 'chart',
  domains: null,
  provenance: null,
  selected: null,
  group: null,
  observed: null,
  scenario: null,
  capacity: null,
});

const MAX_F = 1e15;
const ID = /^[a-z0-9][a-z0-9-]{1,95}$/;

function pick<T extends string>(v: string | null, allowed: readonly T[], d: T): T {
  return v !== null && (allowed as readonly string[]).includes(v) ? (v as T) : d;
}
function pickList<T extends string>(v: string | null, allowed: readonly T[]): T[] | null {
  if (v === null) return null;
  if (v === '') return [];
  const items = v.split(',').filter((x): x is T => (allowed as readonly string[]).includes(x));
  return items.length ? [...new Set(items)] : null;
}

const capOrNull = (v: string | null) => (v !== null && /^\d{1,2}$/.test(v) && Number(v) >= 1 && Number(v) <= 64 ? Number(v) : null);
const idOrNull = (v: string | null) => (v !== null && ID.test(v) ? v : null);

export function parseHash(hash: string, fallbackLang: Lang = 'fr'): UrlState {
  const h = hash.replace(/^#\/?/, '');
  const [path = '', query = ''] = h.split('?');
  const q = new URLSearchParams(query);
  const fRaw = q.get('f') ?? '';
  const f = /^\d+(\.\d+)?(e\d+)?$/i.test(fRaw) ? Number(fRaw) : NaN;
  const sel = q.get('sel');
  return {
    route: pick(path, ROUTES, DEFAULT_STATE.route),
    lang: pick(q.get('lang'), LANGS, fallbackLang),
    level: pick(q.get('level'), LEVELS, DEFAULT_STATE.level),
    frequencyHz: Number.isFinite(f) && f > 0 && f <= MAX_F ? f : DEFAULT_STATE.frequencyHz,
    axis: pick(q.get('axis'), ['physical', 'subjective'] as const, DEFAULT_STATE.axis),
    view: pick(q.get('view'), ['chart', 'table'] as const, DEFAULT_STATE.view),
    domains: pickList(q.get('d'), DOMAINS),
    provenance: pickList(q.get('p'), PROVENANCES),
    selected: sel !== null && ID.test(sel) ? sel : null,
    group: idOrNull(q.get('g')),
    observed: idOrNull(q.get('m')),
    scenario: idOrNull(q.get('sc')),
    capacity: capOrNull(q.get('cap')),
  };
}

export function serializeHash(s: UrlState, appVersion: string): string {
  const q = new URLSearchParams();
  q.set('lang', s.lang);
  if (s.level !== DEFAULT_STATE.level) q.set('level', s.level);
  if (s.frequencyHz !== DEFAULT_STATE.frequencyHz) q.set('f', String(s.frequencyHz));
  if (s.axis !== DEFAULT_STATE.axis) q.set('axis', s.axis);
  if (s.view !== DEFAULT_STATE.view) q.set('view', s.view);
  if (s.domains !== null) q.set('d', s.domains.join(','));
  if (s.provenance !== null) q.set('p', s.provenance.join(','));
  if (s.selected) q.set('sel', s.selected);
  if (s.group) q.set('g', s.group);
  if (s.observed) q.set('m', s.observed);
  if (s.scenario) q.set('sc', s.scenario);
  if (s.capacity !== null) q.set('cap', String(s.capacity));
  q.set('v', appVersion);
  return `#/${s.route}?${q.toString()}`;
}
