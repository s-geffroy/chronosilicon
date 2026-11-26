/**
 * V4 immersion journal (CS-08, CS-10): a first-person log DERIVED ONLY from
 * simulated events. It is explicitly a metaphor. Rules:
 *  - one line per simulated event (ready/start/end/cancel), in event order;
 *  - between two events, an explicit "elapsed time" line with the exact
 *    subjective duration and NO claimed activity (no invented CPU work during
 *    a blocking wait);
 *  - timestamps are converted with the observer; physical time is kept.
 */
import { fsToSeconds, type SimulationResult } from '@chronosilicon/simulator';
import { toSubjective, type Observer } from '@chronosilicon/observers';
import { formatCalendar, formatPhysicalDuration } from './format';
import { translate, type Lang } from './i18n';

export type LineKind = 'event' | 'gap';

export interface JournalLine {
  readonly kind: LineKind;
  /** Physical time of the line (s): event time, or end of the gap. */
  readonly physical: number;
  /** Subjective time at that instant for the observer. */
  readonly subjective: number;
  /** Event sequence number for event lines (traceability to the simulator log). */
  readonly seq: number | null;
  readonly text: string;
}

/** Phrases are fixed templates: the journal cannot say anything the events do not say. */
export function narrate(result: SimulationResult, observer: Observer, lang: Lang, label: (taskId: string) => string): JournalLine[] {
  const lines: JournalLine[] = [];
  const subj = (s: number) => toSubjective(s, observer).subjectiveSeconds;
  let prev: bigint | null = null;
  for (const e of result.events) {
    if (prev !== null && e.time > prev) {
      const gapS = fsToSeconds(e.time - prev);
      const running = [...result.tasks.values()].filter((t) => t.start !== null && t.end !== null && t.start <= prev! && t.end >= e.time).map((t) => t.id);
      lines.push({
        kind: 'gap',
        physical: fsToSeconds(e.time),
        subjective: subj(fsToSeconds(e.time)),
        seq: null,
        text: translate(lang, running.length ? 'journal.gapRunning' : 'journal.gapIdle', {
          t: formatCalendar(subj(gapS), lang),
          p: formatPhysicalDuration(gapS, lang),
          tasks: running.join(', '),
        }),
      });
    }
    const s = fsToSeconds(e.time);
    lines.push({
      kind: 'event',
      physical: s,
      subjective: subj(s),
      seq: e.seq,
      text: translate(lang, `journal.${e.kind}`, { task: label(e.taskId), res: e.resourceId ?? '—' }),
    });
    prev = e.time;
  }
  return lines;
}
