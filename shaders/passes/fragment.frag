// Evidence fragments: the reconstruction law applied to a single trace.
#include "lib/noise.glsl"
#include "lib/displacement.glsl"
#include "lib/blur.glsl"
#include "lib/reconstruction.glsl"

in vec2 vLocal;
in vec4 vUV;
in vec4 vParams;
in vec2 vSize;
out vec4 outColor;

uniform sampler2D uAtlas;
uniform sampler2D uObserved;
uniform float uTime;
uniform float uSeed;
uniform int uTaps;
uniform vec3 uInk;

vec4 sampleSource(bool observed, vec2 uv, vec2 radius, float seed) {
  if (observed) return vec4(blurSample(uObserved, uv, radius, uTaps, seed).rgb, 1.0);
  float a = blurSample(uAtlas, uv, radius, uTaps, seed).a;
  return vec4(uInk * a, a);
}

void main() {
  float k = vParams.x;
  bool observed = vParams.y > 0.5;
  float seed = vParams.z + uSeed;
  Coherence C = coherence(k);
  if (C.presence <= 0.0) discard;

  // Work in world units so every element fragments at the same scale.
  vec2 w = vLocal * vSize;
  float cellDensity = observed ? 3.4 : 5.0; // cells per world unit
  vec2 cellCenter;
  vec3 vor = voronoi(w * cellDensity + seedOffset(seed), cellCenter);
  vec2 cellId = vor.xy;

  vec2 offset = cellSearch(cellId, C.instability, uTime, seed) * C.fragmentation * 0.9;
  float known = cellKnown(cellId, C.dropout, seed);
  vec2 sw = w - offset;
  sw = displace(sw, C.displacement * 2.0, 1.4, uTime * (0.08 + 0.3 * C.instability), seed);
  vec2 local = sw / vSize;

  // Outside the trace, nothing is known.
  vec2 inside = step(vec2(0.0), local) * step(local, vec2(1.0));
  float mask = inside.x * inside.y * known;
  if (mask <= 0.0) discard;

  vec2 uv = vUV.xy + local * vUV.zw;
  vec2 radius = vec2(C.blur * 0.16) / vSize * vUV.zw;
  vec4 src = sampleSource(observed, uv, radius, seed);

  vec3 col = src.rgb;
  float alpha = src.a;
  // Mean energy of the whole trace, for noise replacement.
  vec2 uvMid = vUV.xy + 0.5 * vUV.zw;
  vec3 mean = observed ? textureLod(uObserved, uvMid, 6.0).rgb : uInk * textureLod(uAtlas, uv, 4.0).a;
  if (observed) col = printResponse(col, local, gl_FragCoord.xy, seed);
  col = noiseFill(col, mean, C.noise, w * 9.0, uTime * C.instability, seed);
  col = quantizeLevels(col, C.levels, gl_FragCoord.xy, seed);
  if (!observed) alpha = max(alpha, C.noise * 0.6 * length(col));

  float a = alpha * mask * C.presence;
  outColor = vec4(col * mask * C.presence, a);
}
