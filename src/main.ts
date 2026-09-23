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

const params = new URLSearchParams(location.search);
const mode = params.get('mode') ?? 'live';
const config = makeConfig({
  quality: (params.get('quality') as QualityName) ?? (mode === 'render' ? 'preview' : 'dev'),
  seed: params.has('seed') ? Number(params.get('seed')) : undefined,
  timeline: params.get('timeline') ?? undefined,
  composition: (params.get('composition') as Composition) ?? undefined,
  typography: (params.get('typography') as Typography) ?? undefined,
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
