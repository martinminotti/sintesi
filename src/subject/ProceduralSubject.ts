import * as THREE from 'three';
import { FULLSCREEN_VERT, glsl } from '../rendering/glsl';
import type { SubjectSource } from './SubjectSource';
import { ALTERNATIVES, ARCHIVE_TRUTH, SYNTHESIS, type Hypothesis } from './hypotheses';
import { MAX_REGIONS } from './regions';

import type { Composition } from '../config';
export const COMPOSITION_INDEX: Record<Composition, number> = { A: 0, B: 1, C: 2 };

/**
 * Builds the demo subject on the GPU, once, in tiles (so that no single draw
 * call runs long enough to trip a GPU watchdog at 2160 × 3840).
 */
export function createProceduralSubject(
  renderer: THREE.WebGLRenderer,
  opts: { width: number; height: number; seed: number; steps: number; supersample: number; composition: Composition },
): SubjectSource {
  const material = new THREE.RawShaderMaterial({
    glslVersion: THREE.GLSL3,
    vertexShader: FULLSCREEN_VERT,
    fragmentShader: glsl('passes/subject.frag'),
    uniforms: {
      uSeed: { value: opts.seed },
      uOutput: { value: 0 },
      uSteps: { value: opts.steps },
      uResolution: { value: new THREE.Vector2(opts.width, opts.height) },
      uComposition: { value: COMPOSITION_INDEX[opts.composition] },
      uMono: { value: 0 },
      uSupersample: { value: opts.supersample },
      uHeadDir: { value: new THREE.Vector3() },
      uTransomY: { value: 0 },
      uOutside: { value: 0 },
      uWallObject: { value: 0 },
      uVessel: { value: 0 },
      uCoat: { value: new THREE.Vector3() },
      uSun: { value: 0 },
    },
    depthTest: false,
    depthWrite: false,
  });
  const quad = fullscreenTriangle(material);
  const scene = new THREE.Scene();
  scene.add(quad);
  const camera = new THREE.Camera();

  const make = (w: number, h: number, mipmaps: boolean, type: THREE.TextureDataType = THREE.UnsignedByteType): THREE.WebGLRenderTarget => {
    const rt = new THREE.WebGLRenderTarget(w, h, {
      type,
      format: THREE.RGBAFormat,
      generateMipmaps: mipmaps,
      minFilter: mipmaps ? THREE.LinearMipmapLinearFilter : THREE.NearestFilter,
      magFilter: mipmaps ? THREE.LinearFilter : THREE.NearestFilter,
      depthBuffer: false,
    });
    rt.texture.colorSpace = THREE.NoColorSpace;
    return rt;
  };

  const apply = (h: Hypothesis, mono: boolean, output: number): void => {
    const u = material.uniforms;
    (u.uHeadDir.value as THREE.Vector3).set(...h.headDir);
    u.uTransomY.value = h.transomY;
    u.uOutside.value = h.outside;
    u.uWallObject.value = h.wallObject;
    u.uVessel.value = h.vessel;
    (u.uCoat.value as THREE.Vector3).set(...h.coat);
    u.uSun.value = h.sun;
    u.uMono.value = mono ? 1 : 0;
    u.uOutput.value = output;
  };

  const renderInto = (rt: THREE.WebGLRenderTarget): void => {
    const prevAutoClear = renderer.autoClear;
    renderer.autoClear = false;
    renderer.setRenderTarget(rt);
    renderer.clear();
    const tilesY = Math.max(1, Math.ceil(rt.height / 480));
    for (let i = 0; i < tilesY; i++) {
      const y0 = Math.floor((i * rt.height) / tilesY);
      const y1 = Math.floor(((i + 1) * rt.height) / tilesY);
      rt.scissor.set(0, y0, rt.width, y1 - y0);
      rt.scissorTest = true;
      renderer.render(scene, camera);
    }
    rt.scissorTest = false;
    renderer.setRenderTarget(null);
    renderer.autoClear = prevAutoClear;
  };

  const { width, height } = opts;
  const observed = make(width, height, true);
  apply(ARCHIVE_TRUTH, true, 0);
  renderInto(observed);

  const synthesis = make(width, height, true);
  apply(SYNTHESIS, false, 0);
  renderInto(synthesis);

  const alternatives = ALTERNATIVES.map((h) => {
    const rt = make(width, height, true);
    apply(h, false, 0);
    renderInto(rt);
    return rt;
  });

  const data = make(width, height, false, THREE.HalfFloatType);
  apply(SYNTHESIS, false, 1);
  renderInto(data);

  // Region statistics, from a small 8-bit copy of the data pass.
  const sw = 90, sh = 160;
  const small = make(sw, sh, false);
  material.uniforms.uResolution.value.set(sw, sh);
  renderInto(small);
  const px = new Uint8Array(sw * sh * 4);
  renderer.readRenderTargetPixels(small, 0, 0, sw, sh, px);
  const count = new Array(MAX_REGIONS).fill(0);
  const cx = new Array(MAX_REGIONS).fill(0);
  const cy = new Array(MAX_REGIONS).fill(0);
  for (let y = 0; y < sh; y++) {
    for (let x = 0; x < sw; x++) {
      const id = Math.min(MAX_REGIONS - 1, Math.round((px[(y * sw + x) * 4 + 1] / 255) * 16));
      count[id]++;
      cx[id] += (x + 0.5) / sw;
      cy[id] += 1 - (y + 0.5) / sh;
    }
  }
  small.dispose();

  material.dispose();
  quad.geometry.dispose();

  return {
    kind: 'procedural',
    width,
    height,
    observed: observed.texture,
    synthesis: synthesis.texture,
    alternatives: alternatives.map((rt) => rt.texture),
    data: data.texture,
    regionArea: count.map((c) => c / (sw * sh)),
    regionCentroid: count.map((c, i) => (c ? { x: cx[i] / c, y: cy[i] / c } : { x: 0.5, y: 0.5 })),
    targets: [observed, synthesis, ...alternatives, data],
  };
}

export function fullscreenTriangle(material: THREE.Material): THREE.Mesh {
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.BufferAttribute(new Float32Array([-1, -1, 0, 3, -1, 0, -1, 3, 0]), 3));
  const mesh = new THREE.Mesh(geometry, material);
  mesh.frustumCulled = false;
  return mesh;
}
