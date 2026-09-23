/**
 * The audio renderer: a deterministic function of the score and the seed.
 * See scripts/audio.ts for the design.
 */
import { existsSync, readFileSync } from 'node:fs';
import path from 'node:path';
import { Biquad, noise, panGains, Pink, readWavMono, SR, stereo } from './dsp';
import { createRng, hashFloat } from '../../src/core/random';
import type { Score, ScoreFrame } from '../../src/audio/score';

const ROOT = path.resolve(path.dirname(new URL(import.meta.url).pathname), '../..');
const SIGNATURE_ID = 'REC_07';
const DEFAULT_AUDIO_DIR = path.join(ROOT, 'archive', 'audio');

let AUDIO_DIR = DEFAULT_AUDIO_DIR;

function sample(id: string): Float32Array | null {
  const f = path.join(AUDIO_DIR, `${id}.wav`);
  return existsSync(f) ? readWavMono(readFileSync(f)) : null;
}

/** Linear interpolation of a per-frame control at sample i. */
function control(frames: ScoreFrame[], fps: number) {
  return (key: keyof ScoreFrame, i: number): number => {
    const x = (i / SR) * fps;
    const a = Math.min(frames.length - 1, Math.floor(x));
    const b = Math.min(frames.length - 1, a + 1);
    const u = x - a;
    return (frames[a][key] as number) * (1 - u) + (frames[b][key] as number) * u;
  };
}

