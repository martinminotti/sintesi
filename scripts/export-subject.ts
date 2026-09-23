/**
 * Write the procedural subject in the file format of a synthesis session
 * (archive/synthesis/<name>/), so that the file pipeline can be exercised
 * without the author's material.
 *   npx tsx scripts/export-subject.ts [--composition=C] [--quality=dev] [--name=procedural-C]
 */
import { mkdirSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { openEngine, parseArgs, ROOT } from './lib/browser';

const args = parseArgs(process.argv.slice(2));
const composition = args.composition ?? 'C';
const name = args.name ?? `procedural-${composition}`;
const session = await openEngine({ quality: args.quality ?? 'dev', extraParams: { composition } });
try {
  const files = (await session.page.evaluate(() => (window as any).__SINTESI__.exportSubject())) as Record<string, string>;
  const dir = path.join(ROOT, 'archive', 'synthesis', name);
  mkdirSync(dir, { recursive: true });
  for (const [file, url] of Object.entries(files)) writeFileSync(path.join(dir, file), Buffer.from(url.slice(url.indexOf(',') + 1), 'base64'));
  console.log(`${Object.keys(files).length} files → ${path.relative(ROOT, dir)}`);
} finally {
  await session.close();
}
