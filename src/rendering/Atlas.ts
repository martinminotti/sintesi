import * as THREE from 'three';
import { createRng, type Rng } from '../core/random';

/**
 * Everything typographic or diagrammatic is drawn once into a Canvas2D atlas
 * at the pixel density of the output, then sampled by the fragment shader,
 * so text obeys the same confidence → coherence law as the photographs.
 */

export interface AtlasEntry {
  /** World size (units of the 9 × 16 frame). */
  w: number;
  h: number;
  /** Texture rect: u0, v0, du, dv (v up). */
  uv: [number, number, number, number];
}

export type AtlasDraw = (ctx: CanvasRenderingContext2D, pxW: number, pxH: number, ppu: number) => void;

interface Pending { key: string; w: number; h: number; draw: AtlasDraw; }

const PAD = 10;
export const FONT_MONO = "'IBM Plex Mono', monospace";
export const FONT_SANS = "'Inter', sans-serif";
export const INK = '#e9e6e0';

export class Atlas {
  readonly entries = new Map<string, AtlasEntry>();
  texture!: THREE.CanvasTexture;
  canvas!: HTMLCanvasElement;
  private pending: Pending[] = [];

  /** @param ppu output pixels per world unit */
  constructor(readonly ppu: number) {}

  add(key: string, w: number, h: number, draw: AtlasDraw): void {
    this.pending.push({ key, w, h, draw });
  }

  /** Measure text in world units (for sizing entries before drawing). */
  measure(text: string, font: string, sizeWorld: number, letterSpacingEm = 0): number {
    const ctx = document.createElement('canvas').getContext('2d')!;
    const px = sizeWorld * this.ppu;
    ctx.font = font.replace('{px}', `${px}px`);
    (ctx as unknown as { letterSpacing: string }).letterSpacing = `${letterSpacingEm * px}px`;
    // Canvas letter-spacing also trails the last glyph: remove it so boxes stay centred.
    return (ctx.measureText(text).width - letterSpacingEm * px) / this.ppu;
  }

  build(): void {
    // Shelf packing, tallest first.
    const items = [...this.pending].sort((a, b) => b.h - a.h || a.key.localeCompare(b.key));
    const sizeFor = (maxW: number): { placed: { item: Pending; x: number; y: number; pw: number; ph: number }[]; height: number } => {
      const placed: { item: Pending; x: number; y: number; pw: number; ph: number }[] = [];
      let x = 0, y = 0, rowH = 0;
      for (const item of items) {
        const pw = Math.ceil(item.w * this.ppu) + PAD * 2;
        const ph = Math.ceil(item.h * this.ppu) + PAD * 2;
        if (x + pw > maxW) { x = 0; y += rowH; rowH = 0; }
        placed.push({ item, x, y, pw, ph });
        x += pw;
        rowH = Math.max(rowH, ph);
      }
      return { placed, height: y + rowH };
    };
    let width = 1024;
    let layout = sizeFor(width);
    while (layout.height > width && width < 8192) { width *= 2; layout = sizeFor(width); }
    const height = Math.min(8192, 2 ** Math.ceil(Math.log2(Math.max(64, layout.height))));

    this.canvas = document.createElement('canvas');
    this.canvas.width = width;
    this.canvas.height = height;
    const ctx = this.canvas.getContext('2d')!;
    ctx.clearRect(0, 0, width, height);
    for (const { item, x, y, pw, ph } of layout.placed) {
      ctx.save();
      ctx.translate(x + PAD, y + PAD);
      ctx.beginPath();
      ctx.rect(0, 0, pw - PAD * 2, ph - PAD * 2);
      ctx.clip();
      item.draw(ctx, pw - PAD * 2, ph - PAD * 2, this.ppu);
      ctx.restore();
      this.entries.set(item.key, {
        w: item.w,
        h: item.h,
        uv: [(x + PAD) / width, 1 - (y + ph - PAD) / height, (pw - PAD * 2) / width, (ph - PAD * 2) / height],
      });
    }
    this.texture = new THREE.CanvasTexture(this.canvas);
    this.texture.colorSpace = THREE.NoColorSpace;
    this.texture.generateMipmaps = true;
    this.texture.minFilter = THREE.LinearMipmapLinearFilter;
    this.texture.magFilter = THREE.LinearFilter;
    this.texture.anisotropy = 1;
    this.pending = [];
  }
}

// ------------------------------------------------------------------ drawings

