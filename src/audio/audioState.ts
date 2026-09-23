import type { ArtisticState } from '../confidence/artisticState';

/**
 * AUDIO — architecture only (milestone 1).
 *
 * The sound of the work follows the same law as the image: loss of
 * certainty is loss of structure, not loss of volume. These parameters are
 * written per frame to renders/<id>/control.csv, so that the sound design
 * (Logic Pro or any DAW) can be automated from the exact curves of the render.
 * A live WebAudio renderer can later consume the same values.
 */
export interface AudioParams {
  /** 1 = tonal, periodic; 0 = noise. Follows displayed coherence. */
  harmonicity: number;
  /** Rhythmic regularity. Follows relationships. */
  pulse: number;
  /** Number of simultaneous voices / events. Follows evidence. */
  density: number;
  /** Spectral width of the inferred layer. Follows the inferred share. */
  spread: number;
  /** Overall level: only absence is silence. */
  level: number;
}

export function audioParams(s: ArtisticState, maxEvidence = 32): AudioParams {
  return {
    harmonicity: s.coherence,
    pulse: s.relation,
    density: Math.min(1, s.evidence / maxEvidence),
    spread: s.inferred,
    level: s.phase === null ? 0 : Math.min(1, 0.25 + 0.75 * Math.max(s.coherence, s.inferred)),
  };
}
