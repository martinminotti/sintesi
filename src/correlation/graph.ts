import { relationshipStrength } from '../confidence/confidence';
import type { Dataset } from '../evidence/types';

/**
 * The semantic graph: evidence and concepts as nodes, relationships as edges.
 * Edge strength is not authored — it emerges from the weight and reliability
 * of both ends. Strong relations will be visually stable; weak ones will not.
 */

export interface GraphNode {
  id: string;
  kind: 'evidence' | 'concept';
  semanticWeight: number;
  confidence: number;
}

export interface GraphEdge {
  a: string;
  b: string;
  strength: number;
}

export interface SemanticGraph {
  nodes: GraphNode[];
  edges: GraphEdge[];
  byId: Map<string, GraphNode>;
  neighbours: Map<string, string[]>;
}

export function buildGraph(ds: Dataset): SemanticGraph {
  const nodes: GraphNode[] = [
    ...ds.concepts.map((c) => ({ id: c.id, kind: 'concept' as const, semanticWeight: 1, confidence: 1 })),
    ...ds.evidence.map((e) => ({ id: e.id, kind: 'evidence' as const, semanticWeight: e.semanticWeight, confidence: e.confidence })),
  ];
  const byId = new Map(nodes.map((n) => [n.id, n]));
  const seen = new Set<string>();
  const edges: GraphEdge[] = [];
  for (const e of ds.evidence) {
    for (const r of e.relationships) {
      const key = e.id < r ? `${e.id}|${r}` : `${r}|${e.id}`;
      if (seen.has(key)) continue;
      seen.add(key);
      const a = byId.get(e.id)!;
      const b = byId.get(r)!;
      edges.push({ a: e.id, b: r, strength: relationshipStrength(a, b) });
    }
  }
  const neighbours = new Map<string, string[]>(nodes.map((n) => [n.id, []]));
  for (const e of edges) {
    neighbours.get(e.a)!.push(e.b);
    neighbours.get(e.b)!.push(e.a);
  }
  return { nodes, edges, byId, neighbours };
}

/** The concept an evidence item belongs to most strongly (first listed concept, else via neighbours). */
export function primaryConcept(graph: SemanticGraph, id: string): string | null {
  const direct = (graph.neighbours.get(id) ?? []).filter((n) => graph.byId.get(n)?.kind === 'concept');
  if (direct.length) return direct[0];
  for (const n of graph.neighbours.get(id) ?? []) {
    const c = (graph.neighbours.get(n) ?? []).find((m) => graph.byId.get(m)?.kind === 'concept');
    if (c) return c;
  }
  return null;
}