export function drawText(text: string, font: string, sizeWorld: number, letterSpacingEm = 0, alpha = 1): AtlasDraw {
  return (ctx, _w, h, ppu) => {
    const px = sizeWorld * ppu;
    ctx.font = font.replace('{px}', `${px}px`);
    (ctx as unknown as { letterSpacing: string }).letterSpacing = `${letterSpacingEm * px}px`;
    ctx.fillStyle = INK;
    ctx.globalAlpha = alpha;
    ctx.textBaseline = 'middle';
    ctx.fillText(text, 0, h / 2);
  };
}

/** A recorded voice, as a waveform: bursts of energy separated by silences. */
export function drawWaveform(label: string, seed: number, id: string, labelSize: number): AtlasDraw {
  return (ctx, w, h, ppu) => {
    const rng = createRng(seed, `waveform:${id}`);
    const waveH = h - labelSize * ppu * 1.8;
    const mid = waveH / 2;
    const n = Math.floor(w / Math.max(1.5, ppu * 0.012));
    ctx.fillStyle = INK;
    // Syllable envelope.
    const bursts: { c: number; s: number; a: number }[] = [];
    for (let i = 0; i < 9; i++) bursts.push({ c: rng.range(0.05, 0.95), s: rng.range(0.02, 0.07), a: rng.range(0.3, 1) });
    for (let i = 0; i < n; i++) {
      const x = (i / n) * w;
      const u = i / n;
      let env = 0.03;
      for (const b of bursts) env += b.a * Math.exp(-((u - b.c) ** 2) / (2 * b.s * b.s));
      const amp = Math.min(1, env) * (0.35 + 0.65 * rng.next()) * mid * 0.95;
      ctx.globalAlpha = 0.9;
      ctx.fillRect(x, mid - amp, Math.max(1, ppu * 0.006), amp * 2);
    }
    ctx.globalAlpha = 0.35;
    ctx.fillRect(0, mid, w, Math.max(1, ppu * 0.003));
    ctx.globalAlpha = 0.8;
    ctx.font = `${labelSize * ppu}px ${FONT_MONO}`;
    ctx.textBaseline = 'bottom';
    ctx.fillText(label, 0, h);
  };
}

