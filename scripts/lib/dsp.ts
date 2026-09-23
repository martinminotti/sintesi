/** Minimal, deterministic DSP for the offline audio renderer. */
import { createRng, type Rng } from '../../src/core/random';

export const SR = 48000;

export class Biquad {
  private b0 = 1; private b1 = 0; private b2 = 0; private a1 = 0; private a2 = 0;
  private x1 = 0; private x2 = 0; private y1 = 0; private y2 = 0;
  constructor(type: 'lp' | 'hp' | 'bp', freq: number, q = 0.707) { this.set(type, freq, q); }
  set(type: 'lp' | 'hp' | 'bp', freq: number, q = 0.707): void {
    const w = (2 * Math.PI * Math.min(freq, SR * 0.45)) / SR;
    const cos = Math.cos(w), alpha = Math.sin(w) / (2 * q);
    let b0: number, b1: number, b2: number;
    if (type === 'lp') { b0 = (1 - cos) / 2; b1 = 1 - cos; b2 = (1 - cos) / 2; }
    else if (type === 'hp') { b0 = (1 + cos) / 2; b1 = -(1 + cos); b2 = (1 + cos) / 2; }
    else { b0 = alpha; b1 = 0; b2 = -alpha; }
    const a0 = 1 + alpha;
    this.b0 = b0 / a0; this.b1 = b1 / a0; this.b2 = b2 / a0;
    this.a1 = (-2 * cos) / a0; this.a2 = (1 - alpha) / a0;
  }
  run(x: number): number {
    const y = this.b0 * x + this.b1 * this.x1 + this.b2 * this.x2 - this.a1 * this.y1 - this.a2 * this.y2;
    this.x2 = this.x1; this.x1 = x; this.y2 = this.y1; this.y1 = y;
    return y;
  }
}

/** Pink noise (Paul Kellet's economy filter) from a seeded stream. */
export class Pink {
  private b0 = 0; private b1 = 0; private b2 = 0;
  constructor(private rng: Rng) {}
  next(): number {
    const w = this.rng.next() * 2 - 1;
    this.b0 = 0.99765 * this.b0 + w * 0.099046;
    this.b1 = 0.963 * this.b1 + w * 0.2965164;
    this.b2 = 0.57 * this.b2 + w * 1.0526913;
    return (this.b0 + this.b1 + this.b2 + w * 0.1848) * 0.2;
  }
}

export function noise(seed: number, stream: string): () => number {
  const rng = createRng(seed, stream);
  return () => rng.next() * 2 - 1;
}

export function stereo(n: number): [Float32Array, Float32Array] {
  return [new Float32Array(n), new Float32Array(n)];
}

/** Equal-power pan, x in [-1, 1]. */
export function panGains(x: number): [number, number] {
  const a = ((x + 1) / 2) * (Math.PI / 2);
  return [Math.cos(a), Math.sin(a)];
}

export function writeWav24(path: string, L: Float32Array, R: Float32Array, write: (p: string, b: Buffer) => void): void {
  const n = L.length;
  const data = Buffer.alloc(n * 6);
  for (let i = 0; i < n; i++) {
    for (const [c, ch] of [[0, L], [1, R]] as const) {
      const v = Math.max(-1, Math.min(1, ch[i]));
      const s = Math.round(v * 8388607);
      data.writeIntLE(s, i * 6 + c * 3, 3);
    }
  }
  const h = Buffer.alloc(44);
  h.write('RIFF', 0); h.writeUInt32LE(36 + data.length, 4); h.write('WAVE', 8);
  h.write('fmt ', 12); h.writeUInt32LE(16, 16); h.writeUInt16LE(1, 20); h.writeUInt16LE(2, 22);
  h.writeUInt32LE(SR, 24); h.writeUInt32LE(SR * 6, 28); h.writeUInt16LE(6, 32); h.writeUInt16LE(24, 34);
  h.write('data', 36); h.writeUInt32LE(data.length, 40);
  write(path, Buffer.concat([h, data]));
}

/** Read a PCM WAV (16/24 bit, any channels) as mono float at 48 kHz (nearest resampling). */
export function readWavMono(buf: Buffer): Float32Array | null {
  if (buf.toString('ascii', 0, 4) !== 'RIFF' || buf.toString('ascii', 8, 12) !== 'WAVE') return null;
  let off = 12, fmt: { ch: number; sr: number; bits: number } | null = null;
  while (off + 8 <= buf.length) {
    const id = buf.toString('ascii', off, off + 4);
    const size = buf.readUInt32LE(off + 4);
    if (id === 'fmt ') fmt = { ch: buf.readUInt16LE(off + 10), sr: buf.readUInt32LE(off + 12), bits: buf.readUInt16LE(off + 22) };
    if (id === 'data' && fmt && (fmt.bits === 16 || fmt.bits === 24)) {
      const bps = fmt.bits / 8, frames = Math.floor(size / (bps * fmt.ch));
      const src = new Float32Array(frames);
      for (let i = 0; i < frames; i++) {
        let acc = 0;
        for (let c = 0; c < fmt.ch; c++) {
          const p = off + 8 + (i * fmt.ch + c) * bps;
          acc += bps === 2 ? buf.readInt16LE(p) / 32768 : buf.readIntLE(p, 3) / 8388608;
        }
        src[i] = acc / fmt.ch;
      }
      const ratio = fmt.sr / SR, out = new Float32Array(Math.floor(frames / ratio));
      for (let i = 0; i < out.length; i++) out[i] = src[Math.min(frames - 1, Math.floor(i * ratio))];
      return out;
    }
    off += 8 + size + (size % 2);
  }
  return null;
}
