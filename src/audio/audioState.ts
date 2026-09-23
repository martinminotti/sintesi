import type { ArtworkState } from '../confidence/artworkState';

/**
 * AUDIO — the same epistemic process, heard.
 *
 *   evidence → correlation → inference → certainty → fiction → absence
 *
 * Many small separate events while the system holds traces; a sound that grows
 * continuous, full and "real" as acceptance rises — and less informative;
 * structure lost again when the picture is taken apart; silence at the end.
 * More coherence, less evidence.
 *
 * These parameters are written per frame to renders/<id>/control.csv so that
 * the sound design can be automated from the exact curves of the render
 * (and, later, rendered offline from the same state).
 */
export interface AudioParams {
  /** Discrete transients (clicks, handling noise, fragments of recordings): information. */
  events: number;
  /** Continuity of the room tone / sustained layer: acceptance. */
  continuity: number;
  /** Tonal, periodic vs noisy: what the viewer is given as certain. */
  harmonicity: number;
  /** Rhythmic regularity: relationships. */
  pulse: number;
  /** Proportion of the sound that no recording supports (synthesised room, surf). */
  fiction: number;
  /** Only absence is silence. */
  level: number;
}

export function audioParams(s: ArtworkState, maxEvidence = 36): AudioParams {
  const evidence = Math.min(1, s.evidence / maxEvidence);
  return {
    events: evidence * (1 - s.acceptance),
    continuity: s.acceptance,
    harmonicity: s.certainty,
    pulse: s.relation,
    fiction: s.unsupported * s.acceptance,
    level: s.phase === null ? 0 : Math.min(1, 0.15 + 0.85 * Math.max(evidence, s.picture)),
  };
}