/** A survey-map fragment: contour lines around one or two elevations and a mark. */
export function drawMap(label: string, seed: number, id: string, labelSize: number): AtlasDraw {
  return (ctx, w, h, ppu) => {
    const rng: Rng = createRng(seed, `map:${id}`);
    const mapH = h - labelSize * ppu * 1.8;
    const centres = [0, 1].map(() => ({ x: rng.range(0.2, 0.8) * w, y: rng.range(0.2, 0.8) * mapH, r: rng.range(0.4, 0.8) }));
    const harmonics = Array.from({ length: 5 }, () => ({ a: rng.range(0.02, 0.1), p: rng.range(0, Math.PI * 2) }));
    ctx.strokeStyle = INK;
    ctx.lineWidth = Math.max(1, ppu * 0.005);
    ctx.save();
    ctx.beginPath();
    ctx.rect(0, 0, w, mapH);
    ctx.clip();
    for (const c of centres) {
      for (let ring = 1; ring <= 9; ring++) {
        ctx.globalAlpha = ring % 4 === 0 ? 0.7 : 0.32;
        ctx.beginPath();
        for (let s = 0; s <= 96; s++) {
          const a = (s / 96) * Math.PI * 2;
          let r = ring * 0.075 * c.r;
          harmonics.forEach((hm, k) => { r *= 1 + hm.a * Math.sin(a * (k + 2) + hm.p + ring * 0.3); });
          const x = c.x + Math.cos(a) * r * w;
          const y = c.y + Math.sin(a) * r * mapH;
          if (s === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
        }
        ctx.stroke();
      }
    }
    ctx.restore();
    // The mark: where the system believes it happened.
    const mx = rng.range(0.3, 0.7) * w, my = rng.range(0.3, 0.7) * mapH, ms = ppu * 0.05;
    ctx.globalAlpha = 0.95;
    ctx.lineWidth = Math.max(1, ppu * 0.008);
    ctx.beginPath();
    ctx.moveTo(mx - ms, my); ctx.lineTo(mx + ms, my);
    ctx.moveTo(mx, my - ms); ctx.lineTo(mx, my + ms);
    ctx.stroke();
    ctx.globalAlpha = 0.25;
    ctx.strokeRect(0.5, 0.5, w - 1, mapH - 1);
    ctx.globalAlpha = 0.8;
    ctx.fillStyle = INK;
    ctx.font = `${labelSize * ppu}px ${FONT_MONO}`;
    ctx.textBaseline = 'bottom';
    ctx.fillText(label, 0, h);
  };
}

/** A concept: a small open ring and its name. */
export function drawConcept(label: string, sizeWorld: number): AtlasDraw {
  return (ctx, _w, h, ppu) => {
    const px = sizeWorld * ppu;
    const r = px * 0.32;
    ctx.strokeStyle = INK;
    ctx.fillStyle = INK;
    ctx.lineWidth = Math.max(1, ppu * 0.007);
    ctx.beginPath();
    ctx.arc(r + 1, h / 2, r, 0, Math.PI * 2);
    ctx.stroke();
    ctx.font = `${px}px ${FONT_MONO}`;
    (ctx as unknown as { letterSpacing: string }).letterSpacing = `${0.12 * px}px`;
    ctx.textBaseline = 'middle';
    ctx.fillText(label, r * 2 + px * 0.6, h / 2);
  };
}

/**
 * An ABSENCE: the slot of an album where a photograph should be.
 * Four photo corners and nothing between them.
 */
export function drawAbsence(): AtlasDraw {
  return (ctx, w, h, ppu) => {
    const c = Math.min(w, h) * 0.14;
    ctx.fillStyle = INK;
    ctx.globalAlpha = 0.7;
    const tri = (x: number, y: number, dx: number, dy: number): void => {
      ctx.beginPath();
      ctx.moveTo(x, y);
      ctx.lineTo(x + dx * c, y);
      ctx.lineTo(x, y + dy * c);
      ctx.closePath();
      ctx.fill();
    };
    tri(0, 0, 1, 1);
    tri(w, 0, -1, 1);
    tri(0, h, 1, -1);
    tri(w, h, -1, -1);
    ctx.globalAlpha = 0.12;
    ctx.lineWidth = Math.max(1, ppu * 0.004);
    ctx.strokeStyle = INK;
    ctx.strokeRect(0.5, 0.5, w - 1, h - 1);
  };
}

/** GEOMETRY: a measured plan of a room — walls, a window, a door swing, one dimension. */
export function drawPlan(seed: number, id: string, labelSize: number): AtlasDraw {
  return (ctx, w, h, ppu) => {
    const rng = createRng(seed, `plan:${id}`);
    const planH = h - labelSize * ppu * 1.8;
    const m = ppu * 0.06;
    const lw = Math.max(1, ppu * 0.012);
    ctx.strokeStyle = INK;
    ctx.fillStyle = INK;
    ctx.lineWidth = lw;
    ctx.globalAlpha = 0.85;
    const x0 = m, y0 = m, x1 = w - m, y1 = planH - m;
    // Walls, with a gap for the window on the top wall and one for the door.
    const wa = x0 + (x1 - x0) * rng.range(0.15, 0.3), wb = wa + (x1 - x0) * 0.28;
    const da = y0 + (y1 - y0) * rng.range(0.55, 0.7), db = da + (y1 - y0) * 0.2;
    ctx.beginPath();
    ctx.moveTo(wa, y0); ctx.lineTo(x0, y0); ctx.lineTo(x0, y1); ctx.lineTo(x1, y1); ctx.lineTo(x1, db);
    ctx.moveTo(x1, da); ctx.lineTo(x1, y0); ctx.lineTo(wb, y0);
    ctx.stroke();
    ctx.globalAlpha = 0.5;
    ctx.lineWidth = Math.max(1, ppu * 0.004);
    ctx.beginPath();
    ctx.moveTo(wa, y0 - lw); ctx.lineTo(wb, y0 - lw);
    ctx.moveTo(wa, y0 + lw); ctx.lineTo(wb, y0 + lw);
    // Door swing.
    ctx.moveTo(x1, da);
    ctx.lineTo(x1 - (db - da), da);
    ctx.arc(x1, da, db - da, Math.PI, Math.PI / 2, true);
    ctx.stroke();
    ctx.globalAlpha = 0.75;
    ctx.font = `${labelSize * ppu}px ${FONT_MONO}`;
    ctx.textBaseline = 'bottom';
    ctx.fillText('3.40 × 4.15', 0, h);
  };
}
