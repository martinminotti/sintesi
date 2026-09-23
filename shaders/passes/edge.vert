// Relationships: thin lines whose stability is their strength.
#include "lib/noise.glsl"

in vec3 position; // x in [-0.5, 0.5] along, y in [-0.5, 0.5] across
in vec4 iAB;      // a.xy, b.xy (world)
in vec4 iParams;  // strength, progress, coherence k, seed

uniform mat4 projectionMatrix;
uniform mat4 viewMatrix;
uniform float uTime;
uniform float uPixel; // world units per output pixel

out vec2 vCoord;  // along (world units), across (-0.5..0.5)
out vec4 vParams;
out float vWidthPx;

void main() {
  vec2 a = iAB.xy;
  vec2 b = iAB.zw;
  vec2 d = b - a;
  float len = max(length(d), 1e-4);
  vec2 dir = d / len;
  vec2 n = vec2(-dir.y, dir.x);
  float strength = iParams.x;
  float k = iParams.z;
  float s = (position.x + 0.5) * iParams.y;
  // Weak or uncertain relations waver; strong, certain ones are straight.
  float unsure = (1.0 - k) * (1.0 - strength * 0.7);
  float taper = sin(3.14159 * s);
  float wob = gnoise(vec2(s * len * 0.8 + iParams.w, uTime * (0.1 + 0.5 * unsure) + iParams.w)) * 0.18 * unsure * taper;
  float width = max(0.004 + 0.01 * strength, 1.5 * uPixel);
  vec2 p = a + dir * s * len + n * (position.y * width + wob);
  vCoord = vec2(s * len, position.y);
  vParams = iParams;
  vWidthPx = width / uPixel;
  gl_Position = projectionMatrix * viewMatrix * vec4(p, 0.0, 1.0);
}
