import type { Timeline } from './timeline';

/** Milestone 1 prototype: ARCHIVE → CORRELATION → INFERENCE in 25 seconds. */
export const prototype: Timeline = {
  name: 'prototype',
  duration: 25,
  phases: [
    { phase: 'ARCHIVE', start: 0, end: 8, title: 'ARCHIVE' },
    { phase: 'CORRELATION', start: 8, end: 16, title: 'CORRELATION' },
    { phase: 'INFERENCE', start: 16, end: 25, title: 'INFERENCE' },
  ],
};

/**
 * The complete work, ≈ 3′30″, looping.
 * SYNTHESIS ends in a long stillness (from 72 % of the phase): the picture must
 * be believed before it is taken apart. DECONSTRUCTION ends on the first trace
 * of the next cycle.
 */
export const full: Timeline = {
  name: 'full',
  duration: 210,
  phases: [
    { phase: 'ARCHIVE', start: 0, end: 32, title: 'ARCHIVE' },
    { phase: 'CORRELATION', start: 32, end: 66, title: 'CORRELATION' },
    { phase: 'INFERENCE', start: 66, end: 114, title: 'INFERENCE' },
    { phase: 'SYNTHESIS', start: 114, end: 170, title: 'SYNTHESIS' },
    { phase: 'DECONSTRUCTION', start: 170, end: 210 },
  ],
};

/** The same arc, compressed, for studies (INFERENCE → SYNTHESIS → DECONSTRUCTION in ≈ 46 s). */
export const study: Timeline = {
  name: 'study',
  duration: 58,
  phases: [
    { phase: 'ARCHIVE', start: 0, end: 5 },
    { phase: 'CORRELATION', start: 5, end: 10 },
    { phase: 'INFERENCE', start: 10, end: 22 },
    { phase: 'SYNTHESIS', start: 22, end: 40 },
    { phase: 'DECONSTRUCTION', start: 40, end: 58 },
  ],
};

export const TIMELINES: Record<string, Timeline> = { prototype, full, study };

export function getTimeline(name: string): Timeline {
  const t = TIMELINES[name];
  if (!t) throw new Error(`Unknown timeline "${name}". Available: ${Object.keys(TIMELINES).join(', ')}`);
  return t;
}
