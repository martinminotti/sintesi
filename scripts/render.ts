/**
 * Deterministic frame renderer.
 *
 *   npm run render -- --quality=dev|preview|final [--seed=1987] [--timeline=prototype|full]
 *                     [--from=0] [--to=<seconds>] [--gpu] [--no-video] [--out=<dir>]
 *
 * Writes renders/<name>/frames/NNNNNN.png, control.csv (the artistic state per
 * frame, for sound design), manifest.json (everything needed to reproduce the
 * render, with a SHA-256 per frame), then assembles the video with FFmpeg.
 */
import { createHash } from 'node:crypto';
import { execSync } from 'node:child_process';
import { mkdirSync, writeFileSync, existsSync, rmSync } from 'node:fs';
import path from 'node:path';
import { captureFrame, openEngine, parseArgs, ROOT } from './lib/browser';
import { exportVideo } from './export';

const args = parseArgs(process.argv.slice(2));
const quality = args.quality ?? 'preview';
const seed = args.seed !== undefined ? Number(args.seed) : undefined;
const t0 = Date.now();

const extra: Record<string, string> = {};
for (const k of ['composition', 'typography', 'subject']) if (args[k]) extra[k] = args[k];
const session = await openEngine({ quality, seed, timeline: args.timeline, gpu: args.gpu === 'true', extraParams: extra });
const { info } = session;
const name = args.out ?? `${info.timeline}-${info.quality}-seed${info.seed}${args.composition ? '-' + args.composition : ''}`;
const dir = path.resolve(ROOT, 'renders', name);
const framesDir = path.join(dir, 'frames');
if (existsSync(framesDir)) rmSync(framesDir, { recursive: true });
mkdirSync(framesDir, { recursive: true });

const first = Math.round(Number(args.from ?? 0) * info.fps);
const last = Math.min(info.frames, args.to !== undefined ? Math.round(Number(args.to) * info.fps) : info.frames);
console.log(`SINTESI · ${info.timeline} · ${info.quality} ${info.width}×${info.height} · seed ${info.seed} · frames ${first}–${last - 1}`);
console.log(`renderer: ${info.renderer}`);

const hashes: Record<string, string> = {};
const control: string[] = ['frame,t,phase,phaseProgress,confidence,acceptance,certainty,evidence,relation,picture,unsupported,determination,events,continuity,harmonicity,pulse,fiction,level'];
const started = Date.now();
try {
  for (let f = first; f < last; f++) {
    const png = await captureFrame(session.page, f);
    const file = `${String(f).padStart(6, '0')}.png`;
    writeFileSync(path.join(framesDir, file), png);
    hashes[file] = createHash('sha256').update(png).digest('hex');
    const s = (await session.page.evaluate((fr) => {
      const api = (window as any).__SINTESI__;
      return api.control(fr);
    }, f)) as Record<string, number | string | null>;
    const a = (await session.page.evaluate((st) => (window as any).__SINTESI_AUDIO__?.(st) ?? null, s)) as Record<string, number> | null;
    const n = (v: unknown) => (typeof v === 'number' ? v.toFixed(4) : '');
    control.push([f, n(s.t), s.phase ?? '', n(s.phaseProgress), n(s.confidence), n(s.acceptance), n(s.certainty), s.evidence, n(s.relation), n(s.picture), n(s.unsupported), n(s.determination),
      n(a?.events), n(a?.continuity), n(a?.harmonicity), n(a?.pulse), n(a?.fiction), n(a?.level)].join(','));
    const done = f - first + 1;
    if (done % 24 === 0 || f === last - 1) {
      const per = (Date.now() - started) / done / 1000;
      process.stdout.write(`\r  frame ${f + 1}/${last} · ${per.toFixed(2)} s/frame · eta ${Math.round(per * (last - f - 1))} s   `);
    }
  }
  process.stdout.write('\n');
} finally {
  await session.close();
}

let commit = 'unknown';
let dirty = false;
try {
  commit = execSync('git rev-parse HEAD', { cwd: ROOT }).toString().trim();
  dirty = execSync('git status --porcelain -- src shaders archive', { cwd: ROOT }).toString().trim().length > 0;
} catch { /* not a git checkout */ }

writeFileSync(path.join(dir, 'control.csv'), control.join('\n') + '\n');
writeFileSync(
  path.join(dir, 'manifest.json'),
  JSON.stringify({ work: 'SINTESI — Un ritratto di ciò che rimane', ...info, firstFrame: first, lastFrame: last - 1, commit, dirty, renderedAt: new Date().toISOString(), seconds: Math.round((Date.now() - t0) / 1000), frames: hashes }, null, 2),
);
console.log(`frames → ${path.relative(ROOT, framesDir)}`);

if (args['no-video'] !== 'true') exportVideo(dir, { fps: info.fps, final: info.quality === 'final', startNumber: first });
