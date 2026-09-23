import { WORLD, type Typography } from '../config';
import { clamp, easeInOutCubic, easeOutQuint, lerp, smoothstep, type Rect, type Vec2 } from './math';
import { createRng, hashFloat } from './random';
import { buildGraph, primaryConcept, type SemanticGraph } from '../correlation/graph';
import { forceLayout } from '../correlation/layout';
import { deriveInferences } from '../inference/inferences';
import type { Dataset, Evidence, Inference } from '../evidence/types';
import { evaluateTimeline, type PhaseName, type Timeline, type TimelineState } from '../timeline/timeline';
import type { Atlas } from '../rendering/Atlas';
import { regionStates, SCHEDULE, type RegionState } from '../confidence/epistemics';
import { REGIONS } from '../subject/regions';

/**
 * CHOREOGRAPHY — every element of the work as a pure function of time.
 *
 * Nothing here accumulates state between frames: given (dataset, timeline,
 * seed, t) positions, sizes, confidences and acceptances are fully
 * determined, so any frame can be rendered alone, in any order, identically.
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
  /** 1 = the trace is shown; 0 = it has been overwritten by the synthesis. */
  visibility: number;
}

export interface EdgeState {
  a: Vec2; b: Vec2;
  strength: number;
  progress: number;
  k: number;
  seed: number;
}

/** visibility: 0 once the synthesis has rewritten the fragment (it no longer supports anything). */
export interface FieldAnchor { rect: Rect; confidence: number; arrival: number; visibility: number; }

export interface FieldState {
  anchors: FieldAnchor[];
  /** 0→1: how far the system has extended its attention beyond the evidence. */
  reach: number;
}

export interface Frame {
  timeline: TimelineState;
  elements: ElementState[];
  edges: EdgeState[];
  field: FieldState;
  regions: RegionState[];
  /** Photographic response of the picture (optics, halation), follows acceptance. */
  photo: number;
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
  metadata: 0, date: 0.1, coordinates: 0.15, geometry: 0.18, texture: 0.2, audio: 0.25, location: 0.3,
  photograph: 0.35, absence: 0.38, text: 0.4,
};

const TEXT_SIZE: Partial<Record<Evidence['type'], number>> = { text: 0.15, date: 0.17, coordinates: 0.15, metadata: 0.12 };
const LABEL_SIZE = 0.09;
const CONCEPT_SIZE = 0.12;
const TITLE_SIZE = 0.24;
const TITLE_Y = -7.05;
/** Coherence of the residue at the seam of the loop. */
const RESIDUE_K = 0.32;

interface Item {
  ev: Evidence;
  /** Content sampled from the archive picture. */
  isPhoto: boolean;
  /** Has a place in the picture (photographs, textures, absences with a crop). */
  hasTarget: boolean;
  archiveSize: { w: number; h: number };
  archivePos: Vec2;
  layoutPos: Vec2;
  target?: { x: number; y: number; w: number; h: number };
  concept: string | null;
  acquire: number;
  order: number;
  seed: number;
  uv: [number, number, number, number];
}

export class Choreography {
  readonly graph: SemanticGraph;
  readonly inferences: Inference[];
  private items: Item[] = [];
  private itemById = new Map<string, Item>();
  private conceptPos = new Map<string, Vec2>();
  private residue: string | null;
  /** Region id → the traces that reappear on it when it is taken apart. */
  private genealogy = new Map<string, { region: number; delay: number }>();

  constructor(
    readonly dataset: Dataset,
    readonly timeline: Timeline,
    readonly atlas: Atlas,
    readonly seed: number,
    readonly typography: Typography = 'none',
    /** Normalised centroids of the subject's regions (origin top-left). */
    readonly regionCentroid: Vec2[] = [],
  ) {
    this.graph = buildGraph(dataset);
    this.inferences = deriveInferences(dataset, this.graph);
    this.residue = dataset.residue ?? null;
  }

  // ------------------------------------------------------------ setup

