import * as THREE from "three";
import { RoundedBoxGeometry } from "three/examples/jsm/geometries/RoundedBoxGeometry.js";
import { VERTICALS } from "../verticals";
import { buildFloaters } from "./ui";
import { applyPixelRatio, canvasTexture, clamp, createRenderer, disposeScene, lerp, radialTexture, sstep } from "./common";

interface KF {
  dist: number;
  az: number;
  el: number;
  sx: number;
  sy: number;
  fit: number;
}

// Positions caméra par séquence : 0 = hero, 1..5 = chapitres
const KF_WIDE: KF[] = [
  { dist: 10.4, az: 0.1, el: 0.15, sx: 0, sy: 0.325, fit: 0.86 },
  { dist: 7.0, az: -0.42, el: 0.07, sx: 0.18, sy: 0, fit: 0.56 },
  { dist: 6.6, az: 0.5, el: 0.12, sx: -0.18, sy: 0, fit: 0.57 },
  { dist: 7.0, az: -0.52, el: -0.03, sx: 0.18, sy: 0, fit: 0.56 },
  { dist: 6.6, az: 0.5, el: 0.14, sx: -0.18, sy: 0, fit: 0.57 },
  { dist: 10.5, az: -0.22, el: 0.2, sx: 0.16, sy: 0, fit: 0.5 },
];
const KF_NARROW: KF[] = [
  { dist: 11, az: 0.08, el: 0.14, sx: 0, sy: 0.3, fit: 0.92 },
  { dist: 8, az: -0.3, el: 0.08, sx: 0, sy: -0.08, fit: 0.9 },
  { dist: 8, az: 0.34, el: 0.1, sx: 0, sy: -0.08, fit: 0.9 },
  { dist: 8, az: -0.34, el: -0.02, sx: 0, sy: -0.08, fit: 0.9 },
  { dist: 8, az: 0.34, el: 0.12, sx: 0, sy: -0.08, fit: 0.9 },
  { dist: 12, az: -0.14, el: 0.16, sx: 0, sy: -0.07, fit: 0.9 },
];

type V3 = [number, number, number];
interface FloaterDef {
  stage: number;
  key: string;
  to: V3;
  rot: V3;
  delay: number;
}
const PX = 256; // pixels logiques par unité monde
const FLOATERS: FloaterDef[] = VERTICALS.flatMap((_, i) => [
  { stage: i + 1, key: `vertical-${i}-0`, to: [-0.9, 0.8, 0.65] as V3, rot: [0, 0.08, 0] as V3, delay: 0 },
  { stage: i + 1, key: `vertical-${i}-1`, to: [0.95, 0.05, 1.1] as V3, rot: [0, -0.1, 0] as V3, delay: 1 },
  { stage: i + 1, key: `vertical-${i}-2`, to: [-0.55, -0.8, 1.45] as V3, rot: [0, 0.08, 0] as V3, delay: 2 },
]);

export interface StoryOptions {
  canvas: HTMLCanvasElement;
  views: HTMLCanvasElement[];
  mobile: boolean;
  getProgress: () => number;
  getHeroView: () => number;
  getHeroBottom?: () => number;
  onFrame: (s: number) => void;
}

interface FloaterRuntime {
  def: FloaterDef;
  mesh: THREE.Mesh;
  mat: THREE.MeshBasicMaterial;
  from: V3;
  to: V3;
}

export class StoryScene {
  private renderer: THREE.WebGLRenderer;
  private scene = new THREE.Scene();
  private camera = new THREE.PerspectiveCamera(32, 1, 1, 80);
  private device = new THREE.Group();
  private screenProgress = 0;
  private accentColor = new THREE.Color();
  private screens: THREE.Mesh[] = [];
  private overlays: THREE.MeshBasicMaterial[] = [];
  private floaters: FloaterRuntime[] = [];
  private shadow!: THREE.Mesh;
  private cursor!: THREE.Mesh;
  private compact: boolean;
  private devW: number;
  private devH: number;
  private fscale: number;
  private intro = 0;
  private lastHB = 0;
  private frame = 0;
  private halo!: THREE.Mesh;
  private envRT: THREE.WebGLRenderTarget;
  private raf = 0;
  private active = true;
  private s = 0;
  private mx = 0;
  private my = 0;
  private smx = 0;
  private smy = 0;
  private last = performance.now();
  private time = 0;
  private w = 1;
  private h = 1;
  private eff: number[][] = [];
  private ro: ResizeObserver;
  private onMove = (e: PointerEvent) => {
    if (e.pointerType !== "mouse") return;
    this.mx = (e.clientX / window.innerWidth) * 2 - 1;
    this.my = (e.clientY / window.innerHeight) * 2 - 1;
  };

