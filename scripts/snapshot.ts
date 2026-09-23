/**
 * Render single frames at given times, for review.
 *   npm run snapshot -- --t=4,12,22 [--quality=dev] [--view=subject] [--out=renders/snapshots]
 */
import { mkdirSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { captureFrame, openEngine, parseArgs, ROOT } from './lib/browser';

const args = parseArgs(process.argv.slice(2));
const times = (args.t ?? '0').split(',').map(Number);
const out = path.resolve(ROOT, args.out ?? 'renders/snapshots');
mkdirSync(out, { recursive: true });

const extra: Record<string, string> = {};
if (args.view) extra.view = args.view;
const session = await openEngine({
  quality: args.quality ?? 'dev',
  seed: args.seed ? Number(args.seed) : undefined,
  timeline: args.timeline,
  gpu: args.gpu === 'true',
  extraParams: extra,
});
try {
  for (const t of times) {
    const frame = Math.round(t * session.info.fps);
    const png = await captureFrame(session.page, frame);
    const name = `${args.view ?? session.info.timeline}_${session.info.quality}_t${t.toFixed(2)}.png`;
    writeFileSync(path.join(out, name), png);
    console.log(path.relative(ROOT, path.join(out, name)));
  }
} finally {
  await session.close();
}
