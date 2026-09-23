import type * as THREE from 'three';

/**
 * The image the system is reconstructing, as three aligned layers.
 *
 *   observed — what the archive photographs recorded (grayscale).
 *   inferred — the system's belief about the whole scene (colour).
 *   data     — R: linear depth, G: region id / 8, B: material id / 16.
 *
 * The procedural demo subject fills these on the GPU. A produced subject
 * (ComfyUI image + depth estimate + segmentation) will fill them from files.
 */
export interface SubjectSource {
  kind: 'procedural' | 'files';
  width: number;
  height: number;
  observed: THREE.Texture;
  inferred: THREE.Texture;
  data: THREE.Texture;
  /** Owned render targets, if any (for disposal). */
  targets?: THREE.WebGLRenderTarget[];
}
