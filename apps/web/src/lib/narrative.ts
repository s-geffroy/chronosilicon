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
  /** Physical time of the line (s): event time, or START of the gap. */
  readonly physical: number;
  /** Gap lines only: physical end of the gap (s) and its exact duration (s). */
  readonly physicalEnd: number | null;
  readonly gapSeconds: number | null;
  /** Gap lines only: task ids running / waiting for a resource during the whole gap. */
  readonly running: readonly string[];
  readonly waiting: readonly string[];
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
      const p0 = prev;
      const gap = e.time - p0;
      const gapS = fsToSeconds(gap);
      const tasks = [...result.tasks.values()];
      // Running during the whole gap: started at or before its start, not ended before its end.
      const running = tasks.filter((t) => t.start !== null && t.end !== null && t.start <= p0 && t.end >= e.time).map((t) => t.id);
      // Waiting for a resource: ready at or before the gap, started at or after its end.
      const waiting = tasks.filter((t) => t.ready !== null && t.start !== null && t.ready <= p0 && t.start >= e.time).map((t) => t.id);
      const waitingText = waiting.length ? translate(lang, 'journal.waiting', { tasks: waiting.map(label).join(', ') }) : '';
      lines.push({
        kind: 'gap',
        physical: fsToSeconds(p0),
        physicalEnd: fsToSeconds(e.time),
        gapSeconds: gapS,
        running,
        waiting,
        subjective: subj(fsToSeconds(p0)),
        seq: null,
        text: translate(lang, running.length ? 'journal.gapRunning' : 'journal.gapIdle', {
          t: formatCalendar(subj(gapS), lang),
          p: formatPhysicalDuration(gapS, lang),
          tasks: running.map(label).join(', '),
          waiting: waitingText,
        }),
      });
    }
    const s = fsToSeconds(e.time);
    lines.push({
      kind: 'event',
      physical: s,
      physicalEnd: null,
      gapSeconds: null,
      running: [],
      waiting: [],
      subjective: subj(s),
      seq: e.seq,
      text: translate(lang, `journal.${e.kind}`, { task: label(e.taskId), res: e.resourceId ?? '—' }),
    });
    prev = e.time;
  }
  return lines;
}
