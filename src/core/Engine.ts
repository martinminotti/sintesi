import * as THREE from 'three';
import { WORLD, type EngineConfig } from '../config';
import type { Dataset } from '../evidence/types';
import type { Timeline } from '../timeline/timeline';
import { createProceduralSubject, fullscreenTriangle } from '../subject/ProceduralSubject';
import { focusFromData, loadFileSubject } from '../subject/FileSubject';
import type { SubjectSource } from '../subject/SubjectSource';
import { FULLSCREEN_VERT, glsl } from '../rendering/glsl';
import { Atlas } from '../rendering/Atlas';
import { registerAtlasContent } from '../rendering/atlasContent';
import { EdgeLayer, FragmentLayer } from '../rendering/layers';
import { Choreography, type Frame } from './choreography';
import { computeArtworkState, type ArtworkState } from '../confidence/artworkState';
import { CLASS_CONFIDENCE, CLASS_ORDER, MAX_REGIONS, REGIONS } from '../subject/regions';
import { datasetHash } from '../data/loadDataset';

export type EngineView = 'work' | 'subject-observed' | 'subject-synthesis' | 'subject-alt1' | 'subject-alt2' | 'subject-alt3' | 'subject-data' | 'field' | 'epistemic' | 'subject-data-raw';

/** Focus distance (m) of the photographic response, per composition. */
const FOCUS: Record<string, number> = { A: 0.86, B: 1.95, C: 1.43 };

const MAX_ANCHORS = 24;

/**
 * The engine owns the GPU resources and renders any instant of the work.
 * renderAt(t) is a pure function of t: no state carries over between frames.
 */
export class Engine {
  readonly renderer: THREE.WebGLRenderer;
  view: EngineView;
  subject!: SubjectSource;
  choreography!: Choreography;
  private atlas!: Atlas;
  private fragments!: FragmentLayer;
  private edges!: EdgeLayer;

  private camera: THREE.OrthographicCamera;
  private scene = new THREE.Scene();
  private sceneRT!: THREE.WebGLRenderTarget;
  private fieldRT!: THREE.WebGLRenderTarget;

  private fieldMat!: THREE.RawShaderMaterial;
  private fieldScene = new THREE.Scene();
  private compositeMat!: THREE.RawShaderMaterial;
  private compositeMesh!: THREE.Mesh;
  private postMat!: THREE.RawShaderMaterial;
  private postScene = new THREE.Scene();
  private debugMat!: THREE.RawShaderMaterial;
  private debugScene = new THREE.Scene();
  private screenCamera = new THREE.Camera();

  constructor(
    readonly canvas: HTMLCanvasElement,
    readonly config: EngineConfig,
    readonly dataset: Dataset,
    readonly timeline: Timeline,
    readonly opts: { preserveDrawingBuffer: boolean; view: EngineView },
  ) {
    this.view = opts.view;
    this.renderer = new THREE.WebGLRenderer({
      canvas,
      antialias: false,
      alpha: false,
      preserveDrawingBuffer: opts.preserveDrawingBuffer,
      powerPreference: 'high-performance',
    });
    this.renderer.setPixelRatio(1);
    this.renderer.setSize(config.width, config.height, false);
    this.renderer.outputColorSpace = THREE.LinearSRGBColorSpace;
    this.camera = new THREE.OrthographicCamera(-WORLD.width / 2, WORLD.width / 2, WORLD.height / 2, -WORLD.height / 2, -10, 10);
  }

