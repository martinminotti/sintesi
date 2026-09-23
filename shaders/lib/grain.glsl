// Film grain: extremely subtle, luminance dependent, re-drawn every frame from
// (pixel, frame, seed), so it is alive but perfectly reproducible.

float grainNoise(vec2 px, float frame, float seed) {
  vec3 p = vec3(px, frame * 7.13 + seed * 0.37);
  // Sum of four hashes ≈ gaussian.
  float g = hash13(p) + hash13(p + 17.1) + hash13(p + 41.7) + hash13(p + 73.3);
  return (g - 2.0) * 0.866;
}

vec3 applyGrain(vec3 color, vec2 px, float frame, float seed, float amount) {
  float l = dot(color, vec3(0.2126, 0.7152, 0.0722));
  // Grain is strongest in the midtones, as on film.
  float response = 0.35 + 0.65 * (1.0 - abs(l * 2.0 - 1.0));
  float g = grainNoise(floor(px), frame, seed);
  return color + g * amount * response;
}
