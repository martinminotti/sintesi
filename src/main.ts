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
import { makeConfig, type QualityName } from './config';
import { Engine, type EngineView } from './core/Engine';
import { loadDataset } from './data/loadDataset';
import { getTimeline } from './timeline/timelines';
import { startLivePlayer } from './core/player';

const params = new URLSearchParams(location.search);
const mode = params.get('mode') ?? 'live';
const config = makeConfig({
  quality: (params.get('quality') as QualityName) ?? (mode === 'render' ? 'preview' : 'dev'),
  seed: params.has('seed') ? Number(params.get('seed')) : undefined,
  timeline: params.get('timeline') ?? undefined,
});
const view = (params.get('view') ?? 'work') as EngineView;

const canvas = document.getElementById('sintesi') as HTMLCanvasElement;
const engine = new Engine(canvas, config, loadDataset(), getTimeline(config.timeline), {
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
  state: (t: number) => engine.artisticState(t),
  control: (frame: number) => engine.artisticState(frame / config.fps),
  probeCoherence: () => engine.probeCoherence(),
};
(window as unknown as { __SINTESI__: typeof api }).__SINTESI__ = api;

if (mode !== 'render') startLivePlayer(engine, config);
