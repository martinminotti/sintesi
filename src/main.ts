/**
 * SINTESI — entry point.
 *
 *   live   (default)  plays the work in real time, looping. Keyboard only:
 *                     space pause · ←/→ ±1 s · 1–5 jump to phase · d debug · f fullscreen
 *   render (?mode=render)  waits for the harness to request frames (scripts/render.ts).
 *
 * URL parameters: quality=dev|preview|final · seed=<int> · timeline=prototype|full
 *                 view=work|subject-observed|subject-inferred|subject-data|field
 */
import '@fontsource/inter/300.css';
import '@fontsource/inter/400.css';
import '@fontsource/ibm-plex-mono/400.css';
import { makeConfig, type Composition, type QualityName, type Typography } from './config';
import { Engine, type EngineView } from './core/Engine';
import { loadDataset } from './data/loadDataset';
import { getTimeline } from './timeline/timelines';
import { startLivePlayer } from './core/player';
import { audioParams } from './audio/audioState';
import { buildScore } from './audio/score';

const params = new URLSearchParams(location.search);
const mode = params.get('mode') ?? 'live';
const config = makeConfig({
  quality: (params.get('quality') as QualityName) ?? (mode === 'render' ? 'preview' : 'dev'),
  seed: params.has('seed') ? Number(params.get('seed')) : undefined,
  timeline: params.get('timeline') ?? undefined,
  composition: (params.get('composition') as Composition) ?? undefined,
  typography: (params.get('typography') as Typography) ?? undefined,
  subject: params.get('subject') ?? undefined,
});
const view = (params.get('view') ?? 'work') as EngineView;

const canvas = document.getElementById('sintesi') as HTMLCanvasElement;
const engine = new Engine(canvas, config, loadDataset(config.composition), getTimeline(config.timeline), {
  preserveDrawingBuffer: mode === 'render',
  view,
});
await engine.init();

// The harness API (also useful from the console).
const api = {
  ready: true,
  info: () => engine.info(),
  renderFrame: (frame: number) => engine.renderAt(frame / config.fps),
  captureFrame: (frame: number, format: 'png' | 'jpeg' = 'png') => {
    engine.renderAt(frame / config.fps);
    return canvas.toDataURL(format === 'png' ? 'image/png' : 'image/jpeg', 0.95);
  },
  state: (t: number) => engine.artworkState(t),
  control: (frame: number) => engine.artworkState(frame / config.fps),
  probeCoherence: () => engine.probeCoherence(),
  setView: (v: EngineView) => { engine.view = v; },
  /** The audio score: per-frame state and events, derived from the choreography. */
  score: () => buildScore(engine),
  /** Where every trace sits in the archive and in the semantic map (quality-independent). */
  layout: () => engine.choreography.evidenceItems,
  /**
   * The subject's layers in the file format of a synthesis session (for tests
   * of the file pipeline): PNG data URLs keyed by file name.
   */
  exportSubject: () => {
    const grab = (view: EngineView): string => { engine.view = view; engine.renderAt(0); return canvas.toDataURL('image/png'); };
    const files: Record<string, string> = {
      'observed.png': grab('subject-observed'),
      'synthesis.png': grab('subject-synthesis'),
      'alt-1.png': grab('subject-alt1'),
      'alt-2.png': grab('subject-alt2'),
      'alt-3.png': grab('subject-alt3'),
    };
    engine.view = 'subject-data-raw';
    engine.renderAt(0);
    const w = canvas.width, h = canvas.height;
    const c = document.createElement('canvas');
    c.width = w; c.height = h;
    const ctx = c.getContext('2d', { willReadFrequently: true })!;
    ctx.drawImage(canvas, 0, 0);
    const src = ctx.getImageData(0, 0, w, h).data;
    const layer = (f: (r: number, id: number) => number): string => {
      const out = ctx.createImageData(w, h);
      for (let i = 0; i < w * h; i++) {
        const v = f(src[i * 4], Math.round((src[i * 4 + 1] / 255) * 16));
        out.data[i * 4] = out.data[i * 4 + 1] = out.data[i * 4 + 2] = v;
        out.data[i * 4 + 3] = 255;
      }
      const o = document.createElement('canvas');
      o.width = w; o.height = h;
      o.getContext('2d')!.putImageData(out, 0, 0);
      return o.toDataURL('image/png');
    };
    files['depth.png'] = layer((r) => 255 - r);
    for (const [name, id] of Object.entries({ view: 3, wall: 11, vessel: 5, coat: 6, gaze: 12 })) {
      files[`mask-${name}.png`] = layer((_, rid) => (rid === id ? 255 : 0));
    }
    // The person: skin, hair, shirt (coat and eyes have their own masks, which win).
    files['mask-figure.png'] = layer((_, rid) => ([7, 8, 13, 6, 12].includes(rid) ? 255 : 0));
    engine.view = 'work';
    return files;
  },
  /** Luminance of a frame on a coarse 36 × 64 grid (for seam and stability checks). */
  thumbnail: (frame: number) => {
    engine.renderAt(frame / config.fps);
    const c = document.createElement('canvas');
    c.width = 36; c.height = 64;
    const ctx = c.getContext('2d')!;
    ctx.drawImage(canvas, 0, 0, 36, 64);
    const d = ctx.getImageData(0, 0, 36, 64).data;
    return Array.from({ length: 36 * 64 }, (_, i) => (0.2126 * d[i * 4] + 0.7152 * d[i * 4 + 1] + 0.0722 * d[i * 4 + 2]) / 255);
  },
};
(window as unknown as { __SINTESI__: typeof api }).__SINTESI__ = api;
(window as unknown as { __SINTESI_AUDIO__: typeof audioParams }).__SINTESI_AUDIO__ = audioParams;

if (mode !== 'render') startLivePlayer(engine, config);
