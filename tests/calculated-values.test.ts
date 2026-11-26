/**
 * Independent recomputation of every qualified `calculated` value (review M-3).
 * Each entry recomputes from the corpus inputs (or from the documented figure
 * of the cited source, quoted in the comment). A new calculated value without
 * an oracle here makes the coverage test fail.
 */
import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import type { Corpus } from '@chronosilicon/ontology';

const corpus = JSON.parse(readFileSync('data/validated/corpus.json', 'utf8')) as Corpus;
const si = (phen: string) => {
  const m = corpus.measurements.find((x) => x.phenomenonId === phen);
  if (!m) throw new Error(`missing input ${phen}`);
  return m.valueSI;
};
const c = () => si('speed-of-light-vacuum');

const ORACLE: Record<string, () => number> = {
  'caesium-period': () => 1 / si('caesium-hyperfine-frequency'),
  'light-distance-per-ns': () => c() * 1e-9,
  'astronomical-unit-light-time': () => si('astronomical-unit') / c(),
  'earth-moon-light-time-one-way': () => si('earth-moon-semimajor-axis') / c(),
  'earth-mars-light-time-min': () => si('earth-mars-distance-min') / c(),
  'earth-mars-light-time-max': () => si('earth-mars-distance-max') / c(),
  'voyager1-light-time-2026-11-18': () => si('voyager1-distance-2026-11-18') / c(),
  // 64 B frame + 8 B preamble + 12 B inter-frame gap = 84 B = 672 bit (RFC 2544 App. B structure)
  'ethernet-min-frame-wire-time-1g': () => ((si('ethernet-min-frame-size') + 8 + 12) * 8) / 1e9,
  'ethernet-min-frame-wire-time-10g': () => ((si('ethernet-min-frame-size') + 8 + 12) * 8) / 1e10,
  'ethernet-min-frame-wire-time-100g': () => ((si('ethernet-min-frame-size') + 8 + 12) * 8) / 1e11,
  'linux-tick-period-hz1000': () => 1 / 1000, // Kconfig option HZ_1000 (cited source)
  'usb-fs-max-polling-rate': () => 1 / si('usb-fs-interrupt-min-period'),
  'usb-hs-max-polling-rate': () => 1 / si('usb-hs-microframe'), // bInterval = 1 → 2^0 × 125 µs
  'frame-time-60hz': () => 1 / si('hdmi-8k60-refresh'),
  'frame-time-120hz': () => 1 / si('hdmi-4k120-refresh'),
  'b200-per-gpu-hbm-bandwidth': () => si('dgx-b200-total-hbm-bandwidth') / 8, // 8 GPUs per DGX B200
  'exos-x20-spindle-frequency': () => 7200 / 60, // 7200 RPM documented in the cited data sheet
  'hdd-7200rpm-half-rotation': () => 0.5 / si('exos-x20-spindle-frequency'),
  'hdd-7200rpm-full-rotation': () => 1 / si('exos-x20-spindle-frequency'),
  'solidigm-p5520-4k-qd16-latency-derived': () => 16 / 233_700, // Little's law, QD16, 233.7k IOPS documented
  // lot 2 (M01)
  'fdsoi28-ro101-frequency-296k-1v': () => 1 / (2 * 101 * si('fdsoi28-ro-stage-delay-296k-1v')), // ring oscillator, 101 stages
  'gps-zenith-one-way-light-time': () => si('gps-orbit-altitude') / c(),
  'geo-one-way-light-time-subsatellite': () => si('geo-orbit-altitude') / c(),
  'ethernet-min-frame-wire-time-800g': () => 672 / si('ethernet-800gbe-rate') / 8, // 672 bit; rate stored in B/s
  'hdd-15k-spindle-frequency': () => 15_000 / 60, // 15 000 RPM documented
  'hdd-5400rpm-spindle-frequency': () => 5400 / 60, // 5400 RPM documented
  'hdd-5400rpm-half-rotation': () => 0.5 / si('hdd-5400rpm-spindle-frequency'),
  'frame-time-144hz': () => 1 / si('vesa-adaptivesync-min-max-refresh'),
  'frame-time-240hz': () => 1 / si('vesa-adaptivesync-display240-tier'),
};

describe('calculated values are reproducible from their inputs', () => {
  const calculated = corpus.measurements.filter((m) => m.provenanceType === 'calculated');
  it('every calculated value has an oracle', () => {
    expect(calculated.map((m) => m.phenomenonId).filter((id) => !ORACLE[id])).toEqual([]);
  });
  for (const m of calculated) {
    it(`${m.phenomenonId}`, () => {
      const expected = ORACLE[m.phenomenonId]!();
      // Stored values may be rounded by the source extraction (e.g. 16.667 ms): ≤ 5e-5 relative.
      expect(Math.abs(m.valueSI - expected) / expected).toBeLessThan(5e-5);
    });
  }
});
