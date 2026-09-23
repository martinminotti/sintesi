import { clamp, lerp, smoothstep } from '../core/math';
import type { Provenance } from '../evidence/types';

/**
 * CONFIDENCE
 *
 *   1.00  highly certain information
 *   0.80  very probable
 *   0.60  plausible
 *   0.40  inferred
 *   0.20  highly uncertain
 *   0.00  absence of information
 *
 * Two quantities drive the work:
 *
 *   confidence  — epistemic: how much the system actually knows.
 *   acceptance  — how much the system stops *signalling* what it does not know.
 *
 * What the viewer sees is the displayed coherence:
 *
 *   coherence = mix(confidence, 1, acceptance)
 *
 * Until SYNTHESIS, acceptance is 0 and the image is honest. In SYNTHESIS it
 * rises to 1: inference becomes accepted reality, while confidence has not changed.
 */

export const PROVENANCE_RANGE: Record<Provenance, readonly [number, number]> = {
  observed: [0.8, 1.0],
  derived: [0.55, 0.85],
  inferred: [0.2, 0.6],
  synthetic: [0.0, 0.3],
};

export function displayedCoherence(confidence: number, acceptance: number): number {
  return lerp(clamp(confidence), 1, clamp(acceptance));
}

/**
 * The visual consequences of a coherence value.
 * This is the reference implementation; shaders/lib/reconstruction.glsl mirrors it.
 * Confidence governs structure, not opacity: `presence` only falls
 * at the very bottom of the scale, where information is absent.
 */
export interface CoherenceParams {
  /** Flow displacement amplitude (fraction of the element). */
  displacement: number;
  /** Cell offset: pieces of the image drift from where they belong. */
  fragmentation: number;
  /** Fraction of cells for which nothing is known. */
  dropout: number;
  /** Blur, normalised 0–1. */
  blur: number;
  /** Replacement of structure by noise of the same energy. */
  noise: number;
  /** Tonal levels available (information as bit depth). */
  levels: number;
  /** Speed at which uncertain structure keeps searching. */
  instability: number;
  /** Only absence makes things disappear. */
  presence: number;
}

export function coherenceParams(k: number): CoherenceParams {
  k = clamp(k);
  const u = 1 - k;
  return {
    displacement: 0.07 * Math.pow(u, 1.5),
    fragmentation: 0.32 * u * u,
    dropout: 0.8 * smoothstep(0.45, 0.97, u),
    blur: Math.pow(u, 1.4),
    noise: smoothstep(0.35, 1.0, u),
    levels: lerp(256, 5, smoothstep(0.4, 1.0, u)),
    instability: u,
    presence: smoothstep(0.0, 0.12, k),
  };
}

/** Strength of a relationship: evidence must be both meaningful and reliable to bind. */
export function relationshipStrength(a: { semanticWeight: number; confidence: number }, b: { semanticWeight: number; confidence: number }): number {
  return clamp(Math.sqrt(a.semanticWeight * b.semanticWeight) * Math.min(a.confidence, b.confidence));
}

/** Confidence of something inferred from several sources: it can never exceed its weakest support. */
export function inferredConfidence(sources: number[], attenuation = 0.65): number {
  if (sources.length === 0) return 0;
  const mean = sources.reduce((s, c) => s + c, 0) / sources.length;
  const min = Math.min(...sources);
  // More sources reinforce each other, with diminishing returns.
  const support = 1 - Math.exp(-sources.length / 2.5);
  return clamp(Math.min(min, mean) * attenuation * (0.6 + 0.4 * support));
}

export function classify(confidence: number): Provenance {
  if (confidence >= PROVENANCE_RANGE.observed[0]) return 'observed';
  if (confidence >= PROVENANCE_RANGE.derived[0]) return 'derived';
  if (confidence >= PROVENANCE_RANGE.inferred[0]) return 'inferred';
  return 'synthetic';
}
