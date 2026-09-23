import { inferredConfidence } from '../confidence/confidence';
import type { SemanticGraph } from '../correlation/graph';
import type { Dataset, Inference } from '../evidence/types';

/**
 * Derive what the system will propose to fill the gaps.
 * For each concept, the photographic evidence attached to it supports one
 * inference, centred on that evidence in picture space. Its confidence can
 * never exceed its weakest support — and is attenuated for being a guess.
 */
export function deriveInferences(ds: Dataset, graph: SemanticGraph): Inference[] {
  const out: Inference[] = [];
  const byId = new Map(ds.evidence.map((e) => [e.id, e]));
  for (const concept of ds.concepts) {
    const support = (graph.neighbours.get(concept.id) ?? [])
      .map((id) => byId.get(id))
      .filter((e): e is NonNullable<typeof e> => !!e && !!e.visualProperties?.crop);
    const all = (graph.neighbours.get(concept.id) ?? []).map((id) => byId.get(id)).filter((e): e is NonNullable<typeof e> => !!e);
    if (support.length === 0) continue;
    let wx = 0, wy = 0, ws = 0;
    let spread = 0;
    for (const e of support) {
      const c = e.visualProperties!.crop!;
      const w = e.semanticWeight * e.confidence;
      wx += (c.x + c.w / 2) * w;
      wy += (c.y + c.h / 2) * w;
      ws += w;
    }
    const center = { x: wx / ws, y: wy / ws };
    for (const e of support) {
      const c = e.visualProperties!.crop!;
      spread = Math.max(spread, Math.hypot(c.x + c.w / 2 - center.x, (c.y + c.h / 2 - center.y) * (16 / 9)) + Math.max(c.w, c.h * (16 / 9)) / 2);
    }
    const confidence = inferredConfidence(all.map((e) => e.confidence));
    out.push({
      id: `INF_${concept.id}`,
      sourceEvidence: all.map((e) => e.id),
      confidence,
      semanticCategory: concept.label,
      visualImpact: Math.min(1, all.reduce((s, e) => s + e.semanticWeight, 0) / 3),
      center,
      radius: Math.min(0.9, spread * 1.25 + 0.08),
    });
  }
  return out;
}
