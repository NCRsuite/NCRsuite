import * as THREE from "three";
import { RoomEnvironment } from "three/examples/jsm/environments/RoomEnvironment.js";
import { renderRatio } from "./motion";

export const clamp = (v: number, a: number, b: number) => Math.min(b, Math.max(a, v));
export const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
export const sstep = (a: number, b: number, x: number) => {
  const t = clamp((x - a) / (b - a), 0, 1);
  return t * t * (3 - 2 * t);
};

/** Fixed device tier avoids resolution oscillation during a scroll gesture. */
export function applyPixelRatio(renderer: THREE.WebGLRenderer, cssW: number, cssH: number, mobile: boolean) {
  const ratio = renderRatio(window.devicePixelRatio, cssW, cssH, mobile, navigator.hardwareConcurrency || 0);
  if (Math.abs(renderer.getPixelRatio() - ratio) > 0.001) renderer.setPixelRatio(ratio);
}

/** Format compact (téléphone / petite tablette portrait) : interface et appareil en portrait dédiés. */
export const isCompact = () => window.innerWidth < 820;

export function createRenderer(canvas: HTMLCanvasElement, mobile: boolean, envIntensity: number) {
  const renderer = new THREE.WebGLRenderer({
    canvas,
    antialias: true,
    alpha: true,
    powerPreference: "high-performance",
  });
  applyPixelRatio(renderer, window.innerWidth, window.innerHeight, mobile);
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1;
  renderer.setClearColor(0x000000, 0);
  const pmrem = new THREE.PMREMGenerator(renderer);
  const envScene = new RoomEnvironment();
  const envRT = pmrem.fromScene(envScene, 0.04);
  envScene.dispose();
  pmrem.dispose();
  return { renderer, envMap: envRT.texture, envRT, envIntensity };
}

export function radialTexture(stops: [number, string][], size = 256) {
  const c = document.createElement("canvas");
  c.width = c.height = size;
  const ctx = c.getContext("2d")!;
  const g = ctx.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2);
  stops.forEach(([o, col]) => g.addColorStop(o, col));
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, size, size);
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

export function canvasTexture(c: HTMLCanvasElement, renderer: THREE.WebGLRenderer) {
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = Math.min(4, renderer.capabilities.getMaxAnisotropy());
  tex.generateMipmaps = true;
  tex.minFilter = THREE.LinearMipmapLinearFilter;
  tex.magFilter = THREE.LinearFilter;
  return tex;
}

export function disposeScene(scene: THREE.Object3D) {
  scene.traverse((o) => {
    const m = o as THREE.Mesh;
    if (m.geometry) m.geometry.dispose();
    const mat = m.material as THREE.Material | THREE.Material[] | undefined;
    if (mat) {
      (Array.isArray(mat) ? mat : [mat]).forEach((mm) => {
        const anyM = mm as THREE.MeshBasicMaterial;
        if (anyM.map) anyM.map.dispose();
        mm.dispose();
      });
    }
  });
}
