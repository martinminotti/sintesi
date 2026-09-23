import type { Concept, Dataset, Evidence } from '../evidence/types';

/**
 * DEMO ARCHIVE — synthetic traces of a person who does not exist.
 *
 * No real person's data is used. Photographs are crops of the procedural
 * demo subject ('subject:observed'); texts, dates and places are written
 * for the work. Replace with archive/metadata/dataset.json for the real piece.
 *
 * Crops are in normalised picture space (origin top-left, 9:16 frame).
 */

const concepts: Concept[] = [
  { id: 'PERSON', label: 'PERSON', anchor: { x: 0.56, y: 0.36 } },
  { id: 'PLACE', label: 'PLACE', anchor: { x: 0.22, y: 0.2 } },
  { id: 'OBJECT', label: 'OBJECT', anchor: { x: 0.3, y: 0.78 } },
  { id: 'DATE', label: 'DATE', anchor: { x: 0.74, y: 0.66 } },
];

const photo = (
  id: string,
  label: string,
  crop: [number, number, number, number],
  confidence: number,
  semanticWeight: number,
  relationships: string[],
  size = 1.9,
): Evidence => ({
  id,
  type: 'photograph',
  source: 'subject:observed',
  provenance: 'observed',
  label,
  confidence,
  semanticWeight,
  relationships,
  visualProperties: { crop: { x: crop[0], y: crop[1], w: crop[2], h: crop[3] }, size },
});

const texture = (id: string, label: string, crop: [number, number, number, number], confidence: number, relationships: string[]): Evidence => ({
  ...photo(id, label, crop, confidence, 0.35, relationships, 0.9),
  type: 'texture',
  provenance: 'derived',
});

const typeset = (
  id: string,
  type: Evidence['type'],
  text: string,
  source: string,
  provenance: Evidence['provenance'],
  confidence: number,
  semanticWeight: number,
  relationships: string[],
): Evidence => ({ id, type, source, provenance, confidence, semanticWeight, relationships, visualProperties: { text } });

