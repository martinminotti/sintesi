// Evidence fragments: one instanced quad per element of the archive.
in vec3 position;
in vec4 iRect;   // centre x, y, width, height (world)
in vec4 iUV;     // source rect u0, v0, du, dv
in vec4 iParams; // coherence k, source (0 atlas, 1 observed), seed, visibility

uniform mat4 projectionMatrix;
uniform mat4 viewMatrix;

out vec2 vLocal;
out vec4 vUV;
out vec4 vParams;
out vec2 vSize;

void main() {
  float k = iParams.x;
  // Uncertain elements occupy more space than their content: pieces spill.
  float margin = 1.0 + 0.9 * (1.0 - k) * (1.0 - k);
  vec2 extra = vec2(0.35) * (1.0 - k) * (1.0 - k); // world units
  vec2 size = iRect.zw * margin + extra;
  vec2 world = iRect.xy + position.xy * size;
  vLocal = position.xy * size / iRect.zw + 0.5;
  vUV = iUV;
  vParams = iParams;
  vSize = iRect.zw;
  gl_Position = projectionMatrix * viewMatrix * vec4(world, 0.0, 1.0);
}
