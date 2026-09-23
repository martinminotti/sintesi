/**
 * SINTESI — the sound of the work, rendered offline from the score.
 *
 *   npm run audio -- [--timeline=full] [--composition=C] [--out=renders/<name>]
 *
 * The score (per-frame ArtworkState + events detected from the choreography)
 * is read from the engine; the sound is a deterministic function of it and of
 * the seed. Real recordings replace the demo material when present in
 * archive/audio/ (never committed):
 *   <EVIDENCE_ID>.wav   played when that trace is acquired or reappears
 *   REC_07.wav          the signature trace (in the demo: synthesised surf)
 *   room_tone.wav       the room (in the demo: synthesised)
 *
 * More coherence, less evidence: many separate small events while the system
 * holds traces; a continuous, full, "real" sound as acceptance rises — and
 * carries less information; structure lost again when the picture is taken
 * apart; silence.
 */
import { mkdirSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { openEngine, parseArgs, ROOT } from './lib/browser';
import { writeWav24 } from './lib/dsp';
import { renderAudio } from './lib/renderAudio';
import type { Score } from '../src/audio/score';

// ---------------------------------------------------------------- CLI
if (process.argv[1] && path.resolve(process.argv[1]).endsWith(path.join('scripts', 'audio.ts'))) {
  const args = parseArgs(process.argv.slice(2));
  const extra: Record<string, string> = {};
  for (const k of ['composition', 'subject']) if (args[k]) extra[k] = args[k];
  const timeline = args.timeline ?? 'full';
  const session = await openEngine({ quality: 'dev', timeline, extraParams: extra });
  let score: Score;
  try {
    score = (await session.page.evaluate(() => (window as any).__SINTESI__.score())) as Score;
  } finally {
    await session.close();
  }
  const out = path.resolve(ROOT, args.out ?? path.join('renders', `audio-${timeline}`));
  mkdirSync(out, { recursive: true });
  writeFileSync(path.join(out, 'score.json'), JSON.stringify(score));
  const { L, R, report } = renderAudio(score);
  writeWav24(path.join(out, 'audio.wav'), L, R, writeFileSync);
  console.log(`audio → ${path.relative(ROOT, path.join(out, 'audio.wav'))}  ${JSON.stringify(report)}`);
}
