// THE PICTURE — the system's belief, shown with the coherence it allows itself.
//
// Each region (material id of the subject) carries a class, a confidence and an
// acceptance. Where acceptance is low the system holds several hypotheses at
// once: the picture is a quiet superposition, then a search between proposals.
// As acceptance rises the alternatives disappear, the structure stops moving,
// the optics become photographic. Confidence never changes: the picture becomes
// acceptable, not true.
#include "lib/noise.glsl"
#include "lib/displacement.glsl"
#include "lib/blur.glsl"
#include "lib/reconstruction.glsl"

#define MAX_REGIONS 16

in vec2 vUv;
out vec4 outColor;

uniform sampler2D uSynthesis;
uniform sampler2D uAlt0;
uniform sampler2D uAlt1;
uniform sampler2D uAlt2;
uniform sampler2D uData;
uniform sampler2D uField;
uniform float uConfidence[MAX_REGIONS];
uniform float uAcceptance[MAX_REGIONS];
uniform float uPresence[MAX_REGIONS];
uniform float uPhoto;
/** INFERENCE, second tempo: 0 = the hypotheses are only superposed, 1 = they are proposed in turn. */
uniform float uProposal;
uniform float uFocus;
uniform float uTime;
uniform float uSeed;
uniform int uTaps;

const vec2 WORLD = vec2(9.0, 16.0);

vec3 hypothesis(int i, vec2 uv, vec2 radius) {
  if (i == 0) return blurSample(uSynthesis, uv, radius, uTaps, uSeed).rgb;
  if (i == 1) return blurSample(uAlt0, uv, radius, uTaps, uSeed).rgb;
  if (i == 2) return blurSample(uAlt1, uv, radius, uTaps, uSeed).rgb;
  return blurSample(uAlt2, uv, radius, uTaps, uSeed).rgb;
}

vec3 hypothesisLod(int i, vec2 uv, float lod) {
  if (i == 0) return textureLod(uSynthesis, uv, lod).rgb;
  if (i == 1) return textureLod(uAlt0, uv, lod).rgb;
  if (i == 2) return textureLod(uAlt1, uv, lod).rgb;
  return textureLod(uAlt2, uv, lod).rgb;
}

