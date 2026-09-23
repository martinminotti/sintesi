import type { Composition } from '../config';
import type { Concept, Dataset, Evidence } from '../evidence/types';

/**
 * DEMO ARCHIVE — deliberately incomplete traces of a person who does not exist.
 *
 * Strongly documented: the window, one eye, the cup, the date.
 * Partially documented: the coat (texture, collar — never its colour), the face.
 * Not documented at all (ABSENCE): what the person was looking at, what was
 * outside, what happened before and after.
 *
 * Photographs are crops of the procedural subject's ARCHIVE version. Crops
 * depend on the composition studied (A portrait · B environment · C figure).
 * Replace with archive/metadata/dataset.json for the real work.
 */

type Crop = [number, number, number, number];
type CropTable = Record<string, Crop>;

const CROPS: Record<Composition, CropTable> = {
  C: {
    IMG_0412: [0.48, 0.405, 0.16, 0.05], // an eye, looking down
    IMG_0418: [0.69, 0.37, 0.1, 0.06], // an ear
    IMG_0433: [0.5, 0.455, 0.14, 0.06], // nose, lips
    IMG_0437: [0.5, 0.28, 0.24, 0.06], // hair
    IMG_0421: [0.04, 0.08, 0.3, 0.09], // window, transom
    IMG_0427: [0.0, 0.52, 0.3, 0.06], // window sill
    IMG_0440: [0.52, 0.55, 0.26, 0.07], // neck, collar
    IMG_0446: [0.04, 0.86, 0.24, 0.1], // a cup
    IMG_0451: [0.78, 0.41, 0.2, 0.08], // empty wall
    IMG_0455: [0.34, 0.81, 0.3, 0.06], // table edge, coat hem
    TEX_01: [0.75, 0.68, 0.06, 0.035],
    TEX_02: [0.84, 0.24, 0.07, 0.04], // bare plaster, where the system will hang a frame
    TEX_03: [0.55, 0.9, 0.08, 0.045],
    ABS_01: [0.44, 0.35, 0.2, 0.09], // what the person was looking at
    ABS_02: [0.03, 0.15, 0.35, 0.34], // what was outside
  },
  A: {
    IMG_0412: [0.36, 0.45, 0.22, 0.05],
    IMG_0418: [0.74, 0.36, 0.12, 0.08],
    IMG_0433: [0.44, 0.53, 0.18, 0.07],
    IMG_0437: [0.4, 0.17, 0.35, 0.08],
    IMG_0421: [0.0, 0.02, 0.24, 0.12],
    IMG_0427: [0.0, 0.56, 0.26, 0.05],
    IMG_0440: [0.5, 0.68, 0.3, 0.07],
    IMG_0446: [0.08, 0.76, 0.26, 0.08], // (the cup is out of frame: a shoulder)
    IMG_0451: [0.78, 0.3, 0.2, 0.08],
    IMG_0455: [0.22, 0.69, 0.4, 0.04],
    TEX_01: [0.7, 0.85, 0.06, 0.035],
    TEX_02: [0.76, 0.2, 0.07, 0.04],
    TEX_03: [0.1, 0.69, 0.08, 0.02],
    ABS_01: [0.33, 0.33, 0.22, 0.09],
    ABS_02: [0.0, 0.05, 0.2, 0.5],
  },
  B: {
    IMG_0412: [0.4, 0.5, 0.2, 0.06], // the collar of the coat, on the chair
    IMG_0418: [0.78, 0.5, 0.14, 0.06],
    IMG_0433: [0.5, 0.58, 0.2, 0.07],
    IMG_0437: [0.6, 0.52, 0.18, 0.05],
    IMG_0421: [0.1, 0.09, 0.36, 0.08],
    IMG_0427: [0.02, 0.44, 0.5, 0.05],
    IMG_0440: [0.4, 0.62, 0.3, 0.06],
    IMG_0446: [0.1, 0.68, 0.2, 0.08],
    IMG_0451: [0.66, 0.3, 0.3, 0.1],
    IMG_0455: [0.3, 0.85, 0.4, 0.06],
    TEX_01: [0.6, 0.6, 0.06, 0.035],
    TEX_02: [0.86, 0.2, 0.07, 0.04],
    TEX_03: [0.5, 0.92, 0.08, 0.045],
    ABS_01: [0.35, 0.5, 0.42, 0.16], // who sat here
    ABS_02: [0.1, 0.13, 0.36, 0.3],
  },
};

