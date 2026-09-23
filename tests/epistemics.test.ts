import { describe, expect, it } from 'vitest';
import { evaluateTimeline } from '../src/timeline/timeline';
import { full, study } from '../src/timeline/timelines';
import { classAcceptance, classPresence, SYNTHESIS_STILL } from '../src/confidence/epistemics';
import { CLASS_ORDER, type EpistemicClass } from '../src/subject/regions';

const at = (tl: typeof full, t: number) => evaluateTimeline(tl, t);

/** First time (s) at which f(t) crosses below 0.5, scanning the phase. */
function withdrawTime(cls: EpistemicClass, tl: typeof full): number {
  const d = tl.phases.find((p) => p.phase === 'DECONSTRUCTION')!;
  for (let t = d.start; t <= d.end; t += 0.05) if (classPresence(cls, at(tl, t)) < 0.5) return t;
  return Infinity;
}

describe('epistemic schedule', () => {
  for (const tl of [full, study]) {
    it(`${tl.name}: acceptance ≈ 0 before the picture, → 1 when SYNTHESIS is still`, () => {
      const s = tl.phases.find((p) => p.phase === 'SYNTHESIS')!;
      const still = s.start + (s.end - s.start) * (SYNTHESIS_STILL + 0.02);
      for (const cls of CLASS_ORDER) {
        expect(classAcceptance(cls, at(tl, 1))).toBe(0);
        expect(classAcceptance(cls, at(tl, still))).toBeGreaterThan(0.999);
      }
    });

    it(`${tl.name}: during SYNTHESIS, the best supported are accepted first, the absent last`, () => {
      const s = tl.phases.find((p) => p.phase === 'SYNTHESIS')!;
      const mid = at(tl, s.start + (s.end - s.start) * 0.4);
      const a = CLASS_ORDER.map((c) => classAcceptance(c, mid));
      for (let i = 1; i < a.length; i++) expect(a[i]).toBeLessThanOrEqual(a[i - 1] + 1e-9);
    });

    it(`${tl.name}: DECONSTRUCTION follows the genealogy in reverse`, () => {
      const t = Object.fromEntries(CLASS_ORDER.map((c) => [c, withdrawTime(c, tl)])) as Record<EpistemicClass, number>;
      expect(t.synthetic).toBeLessThan(t.inferred);
      expect(t.absent).toBeLessThan(t.inferred);
      expect(t.inferred).toBeLessThan(t.derived);
      expect(t.derived).toBeLessThan(t.observed);
      expect(t.observed).toBeLessThan(Infinity);
    });
  }
});