  async init(): Promise<void> {
    const { width, height, seed, quality } = this.config;
    await Promise.all([
      document.fonts.load(`300 32px Inter`),
      document.fonts.load(`400 32px Inter`),
      document.fonts.load(`400 32px "IBM Plex Mono"`),
    ]);

    this.subject = this.config.subject
      ? await loadFileSubject(`archive/synthesis/${this.config.subject}`, width, height)
      : createProceduralSubject(this.renderer, { width, height, seed, steps: quality.subjectSteps, supersample: quality.subjectSupersample, composition: this.config.composition });

    const ppu = width / WORLD.width;
    this.atlas = new Atlas(ppu);
    registerAtlasContent(this.atlas, this.dataset, this.timeline, seed);
    this.atlas.build();
    this.choreography = new Choreography(this.dataset, this.timeline, this.atlas, seed, this.config.typography, this.subject.regionCentroid);
    this.choreography.prepare();

    const rtOpts = { type: THREE.HalfFloatType, depthBuffer: false, generateMipmaps: false, minFilter: THREE.LinearFilter, magFilter: THREE.LinearFilter } as const;
    this.sceneRT = new THREE.WebGLRenderTarget(width, height, rtOpts);
    this.fieldRT = new THREE.WebGLRenderTarget(Math.round(width * quality.fieldScale), Math.round(height * quality.fieldScale), rtOpts);

    // Confidence field.
    this.fieldMat = new THREE.RawShaderMaterial({
      glslVersion: THREE.GLSL3,
      vertexShader: FULLSCREEN_VERT,
      fragmentShader: glsl('passes/field.frag'),
      uniforms: {
        uAnchorRect: { value: Array.from({ length: MAX_ANCHORS }, () => new THREE.Vector4()) },
        uAnchorParams: { value: Array.from({ length: MAX_ANCHORS }, () => new THREE.Vector2()) },
        uAnchorCount: { value: 0 },
        uReach: { value: 0 },
        uTime: { value: 0 },
        uSeed: { value: seed % 1000 },
      },
      depthTest: false,
      depthWrite: false,
    });
    this.fieldScene.add(fullscreenTriangle(this.fieldMat));

    // Inferred picture, occupying the whole frame in world space.
    this.compositeMat = new THREE.RawShaderMaterial({
      glslVersion: THREE.GLSL3,
      vertexShader: `in vec3 position; in vec2 uv; uniform mat4 projectionMatrix; uniform mat4 modelViewMatrix; out vec2 vUv;
        void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`,
      fragmentShader: glsl('passes/composite.frag'),
      uniforms: {
        uSynthesis: { value: this.subject.synthesis },
        uAlt0: { value: this.subject.alternatives[0] },
        uAlt1: { value: this.subject.alternatives[1] },
        uAlt2: { value: this.subject.alternatives[2] },
        uData: { value: this.subject.data },
        uField: { value: this.fieldRT.texture },
        uConfidence: { value: Array.from({ length: MAX_REGIONS }, (_, i) => CLASS_CONFIDENCE[REGIONS[i]?.class ?? 'absent']) },
        uAcceptance: { value: new Array(MAX_REGIONS).fill(0) },
        uPresence: { value: new Array(MAX_REGIONS).fill(0) },
        uPhoto: { value: 0 },
        uProposal: { value: 0 },
        uFocus: { value: focusFromData(this.subject) ?? FOCUS[this.config.composition] ?? 1.4 },
        uTime: { value: 0 },
        uSeed: { value: seed % 1000 },
        uTaps: { value: quality.blurTaps },
      },
      depthTest: false,
      depthWrite: false,
    });
    this.compositeMesh = new THREE.Mesh(new THREE.PlaneGeometry(WORLD.width, WORLD.height), this.compositeMat);
    this.compositeMesh.frustumCulled = false;

    this.edges = new EdgeLayer(256, 1 / ppu);
    this.fragments = new FragmentLayer(256, this.atlas.texture, this.subject.observed, quality.blurTaps, seed);
    this.compositeMesh.renderOrder = 0;
    this.edges.mesh.renderOrder = 1;
    this.fragments.mesh.renderOrder = 2;
    this.scene.add(this.compositeMesh, this.edges.mesh, this.fragments.mesh);

    this.postMat = new THREE.RawShaderMaterial({
      glslVersion: THREE.GLSL3,
      vertexShader: FULLSCREEN_VERT,
      fragmentShader: glsl('passes/post.frag'),
      uniforms: {
        uScene: { value: this.sceneRT.texture },
        uFrame: { value: 0 },
        uSeed: { value: seed % 1000 },
        uGrain: { value: quality.grain },
        uResolution: { value: new THREE.Vector2(width, height) },
      },
      depthTest: false,
      depthWrite: false,
    });
    this.postScene.add(fullscreenTriangle(this.postMat));

    this.debugMat = new THREE.RawShaderMaterial({
      glslVersion: THREE.GLSL3,
      vertexShader: FULLSCREEN_VERT,
      fragmentShader: `precision highp float; in vec2 vUv; out vec4 o; uniform sampler2D uTex; uniform int uMode; uniform float uClass[16];
        void main(){ vec4 c = texture(uTex, vUv);
          if (uMode == 1) o = vec4(c.r, fract(c.g * 16.0 * 0.37), fract(c.g * 16.0 * 0.61), 1.0);
          else if (uMode == 2) o = vec4(vec3(c.r) * vec3(1.0, 0.92, 0.8) + vec3(0.0, 0.0, c.b * 0.4), 1.0);
          else if (uMode == 3) { int id = int(floor(c.g * 16.0 + 0.5)); float cls = uClass[id];
            // observed white · derived light · inferred mid · synthetic dark · absent hatched black
            float v = cls < 0.5 ? 0.95 : cls < 1.5 ? 0.7 : cls < 2.5 ? 0.45 : cls < 3.5 ? 0.22 : 0.06 + 0.1 * step(0.5, fract((gl_FragCoord.x + gl_FragCoord.y) / 12.0));
            o = vec4(vec3(v), 1.0); }
          else o = vec4(c.rgb, 1.0); }`,
      uniforms: { uTex: { value: null }, uMode: { value: 0 }, uClass: { value: Array.from({ length: MAX_REGIONS }, (_, i) => CLASS_ORDER.indexOf(REGIONS[i]?.class ?? 'absent')) } },
    });
    this.debugScene.add(fullscreenTriangle(this.debugMat));

    // Compile every program now, so errors surface at startup, not mid-render.
    this.compositeMesh.visible = true;
    this.renderer.compile(this.scene, this.camera);
    this.renderer.compile(this.fieldScene, this.screenCamera);
    this.renderer.compile(this.postScene, this.screenCamera);
  }

