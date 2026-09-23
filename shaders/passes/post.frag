// Final pass: black level, very subtle vignette, film grain, dither.
#include "lib/noise.glsl"
#include "lib/grain.glsl"

in vec2 vUv;
out vec4 outColor;

uniform sampler2D uScene;
uniform float uFrame;
uniform float uSeed;
uniform float uGrain;
uniform vec2 uResolution;

void main() {
  vec3 col = texture(uScene, vUv).rgb;
  vec2 q = (vUv - 0.5) * vec2(9.0 / 16.0, 1.0);
  col *= 1.0 - 0.18 * dot(q, q) * 2.0;
  col = col * (1.0 - 0.012) + 0.012; // black is never quite empty
  // Grain scales with the output, so that every quality looks alike.
  vec2 px = vUv * uResolution / max(1.0, uResolution.x / 1080.0);
  col = applyGrain(col, px, uFrame, uSeed, uGrain);
  col += (hash12(gl_FragCoord.xy + uFrame) - 0.5) / 255.0;
  outColor = vec4(clamp(col, 0.0, 1.0), 1.0);
}
