import type { Rect, Vec2 } from '../core/math';

/**
 * The conceptual model of the work.
 *
 *   EVIDENCE → RELATIONSHIP → CONFIDENCE → VISUAL CONSEQUENCE
 */

export type EvidenceType =
  | 'photograph' // a crop of a photograph (grayscale, as archived)
  | 'texture' // an extreme detail of a material
  | 'text' // a transcribed sentence or testimony
  | 'date'
  | 'coordinates'
  | 'location' // a map fragment
  | 'audio' // a recorded sound, shown as its waveform
  | 'metadata'; // technical traces: exposure, film stock, scan settings

/**
 * How a piece of information came to exist.
 *   observed  — recorded directly (a photograph, a recording)
 *   derived   — computed from observed data (a scan setting, a location fix)
 *   inferred  — proposed by the system to fill a gap
 *   synthetic — produced to make the image whole; nothing supports it
 */
export type Provenance = 'observed' | 'derived' | 'inferred' | 'synthetic';

export interface VisualProperties {
  /** For photographs/textures: normalised rect of the subject image (origin top-left). */
  crop?: Rect;
  /** For typeset evidence. */
  text?: string;
  /** Longest side when displayed in the archive, in world units. */
  size?: number;
}

export interface Evidence {
  id: string;
  type: EvidenceType;
  /** Where the trace comes from: 'subject:observed', 'photographs/x.jpg', 'audio/rec.wav', 'testimony', … */
  source: string;
  provenance: Provenance;
  /** How much this trace says about the person (0–1). */
  semanticWeight: number;
  /** How certain the trace itself is (0–1). */
  confidence: number;
  /** Ids of evidence or concepts this trace is related to. */
  relationships: string[];
  /** Short catalogue label, e.g. "IMG_0412". */
  label?: string;
  visualProperties?: VisualProperties;
}

/**
 * A semantic category the system uses to organise evidence: PERSON, PLACE…
 * `anchor` is where the category lives in picture space (normalised, origin top-left),
 * so that the semantic map of CORRELATION anticipates the image of INFERENCE.
 */
export interface Concept {
  id: string;
  label: string;
  anchor: Vec2;
}

export interface Dataset {
  name: string;
  evidence: Evidence[];
  concepts: Concept[];
}

/** Missing information proposed by the system. */
export interface Inference {
  id: string;
  sourceEvidence: string[];
  confidence: number;
  semanticCategory: string;
  /** How much of the image this inference is allowed to shape (0–1). */
  visualImpact: number;
  /** Where it acts, normalised picture space (origin top-left). */
  center: Vec2;
  /** Radius of influence, normalised to picture width. */
  radius: number;
}
