/**
 * Validation of the work, not only of the code.
 *
 *   npm run validate            static checks + determinism + coherence probe
 *   npm run validate -- --static   static checks only (no browser)
 *
 * 1. Dataset and timelines are consistent.
 * 2. No unseeded randomness or wall-clock time in the render path.
 * 3. Determinism: frames rendered out of order, and in a fresh session, are identical.
 * 4. Coherence law: lowering confidence destroys structure much faster than energy
 *    (confidence ↓ ⇒ coherence ↓, not opacity ↓).
 */
import { createHash } from 'node:crypto';
import { readdirSync, readFileSync, statSync } from 'node:fs';
import path from 'node:path';
import { captureFrame, openEngine, parseArgs, ROOT } from './lib/browser';
import { validateDataset } from '../src/evidence/validate';
import { demoDataset } from '../src/data/demoDataset';
import { study, TIMELINES } from '../src/timeline/timelines';
import { validateTimeline } from '../src/timeline/timeline';
import type { Dataset } from '../src/evidence/types';

const args = parseArgs(process.argv.slice(2));
let failures = 0;
const ok = (msg: string) => console.log(`  ✓ ${msg}`);
const fail = (msg: string) => { failures++; console.log(`  ✗ ${msg}`); };

console.log('dataset');
const userPath = path.join(ROOT, 'archive/metadata/dataset.json');
let dataset: Dataset = demoDataset();
try {
  dataset = JSON.parse(readFileSync(userPath, 'utf8')) as Dataset;
  ok(`using archive/metadata/dataset.json ("${dataset.name}")`);
} catch {
  ok('no archive/metadata/dataset.json — using the synthetic demo archive');
}
const dsErrors = validateDataset(dataset);
dsErrors.length ? dsErrors.forEach(fail) : ok(`${dataset.evidence.length} evidence items, ${dataset.concepts.length} concepts: valid`);

console.log('timelines');
for (const t of Object.values(TIMELINES)) {
  const errs = validateTimeline(t);
  errs.length ? errs.forEach(fail) : ok(`${t.name}: ${t.duration}s, ${t.phases.map((p) => p.phase).join(' → ')}`);
}