  /** Render the instant t (seconds). */
  renderAt(t: number): Frame {
    const frame = this.choreography.evaluate(t);
    const r = this.renderer;
    const inference = frame.field.reach > 0 || frame.field.anchors.length > 0;

    // 1. Confidence field and attention.
    if (inference) {
      const u = this.fieldMat.uniforms;
      const anchors = frame.field.anchors.slice(0, MAX_ANCHORS);
      anchors.forEach((a, i) => {
        (u.uAnchorRect.value[i] as THREE.Vector4).set(a.rect.x, a.rect.y, a.rect.w, a.rect.h);
        (u.uAnchorParams.value[i] as THREE.Vector2).set(a.confidence, a.arrival);
      });
      u.uAnchorCount.value = anchors.length;
      u.uReach.value = frame.field.reach;
      u.uTime.value = t;
      r.setRenderTarget(this.fieldRT);
      r.render(this.fieldScene, this.screenCamera);
    }
    const cu = this.compositeMat.uniforms;
    for (const rs of frame.regions) {
      cu.uAcceptance.value[rs.id] = rs.acceptance;
      cu.uPresence.value[rs.id] = rs.presence;
    }
    cu.uPhoto.value = frame.photo;
    cu.uProposal.value = frame.proposal;

    // 2. Scene: inferred picture, relationships, evidence.
    this.compositeMesh.visible = inference;
    this.compositeMat.uniforms.uTime.value = t;
    this.edges.update(frame.edges, t);
    this.fragments.update(frame.elements, t);
    this.camera.zoom = frame.camera.zoom;
    this.camera.updateProjectionMatrix();
    r.setRenderTarget(this.sceneRT);
    r.setClearColor(0x000000, 1);
    r.clear();
    r.render(this.scene, this.camera);

    // 3. Output.
    r.setRenderTarget(null);
    const view = this.view;
    if (view === 'work') {
      this.postMat.uniforms.uFrame.value = Math.round(t * this.config.fps);
      r.render(this.postScene, this.screenCamera);
    } else {
      const tex = { 'subject-observed': this.subject.observed, 'subject-synthesis': this.subject.synthesis, 'subject-alt1': this.subject.alternatives[0], 'subject-alt2': this.subject.alternatives[1], 'subject-alt3': this.subject.alternatives[2], 'subject-data': this.subject.data, field: this.fieldRT.texture, epistemic: this.subject.data, 'subject-data-raw': this.subject.data }[view];
      this.debugMat.uniforms.uTex.value = tex;
      this.debugMat.uniforms.uMode.value = view === 'subject-data' ? 1 : view === 'field' ? 2 : view === 'epistemic' ? 3 : 0;
      r.render(this.debugScene, this.screenCamera);
    }
    return frame;
  }

  artworkState(t: number): ArtworkState {
    return computeArtworkState(this.choreography.evaluate(t), this.config.seed, this.subject.regionArea, this.choreography.graph.edges.length);
  }

  info() {
    const gl = this.renderer.getContext();
    const ext = gl.getExtension('WEBGL_debug_renderer_info');
    return {
      width: this.config.width,
      height: this.config.height,
      fps: this.config.fps,
      duration: this.timeline.duration,
      frames: Math.round(this.timeline.duration * this.config.fps),
      seed: this.config.seed,
      quality: this.config.quality.name,
      timeline: this.timeline.name,
      dataset: this.dataset.name,
      datasetHash: datasetHash(this.dataset),
      renderer: ext ? String(gl.getParameter(ext.UNMASKED_RENDERER_WEBGL)) : 'unknown',
    };
  }

