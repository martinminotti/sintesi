import { PHASES } from '../timeline/timeline';
import type { EngineConfig } from '../config';
import type { Engine } from './Engine';

/**
 * Live mode: the work plays in real time and loops. The canvas is fitted to
 * the window at 9:16. There is no on-screen interface; keys are for installation
 * and development only.
 */
export function startLivePlayer(engine: Engine, config: EngineConfig): void {
  const canvas = engine.canvas;
  const debug = document.getElementById('debug')!;
  const duration = engine.timeline.duration;
  let offset = 0;
  let paused = false;
  let pausedAt = 0;
  let origin = performance.now();

  const fit = (): void => {
    const s = Math.min(window.innerWidth / config.width, window.innerHeight / config.height);
    canvas.style.width = `${Math.floor(config.width * s)}px`;
    canvas.style.height = `${Math.floor(config.height * s)}px`;
  };
  window.addEventListener('resize', fit);
  fit();

  const now = (): number => {
    const raw = paused ? pausedAt : (performance.now() - origin) / 1000 + offset;
    return ((raw % duration) + duration) % duration;
  };

  window.addEventListener('keydown', (e) => {
    const t = now();
    if (e.key === ' ') {
      if (paused) { origin = performance.now(); offset = pausedAt; } else pausedAt = t;
      paused = !paused;
    } else if (e.key === 'ArrowRight' || e.key === 'ArrowLeft') {
      const d = e.key === 'ArrowRight' ? 1 : -1;
      if (paused) pausedAt = t + d; else offset += d;
    } else if (/^[1-5]$/.test(e.key)) {
      const phase = engine.timeline.phases.find((p) => p.phase === PHASES[Number(e.key) - 1]);
      if (phase) { origin = performance.now(); offset = phase.start; pausedAt = phase.start; }
    } else if (e.key === 'd') {
      document.body.classList.toggle('debug');
    } else if (e.key === 'f') {
      void (document.fullscreenElement ? document.exitFullscreen() : document.documentElement.requestFullscreen());
    }
  });

  const loop = (): void => {
    const t = now();
    engine.renderAt(t);
    if (document.body.classList.contains('debug')) {
      const s = engine.artisticState(t);
      debug.textContent = `t ${t.toFixed(2)}  ${s.phase ?? '—'} ${(s.phaseProgress * 100).toFixed(0)}%\n` +
        `confidence ${s.confidence.toFixed(3)}  coherence ${s.coherence.toFixed(3)}  acceptance ${s.acceptance.toFixed(2)}\n` +
        `evidence ${s.evidence}  relation ${s.relation.toFixed(2)}  inferred ${s.inferred.toFixed(2)}\n` +
        `${config.quality.name} ${config.width}×${config.height} seed ${config.seed}${paused ? '  [paused]' : ''}`;
    }
    requestAnimationFrame(loop);
  };
  requestAnimationFrame(loop);
}