console.log('determinism (static)');
const walk = (dir: string): string[] => readdirSync(dir).flatMap((f) => {
  const p = path.join(dir, f);
  return statSync(p).isDirectory() ? walk(p) : [p];
});
const offenders: string[] = [];
for (const file of walk(path.join(ROOT, 'src'))) {
  const src = readFileSync(file, 'utf8').replace(/\/\*[\s\S]*?\*\/|\/\/.*$/gm, '');
  const rel = path.relative(ROOT, file);
  if (/Math\.random\s*\(/.test(src)) offenders.push(`${rel}: Math.random()`);
  // Wall-clock time is allowed only in the live player.
  if (!rel.endsWith('core/player.ts') && /(Date\.now|performance\.now)\s*\(/.test(src)) offenders.push(`${rel}: wall-clock time`);
}
for (const file of walk(path.join(ROOT, 'shaders'))) {
  if (/\bsin\s*\(\s*dot\s*\(/.test(readFileSync(file, 'utf8'))) offenders.push(`${path.relative(ROOT, file)}: sin-hash (GPU-dependent)`);
}
offenders.length ? offenders.forEach(fail) : ok('no unseeded randomness or wall-clock time in the render path');

if (args.static !== 'true') {
  console.log('determinism (rendered, dev quality)');
  const frames = [0, 150, 310, 480];
  const hash = (b: Buffer) => createHash('sha256').update(b).digest('hex').slice(0, 16);
  const a = await openEngine({ quality: 'dev' });
  const forward: string[] = [];
  for (const f of frames) forward.push(hash(await captureFrame(a.page, f)));
  const backward: string[] = [];
  for (const f of [...frames].reverse()) backward.push(hash(await captureFrame(a.page, f)));
  backward.reverse();
  frames.forEach((f, i) => (forward[i] === backward[i] ? ok(`frame ${f} identical out of order (${forward[i]})`) : fail(`frame ${f} differs out of order`)));

  console.log('coherence law');
  const probe = (await a.page.evaluate(() => (window as any).__SINTESI__.probeCoherence())) as { k: number; meanLuma: number; structure: number; layout: number }[];
  for (const p of probe) console.log(`    k ${p.k.toFixed(1)}  energy ${(p.meanLuma * 100).toFixed(0).padStart(3)}%  detail ${(p.structure * 100).toFixed(0).padStart(3)}%  layout ${(p.layout * 100).toFixed(0).padStart(3)}%`);
  const at = (k: number) => probe.find((p) => Math.abs(p.k - k) < 1e-6)!;
  const mid = at(0.4);
  mid.structure < 0.6 ? ok(`structure falls with confidence (k 0.4 → ${(mid.structure * 100).toFixed(0)}%)`) : fail(`structure barely falls at k 0.4 (${mid.structure.toFixed(2)})`);
  mid.meanLuma > 0.6 ? ok(`energy is preserved (k 0.4 → ${(mid.meanLuma * 100).toFixed(0)}%)`) : fail(`image fades instead of losing coherence (energy ${mid.meanLuma.toFixed(2)} at k 0.4)`);
  (1 - mid.structure) > (1 - mid.meanLuma) ? ok('structure is lost faster than energy: coherence ↓, not opacity ↓') : fail('confidence acts like opacity');
  const mono = probe.every((p, i) => i === 0 || p.structure <= probe[i - 1].structure + 0.02);
  mono ? ok('structure decreases monotonically with confidence') : fail('structure is not monotonic in confidence');
  const info = a.info;
  await a.close();

  console.log('the paradox (study timeline)');
  const st = await openEngine({ quality: 'dev', timeline: 'study' });
  const I = study.phases.find((p) => p.phase === 'INFERENCE')!;
  const S = study.phases.find((p) => p.phase === 'SYNTHESIS')!;
  const state = async (t: number) => (await st.page.evaluate((tt) => (window as any).__SINTESI__.state(tt), t)) as { confidence: number; acceptance: number; certainty: number };
  const endI = await state(I.end - 0.05);
  const still = await state(S.start + (S.end - S.start) * 0.8);
  console.log(`    end of INFERENCE   confidence ${endI.confidence.toFixed(2)}  acceptance ${endI.acceptance.toFixed(2)}  certainty ${endI.certainty.toFixed(2)}`);
  console.log(`    SYNTHESIS (still)  confidence ${still.confidence.toFixed(2)}  acceptance ${still.acceptance.toFixed(2)}  certainty ${still.certainty.toFixed(2)}`);
  still.confidence <= endI.confidence + 0.02 ? ok('the picture becomes more certain without becoming more supported') : fail('confidence rises during SYNTHESIS');
  still.confidence < 0.5 ? ok(`confidence stays below 0.5 (${still.confidence.toFixed(2)})`) : fail(`confidence ${still.confidence.toFixed(2)} ≥ 0.5 in SYNTHESIS`);
  still.certainty > 0.95 ? ok(`certainty shown → ${still.certainty.toFixed(2)}`) : fail(`SYNTHESIS is not accepted (certainty ${still.certainty.toFixed(2)})`);

  console.log('loop');
  const lastFrame = Math.round(st.info.duration * st.info.fps) - 1;
  const first = (await st.page.evaluate((f) => (window as any).__SINTESI__.thumbnail(f), 0)) as number[];
  const last = (await st.page.evaluate((f) => (window as any).__SINTESI__.thumbnail(f), lastFrame)) as number[];
  const seam = first.reduce((s, v, i) => s + Math.abs(v - last[i]), 0) / first.length;
  seam < 0.01 ? ok(`last and first frame match (mean difference ${(seam * 100).toFixed(2)} %)`) : fail(`visible seam at the loop (mean difference ${(seam * 100).toFixed(2)} %)`);
  await st.close();

  const b = await openEngine({ quality: 'dev' });
  const fresh = hash(await captureFrame(b.page, frames[2]));
  await b.close();
  fresh === forward[2] ? ok(`frame ${frames[2]} identical in a fresh session`) : fail(`frame ${frames[2]} differs across sessions`);
  console.log(`  (renderer: ${info.renderer}, dataset ${info.datasetHash}, seed ${info.seed})`);
}

console.log(failures ? `\n${failures} check(s) failed` : '\nall checks passed');
process.exit(failures ? 1 : 0);
