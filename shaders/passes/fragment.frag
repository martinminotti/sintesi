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

  // Effects scale with the trace: a large photograph loses structure as visibly as a small one.
  float scale = clamp(min(vSize.x, vSize.y), 0.25, 1.6);
  vec2 offset = cellSearch(cellId, C.instability, uTime, seed) * C.fragmentation * 1.6 * scale;
  float known = cellKnown(cellId, C.dropout, seed);
  vec2 sw = w - offset;
  sw = displace(sw, C.displacement * 3.0 * scale, 1.4 / scale, uTime * (0.08 + 0.3 * C.instability), seed);
  vec2 local = sw / vSize;

  // The trace occupies its own rectangle; uncertain pieces may spill beyond it.
  vec2 own = step(vec2(0.0), vLocal) * step(vLocal, vec2(1.0));
  vec2 src = step(vec2(0.0), local) * step(local, vec2(1.0));
  float inOwn = own.x * own.y;
  float inSrc = src.x * src.y;
  if (inOwn + inSrc * known <= 0.0) discard;

  vec2 uv = vUV.xy + clamp(local, 0.0, 1.0) * vUV.zw;
  vec2 radius = vec2(C.blur * 0.35 * scale) / vSize * vUV.zw;
  vec4 s0 = sampleSource(observed, uv, radius, seed);

  vec3 col = s0.rgb;
  float alpha = s0.a;
  // Mean energy of the whole trace, for noise replacement.
  vec2 uvMid = vUV.xy + 0.5 * vUV.zw;
  vec3 mean = observed ? textureLod(uObserved, uvMid, 6.0).rgb : uInk * textureLod(uAtlas, uv, 4.0).a;
  if (observed) col = printResponse(col, clamp(local, 0.0, 1.0), gl_FragCoord.xy, seed);
  col = noiseFill(col, mean, C.noise, w * 9.0, uTime * C.instability, seed);
  col = quantizeLevels(col, C.levels, gl_FragCoord.xy, seed);
  if (!observed) alpha = max(alpha, C.noise * 0.6 * length(col));

  // What is not known keeps its energy but loses its form (photographs);
  // for typeset traces, unknown ink is simply absent.
  float usable = inSrc * known;
  float mask = observed ? inOwn + (1.0 - inOwn) * usable : usable;
  if (observed) {
    vec3 ghost = vec3(dot(mean, vec3(0.2126, 0.7152, 0.0722)));
    col = mix(ghost, col, usable);
  }
  float a = alpha * mask * C.presence;
  outColor = vec4(col * mask * C.presence, a);
}
