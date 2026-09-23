import { WORLD } from '../config';
import { clamp, easeInOutCubic, easeOutQuint, lerp, smoothstep, type Rect, type Vec2 } from './math';
import { createRng, hashFloat } from './random';
import { buildGraph, primaryConcept, type SemanticGraph } from '../correlation/graph';
import { forceLayout } from '../correlation/layout';
import { deriveInferences } from '../inference/inferences';
import type { Dataset, Evidence, Inference } from '../evidence/types';
import { evaluateTimeline, type PhaseName, type Timeline, type TimelineState } from '../timeline/timeline';
import type { Atlas } from '../rendering/Atlas';

/**
 * CHOREOGRAPHY — every element of the work as a pure function of time.
 *
 * Nothing here accumulates state between frames: given (dataset, timeline,
 * seed, t) the positions, sizes and confidences are fully determined, so any
 * frame can be rendered on its own, in any order, and always identically.
 */

export type ElementKind = 'evidence' | 'label' | 'concept' | 'title';

export interface ElementState {
  id: string;
  kind: ElementKind;
  /** Centre and size, world units. */
  x: number; y: number; w: number; h: number;
  /** Epistemic confidence (what is known). */
  confidence: number;
  /** Displayed coherence (what is shown): drives the reconstruction shader. */
  k: number;
  /** 0 = atlas, 1 = observed subject image. */
  source: 0 | 1;
  uv: [number, number, number, number];
  seed: number;
}

export interface EdgeState {
  a: Vec2; b: Vec2;
  strength: number;
  /** Fraction of the line drawn, 0→1. */
  progress: number;
  k: number;
  seed: number;
}

export interface FieldAnchor { rect: Rect; confidence: number; arrival: number; }
export interface FieldInference { center: Vec2; radius: number; confidence: number; }
export interface FieldState {
  anchors: FieldAnchor[];
  inferences: FieldInference[];
  /** 0→1: how far the system has extended its belief beyond the evidence. */
  reach: number;
  /** Faint belief about the whole scene (the room exists). */
  prior: number;
  acceptance: number;
}

export interface Frame {
  timeline: TimelineState;
  elements: ElementState[];
  edges: EdgeState[];
  field: FieldState;
  camera: { zoom: number };
}

// --------------------------------------------------------------- geometry

/** Picture space (0–1, origin top-left) → world (centre origin, y up). */
export const pictureToWorld = (p: Vec2): Vec2 => ({ x: (p.x - 0.5) * WORLD.width, y: (0.5 - p.y) * WORLD.height });

export function cropToWorld(c: Rect): { x: number; y: number; w: number; h: number } {
  const centre = pictureToWorld({ x: c.x + c.w / 2, y: c.y + c.h / 2 });
  return { x: centre.x, y: centre.y, w: c.w * WORLD.width, h: c.h * WORLD.height };
}

const TYPE_ORDER: Record<Evidence['type'], number> = {
  metadata: 0, date: 0.1, coordinates: 0.15, texture: 0.2, audio: 0.25, location: 0.3, photograph: 0.35, text: 0.4,
};

const TEXT_SIZE: Partial<Record<Evidence['type'], number>> = { text: 0.15, date: 0.17, coordinates: 0.15, metadata: 0.12 };
const LABEL_SIZE = 0.09;
const CONCEPT_SIZE = 0.12;
const TITLE_SIZE = 0.24;
const TITLE_Y = -7.05;

interface Item {
  ev: Evidence;
  isPhoto: boolean;
  archiveSize: { w: number; h: number };
  archivePos: Vec2;
  layoutPos: Vec2;
  anchor?: { x: number; y: number; w: number; h: number };
  concept: string | null;
  acquire: number; // seconds
  seed: number;
  uv: [number, number, number, number];
}

export class Choreography {
  readonly graph: SemanticGraph;
  readonly inferences: Inference[];
  private items: Item[] = [];
  private itemById = new Map<string, Item>();
  private conceptPos = new Map<string, Vec2>();

  constructor(
    readonly dataset: Dataset,
    readonly timeline: Timeline,
    readonly atlas: Atlas,
    readonly seed: number,
  ) {
    this.graph = buildGraph(dataset);
    this.inferences = deriveInferences(dataset, this.graph);
  }

  // ------------------------------------------------------------ setup

