import type { Provenance } from '../evidence/types';

/**
 * EPISTEMIC REGIONS — every significant region of the picture has a history.
 *
 *   observed   directly supported by a trace
 *   derived    obtainable from several traces
 *   inferred   probable, not documented
 *   synthetic  chosen by the system to make the scene coherent
 *   absent     no evidence at all
 *
 * Regions are the material ids of the subject's data layer (for a produced
 * subject: the painted epistemic map). The class decides how the region
 * behaves: how much it is believed, when it is accepted during SYNTHESIS,
 * and when it is taken apart during DECONSTRUCTION.
 */

export type EpistemicClass = Provenance | 'absent';

export const CLASS_ORDER: EpistemicClass[] = ['observed', 'derived', 'inferred', 'synthetic', 'absent'];

export const CLASS_CONFIDENCE: Record<EpistemicClass, number> = {
  observed: 0.9,
  derived: 0.6,
  inferred: 0.38,
  synthetic: 0.16,
  absent: 0.0,
};

export interface Region {
  id: number;
  name: string;
  class: EpistemicClass;
  /** Traces that support the region (its genealogy). */
  evidence: string[];
  /**
   * The trace the synthesis actually drew this region from, if not a photograph.
   * It reappears on the region when the region is taken apart.
   */
  source?: string;
}

export const REGIONS: Region[] = [
  { id: 0, name: 'nothing', class: 'absent', evidence: [] },
  { id: 1, name: 'wall', class: 'derived', evidence: ['TEX_02', 'GEO_01'] },
  { id: 2, name: 'window', class: 'observed', evidence: ['IMG_0421', 'IMG_0427'] },
  { id: 3, name: 'outside', class: 'absent', evidence: ['ABS_02'], source: 'REC_07' },
  { id: 4, name: 'table', class: 'derived', evidence: ['TEX_03', 'IMG_0455'] },
  { id: 5, name: 'vessel', class: 'inferred', evidence: ['IMG_0446'], source: 'TXT_04' },
  { id: 6, name: 'coat', class: 'inferred', evidence: ['TEX_01', 'IMG_0440'], source: 'TXT_02' },
  { id: 7, name: 'skin', class: 'inferred', evidence: ['IMG_0412', 'IMG_0418', 'IMG_0433'] },
  { id: 8, name: 'hair', class: 'inferred', evidence: ['IMG_0437'] },
  { id: 9, name: 'chair', class: 'inferred', evidence: ['TXT_03'] },
  { id: 10, name: 'floor', class: 'synthetic', evidence: [] },
  { id: 11, name: 'wall object', class: 'synthetic', evidence: [] },
  { id: 12, name: 'gaze', class: 'absent', evidence: ['ABS_01'] },
  { id: 13, name: 'shirt', class: 'inferred', evidence: [] },
];

export const MAX_REGIONS = 16;
