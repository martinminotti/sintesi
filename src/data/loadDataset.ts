import { hash32 } from '../core/random';
import type { Dataset } from '../evidence/types';
import { validateDataset } from '../evidence/validate';
import { demoDataset } from './demoDataset';

/**
 * The artistic dataset lives in archive/metadata/dataset.json. While it does
 * not exist, the synthetic demo archive is used, so the engine always runs.
 */
const files = import.meta.glob('../../archive/metadata/dataset.json', { eager: true, import: 'default' }) as Record<string, Dataset>;

export function loadDataset(): Dataset {
  const user = Object.values(files)[0];
  const dataset = user ?? demoDataset;
  const errors = validateDataset(dataset);
  if (errors.length) throw new Error(`Invalid dataset "${dataset.name}":\n  ${errors.join('\n  ')}`);
  return dataset;
}

/** Stable fingerprint of a dataset, recorded in every render manifest. */
export function datasetHash(dataset: Dataset): string {
  return hash32(JSON.stringify(dataset)).toString(16).padStart(8, '0');
}
