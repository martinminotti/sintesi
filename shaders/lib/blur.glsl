// Confidence-controlled blur: golden-angle disc sampling on a mipmapped source.
// radius is in uv units; taps is bounded by MAX_BLUR_TAPS.

#define MAX_BLUR_TAPS 24

vec4 blurSample(sampler2D tex, vec2 uv, vec2 radius, int taps, float seed) {
  if (max(radius.x, radius.y) < 1e-5) return texture(tex, uv);
  vec2 texSize = vec2(textureSize(tex, 0));
  // Mip level that matches the spacing between taps.
  float spacing = max(radius.x * texSize.x, radius.y * texSize.y) / sqrt(float(taps));
  float lod = max(0.0, log2(max(spacing, 1.0)));
  float rot = hash12(uv * 913.1 + seed) * 6.2831853;
  vec4 acc = vec4(0.0);
  float wsum = 0.0;
  for (int i = 0; i < MAX_BLUR_TAPS; i++) {
    if (i >= taps) break;
    float fi = float(i) + 0.5;
    float r = sqrt(fi / float(taps));
    float a = fi * 2.3999632 + rot;
    vec2 o = vec2(cos(a), sin(a)) * r * radius;
    float w = 1.0 - 0.5 * r;
    acc += textureLod(tex, uv + o, lod) * w;
    wsum += w;
  }
  return acc / wsum;
}
