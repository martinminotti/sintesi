// INFERENCE — the system's belief about the whole picture, rendered with
// exactly the coherence its confidence field allows.
#include "lib/noise.glsl"
#include "lib/displacement.glsl"
#include "lib/blur.glsl"
#include "lib/reconstruction.glsl"

in vec2 vUv;
out vec4 outColor;

uniform sampler2D uInferred;
uniform sampler2D uField;
uniform float uAcceptance;
uniform float uTime;
uniform float uSeed;
uniform int uTaps;

const vec2 WORLD = vec2(9.0, 16.0);

float displayed(float c) { return mix(c, 1.0, uAcceptance); }

void main() {
  vec2 w = vUv * WORLD;
  vec2 cellCenter;
  vec3 vor = voronoi(w * 2.4 + seedOffset(uSeed), cellCenter);
  vec2 cellId = vor.xy;
  vec2 cellUv = (cellCenter - seedOffset(uSeed)) / 2.4 / WORLD;

  // Structure is decided per cell; absence is decided per pixel.
  float cPix = texture(uField, vUv).r;
  float cCell = texture(uField, clamp(cellUv, 0.0, 1.0)).r;
  float k = displayed(mix(cCell, cPix, 0.35));
  Coherence C = coherence(k);
  float presence = smoothstep(0.0, 0.12, displayed(cPix));
  if (presence <= 0.0) { outColor = vec4(0.0, 0.0, 0.0, 1.0); return; }

  vec2 offset = cellSearch(cellId, C.instability, uTime, uSeed) * C.fragmentation * 0.6;
  float known = cellKnown(cellId, C.dropout * 0.7, uSeed);
  vec2 sw = w - offset;
  sw = displace(sw, C.displacement * 3.0, 0.9, uTime * (0.06 + 0.25 * C.instability), uSeed);
  vec2 uv = sw / WORLD;

  vec3 col = blurSample(uInferred, uv, vec2(C.blur * 0.28) / WORLD, uTaps, uSeed).rgb;
  vec3 mean = textureLod(uInferred, uv, 6.0).rgb;
  col = noiseFill(col, mean, C.noise, w * 7.0, uTime * C.instability, uSeed);
  col = quantizeLevels(col, C.levels, gl_FragCoord.xy, uSeed);

  // Colour was never archived: it appears only where belief is strong.
  float l = dot(col, vec3(0.2126, 0.7152, 0.0722));
  col = mix(vec3(l), col, smoothstep(0.3, 0.8, k));

  // Where a cell is not known, only the vaguest memory of the scene remains.
  // Same energy, no structure: the cell is out of focus, not missing.
  vec3 ghost = textureLod(uInferred, vUv, 5.5).rgb;
  ghost = vec3(dot(ghost, vec3(0.2126, 0.7152, 0.0722)));
  float edge = smoothstep(0.0, 0.35, vor.z);
  col = mix(ghost, col, mix(1.0, known, edge));

  outColor = vec4(col * presence, 1.0);
}
