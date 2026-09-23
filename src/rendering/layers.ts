import * as THREE from 'three';
import type { EdgeState, ElementState } from '../core/choreography';
import { glsl } from './glsl';

export const INK = new THREE.Vector3(0.914, 0.902, 0.878);

const premultiplied = {
  transparent: true,
  depthTest: false,
  depthWrite: false,
  blending: THREE.CustomBlending,
  blendEquation: THREE.AddEquation,
  blendSrc: THREE.OneFactor,
  blendDst: THREE.OneMinusSrcAlphaFactor,
  blendSrcAlpha: THREE.OneFactor,
  blendDstAlpha: THREE.OneMinusSrcAlphaFactor,
} as const;

/** Instanced quads for every element: evidence, labels, concepts, titles. */
export class FragmentLayer {
  readonly mesh: THREE.Mesh;
  readonly material: THREE.RawShaderMaterial;
  private geometry: THREE.InstancedBufferGeometry;
  private rect: THREE.InstancedBufferAttribute;
  private uv: THREE.InstancedBufferAttribute;
  private params: THREE.InstancedBufferAttribute;

  constructor(readonly capacity: number, atlas: THREE.Texture, observed: THREE.Texture, taps: number, seed: number) {
    const base = new THREE.PlaneGeometry(1, 1);
    this.geometry = new THREE.InstancedBufferGeometry();
    this.geometry.index = base.index;
    this.geometry.setAttribute('position', base.getAttribute('position'));
    this.rect = new THREE.InstancedBufferAttribute(new Float32Array(capacity * 4), 4);
    this.uv = new THREE.InstancedBufferAttribute(new Float32Array(capacity * 4), 4);
    this.params = new THREE.InstancedBufferAttribute(new Float32Array(capacity * 4), 4);
    for (const a of [this.rect, this.uv, this.params]) a.setUsage(THREE.DynamicDrawUsage);
    this.geometry.setAttribute('iRect', this.rect);
    this.geometry.setAttribute('iUV', this.uv);
    this.geometry.setAttribute('iParams', this.params);
    this.material = new THREE.RawShaderMaterial({
      glslVersion: THREE.GLSL3,
      vertexShader: glsl('passes/fragment.vert'),
      fragmentShader: glsl('passes/fragment.frag'),
      uniforms: {
        uAtlas: { value: atlas },
        uObserved: { value: observed },
        uTime: { value: 0 },
        uSeed: { value: seed % 1000 },
        uTaps: { value: taps },
        uInk: { value: INK },
      },
      ...premultiplied,
    });
    this.mesh = new THREE.Mesh(this.geometry, this.material);
    this.mesh.frustumCulled = false;
  }

  update(elements: ElementState[], t: number): void {
    let n = 0;
    for (const e of elements) {
      if (e.k <= 0.001 || n >= this.capacity) continue;
      this.rect.setXYZW(n, e.x, e.y, e.w, e.h);
      this.uv.setXYZW(n, e.uv[0], e.uv[1], e.uv[2], e.uv[3]);
      this.params.setXYZW(n, e.k, e.source, e.seed, 0);
      n++;
    }
    this.geometry.instanceCount = n;
    this.rect.needsUpdate = this.uv.needsUpdate = this.params.needsUpdate = true;
    this.material.uniforms.uTime.value = t;
  }
}

/** Relationship lines. */
export class EdgeLayer {
  readonly mesh: THREE.Mesh;
  readonly material: THREE.RawShaderMaterial;
  private geometry: THREE.InstancedBufferGeometry;
  private ab: THREE.InstancedBufferAttribute;
  private params: THREE.InstancedBufferAttribute;

  constructor(readonly capacity: number, pixel: number) {
    const base = new THREE.PlaneGeometry(1, 1, 48, 1);
    this.geometry = new THREE.InstancedBufferGeometry();
    this.geometry.index = base.index;
    this.geometry.setAttribute('position', base.getAttribute('position'));
    this.ab = new THREE.InstancedBufferAttribute(new Float32Array(capacity * 4), 4);
    this.params = new THREE.InstancedBufferAttribute(new Float32Array(capacity * 4), 4);
    this.ab.setUsage(THREE.DynamicDrawUsage);
    this.params.setUsage(THREE.DynamicDrawUsage);
    this.geometry.setAttribute('iAB', this.ab);
    this.geometry.setAttribute('iParams', this.params);
    this.material = new THREE.RawShaderMaterial({
      glslVersion: THREE.GLSL3,
      vertexShader: glsl('passes/edge.vert'),
      fragmentShader: glsl('passes/edge.frag'),
      uniforms: { uTime: { value: 0 }, uPixel: { value: pixel }, uInk: { value: INK } },
      ...premultiplied,
    });
    this.mesh = new THREE.Mesh(this.geometry, this.material);
    this.mesh.frustumCulled = false;
  }

  update(edges: EdgeState[], t: number): void {
    let n = 0;
    for (const e of edges) {
      if (n >= this.capacity) break;
      this.ab.setXYZW(n, e.a.x, e.a.y, e.b.x, e.b.y);
      this.params.setXYZW(n, e.strength, e.progress, e.k, e.seed);
      n++;
    }
    this.geometry.instanceCount = n;
    this.ab.needsUpdate = this.params.needsUpdate = true;
    this.material.uniforms.uTime.value = t;
  }
}
