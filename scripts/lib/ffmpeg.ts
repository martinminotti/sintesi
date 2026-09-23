import { spawnSync } from 'node:child_process';
import { createRequire } from 'node:module';

/** System ffmpeg if available (usually better codecs), else the bundled ffmpeg-static. */
export function findFfmpeg(): string {
  const env = process.env.FFMPEG_PATH;
  if (env) return env;
  const probe = spawnSync('ffmpeg', ['-version'], { stdio: 'ignore' });
  if (probe.status === 0) return 'ffmpeg';
  try {
    const bundled = createRequire(import.meta.url)('ffmpeg-static') as string | null;
    if (bundled) return bundled;
  } catch {
    /* not installed */
  }
  throw new Error('FFmpeg not found: install ffmpeg, or `npm install ffmpeg-static`, or set FFMPEG_PATH.');
}

export interface EncodeJob {
  framesPattern: string;
  fps: number;
  output: string;
  codec: 'h264' | 'prores';
  startNumber?: number;
  crf?: string;
}

export function encode(job: EncodeJob): void {
  const ffmpeg = findFfmpeg();
  const input = ['-y', '-loglevel', 'error', '-framerate', String(job.fps), '-start_number', String(job.startNumber ?? 0), '-i', job.framesPattern];
  const codec =
    job.codec === 'prores'
      ? ['-c:v', 'prores_ks', '-profile:v', '3', '-pix_fmt', 'yuv422p10le', '-vendor', 'apl0']
      : ['-c:v', 'libx264', '-preset', 'slow', '-crf', job.crf ?? '16', '-pix_fmt', 'yuv420p', '-tune', 'grain', '-movflags', '+faststart'];
  const color = ['-color_primaries', 'bt709', '-color_trc', 'bt709', '-colorspace', 'bt709'];
  const res = spawnSync(ffmpeg, [...input, ...codec, ...color, '-r', String(job.fps), job.output], { stdio: 'inherit' });
  if (res.status !== 0) throw new Error(`ffmpeg failed for ${job.output}`);
}