  /** Must be called once the atlas has been built. */
  prepare(): void {
    const rng = createRng(this.seed, 'archive-order');
    const ds = this.dataset;
    for (const c of ds.concepts) this.conceptPos.set(c.id, pictureToWorld(c.anchor));

    const items: Item[] = ds.evidence.map((ev) => {
      const crop = ev.visualProperties?.crop;
      const isPhoto = !!crop && (ev.type === 'photograph' || ev.type === 'texture');
      const hasTarget = !!crop && (isPhoto || ev.type === 'absence');
      let archiveSize: { w: number; h: number };
      let uv: Item['uv'];
      const target = crop ? cropToWorld(crop) : undefined;
      if (isPhoto) {
        const size = ev.visualProperties?.size ?? (ev.type === 'texture' ? 0.9 : 1.9);
        const s = size / Math.max(target!.w, target!.h);
        archiveSize = { w: target!.w * s, h: target!.h * s };
        uv = [crop!.x, 1 - crop!.y - crop!.h, crop!.w, crop!.h];
      } else {
        const e = this.atlas.entries.get(`ev:${ev.id}`);
        if (!e) throw new Error(`atlas entry missing for ${ev.id}`);
        archiveSize = { w: e.w, h: e.h };
        uv = e.uv;
      }
      return {
        ev, isPhoto, hasTarget, archiveSize, uv, target,
        archivePos: { x: 0, y: 0 }, layoutPos: { x: 0, y: 0 },
        concept: primaryConcept(this.graph, ev.id),
        acquire: 0, order: 0,
        seed: hashFloat(this.seed, ev.id) * 1000,
      };
    });

    // ARCHIVE: order of acquisition — the residue first (it opens every cycle),
    // then technical traces, testimony last, shuffled.
    const archive = this.phase('ARCHIVE');
    const order = items
      .map((it) => ({ it, key: it.ev.id === this.residue ? -1 : TYPE_ORDER[it.ev.type] + rng.next() * 0.7 }))
      .sort((a, b) => a.key - b.key)
      .map((o) => o.it);
    const span = archive ? archive.end - archive.start : 1;
    order.forEach((it, i) => {
      it.order = i;
      const u = i === 0 ? 0 : 0.12 + 0.74 * Math.pow((i - 1) / Math.max(1, order.length - 2), 0.72);
      it.acquire = (archive?.start ?? 0) + span * u;
    });

    // ARCHIVE: a catalogue — sparse placement on a quarter-unit grid, no overlaps.
    const place = createRng(this.seed, 'archive-layout');
    const placed: Rect[] = [];
    const bounds = { minX: -4.0, maxX: 4.0, minY: -6.9, maxY: 7.3 };
    const bySize = [...items].sort((a, b) => b.archiveSize.w * b.archiveSize.h - a.archiveSize.w * a.archiveSize.h || a.ev.id.localeCompare(b.ev.id));
    const labels = this.typography !== 'none';
    for (const it of bySize) {
      const w = it.archiveSize.w;
      const h = it.archiveSize.h + (it.isPhoto && labels ? 0.22 : 0);
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
      it.archivePos = { x: best.x, y: best.y + (it.isPhoto && labels ? 0.11 : 0) };
    }

    // CORRELATION: a semantic map whose centres sit where the picture will need them.
    const sizes = new Map<string, { w: number; h: number }>();
    for (const it of items) sizes.set(it.ev.id, { w: it.archiveSize.w * this.correlationScale(it), h: it.archiveSize.h * this.correlationScale(it) });
    for (const c of ds.concepts) sizes.set(c.id, labels ? { w: 1.2, h: 0.3 } : { w: 0.3, h: 0.3 });
    const layout = forceLayout({
      graph: this.graph,
      sizes,
      pinned: this.conceptPos,
      initial: new Map(items.map((it) => [it.ev.id, it.archivePos])),
      bounds: { minX: -4.2, maxX: 4.2, minY: -7.2, maxY: 7.5 },
      seed: this.seed,
    });
    for (const it of items) it.layoutPos = layout.get(it.ev.id)!;

    // DECONSTRUCTION: the traces a region was drawn from reappear on it.
    for (const r of REGIONS) {
      const traces = [r.source, ...r.evidence.filter((id) => items.find((it) => it.ev.id === id && it.ev.type === 'absence'))].filter((x): x is string => !!x);
      traces.forEach((id, i) => { if (items.some((it) => it.ev.id === id)) this.genealogy.set(id, { region: r.id, delay: i * 0.03 }); });
    }

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

  /** Normalised phase progress → 0..1 inside [a, b]. */
  private w(u: number, a: number, b: number): number {
    return easeInOutCubic(clamp((u - a) / Math.max(1e-6, b - a)));
  }

  // ------------------------------------------------------------ evaluation

  evaluate(t: number): Frame {
    const tl = evaluateTimeline(this.timeline, t);
    const A = this.phase('ARCHIVE');
    const C = this.phase('CORRELATION');
    const I = this.phase('INFERENCE');
    const S = this.phase('SYNTHESIS');
    const D = this.phase('DECONSTRUCTION');
    const uC = tl.progress.CORRELATION;
    const uI = tl.progress.INFERENCE;
    const uS = tl.progress.SYNTHESIS;
    const uD = tl.progress.DECONSTRUCTION;
    const acqDur = A ? clamp((A.end - A.start) * 0.11, 0.8, 2.2) : 1;
    const labels = this.typography !== 'none';
    const regions = regionStates(tl);

    const pos = new Map<string, Vec2>();
    const conf = new Map<string, number>();

    // Concepts: named in 'minimal' typography; otherwise invisible centres the relations converge on.
    const conceptStates: ElementState[] = [];
    this.dataset.concepts.forEach((c, j) => {
      const entry = this.atlas.entries.get(`concept:${c.id}`)!;
      let k = 0;
      if (C) k = easeOutQuint(this.win(t, C.start + (C.end - C.start) * (0.05 + 0.05 * j), acqDur));
      if (I) k *= 1 - smoothstep(0.3, 0.55, uI);
      const p = this.conceptPos.get(c.id)!;
      pos.set(c.id, p);
      conf.set(c.id, k);
      if (!labels) return;
      conceptStates.push({ id: c.id, kind: 'concept', x: p.x + entry.w / 2 - entry.h * 0.4, y: p.y, w: entry.w, h: entry.h, confidence: k, k, source: 0, uv: entry.uv, seed: hashFloat(this.seed, c.id) * 1000, visibility: 1 });
    });

    // Evidence.
    const evidenceStates: ElementState[] = [];
    const labelStates: ElementState[] = [];
    const photoCount = this.items.filter((it) => it.isPhoto).length;
    for (const it of this.items) {
      const ev = it.ev;
      const isResidue = ev.id === this.residue;
      let k = isResidue
        ? lerp(RESIDUE_K, ev.confidence, easeOutQuint(this.win(t, it.acquire, acqDur * 1.6)))
        : ev.confidence * easeOutQuint(this.win(t, it.acquire, acqDur));
      let visibility = 1;
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
        k *= 1 - 0.45 * (1 - ev.semanticWeight) * uC;
      }

      if (I) {
        const len = I.end - I.start;
        if (it.hasTarget && it.target) {
          // Evidence returns to where it was taken from; an absence to what it leaves open.
          const m = easeInOutCubic(this.win(t, I.start + len * (0.02 + 0.22 * (1 - ev.semanticWeight)), len * 0.3));
          x = lerp(x, it.target.x, m);
          y = lerp(y, it.target.y, m);
          w = lerp(w, it.target.w, m);
          h = lerp(h, it.target.h, m);
          k = lerp(k, ev.confidence, m);
        } else {
          // Everything else is absorbed into what it supports.
          const r = hashFloat(this.seed, 'absorb', ev.id);
          const m = easeInOutCubic(this.win(t, I.start + len * (0.04 + 0.22 * r), len * 0.3));
          const target = it.concept ? this.conceptPos.get(it.concept)! : { x, y };
          x = lerp(x, target.x, m * 0.85);
          y = lerp(y, target.y, m * 0.85);
          w *= 1 - 0.5 * m; h *= 1 - 0.5 * m;
          k *= 1 - m;
        }
      }

      if (S) {
        if (it.isPhoto) {
          // The synthesis rewrites even the evidence: the seams heal.
          visibility = 1 - this.w(uS, 0.22 + 0.1 * hashFloat(this.seed, 'overwrite', ev.id), 0.58);
        } else if (ev.type === 'absence') {
          // A gap is closed when its region is decided.
          k *= 1 - this.w(uS, SCHEDULE.absent.synthesis[0], SCHEDULE.absent.synthesis[1]);
        }
      }

      if (D) {
        if (it.isPhoto) {
          // Once what was chosen has collapsed, the evidence is visible again, alone.
          visibility = Math.max(visibility, this.w(uD, 0.26, 0.4));
          if (isResidue) {
            // The last trace goes back to the archive: it opens the next cycle.
            const m = this.w(uD, 0.8, 0.98);
            x = lerp(x, it.archivePos.x, m);
            y = lerp(y, it.archivePos.y, m);
            w = lerp(w, it.archiveSize.w, m);
            h = lerp(h, it.archiveSize.h, m);
            k = lerp(k, RESIDUE_K, this.w(uD, 0.7, 1.0));
          } else {
            // The other traces go out, most recently acquired first.
            const rank = (photoCount - 1 - Math.min(photoCount - 1, it.order)) / Math.max(1, photoCount - 1);
            const a = 0.66 + 0.16 * rank;
            k *= 1 - smoothstep(a, a + 0.08, uD);
          }
        } else {
          const g = this.genealogy.get(ev.id);
          if (g) {
            // A region taken apart shows what it was made from.
            const cls = REGIONS[g.region].class;
            const rel = SCHEDULE[cls].release;
            const wd = SCHEDULE[cls].withdraw;
            const appear = this.w(uD, rel[0] + g.delay, rel[0] + g.delay + 0.06);
            const leave = this.w(uD, wd[1] + 0.02, wd[1] + 0.12);
            const cen = this.regionCentroid[g.region] ?? { x: 0.5, y: 0.5 };
            const centre = it.target ?? { ...pictureToWorld(cen), w: it.archiveSize.w, h: it.archiveSize.h };
            if (appear > 0) {
              x = centre.x; y = centre.y;
              w = ev.type === 'absence' ? centre.w : it.archiveSize.w;
              h = ev.type === 'absence' ? centre.h : it.archiveSize.h;
            }
            k = Math.max(k, ev.confidence * appear * (1 - leave));
          }
        }
      }

      pos.set(ev.id, { x, y });
      conf.set(ev.id, k);
      evidenceStates.push({ id: ev.id, kind: 'evidence', x, y, w, h, confidence: k, k, source: it.isPhoto ? 1 : 0, uv: it.uv, seed: it.seed, visibility });

      if (it.isPhoto && labels) {
        const entry = this.atlas.entries.get(`label:${ev.id}`)!;
        let lk = k;
        if (I) lk *= 1 - smoothstep(0.0, 0.12, uI);
        labelStates.push({
          id: `label:${ev.id}`, kind: 'label',
          x: x - w / 2 + entry.w / 2, y: y - h / 2 - 0.06 - entry.h / 2, w: entry.w, h: entry.h,
          confidence: lk, k: lk, source: 0, uv: entry.uv, seed: it.seed + 7, visibility: 1,
        });
      }
    }

    // Titles (only with 'minimal' typography).
    const titleStates: ElementState[] = [];
    if (labels) {
      for (const p of this.timeline.phases) {
        if (!p.title) continue;
        const entry = this.atlas.entries.get(`title:${p.phase}`)!;
        const len = p.end - p.start;
        const hold = Math.min(3.4, len * 0.34);
        const k = easeOutQuint(this.win(t, p.start + 0.25, 1.1)) * (1 - smoothstep(0, 1, this.win(t, p.start + hold, 1.2)));
        if (k <= 0) continue;
        titleStates.push({ id: `title:${p.phase}`, kind: 'title', x: 0, y: TITLE_Y, w: entry.w, h: entry.h, confidence: k, k, source: 0, uv: entry.uv, seed: hashFloat(this.seed, p.phase) * 1000, visibility: 1 });
      }
    }

    const isPhoto = (e: ElementState) => this.itemById.get(e.id)!.isPhoto;
    const elements = [...conceptStates, ...evidenceStates.filter((e) => !isPhoto(e)), ...labelStates, ...evidenceStates.filter(isPhoto), ...titleStates];

    // Relationships.
    const edges: EdgeState[] = [];
    if (C) {
      const len = C.end - C.start;
      for (const e of this.graph.edges) {
        const start = C.start + len * (0.16 + 0.48 * (1 - e.strength) + 0.08 * hashFloat(this.seed, 'edge', e.a, e.b));
        const progress = easeInOutCubic(this.win(t, start, len * 0.14));
        if (progress <= 0) continue;
        let k = Math.min(conf.get(e.a) ?? 0, conf.get(e.b) ?? 0) * (0.35 + 0.65 * e.strength);
        if (I) k *= 1 - smoothstep(0.12, 0.45, uI);
        // In DECONSTRUCTION, once only evidence remains, its relations show briefly.
        if (D) {
          const both = this.itemById.get(e.a)?.isPhoto && this.itemById.get(e.b)?.isPhoto;
          const rel = both ? this.w(uD, 0.46, 0.54) * (1 - this.w(uD, 0.6, 0.7)) : 0;
          k = Math.max(k, rel * Math.min(conf.get(e.a) ?? 0, conf.get(e.b) ?? 0) * (0.3 + 0.5 * e.strength));
        }
        if (k <= 0.002) continue;
        edges.push({ a: pos.get(e.a)!, b: pos.get(e.b)!, strength: e.strength, progress, k, seed: hashFloat(this.seed, e.a, e.b) * 1000 });
      }
    }

    // Anchors of the confidence field: photographs back in place.
    const anchors: FieldAnchor[] = [];
    if (I) {
      const len = I.end - I.start;
      for (const it of this.items) {
        if (!it.isPhoto || !it.ev.visualProperties?.crop) continue;
        const m = this.win(t, I.start + len * (0.02 + 0.22 * (1 - it.ev.semanticWeight)), len * 0.3);
        const arrival = smoothstep(0.85, 1.0, m);
        if (arrival <= 0) continue;
        const visibility = elements.find((e) => e.id === it.ev.id)?.visibility ?? 1;
        anchors.push({ rect: it.ev.visualProperties.crop, confidence: it.ev.confidence, arrival, visibility });
      }
    }
    // Attention extends from the evidence over the whole of INFERENCE.
    const reach = I ? Math.pow(smoothstep(0.1, 1.0, uI), 0.9) * Math.pow(smoothstep(0.1, 0.45, uI), 0.5) : 0;

    // Photographic response follows the acceptance of the picture as a whole.
    const meanAcceptance = regions.reduce((s, r) => s + r.acceptance, 0) / regions.length;
    const photo = smoothstep(0.35, 1.0, meanAcceptance) * (D ? 1 - this.w(uD, 0.0, 0.3) : 1);

    const zoom = 1 + 0.03 * easeInOutCubic(tl.progress.ARCHIVE) * (1 - easeInOutCubic(uC));

    return { timeline: tl, elements, edges, field: { anchors, reach }, regions, photo, camera: { zoom } };
  }

  /** Evidence items, for inspection and tests. */
  get evidenceItems(): ReadonlyArray<{ id: string; acquire: number; archivePos: Vec2; layoutPos: Vec2 }> {
    return this.items.map((it) => ({ id: it.ev.id, acquire: it.acquire, archivePos: it.archivePos, layoutPos: it.layoutPos }));
  }

  static sizes = { TEXT_SIZE, LABEL_SIZE, CONCEPT_SIZE, TITLE_SIZE };
}
