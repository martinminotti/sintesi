/**
 * HYPOTHESES — what the system proposes where the archive is silent.
 *
 * ARCHIVE is what the photographs actually recorded. SYNTHESIS is the proposal
 * the system will accept. ALTERNATIVES are the other possibilities it holds
 * while it still shows its uncertainty.
 *
 * The synthesis is not a mistake. Each of its choices is supported by some
 * trace; none of them is supported together:
 *   – the sea outside the window comes from a cassette (REC_07), not from the room;
 *   – the gaze turns to that sea: the archive only knows an eye looking down;
 *   – a frame hangs where a macro photograph shows bare plaster (TEX_02);
 *   – "una tazza, credo. o un bicchiere." — it decides: a cup, handle to the left;
 *   – "non ricordo il colore del cappotto" — it decides: brown;
 *   – afternoon sun, because "la luce entrava solo il pomeriggio".
 */

export type Vec3 = [number, number, number];

export interface Hypothesis {
  id: string;
  /** Direction the face points to (world space). */
  headDir: Vec3;
  transomY: number;
  /** 0 blank · 1 city · 2 trees · 3 sea */
  outside: 0 | 1 | 2 | 3;
  /** 0 none · 1 frame · 2 mirror · 3 shelf */
  wallObject: 0 | 1 | 2 | 3;
  /** 0 cup, handle right · 1 cup, handle left · 2 glass */
  vessel: 0 | 1 | 2;
  coat: Vec3;
  sun: number;
}

export const ARCHIVE_TRUTH: Hypothesis = {
  id: 'archive',
  headDir: [-0.55, -0.62, 0.56],
  transomY: 1.83,
  outside: 0,
  wallObject: 0,
  vessel: 0,
  coat: [0.17, 0.16, 0.15],
  sun: 0,
};

export const SYNTHESIS: Hypothesis = {
  id: 'synthesis',
  headDir: [-0.94, 0.03, 0.34],
  transomY: 1.71,
  outside: 3,
  wallObject: 1,
  vessel: 1,
  coat: [0.25, 0.155, 0.1],
  sun: 1,
};

export const ALTERNATIVES: Hypothesis[] = [
  { id: 'alt-1', headDir: [-0.3, -0.12, 0.95], transomY: 1.83, outside: 1, wallObject: 0, vessel: 2, coat: [0.1, 0.12, 0.17], sun: 0 },
  { id: 'alt-2', headDir: [-0.72, -0.42, 0.55], transomY: 1.9, outside: 2, wallObject: 3, vessel: 0, coat: [0.14, 0.16, 0.13], sun: 0.4 },
  { id: 'alt-3', headDir: [-0.85, -0.22, 0.48], transomY: 1.77, outside: 0, wallObject: 2, vessel: 2, coat: [0.21, 0.2, 0.19], sun: 0 },
];