const CONCEPTS: Record<Composition, Concept[]> = {
  C: [
    { id: 'PERSON', label: 'PERSON', anchor: { x: 0.56, y: 0.38 } },
    { id: 'PLACE', label: 'PLACE', anchor: { x: 0.2, y: 0.22 } },
    { id: 'OBJECT', label: 'OBJECT', anchor: { x: 0.2, y: 0.82 } },
    { id: 'DATE', label: 'DATE', anchor: { x: 0.76, y: 0.66 } },
  ],
  A: [
    { id: 'PERSON', label: 'PERSON', anchor: { x: 0.5, y: 0.42 } },
    { id: 'PLACE', label: 'PLACE', anchor: { x: 0.12, y: 0.22 } },
    { id: 'OBJECT', label: 'OBJECT', anchor: { x: 0.25, y: 0.78 } },
    { id: 'DATE', label: 'DATE', anchor: { x: 0.78, y: 0.66 } },
  ],
  B: [
    { id: 'PERSON', label: 'PERSON', anchor: { x: 0.6, y: 0.56 } },
    { id: 'PLACE', label: 'PLACE', anchor: { x: 0.28, y: 0.22 } },
    { id: 'OBJECT', label: 'OBJECT', anchor: { x: 0.22, y: 0.74 } },
    { id: 'DATE', label: 'DATE', anchor: { x: 0.78, y: 0.4 } },
  ],
};