  constructor(private o: StoryOptions) {
    // vues en portrait = appareil en portrait (tablette), sinon écran de bureau
    const v0 = o.views[0];
    this.compact = v0.height > v0.width;
    this.devW = this.compact ? 3.04 : 4.22;
    this.devH = this.compact ? 3.74 : 2.74;
    this.fscale = this.compact ? 0.8 : 1;
    const { renderer, envMap, envRT } = createRenderer(o.canvas, o.mobile, 0.9);
    this.renderer = renderer;
    this.envRT = envRT;
    this.scene.environment = envMap;
    this.scene.environmentIntensity = 0.85;
    this.build();
    this.resize();
    this.ro = new ResizeObserver(() => this.resize());
    this.ro.observe(o.canvas);
    if (!o.mobile) window.addEventListener("pointermove", this.onMove, { passive: true });
    document.addEventListener("visibilitychange", this.onVisibility);
    this.onVisibility();
  }

  private build() {
    const { renderer, scene, device } = { renderer: this.renderer, scene: this.scene, device: this.device };
    const mobile = this.o.mobile;

    // lumières
    const key = new THREE.DirectionalLight(0xffffff, 1.6);
    key.position.set(3, 5, 6);
    scene.add(key);
    scene.add(new THREE.AmbientLight(0xffffff, 0.35));

    // halo doux derrière l'appareil
    const haloTex = radialTexture([
      [0, "rgba(255,255,255,0.22)"],
      [0.5, "rgba(255,255,255,0.07)"],
      [1, "rgba(255,255,255,0)"],
    ]);
    this.halo = new THREE.Mesh(
      new THREE.PlaneGeometry(14, 14),
      new THREE.MeshBasicMaterial({ map: haloTex, transparent: true, depthWrite: false, toneMapped: false })
    );
    this.halo.position.z = -1.6;
    this.halo.renderOrder = -2;
    scene.add(this.halo);

    // ombre portée diffuse (appareil en suspension)
    const shTex = radialTexture([
      [0, "rgba(20,30,60,0.34)"],
      [0.6, "rgba(20,30,60,0.08)"],
      [1, "rgba(20,30,60,0)"],
    ]);
    this.shadow = new THREE.Mesh(
      new THREE.PlaneGeometry((6.4 * this.devW) / 4.22, (2.6 * this.devW) / 4.22),
      new THREE.MeshBasicMaterial({ map: shTex, transparent: true, depthWrite: false, toneMapped: false })
    );
    this.shadow.rotation.x = -Math.PI / 2;
    this.shadow.position.set(0, -(this.devH / 2 + 0.78), 0);
    this.shadow.renderOrder = -1;
    scene.add(this.shadow);

    // corps de l'écran
    const body = new THREE.Mesh(
      new RoundedBoxGeometry(this.devW, this.devH, 0.12, mobile ? 4 : 5, this.compact ? 0.17 : 0.07),
      new THREE.MeshStandardMaterial({ color: 0x1a1d24, metalness: 0.92, roughness: 0.3 })
    );
    device.add(body);
    const glass = new THREE.Mesh(
      new THREE.PlaneGeometry(this.devW - 0.1, this.devH - 0.1),
      new THREE.MeshStandardMaterial({ color: 0x020305, metalness: 0.2, roughness: 0.18 })
    );
    glass.position.z = 0.0615;
    device.add(glass);

    // vues (le premier plan est opaque, les suivants se superposent)
    this.o.views.forEach((cv, i) => {
      const tex = canvasTexture(cv, renderer);
      const mat = new THREE.MeshBasicMaterial({
        map: tex,
        toneMapped: false,
        transparent: i > 0,
        opacity: i > 0 ? 0 : 1,
        depthWrite: i === 0,
      });
      const m = new THREE.Mesh(new THREE.PlaneGeometry(this.devW - 0.22, this.devH - 0.24), mat);
      m.position.z = 0.0625 + i * 0.0004;
      m.renderOrder = i;
      device.add(m);
      this.screens.push(m);
      if (i > 0) this.overlays.push(mat);
    });

    // reflet verre
    const gc = document.createElement("canvas");
    gc.width = 256;
    gc.height = 160;
    const g = gc.getContext("2d")!;
    const gr = g.createLinearGradient(0, 0, 256, 160);
    gr.addColorStop(0, "rgba(255,255,255,0.16)");
    gr.addColorStop(0.35, "rgba(255,255,255,0.03)");
    gr.addColorStop(0.5, "rgba(255,255,255,0)");
    gr.addColorStop(1, "rgba(255,255,255,0.05)");
    g.fillStyle = gr;
    g.fillRect(0, 0, 256, 160);
    const glare = new THREE.Mesh(
      new THREE.PlaneGeometry(this.devW - 0.22, this.devH - 0.24),
      new THREE.MeshBasicMaterial({ map: new THREE.CanvasTexture(gc), transparent: true, depthWrite: false, toneMapped: false })
    );
    glare.position.z = 0.0675;
    glare.renderOrder = 20;
    device.add(glare);

    // curseur animé sur l'écran (donne vie à l'interface)
    const cc = document.createElement("canvas");
    cc.width = cc.height = 128;
    const cx = cc.getContext("2d")!;
    cx.translate(22, 14);
    cx.scale(3.2, 3.2);
    cx.beginPath();
    cx.moveTo(0, 0);
    cx.lineTo(0, 15.5);
    cx.lineTo(4, 12);
    cx.lineTo(6.9, 18.6);
    cx.lineTo(9.3, 17.5);
    cx.lineTo(6.5, 11.2);
    cx.lineTo(11.8, 11.2);
    cx.closePath();
    cx.shadowColor = "rgba(0,0,0,0.35)";
    cx.shadowBlur = 8;
    cx.shadowOffsetY = 3;
    cx.fillStyle = "#0b0d12";
    cx.fill();
    cx.shadowColor = "transparent";
    cx.lineWidth = 1.4;
    cx.strokeStyle = "#ffffff";
    cx.lineJoin = "round";
    cx.stroke();
    const curTex = new THREE.CanvasTexture(cc);
    curTex.colorSpace = THREE.SRGBColorSpace;
    this.cursor = new THREE.Mesh(
      new THREE.PlaneGeometry(0.3, 0.3),
      new THREE.MeshBasicMaterial({ map: curTex, transparent: true, depthWrite: false, toneMapped: false })
    );
    this.cursor.position.z = 0.072;
    this.cursor.renderOrder = 25;
    // le point d'ancrage de la flèche est en haut à gauche de la texture
    this.cursor.geometry.translate(0.098, -0.117, 0);
    device.add(this.cursor);

    // cartes flottantes
    const tex = buildFloaters(mobile ? 2 : 3);
    const sx = this.compact ? 0.72 : mobile ? 0.8 : 1;
    const sy = this.compact ? 1.45 : 1;
    const sz = this.compact ? 0.9 : 1;
    FLOATERS.forEach((def) => {
      const ft = tex[def.key];
      const mat = new THREE.MeshBasicMaterial({
        map: canvasTexture(ft.canvas, renderer),
        transparent: true,
        opacity: 0,
        depthWrite: false,
        toneMapped: false,
      });
      const mesh = new THREE.Mesh(new THREE.PlaneGeometry(ft.w / PX, ft.h / PX), mat);
      mesh.visible = false;
      mesh.renderOrder = 30 + def.stage;
      const to: V3 = [def.to[0] * sx, def.to[1] * sy, def.to[2] * sz];
      device.add(mesh);
      this.floaters.push({ def, mesh, mat, to, from: [to[0] * 0.85, to[1] * 0.85, 0.09] });
    });

    scene.add(device);
  }

