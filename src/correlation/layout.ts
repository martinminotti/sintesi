import { createRng } from '../core/random';
import type { Vec2 } from '../core/math';
import type { SemanticGraph } from './graph';

/**
 * Deterministic force-directed layout, computed once at startup.
 * Concepts are pinned where they will live in the picture; evidence is pulled
 * towards what it relates to (in proportion to strength) and pushed apart by size.
 */

export interface LayoutInput {
  graph: SemanticGraph;
  sizes: Map<string, { w: number; h: number }>;
  pinned: Map<string, Vec2>;
  initial: Map<string, Vec2>;
  bounds: { minX: number; maxX: number; minY: number; maxY: number };
  seed: number;
  iterations?: number;
}

export function forceLayout(input: LayoutInput): Map<string, Vec2> {
  const { graph, sizes, pinned, bounds } = input;
  const rng = createRng(input.seed, 'correlation-layout');
  const ids = graph.nodes.map((n) => n.id);
  const pos = new Map<string, Vec2>();
  for (const id of ids) {
    const p = pinned.get(id) ?? input.initial.get(id) ?? { x: rng.range(bounds.minX, bounds.maxX), y: rng.range(bounds.minY, bounds.maxY) };
    pos.set(id, { x: p.x, y: p.y });
  }
  const iterations = input.iterations ?? 400;
  for (let it = 0; it < iterations; it++) {
    const cooling = 1 - it / iterations;
    const force = new Map<string, Vec2>(ids.map((id) => [id, { x: 0, y: 0 }]));
    // Attraction along relationships.
    for (const e of graph.edges) {
      const a = pos.get(e.a)!;
      const b = pos.get(e.b)!;
      const dx = b.x - a.x;
      const dy = b.y - a.y;
      const d = Math.hypot(dx, dy) + 1e-6;
      const rest = 1.2 + 1.6 * (1 - e.strength);
      const f = 0.06 * (0.3 + e.strength) * (d - rest);
      const fa = force.get(e.a)!;
      const fb = force.get(e.b)!;
      fa.x += (f * dx) / d; fa.y += (f * dy) / d;
      fb.x -= (f * dx) / d; fb.y -= (f * dy) / d;
    }
    // Size-aware repulsion.
    for (let i = 0; i < ids.length; i++) {
      for (let j = i + 1; j < ids.length; j++) {
        const a = pos.get(ids[i])!;
        const b = pos.get(ids[j])!;
        const sa = sizes.get(ids[i]) ?? { w: 0.4, h: 0.2 };
        const sb = sizes.get(ids[j]) ?? { w: 0.4, h: 0.2 };
        const dx = b.x - a.x;
        const dy = b.y - a.y;
        const ox = (sa.w + sb.w) / 2 + 0.22 - Math.abs(dx);
        const oy = (sa.h + sb.h) / 2 + 0.22 - Math.abs(dy);
        let fx = 0, fy = 0;
        if (ox > 0 && oy > 0) {
          // Overlapping: separate along the axis of least penetration.
          if (ox < oy) fx = Math.sign(dx || 1) * ox * 0.5;
          else fy = Math.sign(dy || 1) * oy * 0.5;
        } else {
          const d2 = dx * dx + dy * dy + 0.01;
          fx = (0.02 * dx) / d2;
          fy = (0.02 * dy) / d2;
        }
        const fa = force.get(ids[i])!;
        const fb = force.get(ids[j])!;
        fa.x -= fx; fa.y -= fy;
        fb.x += fx; fb.y += fy;
      }
    }
    for (const id of ids) {
      if (pinned.has(id)) continue;
      const p = pos.get(id)!;
      const f = force.get(id)!;
      const s = sizes.get(id) ?? { w: 0.4, h: 0.2 };
      const step = 0.5 * (0.2 + 0.8 * cooling);
      p.x += Math.max(-0.4, Math.min(0.4, f.x * step));
      p.y += Math.max(-0.4, Math.min(0.4, f.y * step));
      p.x = Math.max(bounds.minX + s.w / 2, Math.min(bounds.maxX - s.w / 2, p.x));
      p.y = Math.max(bounds.minY + s.h / 2, Math.min(bounds.maxY - s.h / 2, p.y));
    }
  }
  return pos;
}
