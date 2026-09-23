import { displayedCoherence } from './confidence';
import type { Choreography, Frame } from '../core/choreography';
import type { PhaseName } from '../timeline/timeline';

/**
 * ARTISTIC STATE — the global condition of the work at an instant.
 * One description, two consequences: the image and (later) the sound.
 *
 *   confidence ──┬── visual coherence
 *                └── audio coherence
 */
export interface ArtisticState {
  t: number;
  phase: PhaseName | null;
  phaseProgress: number;
  /** Epistemic confidence of what is on screen, weighted by presence. */
  confidence: number;
  /** How much the system hides its uncertainty (0 until SYNTHESIS). */
  acceptance: number;
  /** What the viewer is shown. */
  coherence: number;
  /** Visible traces of the archive. */
  evidence: number;
  /** Degree of organisation: relationships formed (0–1). */
  relation: number;
  /** Share of the picture produced by inference rather than recorded (0–1). */
  inferred: number;
}

export function computeArtisticState(frame: Frame, choreo: Choreography): ArtisticState {
  const tl = frame.timeline;
  let wsum = 0, csum = 0, evidence = 0;
  for (const e of frame.elements) {
    if (e.kind !== 'evidence' || e.k <= 0.01) continue;
    evidence++;
    const w = e.w * e.h;
    wsum += w;
    csum += w * e.confidence;
  }
  const evidenceConfidence = wsum > 0 ? csum / wsum : 0;
  const f = frame.field;
  // Area of the picture supported by archived fragments.
  const anchored = Math.min(1, f.anchors.reduce((s, a) => s + a.rect.w * a.rect.h * a.arrival, 0));
  const inferredArea = Math.max(0, Math.min(1, f.reach * 0.9 + f.prior * 0.5) - anchored);
  const inferredShare = inferredArea / Math.max(1e-6, inferredArea + anchored);
  const meanInference = choreo.inferences.length
    ? choreo.inferences.reduce((s, i) => s + i.confidence, 0) / choreo.inferences.length
    : 0;
  const confidence = tl.progress.INFERENCE > 0
    ? evidenceConfidence * (1 - inferredShare) + meanInference * inferredShare
    : evidenceConfidence;
  const relation = frame.edges.length ? frame.edges.reduce((s, e) => s + e.progress * e.k, 0) / choreo.graph.edges.length : 0;
  return {
    t: tl.t,
    phase: tl.phase,
    phaseProgress: tl.local,
    confidence,
    acceptance: f.acceptance,
    coherence: displayedCoherence(confidence, f.acceptance),
    evidence,
    relation,
    inferred: inferredShare,
  };
}
