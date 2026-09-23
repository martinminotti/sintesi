import type { Engine } from '../core/Engine';
import { computeArtworkState } from '../confidence/artworkState';

/**
 * THE SCORE — what the sound is derived from.
 *
 * Nothing is composed on top of the image: every event is detected from the same
 * choreography that draws the frame, and every continuous parameter is the same
 * ArtworkState. The audio renderer (scripts/audio.ts) only turns this into sound.
 */
export interface ScoreFrame {
  t: number;
  phase: string | null;
  confidence: number;
  acceptance: number;
  certainty: number;
  evidence: number;
  relation: number;
  picture: number;
  proposal: number;
  /** The window region: accepted (the view is decided) × still present. */
  outside: number;
  /** Mean presence of the picture's regions (0 once taken apart). */
  presence: number;
}

export type ScoreEvent =
  | { t: number; kind: 'trace'; id: string; type: string; confidence: number; x: number }
  | { t: number; kind: 'relation'; strength: number; x: number }
  | { t: number; kind: 'arrival'; id: string; x: number }
  | { t: number; kind: 'source'; id: string; type: string; x: number }
  | { t: number; kind: 'loss'; id: string; x: number };

export interface Score {
  fps: number;
  duration: number;
  seed: number;
  frames: ScoreFrame[];
  events: ScoreEvent[];
}

export function buildScore(engine: Engine): Score {
  const fps = engine.config.fps;
  const n = Math.round(engine.timeline.duration * fps);
  const types = new Map(engine.dataset.evidence.map((e) => [e.id, e]));
  const frames: ScoreFrame[] = [];
  const events: ScoreEvent[] = [];
  const prevK = new Map<string, number>();
  const seenEdge = new Set<number>();
  const arrived = new Set<string>();
  const regionArea = engine.subject.regionArea;
  const pan = (x: number) => Math.max(-1, Math.min(1, x / 4.5));

  for (let f = 0; f < n; f++) {
    const t = f / fps;
    const frame = engine.choreography.evaluate(t);
    const s = computeArtworkState(frame, engine.config.seed, regionArea, engine.choreography.graph.edges.length);
    const outside = frame.regions[3];
    frames.push({
      t, phase: s.phase, confidence: s.confidence, acceptance: s.acceptance, certainty: s.certainty,
      evidence: s.evidence, relation: s.relation, picture: s.picture, proposal: frame.proposal,
      outside: outside ? outside.acceptance * outside.presence : 0,
      presence: frame.regions.reduce((a, r) => a + r.presence, 0) / Math.max(1, frame.regions.length),
    });

    const phase = frame.timeline.phase;
    for (const e of frame.elements) {
      if (e.kind !== 'evidence') continue;
      const ev = types.get(e.id)!;
      const was = prevK.get(e.id) ?? 0;
      const threshold = 0.3;
      if (was < threshold && e.k >= threshold) {
        if (phase === 'ARCHIVE') events.push({ t, kind: 'trace', id: e.id, type: ev.type, confidence: ev.confidence, x: pan(e.x) });
        else if (phase === 'DECONSTRUCTION' && e.source === 0) events.push({ t, kind: 'source', id: e.id, type: ev.type, x: pan(e.x) });
      }
      if (phase === 'DECONSTRUCTION' && e.source === 1 && was >= threshold && e.k < threshold) {
        events.push({ t, kind: 'loss', id: e.id, x: pan(e.x) });
      }
      prevK.set(e.id, e.k);
    }
    for (const e of frame.edges) {
      // An edge's seed is its stable identity (positions move every frame).
      if (frame.timeline.phase === 'CORRELATION' && e.progress > 0.05 && !seenEdge.has(e.seed)) {
        seenEdge.add(e.seed);
        events.push({ t, kind: 'relation', strength: e.strength, x: pan((e.a.x + e.b.x) / 2) });
      }
    }
    for (const a of frame.field.anchors) {
      const id = `${a.rect.x},${a.rect.y}`;
      if (a.arrival >= 0.99 && !arrived.has(id)) {
        arrived.add(id);
        events.push({ t, kind: 'arrival', id, x: pan((a.rect.x + a.rect.w / 2 - 0.5) * 9) });
      }
    }
  }
  return { fps, duration: engine.timeline.duration, seed: engine.config.seed, frames, events };
}
