// RECONSTRUCTION — the visual consequences of coherence.
// Mirrors src/confidence/confidence.ts (coherenceParams): keep them in sync.
//
// Confidence governs structure, not opacity. As coherence k falls:
//   pieces drift from where they belong (fragmentation),
//   the remaining structure flows (displacement),
//   detail dissolves (blur), tonal information collapses (levels),
//   structure is replaced by noise of the same energy (noise),
//   and uncertain regions keep searching (instability).
// Only at the very bottom, where information is absent, does anything vanish.

struct Coherence {
  float displacement;
  float fragmentation;
  float dropout;
  float blur;
  float noise;
  float levels;
  float instability;
  float presence;
};

Coherence coherence(float k) {
  k = clamp(k, 0.0, 1.0);
  float u = 1.0 - k;
  Coherence c;
  c.displacement = 0.07 * pow(u, 1.5);
  c.fragmentation = 0.32 * u * u;
  c.dropout = 0.8 * smoothstep(0.45, 0.97, u);
  c.blur = pow(u, 1.4);
  c.noise = smoothstep(0.35, 1.0, u);
  c.levels = mix(256.0, 5.0, smoothstep(0.4, 1.0, u));
  c.instability = u;
  c.presence = smoothstep(0.0, 0.12, k);
  return c;
}

// A cell "searches" between candidate positions; the less certain, the faster.
vec2 cellSearch(vec2 cellId, float instability, float t, float seed) {
  float phase = t * (0.15 + 1.6 * instability) + hash12(cellId + seed) * 10.0;
  float i = floor(phase);
  float f = fract(phase);
  f = f * f * f * (f * (f * 6.0 - 15.0) + 10.0);
  vec2 a = hash23(vec3(cellId, i + seed * 0.01));
  vec2 b = hash23(vec3(cellId, i + 1.0 + seed * 0.01));
  return mix(a, b, f) - 0.5;
}

// Whether a cell is known at all. Thresholds are fixed per cell, so as
// coherence rises the missing pieces are filled in one by one, never flicker.
float cellKnown(vec2 cellId, float dropout, float seed) {
  float h = hash12(cellId * 1.37 + seed + 5.1);
  return smoothstep(dropout - 0.04, dropout + 0.04, h);
}

vec3 quantizeLevels(vec3 c, float levels, vec2 px, float seed) {
  float d = hash12(px + seed) - 0.5; // ordered dither avoids banding
  return floor(c * levels + 0.5 + d) / levels;
}

// Replace structure with noise that keeps the local mean energy:
// fine, grain-like, never blotchy — information lost, not a texture added.
vec3 noiseFill(vec3 c, vec3 mean, float amount, vec2 p, float t, float seed) {
  vec2 o = seedOffset(seed);
  float n = gnoise(p * 2.0 + o + t * 0.15) * 0.6 + gnoise(p * 5.3 + o.yx - t * 0.1) * 0.4;
  vec3 textured = mean * (1.0 + 0.25 * n);
  return mix(c, textured, amount * 0.8);
}

// A photographic print: tonal curve, fixed silver grain, soft edge falloff.
vec3 printResponse(vec3 c, vec2 local, vec2 px, float seed) {
  float l = dot(c, vec3(0.2126, 0.7152, 0.0722));
  float curved = smoothstep(0.02, 0.98, l);
  c *= curved / max(l, 1e-3);
  float g = hash12(floor(px) + seed * 3.7) + hash12(floor(px) * 1.3 + seed) - 1.0;
  c += g * 0.035 * (0.4 + 0.6 * (1.0 - abs(l * 2.0 - 1.0)));
  vec2 e = min(local, 1.0 - local);
  c *= 0.86 + 0.14 * smoothstep(0.0, 0.18, min(e.x, e.y));
  return c;
}
