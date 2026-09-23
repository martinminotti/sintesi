/**
 * Assemble numbered frames into the master video(s).
 *   npm run export -- renders/<name> [--final]
 * preview/dev → <name>.mp4 (H.264)
 * final       → <name>.mov (ProRes 422 HQ, the archival master) + <name>.mp4 (exhibition player)
 */
import { existsSync, readdirSync, readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { encode } from './lib/ffmpeg';

export function exportVideo(dir: string, opts: { fps: number; final: boolean; startNumber?: number }): void {
  const framesDir = path.join(dir, 'frames');
  const frames = readdirSync(framesDir).filter((f) => f.endsWith('.png')).sort();
  if (!frames.length) throw new Error(`no frames in ${framesDir}`);
  const start = opts.startNumber ?? Number(frames[0].slice(0, 6));
  const name = path.basename(dir);
  const pattern = path.join(framesDir, '%06d.png');
  const mp4 = path.join(dir, `${name}.mp4`);
  encode({ framesPattern: pattern, fps: opts.fps, output: mp4, codec: 'h264', startNumber: start, crf: opts.final ? '12' : '18' });
  console.log(`video → ${mp4}`);
  if (opts.final) {
    const mov = path.join(dir, `${name}.mov`);
    encode({ framesPattern: pattern, fps: opts.fps, output: mov, codec: 'prores', startNumber: start });
    console.log(`master → ${mov}`);
  }
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const dir = path.resolve(process.argv[2] ?? '');
  const manifestPath = path.join(dir, 'manifest.json');
  if (!existsSync(manifestPath)) {
    console.error('usage: npm run export -- renders/<name> [--final]');
    process.exit(1);
  }
  const m = JSON.parse(readFileSync(manifestPath, 'utf8')) as { fps: number; quality: string; firstFrame: number };
  exportVideo(dir, { fps: m.fps, final: process.argv.includes('--final') || m.quality === 'final', startNumber: m.firstFrame });
}
