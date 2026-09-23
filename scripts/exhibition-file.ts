/**
 * The exhibition file: N cycles of the master concatenated without re-encoding,
 * so that a player's loop point (often a black frame or a pause) occurs once
 * every N × 3′30″ instead of every cycle.
 *   npm run exhibition -- renders/<name>/<name>.mp4 [--cycles=10]
 */
import { spawnSync } from 'node:child_process';
import { existsSync, unlinkSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { parseArgs } from './lib/browser';
import { findFfmpeg } from './lib/ffmpeg';

const args = parseArgs(process.argv.slice(2));
const input = path.resolve(args._ ?? '');
if (!existsSync(input)) {
  console.error('usage: npm run exhibition -- renders/<name>/<name>.mp4 [--cycles=10]');
  process.exit(1);
}
const cycles = Number(args.cycles ?? 10);
const list = `${input}.concat.txt`;
writeFileSync(list, Array.from({ length: cycles }, () => `file '${input.replace(/'/g, "'\\''")}'`).join('\n') + '\n');
const output = input.replace(/\.mp4$/, `_x${cycles}.mp4`);
const res = spawnSync(findFfmpeg(), ['-y', '-loglevel', 'error', '-f', 'concat', '-safe', '0', '-i', list, '-c', 'copy', '-movflags', '+faststart', output], { stdio: 'inherit' });
unlinkSync(list);
if (res.status !== 0) process.exit(1);
console.log(`exhibition file → ${output}`);