  /**
   * Measures what confidence does to an image: renders one archived photograph
   * at decreasing coherence and reports its mean luminance (energy) and its
   * correlation with the certain version (structure). The work requires
   * structure to fall much faster than energy.
   */
  probeCoherence(levels = [1, 0.8, 0.6, 0.4, 0.2]): { k: number; meanLuma: number; structure: number; layout: number }[] {
    const ev = this.dataset.evidence.find((e) => e.type === 'photograph');
    if (!ev?.visualProperties?.crop) return [];
    const c = ev.visualProperties.crop;
    const size = 256;
    const rt = new THREE.WebGLRenderTarget(size, size, { depthBuffer: false });
    const layer = new FragmentLayer(1, this.atlas.texture, this.subject.observed, this.config.quality.blurTaps, this.config.seed);
    const cam = new THREE.OrthographicCamera(-1, 1, 1, -1, -1, 1);
    const scene = new THREE.Scene();
    scene.add(layer.mesh);
    const aspect = (c.w * WORLD.width) / (c.h * WORLD.height);
    const w = aspect >= 1 ? 1.6 : 1.6 * aspect;
    const h = aspect >= 1 ? 1.6 / aspect : 1.6;
    const px = new Uint8Array(size * size * 4);
    const read = (k: number): Float32Array => {
      layer.update([{ id: 'probe', kind: 'evidence', x: 0, y: 0, w, h, confidence: k, k, source: 1, uv: [c.x, 1 - c.y - c.h, c.w, c.h], seed: 1, visibility: 1 }], 3.0);
      this.renderer.setRenderTarget(rt);
      this.renderer.setClearColor(0x000000, 1);
      this.renderer.clear();
      this.renderer.render(scene, cam);
      this.renderer.readRenderTargetPixels(rt, 0, 0, size, size, px);
      const l = new Float32Array(size * size);
      for (let i = 0; i < l.length; i++) l[i] = (0.2126 * px[i * 4] + 0.7152 * px[i * 4 + 1] + 0.0722 * px[i * 4 + 2]) / 255;
      return l;
    };
    // Structure = spatial detail: the image minus its local mean (high-pass),
    // so that a blurred silhouette does not count as preserved structure.
    const highpass = (img: Float32Array): Float32Array => {
      const r = 6;
      const integral = new Float64Array((size + 1) * (size + 1));
      for (let y = 0; y < size; y++) for (let x = 0; x < size; x++) {
        integral[(y + 1) * (size + 1) + x + 1] = img[y * size + x] + integral[y * (size + 1) + x + 1] + integral[(y + 1) * (size + 1) + x] - integral[y * (size + 1) + x];
      }
      const out = new Float32Array(size * size);
      for (let y = 0; y < size; y++) for (let x = 0; x < size; x++) {
        const x0 = Math.max(0, x - r), x1 = Math.min(size, x + r + 1), y0 = Math.max(0, y - r), y1 = Math.min(size, y + r + 1);
        const sum = integral[y1 * (size + 1) + x1] - integral[y0 * (size + 1) + x1] - integral[y1 * (size + 1) + x0] + integral[y0 * (size + 1) + x0];
        out[y * size + x] = img[y * size + x] - sum / ((x1 - x0) * (y1 - y0));
      }
      return out;
    };
    // Analyse only the interior of the trace, away from its border with the black field.
    const inner: number[] = [];
    const hx = (w / 2) * 0.8 * (size / 2), hy = (h / 2) * 0.8 * (size / 2);
    for (let y = 0; y < size; y++) for (let x = 0; x < size; x++) {
      if (Math.abs(x + 0.5 - size / 2) < hx && Math.abs(y + 0.5 - size / 2) < hy) inner.push(y * size + x);
    }
    const pick = (a: Float32Array): Float32Array => Float32Array.from(inner, (i) => a[i]);
    const corr = (a0: Float32Array, b0: Float32Array): number => {
      const a = pick(a0), b = pick(b0);
      let ma = 0, mb = 0;
      for (let i = 0; i < a.length; i++) { ma += a[i]; mb += b[i]; }
      ma /= a.length; mb /= b.length;
      let cov = 0, va = 0, vb = 0;
      for (let i = 0; i < a.length; i++) { cov += (a[i] - ma) * (b[i] - mb); va += (a[i] - ma) ** 2; vb += (b[i] - mb) ** 2; }
      return cov / Math.max(1e-9, Math.sqrt(va * vb));
    };
    const mean = (a0: Float32Array): number => { const a = pick(a0); return a.reduce((s, v) => s + v, 0) / a.length; };
    const ref = read(1);
    const refDetail = highpass(ref);
    const refMean = mean(ref);
    const out = levels.map((k) => {
      const img = read(k);
      return { k, meanLuma: mean(img) / Math.max(1e-6, refMean), structure: corr(highpass(img), refDetail), layout: corr(img, ref) };
    });
    this.renderer.setRenderTarget(null);
    rt.dispose();
    layer.material.dispose();
    return out;
  }
}
