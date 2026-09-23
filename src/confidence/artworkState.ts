import { displayedCoherence } from './confidence';
import type { Frame } from '../core/choreography';
import type { RegionState } from './epistemics';
import type { PhaseName } from '../timeline/timeline';
import { CLASS_CONFIDENCE } from '../subject/regions';

/**
 * ARTWORK STATE — the single temporal state of SINTESI.
 * The image and the sound are two manifestations of it.
 *
 *   confidence  how much of what is shown is supported by evidence
 *   acceptance  how much of what is not supported is shown as if it were
 *   certainty   what the viewer is given: mix(confidence, 1, acceptance)
 *
 * At the start confidence ≈ certainty (the system shows what it knows).
 * In INFERENCE confidence falls and acceptance rises; in SYNTHESIS
 * certainty → 1 while confidence stays below 0.5. That gap is the work.
 */
export interface ArtworkState {
  t: number;
  seed: number;
  phase: PhaseName | null;
  phaseProgress: number;
  confidence: number;
  acceptance: number;
  certainty: number;
  /** Traces of the archive visible as traces. */
  evidence: number;
  /** Relationships drawn (0–1). */
  relation: number;
  /** How much of the frame is occupied by the picture (0–1). */
  picture: number;
  /** Share of the shown picture that no trace supports (0–1). */
  unsupported: number;
  /** Acceptance of the absent and synthetic regions: how decided the undecidable is. */
  determination: number;
  regions: RegionState[];
}

export function computeArtworkState(frame: Frame, seed: number, regionArea: number[], edgeCount: number): ArtworkState {
  const tl = frame.timeline;
  let wsum = 0, csum = 0, evidence = 0;
  for (const e of frame.elements) {
    if (e.kind !== 'evidence' || e.k <= 0.01 || e.visibility <= 0.01) continue;
    evidence++;
    const w = e.w * e.h * e.visibility;
    wsum += w;
    csum += w * e.confidence;
  }
  const evidenceConfidence = wsum > 0 ? csum / wsum : 0;

  // The picture: area-weighted over regions, with archived fragments where they have landed.
  // A fragment rewritten by the synthesis no longer supports the picture.
  const anchored = Math.min(0.9, frame.field.anchors.reduce((s, a) => s + a.rect.w * a.rect.h * a.arrival * a.visibility, 0));
  const anchorConf = frame.field.anchors.length ? frame.field.anchors.reduce((s, a) => s + a.confidence, 0) / frame.field.anchors.length : 0;
  let area = 0, conf = 0, acc = 0, det = 0, detArea = 0, unsupported = 0;
  for (const r of frame.regions) {
    const a = (regionArea[r.id] ?? 0) * r.presence;
    area += a;
    conf += a * CLASS_CONFIDENCE[r.class];
    acc += a * r.acceptance;
    if (r.class === 'absent' || r.class === 'synthetic') { det += a * r.acceptance; detArea += a; }
    if (r.class !== 'observed') unsupported += a * (1 - CLASS_CONFIDENCE[r.class]);
  }
  const picture = frame.field.reach * (area > 0 ? Math.min(1, area) : 0);
  const regionConfidence = area > 0 ? conf / area : 0;
  const pictureConfidence = anchored * anchorConf + (1 - anchored) * regionConfidence;
  const pictureAcceptance = area > 0 ? acc / area : 0;

  const confidence = evidence + picture > 0 ? (evidenceConfidence * (1 - picture) + pictureConfidence * picture) : 0;
  const acceptance = pictureAcceptance * picture;
  const relation = edgeCount ? frame.edges.reduce((s, e) => s + e.progress * e.k, 0) / edgeCount : 0;
  return {
    t: tl.t,
    seed,
    phase: tl.phase,
    phaseProgress: tl.local,
    confidence,
    acceptance,
    certainty: displayedCoherence(confidence, acceptance),
    evidence,
    relation,
    picture,
    unsupported: area > 0 ? (unsupported / area) * picture : 0,
    determination: detArea > 0 ? det / detArea : 0,
    regions: frame.regions,
  };
}
