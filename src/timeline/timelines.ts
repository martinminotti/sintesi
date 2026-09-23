import type { Timeline } from './timeline';

/**
 * Milestone 1 prototype: ARCHIVE → CORRELATION → INFERENCE in 25 seconds.
 */
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
 * The complete work (≈ 3′30″). SYNTHESIS and DECONSTRUCTION are declared
 * but not implemented yet: the engine renders them as a held INFERENCE state.
 */
export const full: Timeline = {
  name: 'full',
  duration: 210,
  phases: [
    { phase: 'ARCHIVE', start: 0, end: 35, title: 'ARCHIVE' },
    { phase: 'CORRELATION', start: 35, end: 75, title: 'CORRELATION' },
    { phase: 'INFERENCE', start: 75, end: 130, title: 'INFERENCE' },
    { phase: 'SYNTHESIS', start: 130, end: 185, title: 'SYNTHESIS' },
    { phase: 'DECONSTRUCTION', start: 185, end: 210 },
  ],
};

export const TIMELINES: Record<string, Timeline> = { prototype, full };

export function getTimeline(name: string): Timeline {
  const t = TIMELINES[name];
  if (!t) throw new Error(`Unknown timeline "${name}". Available: ${Object.keys(TIMELINES).join(', ')}`);
  return t;
}