  /** Must be called once the atlas has been built. */
  prepare(): void {
    const rng = createRng(this.seed, 'archive-order');
    const ds = this.dataset;
    for (const c of ds.concepts) this.conceptPos.set(c.id, pictureToWorld(c.anchor));

    // Sizes.
    const items: Item[] = ds.evidence.map((ev) => {
      const crop = ev.visualProperties?.crop;
      const isPhoto = !!crop && (ev.type === 'photograph' || ev.type === 'texture');
      let archiveSize: { w: number; h: number };
      let anchor: Item['anchor'];
      let uv: Item['uv'];
      if (isPhoto) {
        anchor = cropToWorld(crop!);
        const size = ev.visualProperties?.size ?? (ev.type === 'texture' ? 0.9 : 1.9);
        const s = size / Math.max(anchor.w, anchor.h);
        archiveSize = { w: anchor.w * s, h: anchor.h * s };
        uv = [crop!.x, 1 - crop!.y - crop!.h, crop!.w, crop!.h];
      } else {
        const e = this.atlas.entries.get(`ev:${ev.id}`);
        if (!e) throw new Error(`atlas entry missing for ${ev.id}`);
        archiveSize = { w: e.w, h: e.h };
        uv = e.uv;
      }
      return {
        ev, isPhoto, archiveSize, anchor, uv,
        archivePos: { x: 0, y: 0 }, layoutPos: { x: 0, y: 0 },
        concept: primaryConcept(this.graph, ev.id),
        acquire: 0,
        seed: hashFloat(this.seed, ev.id) * 1000,
      };
    });

    // ARCHIVE: order of acquisition — technical traces first, testimony last, shuffled.
    const archive = this.phase('ARCHIVE');
    const order = items
      .map((it) => ({ it, key: TYPE_ORDER[it.ev.type] + rng.next() * 0.7 }))
      .sort((a, b) => a.key - b.key)
      .map((o) => o.it);
    const acqSpan = archive ? archive.end - archive.start : 1;
    order.forEach((it, i) => {
      const u = 0.14 + 0.72 * Math.pow(i / Math.max(1, order.length - 1), 0.85);
      it.acquire = (archive?.start ?? 0) + acqSpan * u;
    });

    // ARCHIVE: a catalogue — sparse placement on a quarter-unit grid, no overlaps.
    const place = createRng(this.seed, 'archive-layout');
    const placed: Rect[] = [];
    const bounds = { minX: -4.0, maxX: 4.0, minY: -6.5, maxY: 7.3 };
    const bySize = [...items].sort((a, b) => b.archiveSize.w * b.archiveSize.h - a.archiveSize.w * a.archiveSize.h || a.ev.id.localeCompare(b.ev.id));
    for (const it of bySize) {
      const w = it.archiveSize.w;
      const h = it.archiveSize.h + (it.isPhoto ? 0.22 : 0); // room for the label
      let best: Vec2 = { x: 0, y: 0 };
      let bestOverlap = Infinity;
      for (let attempt = 0; attempt < 400; attempt++) {
        const x = Math.round(place.range(bounds.minX + w / 2, bounds.maxX - w / 2) * 4) / 4;
        const y = Math.round(place.range(bounds.minY + h / 2, bounds.maxY - h / 2) * 4) / 4;
        let overlap = 0;
        for (const r of placed) {
          const ox = Math.min(x + w / 2 + 0.3, r.x + r.w / 2) - Math.max(x - w / 2 - 0.3, r.x - r.w / 2);
          const oy = Math.min(y + h / 2 + 0.3, r.y + r.h / 2) - Math.max(y - h / 2 - 0.3, r.y - r.h / 2);
          if (ox > 0 && oy > 0) overlap += ox * oy;
        }
        if (overlap < bestOverlap) { bestOverlap = overlap; best = { x, y }; }
        if (overlap === 0) break;
      }
      placed.push({ x: best.x, y: best.y, w, h });
      // Photos keep their label below: shift the image up by half the label band.
      it.archivePos = { x: best.x, y: best.y + (it.isPhoto ? 0.11 : 0) };
    }

    // CORRELATION: a semantic map whose concepts sit where the picture will need them.
    const sizes = new Map<string, { w: number; h: number }>();
    for (const it of items) sizes.set(it.ev.id, { w: it.archiveSize.w * this.correlationScale(it), h: it.archiveSize.h * this.correlationScale(it) });
    for (const c of ds.concepts) sizes.set(c.id, { w: 1.2, h: 0.3 });
    const layout = forceLayout({
      graph: this.graph,
      sizes,
      pinned: this.conceptPos,
      initial: new Map(items.map((it) => [it.ev.id, it.archivePos])),
      bounds: { minX: -4.2, maxX: 4.2, minY: -6.6, maxY: 7.5 },
      seed: this.seed,
    });
    for (const it of items) it.layoutPos = layout.get(it.ev.id)!;

    this.items = items;
    this.itemById = new Map(items.map((it) => [it.ev.id, it]));
  }