void main() {
  vec2 w = vUv * WORLD;
  vec4 data = texture(uData, vUv);
  int region = int(floor(data.g * 16.0 + 0.5));
  float accept = uAcceptance[region];
  float presence = uPresence[region];
  vec4 f = texture(uField, vUv);
  float attention = f.b;
  // A region withdraws by erosion, never by a clean cut along its outline.
  float erosion = fbm(vUv * WORLD * 0.9 + seedOffset(uSeed + 5.0), 4) * 0.5 + 0.5;
  float withdrawn = smoothstep(erosion - 0.12, erosion + 0.12, presence * 1.24 - 0.12);
  float pres = attention * withdrawn;
  if (pres <= 0.001) { outColor = vec4(0.0, 0.0, 0.0, 1.0); return; }

  // What is known here: an archived fragment, or what the region's class allows.
  float c = max(f.r, uConfidence[region]);
  float k = mix(c, 1.0, accept);
  // Absence is not missing information but missing determination: the proposals
  // themselves are legible; what is uncertain is which one is true.
  float floorK = uConfidence[region] <= 0.0 ? 0.55 : 0.14;
  Coherence C = coherence(max(k, floorK));

  // Displacement: uncertain structure drifts, continuously; accepted structure is still.
  // (No cells here: in the picture the algorithm must not be visible.)
  vec2 sw = displace(w, C.displacement * 3.0 + C.fragmentation * 0.5, 0.9, uTime * (0.06 + 0.25 * C.instability), uSeed);
  vec2 uv = sw / WORLD;

  // Hypotheses: soft fields of preference. Low acceptance → a superposition;
  // rising acceptance → proposals take turns; full acceptance → one picture.
  vec2 o = seedOffset(uSeed + 17.0);
  // First the alternatives are only superposed; then they are proposed in turn,
  // faster and faster; acceptance finally keeps one.
  float rate = 0.02 + 0.24 * uProposal * (1.0 - accept);
  float sharp = mix(0.8, 3.2, uProposal) + 7.0 * accept;
  float bias = 7.0 * accept * accept;
  float s[4];
  s[0] = gnoise(w * 0.45 + o + vec2(0.0, uTime * rate)) + bias;
  s[1] = gnoise(w * 0.45 + o + vec2(31.7, 0.0) + vec2(uTime * rate, 0.0));
  s[2] = gnoise(w * 0.45 + o + vec2(0.0, 57.3) - vec2(0.0, uTime * rate));
  s[3] = gnoise(w * 0.45 + o + vec2(83.1, 11.9) - vec2(uTime * rate, 0.0));
  float wsum = 0.0;
  float wt[4];
  for (int i = 0; i < 4; i++) { wt[i] = exp(sharp * s[i]); wsum += wt[i]; }

  // Optics: depth of field grows with acceptance — the picture becomes a photograph.
  float depth = data.r * 4.0;
  float coc = uPhoto * clamp(abs(depth - uFocus) * 0.035, 0.0, 0.05);
  vec2 radius = (vec2(C.blur * 0.28) + vec2(coc)) / WORLD;

  vec3 col = vec3(0.0);
  for (int i = 0; i < 4; i++) {
    float wi = wt[i] / wsum;
    if (wi < 0.02) continue;
    col += wi * hypothesis(i, uv, radius);
  }
  float kept = 0.0;
  for (int i = 0; i < 4; i++) { float wi = wt[i] / wsum; if (wi >= 0.02) kept += wi; }
  col /= max(kept, 1e-3);

  // Structure replaced by noise of the same energy; tonal information collapses.
  vec3 mean = hypothesisLod(0, uv, 6.0) * wt[0] / wsum + hypothesisLod(1, uv, 6.0) * wt[1] / wsum
            + hypothesisLod(2, uv, 6.0) * wt[2] / wsum + hypothesisLod(3, uv, 6.0) * wt[3] / wsum;
  col = noiseFill(col, mean, C.noise, w * 7.0, uTime * C.instability, uSeed);
  col = quantizeLevels(col, C.levels, gl_FragCoord.xy, uSeed);
  // Where nothing at all is known, only the vaguest memory of the scene: soft, not tiled.
  float field = fbm(w * 0.7 + seedOffset(uSeed + 3.0) + uTime * 0.02, 4) * 0.5 + 0.5;
  float known = smoothstep(C.dropout * 0.7 - 0.12, C.dropout * 0.7 + 0.12, field);
  vec3 ghost = vec3(dot(mean, vec3(0.2126, 0.7152, 0.0722)));
  col = mix(ghost, col, known);

  // Colour was never archived: it appears only as the system commits to it.
  float l = dot(col, vec3(0.2126, 0.7152, 0.0722));
  col = mix(vec3(l), col, smoothstep(0.3, 0.85, k));

  // Photographic response: halation around the light, a trace of lateral colour.
  if (uPhoto > 0.0) {
    vec3 bloom = textureLod(uSynthesis, uv, 5.0).rgb;
    col += max(bloom - 0.62, 0.0) * 0.55 * uPhoto;
    vec2 rad = (vUv - 0.5) * vec2(9.0 / 16.0, 1.0);
    float ca = 0.0012 * uPhoto * length(rad) * 2.0;
    col.r = mix(col.r, texture(uSynthesis, uv + rad * ca).r, 0.6 * uPhoto * accept);
    col.b = mix(col.b, texture(uSynthesis, uv - rad * ca).b, 0.6 * uPhoto * accept);
    // Light is never perfectly constant.
    col *= 1.0 + 0.008 * uPhoto * sin(uTime * 0.53 + 1.3) * sin(uTime * 0.21);
  }

  outColor = vec4(col * pres, 1.0);
}