export function demoDataset(composition: Composition = 'C'): Dataset {
  const crops = CROPS[composition];
  const crop = (id: string) => {
    const c = crops[id];
    return { x: c[0], y: c[1], w: c[2], h: c[3] };
  };
  const photo = (id: string, confidence: number, semanticWeight: number, relationships: string[], size = 1.9): Evidence => ({
    id, type: 'photograph', source: 'subject:observed', provenance: 'observed', label: id,
    confidence, semanticWeight, relationships, visualProperties: { crop: crop(id), size },
  });
  const texture = (id: string, confidence: number, relationships: string[]): Evidence => ({
    ...photo(id, confidence, 0.35, relationships, 0.9), type: 'texture', provenance: 'derived',
  });
  const typeset = (id: string, type: Evidence['type'], text: string, source: string, provenance: Evidence['provenance'], confidence: number, semanticWeight: number, relationships: string[]): Evidence => ({
    id, type, source, provenance, confidence, semanticWeight, relationships, visualProperties: { text },
  });
  const absence = (id: string, text: string, relationships: string[], withCrop: boolean): Evidence => ({
    id, type: 'absence', source: 'archive', provenance: 'observed', confidence: 0.9, semanticWeight: 0.6, relationships,
    visualProperties: { text, size: 1.5, ...(withCrop ? { crop: crop(id) } : {}) },
  });

  const evidence: Evidence[] = [
    photo('IMG_0412', 0.97, 0.95, ['PERSON', 'IMG_0418', 'IMG_0433']),
    photo('IMG_0418', 0.9, 0.8, ['PERSON', 'IMG_0412']),
    photo('IMG_0433', 0.82, 0.85, ['PERSON', 'IMG_0412']),
    photo('IMG_0437', 0.7, 0.5, ['PERSON', 'IMG_0418']),
    photo('IMG_0421', 0.95, 0.6, ['PLACE', 'IMG_0427', 'TXT_03']),
    photo('IMG_0427', 0.86, 0.45, ['PLACE', 'IMG_0421']),
    photo('IMG_0440', 0.93, 0.7, ['PERSON', 'TXT_02', 'TEX_01']),
    photo('IMG_0446', 0.96, 0.55, ['OBJECT', 'TXT_04']),
    photo('IMG_0451', 0.74, 0.2, ['PLACE']),
    photo('IMG_0455', 0.66, 0.4, ['OBJECT', 'PERSON']),

    texture('TEX_01', 0.84, ['PERSON', 'IMG_0440']),
    texture('TEX_02', 0.8, ['PLACE']),
    texture('TEX_03', 0.77, ['OBJECT']),

    typeset('TXT_01', 'text', '“aveva la voce bassa”', 'testimony/A', 'observed', 0.8, 0.7, ['PERSON', 'REC_03']),
    typeset('TXT_02', 'text', '“non ricordo il colore del cappotto”', 'testimony/B', 'observed', 0.72, 0.75, ['PERSON', 'IMG_0440']),
    typeset('TXT_03', 'text', '“sedeva sempre vicino alla finestra”', 'testimony/A', 'observed', 0.85, 0.8, ['PERSON', 'PLACE', 'IMG_0421']),
    typeset('TXT_04', 'text', '“una tazza, credo. o un bicchiere.”', 'testimony/C', 'observed', 0.5, 0.5, ['OBJECT', 'IMG_0446']),
    typeset('TXT_05', 'text', '“la luce entrava solo il pomeriggio”', 'testimony/B', 'observed', 0.68, 0.45, ['PLACE', 'DATE']),
    typeset('TXT_06', 'text', '[illeggibile]', 'letter/1991', 'observed', 0.18, 0.3, ['PERSON']),

    typeset('DAT_01', 'date', '14.06.1987', 'print verso', 'observed', 0.95, 0.6, ['DATE', 'IMG_0412']),
    typeset('DAT_02', 'date', '1987-06-14  16:42', 'negative sleeve', 'derived', 0.8, 0.5, ['DATE', 'TXT_05']),
    typeset('DAT_03', 'date', '06 / 1987 ?', 'handwriting', 'observed', 0.55, 0.35, ['DATE']),
    typeset('DAT_05', 'date', '1991-02-··', 'letter/1991', 'observed', 0.3, 0.25, ['DATE', 'TXT_06']),

    typeset('GEO_02', 'coordinates', '45.47° N   9.18° E', 'negative sleeve', 'derived', 0.78, 0.55, ['PLACE', 'GEO_01']),
    typeset('GEO_01', 'geometry', 'plan', 'survey', 'derived', 0.7, 0.4, ['PLACE', 'GEO_02', 'IMG_0421']),
    typeset('LOC_A', 'location', 'LOC_A', 'survey map', 'derived', 0.7, 0.4, ['PLACE', 'GEO_02']),

    typeset('REC_03', 'audio', 'REC_03   00:14', 'cassette', 'observed', 0.74, 0.65, ['PERSON', 'TXT_01']),
    // A few seconds of surf on the other side of the same cassette.
    typeset('REC_07', 'audio', 'REC_07   00:02', 'cassette', 'observed', 0.4, 0.3, ['PLACE']),

    typeset('MET_01', 'metadata', 'f/2.8   1/60 s   ISO 400', 'exif (scan)', 'derived', 0.88, 0.25, ['IMG_0412', 'DATE']),
    typeset('MET_02', 'metadata', 'TRI-X 400   FRAME 23', 'negative edge', 'observed', 0.92, 0.3, ['IMG_0440', 'DATE']),
    typeset('MET_03', 'metadata', 'verso:  «per M.»', 'print verso', 'observed', 0.6, 0.4, ['IMG_0421', 'PERSON']),

    absence('ABS_01', 'cosa stava guardando', ['PERSON', 'IMG_0412'], true),
    absence('ABS_02', 'fuori dalla finestra', ['PLACE', 'IMG_0421'], true),
    absence('ABS_03', 'prima, dopo', ['DATE'], false),
  ];

  return { name: `demo-${composition}`, residue: 'IMG_0412', evidence, concepts: CONCEPTS[composition] };
}
