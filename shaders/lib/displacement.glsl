// Controlled deformation. Displacement is a divergence-free flow, so matter is
// moved, not smeared: uncertain structure drifts coherently instead of shaking.

vec2 flowField(vec2 p, float t, float seed) {
  vec2 o = seedOffset(seed);
  float e = 0.05;
  vec3 q = vec3(p + o, t);
  float n  = fbm3(q, 3);
  float nx = fbm3(q + vec3(e, 0.0, 0.0), 3);
  float ny = fbm3(q + vec3(0.0, e, 0.0), 3);
  // Curl of a scalar potential.
  return vec2(ny - n, -(nx - n)) / e;
}

// amount is in the same units as uv; scale sets the size of the eddies.
vec2 displace(vec2 uv, float amount, float scale, float t, float seed) {
  if (amount <= 0.0) return uv;
  return uv + flowField(uv * scale, t, seed) * amount * 0.35;
}
