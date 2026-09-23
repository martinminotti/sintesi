/**
 * Global configuration. Everything that changes the output of the work
 * is here or in the timeline/dataset — never hidden in a renderer.
 */

export type QualityName = 'dev' | 'preview' | 'final';

export interface QualityPreset {
  name: QualityName;
  /** Multiplier on the master resolution (2160 × 3840). */
  renderScale: number;
  /** Resolution multiplier of the confidence field relative to the frame. */
  fieldScale: number;
  /** Taps used by the confidence-driven blur. */
  blurTaps: number;
  /** Raymarch steps used to build the demo subject. */
  subjectSteps: number;
  /** Supersampling (per axis) of the demo subject. */
  subjectSupersample: number;
  /** Film grain amount (0 disables). */
  grain: number;
}

export const MASTER = { width: 2160, height: 3840, fps: 24 } as const;

/** Frame space is 9 × 16 world units, origin at the centre. */
export const WORLD = { width: 9, height: 16 } as const;

export const QUALITY: Record<QualityName, QualityPreset> = {
  dev: { name: 'dev', renderScale: 0.25, fieldScale: 0.5, blurTaps: 8, subjectSteps: 72, subjectSupersample: 1, grain: 0.035 },
  preview: { name: 'preview', renderScale: 0.5, fieldScale: 0.35, blurTaps: 12, subjectSteps: 110, subjectSupersample: 2, grain: 0.035 },
  final: { name: 'final', renderScale: 1.0, fieldScale: 0.25, blurTaps: 16, subjectSteps: 160, subjectSupersample: 2, grain: 0.03 },
};

export const DEFAULT_SEED = 1987;

export type Composition = 'A' | 'B' | 'C';
export type Typography = 'none' | 'minimal';

export interface EngineConfig {
  seed: number;
  /** Scene study: A portrait · B environment · C figure + environment. */
  composition: Composition;
  /** 'none': no titles, labels or concept names (the default); 'minimal': milestone-1 typography. */
  typography: Typography;
  /** A synthesis session folder in archive/synthesis/ (e.g. 'session-01'); absent: the procedural demo subject. */
  subject?: string;
  quality: QualityPreset;
  fps: number;
  timeline: string;
  width: number;
  height: number;
}

export function makeConfig(opts: { seed?: number; quality?: QualityName; timeline?: string; composition?: Composition; typography?: Typography; subject?: string } = {}): EngineConfig {
  const quality = QUALITY[opts.quality ?? 'dev'];
  return {
    seed: opts.seed ?? DEFAULT_SEED,
    composition: opts.composition ?? 'C',
    typography: opts.typography ?? 'none',
    subject: opts.subject,
    quality,
    fps: MASTER.fps,
    timeline: opts.timeline ?? 'prototype',
    width: Math.round(MASTER.width * quality.renderScale),
    height: Math.round(MASTER.height * quality.renderScale),
  };
}
