export const clamp = (x: number, lo = 0, hi = 1): number => (x < lo ? lo : x > hi ? hi : x);
export const lerp = (a: number, b: number, t: number): number => a + (b - a) * t;
export const invLerp = (a: number, b: number, x: number): number => (b === a ? 0 : clamp((x - a) / (b - a)));

export function smoothstep(e0: number, e1: number, x: number): number {
  const t = invLerp(e0, e1, x);
  return t * t * (3 - 2 * t);
}

/** Slow start, slow end. Used for anything that should feel deliberate. */
export function easeInOutCubic(t: number): number {
  t = clamp(t);
  return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
}

/** Fast departure, long settle: how evidence "lands". */
export function easeOutQuint(t: number): number {
  t = clamp(t);
  return 1 - Math.pow(1 - t, 5);
}

export function easeInQuad(t: number): number {
  t = clamp(t);
  return t * t;
}

export interface Vec2 { x: number; y: number; }
export interface Rect { x: number; y: number; w: number; h: number; }

export const vlerp = (a: Vec2, b: Vec2, t: number): Vec2 => ({ x: lerp(a.x, b.x, t), y: lerp(a.y, b.y, t) });