  private correlationScale(it: Item): number {
    return it.isPhoto ? 0.72 : 0.85;
  }

  private phase(name: PhaseName) {
    return this.timeline.phases.find((p) => p.phase === name);
  }

  /** Seconds → 0..1 inside a window [a, a + d]. */
  private win(t: number, a: number, d: number): number {
    return clamp((t - a) / Math.max(1e-6, d));
  }

  // ------------------------------------------------------------ evaluation

  evaluate(t: number): Frame {
    const tl = evaluateTimeline(this.timeline, t);
    const A = this.phase('ARCHIVE');
    const C = this.phase('CORRELATION');
    const I = this.phase('INFERENCE');
    const uC = tl.progress.CORRELATION;
    const uI = tl.progress.INFERENCE;
    const acqDur = A ? clamp((A.end - A.start) * 0.11, 0.8, 2.2) : 1;

    const elements: ElementState[] = [];
    const pos = new Map<string, Vec2>();
    const conf = new Map<string, number>();

    // Concepts.
    const conceptStates: ElementState[] = [];
    this.dataset.concepts.forEach((c, j) => {
      const entry = this.atlas.entries.get(`concept:${c.id}`)!;
      let k = 0;
      if (C) {
        const len = C.end - C.start;
        k = easeOutQuint(this.win(t, C.start + len * (0.05 + 0.05 * j), acqDur));
      }
      if (I) k *= 1 - smoothstep(0.3, 0.55, uI);
      const p = this.conceptPos.get(c.id)!;
      // The ring of the concept sits on its anchor; the name extends to the right.
      const x = p.x + entry.w / 2 - entry.h * 0.4;
      pos.set(c.id, p);
      conf.set(c.id, k);
      conceptStates.push({ id: c.id, kind: 'concept', x, y: p.y, w: entry.w, h: entry.h, confidence: k, k, source: 0, uv: entry.uv, seed: hashFloat(this.seed, c.id) * 1000 });
    });

    // Evidence.
    const evidenceStates: ElementState[] = [];
    const labelStates: ElementState[] = [];
    for (const it of this.items) {
      const ev = it.ev;
      let k = ev.confidence * easeOutQuint(this.win(t, it.acquire, acqDur));
      // Uncertain traces are never quite still.
      const drift = 0.05 * (1 - ev.confidence);
      let x = it.archivePos.x + drift * Math.sin(t * 0.35 + it.seed);
      let y = it.archivePos.y + drift * Math.cos(t * 0.27 + it.seed * 1.3);
      let w = it.archiveSize.w;
      let h = it.archiveSize.h;

      if (C) {
        const len = C.end - C.start;
        const r = hashFloat(this.seed, 'corr-start', ev.id);
        const m = easeInOutCubic(this.win(t, C.start + len * (0.12 + 0.2 * r), len * 0.45));
        const s = lerp(1, this.correlationScale(it), m);
        x = lerp(x, it.layoutPos.x, m);
        y = lerp(y, it.layoutPos.y, m);
        w *= s; h *= s;
        // Relevance: what says little about the person loses stability.
        k *= 1 - 0.45 * (1 - ev.semanticWeight) * uC;
      }

      if (I) {
        const len = I.end - I.start;
        if (it.isPhoto && it.anchor) {
          // Evidence returns to where it was taken from.
          const m = easeInOutCubic(this.win(t, I.start + len * (0.02 + 0.22 * (1 - ev.semanticWeight)), len * 0.3));
          x = lerp(x, it.anchor.x, m);
          y = lerp(y, it.anchor.y, m);
          w = lerp(w, it.anchor.w, m);
          h = lerp(h, it.anchor.h, m);
          k = lerp(k, ev.confidence, m);
        } else {
          // Everything else is absorbed into the concept it supports.
          const r = hashFloat(this.seed, 'absorb', ev.id);
          const m = easeInOutCubic(this.win(t, I.start + len * (0.04 + 0.22 * r), len * 0.3));
          const target = it.concept ? this.conceptPos.get(it.concept)! : { x, y };
          x = lerp(x, target.x, m * 0.85);
          y = lerp(y, target.y, m * 0.85);
          w *= 1 - 0.5 * m; h *= 1 - 0.5 * m;
          k *= 1 - m;
        }
      }

      pos.set(ev.id, { x, y });
      conf.set(ev.id, k);
      evidenceStates.push({ id: ev.id, kind: 'evidence', x, y, w, h, confidence: k, k, source: it.isPhoto ? 1 : 0, uv: it.uv, seed: it.seed });

      if (it.isPhoto) {
        const entry = this.atlas.entries.get(`label:${ev.id}`)!;
        let lk = k;
        if (I) lk *= 1 - smoothstep(0.0, 0.12, uI);
        labelStates.push({
          id: `label:${ev.id}`, kind: 'label',
          x: x - w / 2 + entry.w / 2, y: y - h / 2 - 0.06 - entry.h / 2, w: entry.w, h: entry.h,
          confidence: lk, k: lk, source: 0, uv: entry.uv, seed: it.seed + 7,
        });
      }
    }

    // Titles.
    const titleStates: ElementState[] = [];
    for (const p of this.timeline.phases) {
      if (!p.title) continue;
      const entry = this.atlas.entries.get(`title:${p.phase}`)!;
      const len = p.end - p.start;
      const hold = Math.min(3.4, len * 0.34);
      const kIn = easeOutQuint(this.win(t, p.start + 0.25, 1.1));
      const kOut = 1 - smoothstep(0, 1, this.win(t, p.start + hold, 1.2));
      const k = kIn * kOut;
      if (k <= 0) continue;
      titleStates.push({ id: `title:${p.phase}`, kind: 'title', x: 0, y: TITLE_Y, w: entry.w, h: entry.h, confidence: k, k, source: 0, uv: entry.uv, seed: hashFloat(this.seed, p.phase) * 1000 });
    }

    elements.push(...conceptStates, ...evidenceStates.filter((e) => !this.itemById.get(e.id)!.isPhoto), ...labelStates, ...evidenceStates.filter((e) => this.itemById.get(e.id)!.isPhoto), ...titleStates);

    // Edges.
    const edges: EdgeState[] = [];
    if (C) {
      const len = C.end - C.start;
      for (const e of this.graph.edges) {
        const start = C.start + len * (0.16 + 0.48 * (1 - e.strength) + 0.08 * hashFloat(this.seed, 'edge', e.a, e.b));
        const progress = easeInOutCubic(this.win(t, start, len * 0.14));
        if (progress <= 0) continue;
        let k = Math.min(conf.get(e.a) ?? 0, conf.get(e.b) ?? 0) * (0.35 + 0.65 * e.strength);
        if (I) k *= 1 - smoothstep(0.12, 0.45, uI);
        if (k <= 0.002) continue;
        edges.push({ a: pos.get(e.a)!, b: pos.get(e.b)!, strength: e.strength, progress, k, seed: hashFloat(this.seed, e.a, e.b) * 1000 });
      }
    }

    // Confidence field.
    const reach = I ? smoothstep(0.16, 0.97, uI) : 0;
    const anchors: FieldAnchor[] = [];
    if (I) {
      const len = I.end - I.start;
      for (const it of this.items) {
        if (!it.isPhoto || !it.ev.visualProperties?.crop) continue;
        const m = this.win(t, I.start + len * (0.02 + 0.22 * (1 - it.ev.semanticWeight)), len * 0.3);
        const arrival = smoothstep(0.85, 1.0, m);
        if (arrival <= 0) continue;
        anchors.push({ rect: it.ev.visualProperties.crop, confidence: it.ev.confidence, arrival });
      }
    }
    const inferences: FieldInference[] = this.inferences.map((inf) => ({
      center: inf.center,
      radius: inf.radius,
      confidence: inf.confidence * inf.visualImpact * (0.55 + 0.45 * reach),
    }));

    // A slow push-in while the archive accumulates; released as relations form.
    const zoom = 1 + 0.03 * easeInOutCubic(tl.progress.ARCHIVE) * (1 - easeInOutCubic(uC));

    return {
      timeline: tl,
      elements,
      edges,
      field: { anchors, inferences, reach, prior: 0.2 * smoothstep(0.35, 1.0, uI), acceptance: 0 },
      camera: { zoom },
    };
  }

  /** Evidence items, for inspection and tests. */
  get evidenceItems(): ReadonlyArray<{ id: string; acquire: number; archivePos: Vec2; layoutPos: Vec2 }> {
    return this.items.map((it) => ({ id: it.ev.id, acquire: it.acquire, archivePos: it.archivePos, layoutPos: it.layoutPos }));
  }

  static sizes = { TEXT_SIZE, LABEL_SIZE, CONCEPT_SIZE, TITLE_SIZE };
}