  private resize() {
    const c = this.o.canvas;
    const w = c.clientWidth || 1;
    const h = c.clientHeight || 1;
    this.w = w;
    this.h = h;
    applyPixelRatio(this.renderer, w, h, this.o.mobile);
    this.renderer.setSize(w, h, false);
    this.camera.aspect = w / h;
    const narrow = window.innerWidth < 1024;
    const kfs = narrow ? KF_NARROW : KF_WIDE;
    const tanH = Math.tan(THREE.MathUtils.degToRad(this.camera.fov / 2));
    this.eff = kfs.map((k) => [
      Math.max(
        k.dist,
        (this.devW - 0.02) / (k.fit * 2 * tanH * this.camera.aspect),
        narrow ? this.devH / (0.58 * 2 * tanH) : 0
      ),
      k.az,
      k.el,
      k.sx,
      k.sy,
    ]);
    this.layoutHero(narrow, tanH);
    this.camera.updateProjectionMatrix();
  }

  /** Cadre l'écran du hero pour qu'il occupe tout l'espace disponible sous les CTA. */
  private layoutHero(narrow = window.innerWidth < 1024, tanH = Math.tan(THREE.MathUtils.degToRad(this.camera.fov / 2))) {
    const { w, h } = this;
    const hb = this.o.getHeroBottom?.() ?? 0;
    if (!hb || !this.eff.length) return;
    this.lastHB = hb;
    const top = hb + (narrow ? 22 : 30);
    const avail = Math.max(120, h - top - (narrow ? 14 : 0));
    const maxW = narrow ? 0.97 * w : 0.74 * w;
    // desktop : l'écran émerge du bas de page (recadré) ; compact : tablette entière visible
    const ppu = Math.max(50, Math.min(this.compact ? (avail * 0.93) / this.devH : avail / 0.6 / this.devH, maxW / this.devW)); // px / unité monde
    const dh = this.devH * ppu;
    const d = h / (2 * tanH * ppu);
    const center = dh <= avail * 0.9 ? top + avail / 2 : top + dh / 2;
    this.eff[0] = [d, 0.1, 0.15, 0, (center - h / 2) / h];
  }

