// CONFIDENCE FIELD — what the system has evidence for, and where it is looking.
//   R: confidence from archived fragments (certain inside, weaker around them)
//   G: observed (inside an archived fragment)
//   B: attention — the part of the picture the system has begun to consider.
// Attention grows from the evidence outward. It is not knowledge: a region can be
// considered (visible) and still unknown (indeterminate).
#include "lib/noise.glsl"

#define MAX_ANCHORS 24

in vec2 vUv;
out vec4 outColor;

uniform vec4 uAnchorRect[MAX_ANCHORS];   // picture space x, y (top-left), w, h
uniform vec2 uAnchorParams[MAX_ANCHORS]; // confidence, arrival
uniform int uAnchorCount;
uniform float uReach;
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
  float wob = fbm(p * 5.0 + o, 4) * 0.06 + gnoise(p * 21.0 + o + uTime * 0.06) * 0.012;

  float c = 0.0;
  float observed = 0.0;
  float nearest = 10.0;
  for (int i = 0; i < MAX_ANCHORS; i++) {
    if (i >= uAnchorCount) break;
    vec4 r = uAnchorRect[i];
    vec2 conf = uAnchorParams[i];
    vec2 centre = vec2(r.x + r.z * 0.5, (r.y + r.w * 0.5) * ASPECT);
    vec2 hb = vec2(r.z, r.w * ASPECT) * 0.5;
    float d = sdBox2(p - centre, hb);
    nearest = min(nearest, d / max(conf.y, 1e-3));
    if (d <= 0.0) {
      c = max(c, conf.x * conf.y);
      observed = max(observed, conf.y);
    } else {
      float L = 0.01 + 0.11 * uReach;
      c = max(c, conf.y * conf.x * 0.5 * exp(-max(d + wob, 0.0) / L));
    }
  }
  float R = uReach * 1.15;
  float attention = uReach >= 0.999 ? 1.0 : 1.0 - smoothstep(R * 0.4, R, nearest + wob * 1.5);
  outColor = vec4(clamp(c, 0.0, 1.0), observed, attention, 1.0);
}
