import { describe, expect, it } from 'vitest';
import { createRng, hash32 } from '../src/core/random';
import { coherenceParams, displayedCoherence, inferredConfidence, relationshipStrength } from '../src/confidence/confidence';
import { evaluateTimeline, validateTimeline } from '../src/timeline/timeline';
import { TIMELINES, prototype } from '../src/timeline/timelines';
import { demoDataset } from '../src/data/demoDataset';
import { validateDataset } from '../src/evidence/validate';
import { buildGraph } from '../src/correlation/graph';
import { forceLayout } from '../src/correlation/layout';
import { deriveInferences } from '../src/inference/inferences';

describe('seeded randomness', () => {
  it('is reproducible per seed and stream', () => {
    const a = createRng(1987, 'x');
    const b = createRng(1987, 'x');
    const seqA = Array.from({ length: 50 }, () => a.next());
    expect(Array.from({ length: 50 }, () => b.next())).toEqual(seqA);
    expect(createRng(1988, 'x').next()).not.toEqual(seqA[0]);
    expect(createRng(1987, 'y').next()).not.toEqual(seqA[0]);
    expect(seqA.every((v) => v >= 0 && v < 1)).toBe(true);
    expect(hash32('a', 1)).toBe(hash32('a', 1));
  });
});

describe('confidence', () => {
  it('controls coherence, not opacity', () => {
    const levels = [1, 0.8, 0.6, 0.4, 0.2];
    const p = levels.map(coherenceParams);
    for (let i = 1; i < p.length; i++) {
      expect(p[i].blur).toBeGreaterThan(p[i - 1].blur);
      expect(p[i].fragmentation).toBeGreaterThan(p[i - 1].fragmentation);
      expect(p[i].displacement).toBeGreaterThan(p[i - 1].displacement);
    }
    // Presence stays full down to 0.2: uncertainty is not transparency.
    for (const q of p) expect(q.presence).toBe(1);
    expect(coherenceParams(0).presence).toBe(0);
    const certain = coherenceParams(1);
    expect(certain.blur + certain.fragmentation + certain.displacement + certain.noise + certain.dropout).toBe(0);
  });
  it('acceptance hides uncertainty without changing it', () => {
    expect(displayedCoherence(0.4, 0)).toBeCloseTo(0.4);
    expect(displayedCoherence(0.4, 1)).toBeCloseTo(1);
    expect(displayedCoherence(0.4, 0.5)).toBeCloseTo(0.7);
  });
  it('inference never exceeds its weakest support', () => {
    expect(inferredConfidence([0.9, 0.3, 0.8])).toBeLessThanOrEqual(0.3);
    expect(inferredConfidence([])).toBe(0);
    expect(relationshipStrength({ semanticWeight: 1, confidence: 1 }, { semanticWeight: 1, confidence: 0.2 })).toBeCloseTo(0.2);
  });
});

describe('timeline', () => {
  it('all timelines are valid', () => {
    for (const t of Object.values(TIMELINES)) expect(validateTimeline(t)).toEqual([]);
  });
  it('reports phase progress', () => {
    const s = evaluateTimeline(prototype, 12);
    expect(s.phase).toBe('CORRELATION');
    expect(s.local).toBeCloseTo(0.5);
    expect(s.progress.ARCHIVE).toBe(1);
    expect(s.progress.INFERENCE).toBe(0);
  });
  it('detects overlaps', () => {
    expect(validateTimeline({ name: 'bad', duration: 10, phases: [{ phase: 'ARCHIVE', start: 0, end: 6 }, { phase: 'CORRELATION', start: 5, end: 10 }] }).length).toBeGreaterThan(0);
  });
});

describe('demo dataset and graph', () => {
  it('is valid', () => expect(validateDataset(demoDataset)).toEqual([]));
  it('derives edges and inferences deterministically', () => {
    const g = buildGraph(demoDataset);
    expect(g.edges.length).toBeGreaterThan(30);
    for (const e of g.edges) expect(e.strength).toBeGreaterThanOrEqual(0);
    const inf = deriveInferences(demoDataset, g);
    expect(inf.map((i) => i.id)).toContain('INF_PERSON');
    for (const i of inf) expect(i.confidence).toBeLessThanOrEqual(0.6);
  });
  it('layout is a pure function of the seed', () => {
    const g = buildGraph(demoDataset);
    const run = (seed: number) =>
      forceLayout({ graph: g, sizes: new Map(), pinned: new Map([['PERSON', { x: 0, y: 0 }]]), initial: new Map(), bounds: { minX: -4, maxX: 4, minY: -7, maxY: 7 }, seed, iterations: 60 });
    const a = run(7);
    const b = run(7);
    expect([...a.entries()]).toEqual([...b.entries()]);
    expect(a.get('PERSON')).toEqual({ x: 0, y: 0 });
  });
});
