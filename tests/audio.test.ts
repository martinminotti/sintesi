import { describe, expect, it } from 'vitest';
import { renderAudio } from '../scripts/lib/renderAudio';
import { SR } from '../scripts/lib/dsp';
import type { Score, ScoreFrame } from '../src/audio/score';

/** A 20 s score: archive (0–5), picture uncertain (5–10), accepted (10–15), taken apart (15–18), silence. */
function score(): Score {
  const fps = 24, frames: ScoreFrame[] = [];
  for (let f = 0; f < 20 * fps; f++) {
    const t = f / fps;
    const picture = t < 5 ? 0 : t < 7 ? (t - 5) / 2 : t < 15 ? 1 : Math.max(0, 1 - (t - 15) / 3);
    const acceptance = t < 10 ? 0.1 : t < 11 ? 0.1 + 0.9 * (t - 10) : t < 15 ? 1 : Math.max(0, 1 - (t - 15) / 1.5);
    frames.push({
      t, phase: t < 18 ? 'X' : null, confidence: 0.45, acceptance, certainty: 0.45 + 0.55 * acceptance,
      evidence: t < 5 ? Math.min(8, t * 3) : 0, relation: 0, picture, proposal: t > 5 && t < 10 ? 1 : 0,
      outside: t > 11 && t < 15 ? 1 : 0, presence: t < 18 ? picture : 0,
    });
  }
  return {
    fps, duration: 20, seed: 1987, frames,
    events: [
      { t: 1, kind: 'trace', id: 'A', type: 'photograph', confidence: 0.95, x: -0.5 },
      { t: 2, kind: 'trace', id: 'B', type: 'text', confidence: 0.3, x: 0.5 },
      { t: 3, kind: 'trace', id: 'ABS', type: 'absence', confidence: 0.9, x: 0 },
    ],
  };
}

const rms = (x: Float32Array, a: number, b: number) => {
  let s = 0;
  for (let i = Math.round(a * SR); i < Math.round(b * SR); i++) s += x[i] * x[i];
  return Math.sqrt(s / Math.max(1, Math.round((b - a) * SR)));
};

describe('audio', () => {
  const dir = '/nonexistent'; // demo material only
  const a = renderAudio(score(), { audioDir: dir });

  it('is a deterministic function of the score', () => {
    const b = renderAudio(score(), { audioDir: dir });
    expect(Buffer.from(b.L.buffer).equals(Buffer.from(a.L.buffer))).toBe(true);
  });

  it('ends in silence (only absence is silence)', () => {
    expect(rms(a.L, 18.5, 20)).toBeLessThan(1e-4);
  });

  it('an absence is heard as a silence in the archive', () => {
    expect(rms(a.L, 3.35, 3.55)).toBeLessThan(rms(a.L, 3.9, 4.4) * 0.5);
  });

  it('the accepted picture is fuller and steadier than the uncertain one', () => {
    // Loudness fluctuation (20 ms windows) while uncertain vs once accepted.
    const cv = (a0: number, b0: number) => {
      const w: number[] = [];
      for (let t = a0; t < b0; t += 0.02) w.push(rms(a.L, t, t + 0.02));
      const m = w.reduce((s, v) => s + v, 0) / w.length;
      return Math.sqrt(w.reduce((s, v) => s + (v - m) ** 2, 0) / w.length) / m;
    };
    expect(rms(a.L, 12, 14)).toBeGreaterThan(rms(a.L, 7.5, 9.5));
    expect(cv(12, 14)).toBeLessThan(cv(7.5, 9.5));
  });

  it('never clips', () => {
    expect(a.report.peakDb).toBeLessThanOrEqual(-0.99);
  });
});
