import { clamp, easeInOutCubic, lerp, smoothstep } from '../core/math';
import type { TimelineState } from '../timeline/timeline';
import { CLASS_CONFIDENCE, REGIONS, type EpistemicClass, type Region } from '../subject/regions';

/**
 * THE EPISTEMIC SCHEDULE — when each kind of knowledge is accepted, and when it
 * is taken apart. This is where the thesis of the work is written down:
 *
 *   INFERENCE      confidence falls (more of the picture is shown than is known),
 *                  acceptance begins to rise.
 *   SYNTHESIS      acceptance → 1, region by region, best supported first:
 *                  the absent regions are decided last. Confidence does not change.
 *   DECONSTRUCTION the genealogy in reverse: what was chosen goes first,
 *                  what was observed resists longest.
 *
 * Windows are fractions of the phase.
 */
interface ClassSchedule {
  /** Acceptance reached by the end of INFERENCE. */
  inference: number;
  /** Window of SYNTHESIS in which the class is accepted. */
  synthesis: [number, number];
  /** Window of DECONSTRUCTION in which the class stops being accepted… */
  release: [number, number];
  /** …and in which it withdraws from the picture. */
  withdraw: [number, number];
}

export const SCHEDULE: Record<EpistemicClass, ClassSchedule> = {
  observed: { inference: 0.34, synthesis: [0.0, 0.3], release: [0.44, 0.56], withdraw: [0.52, 0.62] },
  derived: { inference: 0.28, synthesis: [0.0, 0.32], release: [0.3, 0.42], withdraw: [0.4, 0.52] },
  inferred: { inference: 0.22, synthesis: [0.12, 0.5], release: [0.15, 0.3], withdraw: [0.28, 0.42] },
  synthetic: { inference: 0.16, synthesis: [0.26, 0.6], release: [0.02, 0.14], withdraw: [0.1, 0.24] },
  absent: { inference: 0.12, synthesis: [0.38, 0.7], release: [0.02, 0.14], withdraw: [0.1, 0.24] },
};

/** SYNTHESIS: after this point nothing moves — the picture must be believed. */
export const SYNTHESIS_STILL = 0.72;

export interface RegionState {
  id: number;
  class: EpistemicClass;
  /** What is known: never changes after INFERENCE. */
  confidence: number;
  /** How much of the uncertainty is hidden. */
  acceptance: number;
  /** Whether the region is part of the picture at all. */
  presence: number;
}

const win = (u: number, w: [number, number]): number => easeInOutCubic(clamp((u - w[0]) / Math.max(1e-6, w[1] - w[0])));

export function classAcceptance(cls: EpistemicClass, tl: TimelineState): number {
  const s = SCHEDULE[cls];
  const uI = tl.progress.INFERENCE;
  const uS = tl.progress.SYNTHESIS;
  const uD = tl.progress.DECONSTRUCTION;
  // The system shows more and more of what it does not know, across the whole phase.
  let a = s.inference * smoothstep(0.1, 1.0, uI);
  if (tl.spec.SYNTHESIS) a = lerp(a, 1, win(uS, s.synthesis));
  if (tl.spec.DECONSTRUCTION) a *= 1 - win(uD, s.release);
  return a;
}

export function classPresence(cls: EpistemicClass, tl: TimelineState): number {
  if (tl.progress.INFERENCE <= 0) return 0;
  if (!tl.spec.DECONSTRUCTION) return 1;
  return 1 - win(tl.progress.DECONSTRUCTION, SCHEDULE[cls].withdraw);
}

export function regionStates(tl: TimelineState, regions: Region[] = REGIONS): RegionState[] {
  return regions.map((r) => ({
    id: r.id,
    class: r.class,
    confidence: CLASS_CONFIDENCE[r.class],
    acceptance: classAcceptance(r.class, tl),
    presence: classPresence(r.class, tl),
  }));
}