export function renderAudio(score: Score, opts: { audioDir?: string } = {}): { L: Float32Array; R: Float32Array; report: Record<string, number> } {
  AUDIO_DIR = opts.audioDir ?? DEFAULT_AUDIO_DIR;
  const n = Math.round(score.duration * SR);
  const [L, R] = stereo(n);
  const c = control(score.frames, score.fps);
  const seed = score.seed;
  const add = (i: number, v: number, x = 0) => {
    if (i < 0 || i >= n) return;
    const [gl, gr] = panGains(x);
    L[i] += v * gl;
    R[i] += v * gr;
  };

  // ---------------------------------------------------------------- continuous layers
  const hiss = noise(seed, 'hiss');
  const hissHP = new Biquad('hp', 3200), hissLP = new Biquad('lp', 9000);
  const roomSample = sample('room_tone');
  const roomPink = new Pink(createRng(seed, 'room'));
  const roomLP = new Biquad('lp', 520), roomLP2 = new Biquad('lp', 900);
  const surfSample = sample(SIGNATURE_ID);
  const surfPink = new Pink(createRng(seed, 'surf'));
  const surfBP = new Biquad('bp', 700, 0.5), foamHP = new Biquad('hp', 2500);
  const gateRng = createRng(seed, 'gate');
  let gate = 1, gateTarget = 1, gateNext = 0;
  // Absences duck the hiss: a silence where a trace should be.
  const ducks: { i: number; len: number }[] = [];
  for (const e of score.events) if (e.kind === 'trace' && e.type === 'absence') ducks.push({ i: Math.round(e.t * SR), len: Math.round(0.9 * SR) });

  for (let i = 0; i < n; i++) {
    const t = i / SR;
    const evidence = c('evidence', i), picture = c('picture', i), acceptance = c('acceptance', i);
    const certainty = c('certainty', i), presence = c('presence', i), outside = c('outside', i);

    // The archive as a medium: tape hiss while traces exist and no picture yet.
    let duck = 1;
    for (const d of ducks) if (i >= d.i && i < d.i + d.len) duck = Math.min(duck, Math.pow((i - d.i) / d.len * 2 - 1, 2));
    const hissLevel = 0.0045 * Math.min(1, evidence / 8) * (1 - picture) * duck;
    if (hissLevel > 0) {
      const h = hissLP.run(hissHP.run(hiss())) * hissLevel;
      L[i] += h; R[i] += h * 0.94;
    }

    // The room: continuous in proportion to certainty; granular when certainty is low.
    if (i >= gateNext) {
      gateTarget = gateRng.next() < 0.25 + 0.75 * certainty * certainty ? 1 : 0;
      gateNext = i + Math.round((0.04 + 0.2 * gateRng.next()) * SR);
    }
    gate += (gateTarget - gate) * 0.002;
    const roomLevel = 0.05 * picture * presence * (0.2 + 0.8 * acceptance) * gate;
    if (roomLevel > 1e-5) {
      const src = roomSample ? roomSample[i % roomSample.length] * 2 : roomLP2.run(roomLP.run(roomPink.next()));
      // A low, almost physical resonance of the room, only once it is accepted.
      const hum = (Math.sin(2 * Math.PI * 49 * t) + 0.6 * Math.sin(2 * Math.PI * 98.7 * t)) * 0.06 * acceptance * acceptance;
      const v = (src + hum) * roomLevel;
      L[i] += v; R[i] += v * 0.97;
    }

    // The signature trace, as the synthesis uses it: the view outside, made sound.
    if (outside > 1e-4) {
      let v: number;
      if (surfSample) {
        v = surfSample[i % surfSample.length];
      } else {
        const swell = Math.pow(0.5 + 0.5 * Math.sin(2 * Math.PI * t / 7.3 + 1.7 * Math.sin(t * 0.21)), 2.2);
        const body = surfBP.run(surfPink.next()) * (0.35 + 0.65 * swell);
        v = body + foamHP.run(surfPink.next()) * 0.25 * swell * swell;
      }
      const level = 0.09 * outside;
      L[i] += v * level; R[i] += v * level * 0.9;
    }
  }

  // ---------------------------------------------------------------- events
  const clickNoise = noise(seed, 'clicks');
  const FREQ: Record<string, number> = {
    photograph: 520, texture: 700, text: 1400, date: 1800, coordinates: 1600, location: 900,
    audio: 300, metadata: 2200, geometry: 1100,
  };

  const click = (t: number, freq: number, amp: number, sharp: number, x: number, reverse = false) => {
    const bp = new Biquad('bp', freq, 10);
    const lp = new Biquad('lp', 1200 + 9000 * sharp);
    const burst = Math.round((0.0015 + 0.008 * (1 - sharp)) * SR);
    const len = Math.round((0.06 + 0.16 * sharp) * SR);
    const start = Math.round(t * SR);
    for (let k = 0; k < len; k++) {
      const exc = k < burst ? clickNoise() * (1 - k / burst) : 0;
      let v = lp.run(exc * 0.6 + bp.run(exc) * 3.0);
      const env = reverse ? Math.pow(k / len, 3) : 1;
      v *= env;
      add(start + (reverse ? len - k : k), v * amp, x);
    }
  };

  const playSample = (t: number, s: Float32Array, seconds: number, amp: number, x: number, cassette: boolean) => {
    const start = Math.round(t * SR), len = Math.min(s.length, Math.round(seconds * SR));
    const hp = new Biquad('hp', cassette ? 350 : 60), lp = new Biquad('lp', cassette ? 3000 : 12000);
    for (let k = 0; k < len; k++) {
      const env = Math.min(1, k / (0.05 * SR)) * Math.min(1, (len - k) / (0.4 * SR));
      add(start + k, lp.run(hp.run(s[k])) * amp * env, x);
    }
  };

  const synthSurf = (seconds: number): Float32Array => {
    const out = new Float32Array(Math.round(seconds * SR));
    const p = new Pink(createRng(seed, 'surf-trace'));
    const bp = new Biquad('bp', 700, 0.5);
    for (let k = 0; k < out.length; k++) {
      const tt = k / SR;
      out[k] = bp.run(p.next()) * (0.4 + 0.6 * Math.pow(0.5 + 0.5 * Math.sin(2 * Math.PI * tt / 3.1), 2));
    }
    return out;
  };

  const counts = { trace: 0, relation: 0, arrival: 0, source: 0, loss: 0 };
  for (const e of score.events) {
    counts[e.kind]++;
    if (e.kind === 'trace') {
      if (e.type === 'absence') continue; // an absence is heard as a silence (see ducks)
      const s = e.type === 'audio' ? sample(e.id) : null;
      if (s) playSample(e.t, s, 1.4, 0.35, e.x, true);
      click(e.t, FREQ[e.type] ?? 1000, 0.12 * Math.sqrt(e.confidence), e.confidence, e.x);
    } else if (e.kind === 'relation') {
      // Strong relations consonant (a fifth), weak ones beating.
      const f0 = 98 * Math.pow(2, Math.floor(hashFloat(seed, 'rel', e.t) * 12) / 12);
      const ratio = e.strength > 0.45 ? 1.5 : 1.47;
      const start = Math.round(e.t * SR), len = Math.round(2.6 * SR);
      for (let k = 0; k < len; k++) {
        const tt = k / SR;
        const env = Math.min(1, tt / 0.02) * Math.exp(-tt * 1.6);
        add(start + k, (Math.sin(2 * Math.PI * f0 * tt) + 0.6 * Math.sin(2 * Math.PI * f0 * ratio * tt)) * env * 0.0035 * (0.4 + 0.6 * e.strength), e.x);
      }
    } else if (e.kind === 'arrival') {
      // A trace set down in its place.
      const start = Math.round(e.t * SR), len = Math.round(0.25 * SR);
      let ph = 0;
      for (let k = 0; k < len; k++) {
        const tt = k / SR;
        ph += (2 * Math.PI * (72 - 24 * tt / 0.25)) / SR;
        add(start + k, Math.sin(ph) * Math.exp(-tt * 18) * 0.06, e.x * 0.5);
      }
    } else if (e.kind === 'source') {
      if (e.type === 'audio') {
        // The trace the view was made from, back in its own form: small, dry, a cassette.
        const s = sample(e.id) ?? synthSurf(3.2);
        playSample(e.t, s, 3.2, 0.32, 0, true);
      } else {
        click(e.t, FREQ[e.type] ?? 900, 0.05, 0.6, e.x);
      }
    } else if (e.kind === 'loss') {
      click(e.t, 520, 0.05, 0.4, e.x, true);
    }
  }

  // ---------------------------------------------------------------- the grains of INFERENCE
  // Proposals: short grains of filtered noise that search, denser as the system proposes.
  const grainRng = createRng(seed, 'grains');
  for (let i = 0; i < n;) {
    const density = 22 * c('proposal', i) * (1 - c('acceptance', i)) * c('picture', i);
    if (density < 0.05) { i += Math.round(0.05 * SR); continue; }
    const len = Math.round((0.04 + 0.08 * grainRng.next()) * SR);
    const f = 300 * Math.pow(9, grainRng.next());
    const bp = new Biquad('bp', f, 4);
    const x = grainRng.next() * 1.6 - 0.8;
    for (let k = 0; k < len; k++) {
      const env = Math.sin((Math.PI * k) / len);
      add(i + k, bp.run(grainRng.next() * 2 - 1) * env * 0.035, x);
    }
    i += Math.round((-Math.log(1 - grainRng.next() * 0.999) / density) * SR);
  }

  // ---------------------------------------------------------------- master
  // Loudness normalised deterministically (RMS of the active part), soft ceiling at -1 dBFS.
  let sum = 0, cnt = 0;
  for (let i = 0; i < n; i += 4) {
    const m = (L[i] + R[i]) / 2;
    if (Math.abs(m) > 1e-5) { sum += m * m; cnt++; }
  }
  const rms = Math.sqrt(sum / Math.max(1, cnt));
  // Calibrated so that the full cycle measures ≈ −23 LUFS integrated (EBU R128, gallery).
  const target = Math.pow(10, -25.1 / 20);
  const gain = rms > 0 ? target / rms : 1;
  const ceiling = Math.pow(10, -1 / 20);
  let peak = 0;
  for (let i = 0; i < n; i++) {
    for (const ch of [L, R]) {
      const v = ch[i] * gain;
      ch[i] = ceiling * Math.tanh(v / ceiling);
      peak = Math.max(peak, Math.abs(ch[i]));
    }
  }
  return { L, R, report: { ...counts, gainDb: 20 * Math.log10(gain), peakDb: 20 * Math.log10(peak), surfFromFile: surfSample ? 1 : 0, roomFromFile: roomSample ? 1 : 0 } };
}