  private onVisibility = () => {
    cancelAnimationFrame(this.raf);
    this.raf = 0;
    if (this.active && !document.hidden) {
      this.last = performance.now();
      this.raf = requestAnimationFrame(this.loop);
    }
  };

  setActive(v: boolean) {
    if (this.active === v) return;
    this.active = v;
    this.onVisibility();
  }

  private loop = (now: number) => {
    this.raf = requestAnimationFrame(this.loop);
    if (!this.active || document.hidden) { cancelAnimationFrame(this.raf); this.raf = 0; return; }
    const dt = clamp((now - this.last) / 1000, 0, 0.05);
    this.last = now;
    this.time += dt;

    this.intro = Math.min(1, this.intro + dt / 2.2);
    const ie = 1 - Math.pow(1 - this.intro, 3);
    if (++this.frame % 20 === 0) {
      const hb = this.o.getHeroBottom?.() ?? 0;
      if (hb && Math.abs(hb - this.lastHB) > 1) this.layoutHero();
    }
    const target = this.o.getProgress() * 5;
    this.s += (target - this.s) * (1 - Math.exp(-dt * 5.5));
    if (Math.abs(target - this.s) < 0.0005) this.s = target;
    const s = clamp(this.s, 0, 5);
    this.smx += (this.mx - this.smx) * (1 - Math.exp(-dt * 3));
    this.smy += (this.my - this.smy) * (1 - Math.exp(-dt * 3));

    // interpolation des keyframes
    const i = clamp(Math.floor(s), 0, 4);
    const tt = sstep(0.2, 0.8, s - i);
    const a = this.eff[i];
    const b = this.eff[i + 1];
    const L = (k: number) => lerp(a[k], b[k], tt);
    const dist = L(0) + (1 - ie) * 2.6;
    const az = L(1) + this.smx * 0.09 + (1 - ie) * 0.3;
    const el = L(2) - this.smy * 0.045;
    const ce = Math.cos(el);
    this.camera.position.set(dist * Math.sin(az) * ce, dist * Math.sin(el), dist * Math.cos(az) * ce);
    this.camera.lookAt(0, 0, 0);
    this.camera.setViewOffset(this.w, this.h, -L(3) * this.w, -L(4) * this.h, this.w, this.h);

    // appareil en lévitation
    const bob = Math.sin(this.time * 0.9) * 0.05;
    this.device.position.y = bob - (1 - ie) * 0.35;
    this.device.rotation.x = Math.sin(this.time * 0.6) * 0.012;
    this.device.rotation.z = Math.sin(this.time * 0.5) * 0.006;
    this.shadow.position.y = -(this.devH / 2 + 0.78) - bob * 0.5;
    (this.shadow.material as THREE.MeshBasicMaterial).opacity = 0.9 - bob * 2;

    // vues : fondu enchaîné cumulatif
    const screenTarget = s < 0.45 ? this.o.getHeroView() : s;
    this.screenProgress += (screenTarget - this.screenProgress) * (1 - Math.exp(-dt * 9));
    this.overlays.forEach((m, k) => {
      const chapter = k + 1;
      m.opacity = sstep(chapter - 0.6, chapter - 0.4, this.screenProgress);
    });
    // Draw only the top opaque screen and the one currently fading over it.
    let opaque = 0;
    this.overlays.forEach((m, k) => { if (m.opacity >= 1) opaque = k + 1; });
    this.screens.forEach((mesh, k) => { mesh.visible = k === opaque || (k > opaque && (mesh.material as THREE.MeshBasicMaterial).opacity > 0); });
    const colorIndex = s < 0.45 ? this.o.getHeroView() - 1 : Math.round(s) - 1;
    const accent = this.accentColor.set(VERTICALS[colorIndex]?.accent ?? "#61728c");
    (this.halo.material as THREE.MeshBasicMaterial).color.lerp(accent, 1 - Math.exp(-dt * 4));

    // cartes : séparation en couches
    for (const f of this.floaters) {
      const d = Math.abs(s - f.def.stage);
      let av = 1 - sstep(0.3, 0.78, d);
      av = sstep(f.def.delay * 0.12, 1, av);
      f.mesh.visible = av > 0.004;
      if (!f.mesh.visible) continue;
      const e = 1 - Math.pow(1 - av, 3);
      const pz = f.to[2] * e;
      f.mesh.position.set(
        lerp(f.from[0], f.to[0], e) + this.smx * 0.11 * pz,
        lerp(f.from[1], f.to[1], e) - this.smy * 0.06 * pz + Math.sin(this.time * 1.1 + f.def.delay * 1.7) * 0.03 * av,
        lerp(f.from[2], f.to[2], e)
      );
      f.mesh.rotation.set(f.def.rot[0] * e, f.def.rot[1] * e, f.def.rot[2] * e);
      f.mesh.scale.setScalar(lerp(0.9, 1, e) * this.fscale);
      f.mat.opacity = clamp(av * 1.15, 0, 1);
    }

    // curseur : trajectoire entre quelques cibles de l'interface
    const T: [number, number][] = [[-1.77, 0.8], [-0.83, 0.5], [1.61, 1.12], [1.3, -0.1], [0.3, -0.42], [-1.77, 0.45]];
    const ph = this.time * 0.26;
    const ci = Math.floor(ph) % T.length;
    const cf = sstep(0, 0.55, ph - Math.floor(ph));
    const A = T[ci];
    const B = T[(ci + 1) % T.length];
    this.cursor.position.x = lerp(A[0], B[0], cf);
    this.cursor.position.y = lerp(A[1], B[1], cf) + Math.sin(cf * Math.PI) * 0.12;
    const cm = this.cursor.material as THREE.MeshBasicMaterial;
    cm.opacity = (1 - sstep(0.35, 0.9, s)) * sstep(0.5, 1.6, this.time);
    this.cursor.visible = !this.compact && cm.opacity > 0.01;

    this.halo.position.x = lerp(0, -0.3, sstep(0, 5, s));
    this.renderer.render(this.scene, this.camera);
    this.o.onFrame(s);
  };

  dispose() {
    cancelAnimationFrame(this.raf);
    document.removeEventListener("visibilitychange", this.onVisibility);
    this.ro.disconnect();
    window.removeEventListener("pointermove", this.onMove);
    disposeScene(this.scene);
    this.envRT.dispose();
    this.renderer.dispose();
    this.renderer.forceContextLoss();
  }
}
