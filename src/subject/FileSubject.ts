import * as THREE from 'three';
import type { SubjectSource } from './SubjectSource';
import { MAX_REGIONS } from './regions';

/**
 * A produced subject, read from a synthesis session folder
 * (tools/comfy/run_session.py → archive/synthesis/<session>/):
 *
 *   observed.png  synthesis.png  alt-1.png alt-2.png alt-3.png
 *   depth.png     (bright = near, as Depth Anything writes it)
 *   mask-figure.png  the person: an inference between the archived fragments
 *   mask-view.png mask-wall.png mask-vessel.png mask-coat.png mask-gaze.png
 *                    the decisions the archive does not support
 *
 * Everything else is the photograph regenerated from its own evidence: derived.
 */
const MASK_REGION: Record<string, number> = { figure: 7, view: 3, wall: 11, vessel: 5, coat: 6, gaze: 12 };
/** Later masks win where they overlap. */
const MASK_ORDER = ['figure', 'view', 'wall', 'coat', 'vessel', 'gaze'];
const DEFAULT_REGION = 1;

async function loadImage(url: string): Promise<HTMLImageElement> {
  const img = new Image();
  img.src = url;
  try {
    await img.decode();
  } catch {
    throw new Error(`subject file missing or unreadable: ${url}`);
  }
  return img;
}

function pixels(img: HTMLImageElement, w: number, h: number): Uint8ClampedArray {
  const c = document.createElement('canvas');
  c.width = w;
  c.height = h;
  const ctx = c.getContext('2d', { willReadFrequently: true })!;
  // Flip vertically: textures are addressed bottom-up.
  ctx.translate(0, h);
  ctx.scale(1, -1);
  ctx.drawImage(img, 0, 0, w, h);
  return ctx.getImageData(0, 0, w, h).data;
}

function colourTexture(img: HTMLImageElement): THREE.Texture {
  const t = new THREE.Texture(img);
  t.colorSpace = THREE.NoColorSpace;
  t.generateMipmaps = true;
  t.minFilter = THREE.LinearMipmapLinearFilter;
  t.magFilter = THREE.LinearFilter;
  t.needsUpdate = true;
  return t;
}

export async function loadFileSubject(base: string, width: number, height: number): Promise<SubjectSource> {
  const url = (name: string) => `${base.replace(/\/$/, '')}/${name}`;
  const [observed, synthesis, a1, a2, a3, depth, ...masks] = await Promise.all([
    'observed.png', 'synthesis.png', 'alt-1.png', 'alt-2.png', 'alt-3.png', 'depth.png',
    ...MASK_ORDER.map((m) => `mask-${m}.png`),
  ].map((n) => loadImage(url(n))));

  // The data layer (depth, region id), composed on the CPU at the output size.
  const d = pixels(depth, width, height);
  const m = masks.map((img) => pixels(img, width, height));
  const data = new Uint8Array(width * height * 4);
  const count = new Array(MAX_REGIONS).fill(0);
  const cx = new Array(MAX_REGIONS).fill(0);
  const cy = new Array(MAX_REGIONS).fill(0);
  for (let i = 0; i < width * height; i++) {
    let region = DEFAULT_REGION;
    MASK_ORDER.forEach((name, k) => { if (m[k][i * 4] > 127) region = MASK_REGION[name]; });
    data[i * 4] = 255 - d[i * 4]; // distance-like: 0 near, 1 far
    data[i * 4 + 1] = Math.round((region / 16) * 255);
    data[i * 4 + 3] = 255;
    count[region]++;
    cx[region] += (i % width) / width;
    cy[region] += 1 - Math.floor(i / width) / height;
  }
  const dataTex = new THREE.DataTexture(data, width, height, THREE.RGBAFormat, THREE.UnsignedByteType);
  dataTex.minFilter = THREE.NearestFilter;
  dataTex.magFilter = THREE.NearestFilter;
  dataTex.colorSpace = THREE.NoColorSpace;
  dataTex.needsUpdate = true;

  const total = width * height;
  return {
    kind: 'files',
    width,
    height,
    observed: colourTexture(observed),
    synthesis: colourTexture(synthesis),
    alternatives: [a1, a2, a3].map(colourTexture),
    data: dataTex,
    regionArea: count.map((c) => c / total),
    regionCentroid: count.map((c, i) => (c ? { x: cx[i] / c, y: cy[i] / c } : { x: 0.5, y: 0.5 })),
  };
}

/** Focus of the photographic response: the gaze (the face), in the data layer's units (× 4). */
export function focusFromData(subject: SubjectSource): number | null {
  if (subject.kind !== 'files') return null;
  const tex = subject.data as THREE.DataTexture;
  const px = tex.image.data as Uint8Array;
  const { width, height } = tex.image;
  const c = subject.regionCentroid[12];
  if (!subject.regionArea[12]) return null;
  const i = (Math.floor(c.y * (height - 1)) * width + Math.floor(c.x * (width - 1))) * 4;
  return (px[i] / 255) * 4;
}
