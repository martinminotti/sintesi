import type * as THREE from 'three';

/**
 * The picture the system is reconstructing, as aligned layers.
 *
 *   observed      what the archive photographs recorded (black and white)
 *   synthesis     the hypothesis the system will accept
 *   alternatives  other hypotheses, held while uncertainty is still shown
 *   data          R: linear depth (/4 m) · G: region id / 16
 *
 * The procedural demo subject fills these on the GPU. A produced subject
 * (ComfyUI image + variants + depth + painted epistemic map) fills them from files.
 */
export interface SubjectSource {
  kind: 'procedural' | 'files';
  width: number;
  height: number;
  observed: THREE.Texture;
  synthesis: THREE.Texture;
  alternatives: THREE.Texture[];
  data: THREE.Texture;
  /** Fraction of the picture occupied by each region id. */
  regionArea: number[];
  /** Normalised centroid (origin top-left) of each region id. */
  regionCentroid: { x: number; y: number }[];
  targets?: THREE.WebGLRenderTarget[];
}
