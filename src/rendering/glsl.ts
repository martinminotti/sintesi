/**
 * Minimal GLSL module system: `#include "lib/noise.glsl"` is resolved
 * against the shaders/ directory at build time (bundled, works offline).
 */

const sources = import.meta.glob('../../shaders/**/*.{glsl,frag,vert}', {
  query: '?raw',
  import: 'default',
  eager: true,
}) as Record<string, string>;

const byPath = new Map<string, string>();
for (const [path, src] of Object.entries(sources)) {
  byPath.set(path.replace(/^.*?shaders\//, ''), src);
}

export function glsl(path: string, defines: Record<string, string | number> = {}): string {
  const seen = new Set<string>();
  const resolve = (p: string): string => {
    const src = byPath.get(p);
    if (src === undefined) throw new Error(`GLSL module not found: ${p}`);
    if (seen.has(p)) return `// (${p} already included)`;
    seen.add(p);
    return src.replace(/^[ \t]*#include\s+"([^"]+)"\s*$/gm, (_m, inc: string) => resolve(inc));
  };
  const header = Object.entries(defines)
    .map(([k, v]) => `#define ${k} ${v}`)
    .join('\n');
  return `precision highp float;\nprecision highp int;\n${header}\n${resolve(path)}`;
}

/** Shared fullscreen-triangle vertex shader. */
export const FULLSCREEN_VERT = `
in vec3 position;
out vec2 vUv;
void main() {
  vUv = position.xy * 0.5 + 0.5;
  gl_Position = vec4(position.xy, 0.0, 1.0);
}`;