const evidence: Evidence[] = [
  // Photographs: fragments of prints, scans, contact sheets.
  photo('IMG_0412', 'IMG_0412', [0.47, 0.375, 0.13, 0.055], 0.97, 0.95, ['PERSON', 'IMG_0418', 'IMG_0433']), // an eye
  photo('IMG_0418', 'IMG_0418', [0.66, 0.36, 0.1, 0.075], 0.9, 0.8, ['PERSON', 'IMG_0412']), // an ear
  photo('IMG_0433', 'IMG_0433', [0.43, 0.43, 0.13, 0.06], 0.82, 0.85, ['PERSON', 'IMG_0412']), // nose, lips
  photo('IMG_0437', 'IMG_0437', [0.53, 0.27, 0.2, 0.055], 0.7, 0.5, ['PERSON', 'IMG_0418']), // hair
  photo('IMG_0421', 'IMG_0421', [0.05, 0.06, 0.28, 0.1], 0.95, 0.6, ['PLACE', 'IMG_0427', 'TXT_03']), // window, transom
  photo('IMG_0427', 'IMG_0427', [0.0, 0.5, 0.3, 0.07], 0.86, 0.45, ['PLACE', 'IMG_0421']), // window sill
  photo('IMG_0440', 'IMG_0440', [0.52, 0.53, 0.28, 0.07], 0.93, 0.7, ['PERSON', 'TXT_02', 'TEX_01']), // neck, collar
  photo('IMG_0446', 'IMG_0446', [0.04, 0.85, 0.24, 0.1], 0.96, 0.55, ['OBJECT', 'TXT_04']), // a cup
  photo('IMG_0451', 'IMG_0451', [0.78, 0.41, 0.2, 0.08], 0.74, 0.2, ['PLACE']), // empty wall
  photo('IMG_0455', 'IMG_0455', [0.34, 0.81, 0.3, 0.06], 0.66, 0.4, ['OBJECT', 'PERSON']), // table edge, coat hem

  // Material details: extreme enlargements.
  texture('TEX_01', 'TEX_01', [0.75, 0.68, 0.06, 0.035], 0.84, ['PERSON', 'IMG_0440']), // coat wool
  texture('TEX_02', 'TEX_02', [0.855, 0.24, 0.07, 0.04], 0.8, ['PLACE']), // plaster — where the system will hang a frame
  texture('TEX_03', 'TEX_03', [0.55, 0.9, 0.08, 0.045], 0.77, ['OBJECT']), // wood grain

  // Testimony, transcribed.
  typeset('TXT_01', 'text', '“aveva la voce bassa”', 'testimony/A', 'observed', 0.8, 0.7, ['PERSON', 'REC_03']),
  typeset('TXT_02', 'text', '“non ricordo il colore del cappotto”', 'testimony/B', 'observed', 0.72, 0.75, ['PERSON', 'IMG_0440']),
  typeset('TXT_03', 'text', '“sedeva sempre vicino alla finestra”', 'testimony/A', 'observed', 0.85, 0.8, ['PERSON', 'PLACE', 'IMG_0421']),
  typeset('TXT_04', 'text', '“una tazza, credo. o un bicchiere.”', 'testimony/C', 'observed', 0.5, 0.5, ['OBJECT', 'IMG_0446']),
  typeset('TXT_05', 'text', '“la luce entrava solo il pomeriggio”', 'testimony/B', 'observed', 0.68, 0.45, ['PLACE', 'DATE']),
  typeset('TXT_06', 'text', '[illeggibile]', 'letter/1991', 'observed', 0.18, 0.3, ['PERSON']),

  // Time.
  typeset('DAT_01', 'date', '14.06.1987', 'print verso', 'observed', 0.95, 0.6, ['DATE', 'IMG_0412']),
  typeset('DAT_02', 'date', '1987-06-14  16:42', 'negative sleeve', 'derived', 0.8, 0.5, ['DATE', 'TXT_05']),
  typeset('DAT_03', 'date', '06 / 1987 ?', 'handwriting', 'observed', 0.55, 0.35, ['DATE']),
  typeset('DAT_04', 'date', 'ca. 1990', 'testimony/C', 'inferred', 0.35, 0.3, ['DATE', 'TXT_04']),
  typeset('DAT_05', 'date', '1991-02-··', 'letter/1991', 'observed', 0.3, 0.25, ['DATE', 'TXT_06']),

  // Place.
  typeset('GEO_01', 'coordinates', '45.47° N   9.18° E', 'negative sleeve', 'derived', 0.78, 0.55, ['PLACE', 'LOC_A']),
  typeset('GEO_02', 'coordinates', '45.4° N   9.1° E   ± 2 km', 'testimony/A', 'inferred', 0.45, 0.35, ['PLACE']),
  typeset('LOC_A', 'location', 'LOC_A', 'survey map', 'derived', 0.7, 0.4, ['PLACE', 'GEO_01']),
  typeset('LOC_B', 'location', 'LOC_B', 'survey map', 'derived', 0.42, 0.2, ['PLACE']),

  // Sound.
  typeset('REC_03', 'audio', 'REC_03   00:14', 'cassette', 'observed', 0.74, 0.65, ['PERSON', 'TXT_01']),
  typeset('REC_07', 'audio', 'REC_07   00:02', 'cassette', 'observed', 0.4, 0.3, ['PLACE']),

  // Technical traces.
  typeset('MET_01', 'metadata', 'f/2.8   1/60 s   ISO 400', 'exif (scan)', 'derived', 0.88, 0.25, ['IMG_0412', 'DATE']),
  typeset('MET_02', 'metadata', 'TRI-X 400   FRAME 23', 'negative edge', 'observed', 0.92, 0.3, ['IMG_0440', 'DATE']),
  typeset('MET_03', 'metadata', 'SCAN 2400 DPI   8 BIT', 'scanner', 'derived', 0.99, 0.1, ['IMG_0421']),
];

export const demoDataset: Dataset = { name: 'demo', evidence, concepts };
