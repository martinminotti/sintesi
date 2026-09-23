/**
 * Seeded randomness. Nothing in SINTESI may call Math.random():
 * every stochastic decision derives from the global seed plus a named stream,
 * so the same seed + dataset + configuration always yields the same work.
 */

/** 32-bit string/number hash (FNV-1a followed by a murmur3 finaliser). */
export function hash32(...parts: (string | number)[]): number {
  let h = 0x811c9dc5;
  for (const part of parts) {
    const s = typeof part === 'number' ? part.toString(36) : part;
    for (let i = 0; i < s.length; i++) {
      h ^= s.charCodeAt(i);
      h = Math.imul(h, 0x01000193);
    }
    h ^= 0x2f; // separator between parts
    h = Math.imul(h, 0x01000193);
  }
  h ^= h >>> 16;
  h = Math.imul(h, 0x85ebca6b);
  h ^= h >>> 13;
  h = Math.imul(h, 0xc2b2ae35);
  h ^= h >>> 16;
  return h >>> 0;
}

/** Hash → float in [0, 1). */
export function hashFloat(...parts: (string | number)[]): number {
  return hash32(...parts) / 4294967296;
}

export interface Rng {
  /** Uniform float in [0, 1). */
  next(): number;
  range(min: number, max: number): number;
  int(min: number, maxExclusive: number): number;
  pick<T>(items: readonly T[]): T;
  /** Approximately normal, mean 0, standard deviation 1. */
  gauss(): number;
  shuffle<T>(items: T[]): T[];
}

/** sfc32 generator seeded from the global seed and a stream name. */
export function createRng(seed: number, stream: string): Rng {
  let a = hash32(seed, stream, 'a');
  let b = hash32(seed, stream, 'b');
  let c = hash32(seed, stream, 'c');
  let d = hash32(seed, stream, 'd');
  const next = (): number => {
    a >>>= 0; b >>>= 0; c >>>= 0; d >>>= 0;
    let t = (a + b) | 0;
    a = b ^ (b >>> 9);
    b = (c + (c << 3)) | 0;
    c = (c << 21) | (c >>> 11);
    d = (d + 1) | 0;
    t = (t + d) | 0;
    c = (c + t) | 0;
    return (t >>> 0) / 4294967296;
  };
  // Warm up so that similar stream names diverge immediately.
  for (let i = 0; i < 12; i++) next();

  const rng: Rng = {
    next,
    range: (min, max) => min + (max - min) * next(),
    int: (min, maxExclusive) => min + Math.floor(next() * (maxExclusive - min)),
    pick: (items) => items[Math.floor(next() * items.length)],
    gauss: () => {
      let s = 0;
      for (let i = 0; i < 4; i++) s += next();
      return (s - 2) * Math.sqrt(3);
    },
    shuffle: (items) => {
      for (let i = items.length - 1; i > 0; i--) {
        const j = Math.floor(next() * (i + 1));
        [items[i], items[j]] = [items[j], items[i]];
      }
      return items;
    },
  };
  return rng;
}
