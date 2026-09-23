#include "lib/noise.glsl"
#include "lib/reconstruction.glsl"

in vec2 vCoord;
in vec4 vParams;
in float vWidthPx;
out vec4 outColor;

uniform float uTime;
uniform vec3 uInk;

void main() {
  float strength = vParams.x;
  float k = vParams.z;
  Coherence C = coherence(k);
  float across = 1.0 - smoothstep(0.25, 0.5, abs(vCoord.y));
  // Weak relations are intermittent: the system is not sure they exist.
  float dashLen = 0.09;
  float duty = 0.3 + 0.7 * smoothstep(0.15, 0.7, strength);
  float cell = floor(vCoord.x / dashLen - uTime * 0.25 * (1.0 - strength));
  float dash = step(fract(vCoord.x / dashLen - uTime * 0.25 * (1.0 - strength)), duty);
  dash *= cellKnown(vec2(cell, vParams.w), C.dropout, vParams.w);
  float intensity = (0.16 + 0.5 * strength) * C.presence;
  float a = across * dash * intensity;
  outColor = vec4(uInk * a, a);
}
