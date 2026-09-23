import type { Dataset } from '../evidence/types';
import type { Timeline } from '../timeline/timeline';
import { Choreography } from '../core/choreography';
import { Atlas, drawAbsence, drawConcept, drawMap, drawPlan, drawText, drawWaveform, FONT_MONO, FONT_SANS } from './Atlas';

const { TEXT_SIZE, LABEL_SIZE, CONCEPT_SIZE, TITLE_SIZE } = Choreography.sizes;

/** Registers every typographic element of the work in the atlas. */
export function registerAtlasContent(atlas: Atlas, ds: Dataset, timeline: Timeline, seed: number): void {
  const mono = `{px} ${FONT_MONO}`;
  for (const ev of ds.evidence) {
    const text = ev.visualProperties?.text ?? ev.label ?? ev.id;
    if (ev.type === 'photograph' || ev.type === 'texture') {
      const label = ev.label ?? ev.id;
      atlas.add(`label:${ev.id}`, atlas.measure(label, mono, LABEL_SIZE, 0.04), LABEL_SIZE * 1.3, drawText(label, mono, LABEL_SIZE, 0.04, 0.75));
    } else if (ev.type === 'audio') {
      atlas.add(`ev:${ev.id}`, 1.7, 0.42 + LABEL_SIZE * 1.8, drawWaveform(text, seed, ev.id, LABEL_SIZE));
    } else if (ev.type === 'absence') {
      const c = ev.visualProperties?.crop;
      const aspect = c ? (c.w * 9) / (c.h * 16) : 1.4;
      const size = ev.visualProperties?.size ?? 1.5;
      const w = aspect >= 1 ? size : size * aspect;
      atlas.add(`ev:${ev.id}`, w, w / aspect, drawAbsence());
    } else if (ev.type === 'geometry') {
      atlas.add(`ev:${ev.id}`, 1.2, 1.0 + LABEL_SIZE * 1.8, drawPlan(seed, ev.id, LABEL_SIZE));
    } else if (ev.type === 'location') {
      atlas.add(`ev:${ev.id}`, 1.05, 1.05 + LABEL_SIZE * 1.8, drawMap(text, seed, ev.id, LABEL_SIZE));
    } else {
      const size = TEXT_SIZE[ev.type] ?? 0.14;
      atlas.add(`ev:${ev.id}`, atlas.measure(text, mono, size), size * 1.4, drawText(text, mono, size));
    }
  }
  for (const c of ds.concepts) {
    const w = atlas.measure(c.label, mono, CONCEPT_SIZE, 0.12) + CONCEPT_SIZE * 1.3;
    atlas.add(`concept:${c.id}`, w, CONCEPT_SIZE * 1.5, drawConcept(c.label, CONCEPT_SIZE));
  }
  const sans = `300 {px} ${FONT_SANS}`;
  for (const p of timeline.phases) {
    if (!p.title) continue;
    const w = atlas.measure(p.title, sans, TITLE_SIZE, 0.42);
    atlas.add(`title:${p.phase}`, w, TITLE_SIZE * 1.5, drawText(p.title, sans, TITLE_SIZE, 0.42));
  }
}
