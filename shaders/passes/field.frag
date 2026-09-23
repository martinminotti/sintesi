// CONFIDENCE FIELD — what the system believes it knows, at every point of the picture.
//   R: epistemic confidence   G: observed (inside an archived fragment)
// Anchors (photographs returned to their place) are certain inside, and extend a
// weaker, inferred confidence around them as the system reaches further.
#include "lib/noise.glsl"

#define MAX_ANCHORS 24
#define MAX_INFERENCES 8

in vec2 vUv;
out vec4 outColor;

uniform vec4 uAnchorRect[MAX_ANCHORS];   // picture space x, y (top-left), w, h
uniform vec2 uAnchorParams[MAX_ANCHORS]; // confidence, arrival
uniform int uAnchorCount;
uniform vec4 uInference[MAX_INFERENCES]; // centre x, y, radius, confidence
uniform int uInferenceCount;
uniform float uReach;
uniform float uPrior;
uniform float uTime;
uniform float uSeed;

const float ASPECT = 16.0 / 9.0;

float sdBox2(vec2 p, vec2 b) {
  vec2 d = abs(p) - b;
  return length(max(d, 0.0)) + min(max(d.x, d.y), 0.0);
}

void main() {
  vec2 pic = vec2(vUv.x, 1.0 - vUv.y);
  vec2 p = vec2(pic.x, pic.y * ASPECT);
  vec2 o = seedOffset(uSeed);
  // The frontier of belief is irregular and slowly alive.
  float wob = fbm(p * 5.0 + o, 4) * 0.06 + gnoise(p * 21.0 + o + uTime * 0.06) * 0.012;

  float c = 0.0;
  float observed = 0.0;
  for (int i = 0; i < MAX_ANCHORS; i++) {
    if (i >= uAnchorCount) break;
    vec4 r = uAnchorRect[i];
    vec2 conf = uAnchorParams[i];
    vec2 centre = vec2(r.x + r.z * 0.5, (r.y + r.w * 0.5) * ASPECT);
    vec2 hb = vec2(r.z, r.w * ASPECT) * 0.5;
    float d = sdBox2(p - centre, hb);
    if (d <= 0.0) {
      c = max(c, conf.x * conf.y);
      observed = max(observed, conf.y);
    } else {
      float L = 0.01 + 0.11 * uReach;
      c = max(c, conf.y * conf.x * 0.5 * exp(-max(d + wob, 0.0) / L));
    }
  }
  for (int i = 0; i < MAX_INFERENCES; i++) {
    if (i >= uInferenceCount) break;
    vec4 inf = uInference[i];
    float R = inf.z * uReach;
    float d = length(p - vec2(inf.x, inf.y * ASPECT)) + wob * 2.0;
    c = max(c, inf.w * (1.0 - smoothstep(R * 0.45, R, d)));
  }
  c = max(c, uPrior * (0.55 + 0.45 * fbm(p * 2.5 + o + 3.0, 3)));
  outColor = vec4(clamp(c, 0.0, 1.0), observed, 0.0, 1.0);
}
