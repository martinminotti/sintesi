import type { Dataset, EvidenceType, Provenance } from './types';

const TYPES: EvidenceType[] = ['photograph', 'texture', 'text', 'date', 'coordinates', 'location', 'audio', 'metadata'];
const PROVENANCES: Provenance[] = ['observed', 'derived', 'inferred', 'synthetic'];

export function validateDataset(ds: Dataset): string[] {
  const errors: string[] = [];
  const ids = new Set<string>();
  for (const c of ds.concepts ?? []) {
    if (ids.has(c.id)) errors.push(`duplicate id ${c.id}`);
    ids.add(c.id);
    if (!(c.anchor?.x >= 0 && c.anchor.x <= 1 && c.anchor.y >= 0 && c.anchor.y <= 1)) errors.push(`${c.id}: anchor outside the picture`);
  }
  for (const e of ds.evidence ?? []) {
    if (!e.id) errors.push('evidence without id');
    if (ids.has(e.id)) errors.push(`duplicate id ${e.id}`);
    ids.add(e.id);
  }
  for (const e of ds.evidence ?? []) {
    if (!TYPES.includes(e.type)) errors.push(`${e.id}: unknown type ${e.type}`);
    if (!PROVENANCES.includes(e.provenance)) errors.push(`${e.id}: unknown provenance ${e.provenance}`);
    for (const k of ['confidence', 'semanticWeight'] as const) {
      if (!(typeof e[k] === 'number' && e[k] >= 0 && e[k] <= 1)) errors.push(`${e.id}: ${k} must be in [0, 1]`);
    }
    for (const r of e.relationships ?? []) {
      if (!ids.has(r)) errors.push(`${e.id}: relationship to unknown id ${r}`);
      if (r === e.id) errors.push(`${e.id}: relationship to itself`);
    }
    const vp = e.visualProperties;
    if (e.type === 'photograph' || e.type === 'texture') {
      const c = vp?.crop;
      if (!c) errors.push(`${e.id}: photograph/texture needs visualProperties.crop`);
      else if (c.x < 0 || c.y < 0 || c.w <= 0 || c.h <= 0 || c.x + c.w > 1.0001 || c.y + c.h > 1.0001) errors.push(`${e.id}: crop outside the picture`);
    } else if (!vp?.text) {
      errors.push(`${e.id}: typeset evidence needs visualProperties.text`);
    }
  }
  if ((ds.evidence ?? []).length === 0) errors.push('dataset has no evidence');
  return errors;
}
