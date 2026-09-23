/**
 * Declarative timeline. The renderer never knows absolute times:
 * layers ask "how far into CORRELATION are we?" and the answer depends
 * only on the timeline data, so durations can change without touching code.
 */

export const PHASES = ['ARCHIVE', 'CORRELATION', 'INFERENCE', 'SYNTHESIS', 'DECONSTRUCTION'] as const;
export type PhaseName = (typeof PHASES)[number];

export interface PhaseSpec {
  phase: PhaseName;
  /** Seconds. */
  start: number;
  /** Seconds. */
  end: number;
  /** Chapter title shown at the start of the phase (omit for none). */
  title?: string;
}

export interface Timeline {
  name: string;
  phases: PhaseSpec[];
  /** Total length in seconds; may exceed the last phase (a held tail). */
  duration: number;
}

export interface TimelineState {
  /** Absolute time in seconds. */
  t: number;
  timeline: Timeline;
  /** Active phase, or null in gaps / after the end. */
  phase: PhaseName | null;
  /** 0→1 progress inside the active phase. */
  local: number;
  /** Progress of every phase: 0 before it starts, 1 after it ends. */
  progress: Record<PhaseName, number>;
  /** Spec of each phase present in the timeline. */
  spec: Partial<Record<PhaseName, PhaseSpec>>;
}

export function evaluateTimeline(timeline: Timeline, t: number): TimelineState {
  const progress = {} as Record<PhaseName, number>;
  const spec: Partial<Record<PhaseName, PhaseSpec>> = {};
  let phase: PhaseName | null = null;
  let local = 0;
  for (const name of PHASES) progress[name] = 0;
  for (const p of timeline.phases) {
    spec[p.phase] = p;
    const len = p.end - p.start;
    const v = len <= 0 ? (t >= p.end ? 1 : 0) : Math.min(1, Math.max(0, (t - p.start) / len));
    progress[p.phase] = v;
    if (t >= p.start && t < p.end) {
      phase = p.phase;
      local = v;
    }
  }
  return { t, timeline, phase, local, progress, spec };
}

/** Seconds since the start of a phase (negative before it). */
export function since(state: TimelineState, phase: PhaseName): number {
  const p = state.spec[phase];
  return p ? state.t - p.start : -Infinity;
}

/** Map a normalised position inside a phase to absolute seconds. */
export function at(timeline: Timeline, phase: PhaseName, u: number): number {
  const p = timeline.phases.find((x) => x.phase === phase);
  if (!p) return Infinity;
  return p.start + (p.end - p.start) * u;
}

export function validateTimeline(timeline: Timeline): string[] {
  const errors: string[] = [];
  const seen = new Set<PhaseName>();
  let cursor = 0;
  timeline.phases.forEach((p, i) => {
    if (seen.has(p.phase)) errors.push(`${timeline.name}: phase ${p.phase} appears twice`);
    seen.add(p.phase);
    if (p.end <= p.start) errors.push(`${timeline.name}: ${p.phase} ends before it starts`);
    if (p.start < cursor - 1e-9) errors.push(`${timeline.name}: ${p.phase} overlaps the previous phase`);
    const expected = PHASES.indexOf(p.phase);
    if (i > 0 && expected < PHASES.indexOf(timeline.phases[i - 1].phase)) {
      errors.push(`${timeline.name}: ${p.phase} is out of narrative order`);
    }
    cursor = p.end;
  });
  if (timeline.duration < cursor) errors.push(`${timeline.name}: duration shorter than its phases`);
  return errors;
}
