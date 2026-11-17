import * as THREE from "three";
import { LOGO } from "../logoGeometry";
import { applyPixelRatio, canvasTexture, createRenderer, disposeScene, lerp, radialTexture, sstep } from "./common";


type P2 = [number, number];

/** Rectangle arrondi dont les côtés longs sont inclinés (y vers le bas), extrémités verticales */
function skewedRoundedRect(x0: number, y0: number, w: number, h: number, r: number, seg: number): P2[] {
  const out: P2[] = [];
  const corners: [number, number, number][] = [
    [x0 + w - r, y0 + r, -90],
    [x0 + w - r, y0 + h - r, 0],
    [x0 + r, y0 + h - r, 90],
    [x0 + r, y0 + r, 180],
  ];
  for (const [cx, cy, a0] of corners) {
    for (let i = 0; i <= seg; i++) {
      const a = ((a0 + (90 * i) / seg) * Math.PI) / 180;
      const x = cx + r * Math.cos(a);
      const y = cy + r * Math.sin(a);
      out.push([x, y - LOGO.slope * x]);
    }
  }
  return out;
}

function densify(pts: P2[], step: number): P2[] {
  const out: P2[] = [];
  for (let i = 0; i < pts.length; i++) {
    const a = pts[i];
    const b = pts[(i + 1) % pts.length];
    const n = Math.max(1, Math.ceil(Math.hypot(b[0] - a[0], b[1] - a[1]) / step));
    for (let k = 0; k < n; k++) out.push([a[0] + ((b[0] - a[0]) * k) / n, a[1] + ((b[1] - a[1]) * k) / n]);
  }
  return out;
}

/** Retire d'un contour le disque (c, r) et referme la forme par un arc concave */
function cutByCircle(pts: P2[], c: P2, r: number): P2[] {
  const n = pts.length;
  const outside = pts.map((p) => Math.hypot(p[0] - c[0], p[1] - c[1]) > r);
  let s = -1;
  for (let i = 0; i < n; i++) {
    if (outside[i] && !outside[(i - 1 + n) % n]) {
      s = i;
      break;
    }
  }
  if (s < 0) return pts;
  const keep: P2[] = [];
  for (let k = 0; k < n; k++) {
    const i = (s + k) % n;
    if (!outside[i]) break;
    keep.push(pts[i]);
  }
  const A = keep[0];
  const B = keep[keep.length - 1];
  const aA = Math.atan2(A[1] - c[1], A[0] - c[0]);
  const aB = Math.atan2(B[1] - c[1], B[0] - c[0]);
  let d = aA - aB;
  while (d > Math.PI) d -= Math.PI * 2;
  while (d < -Math.PI) d += Math.PI * 2;
  const m = 40;
  const arc: P2[] = [];
  for (let i = 0; i <= m; i++) {
    const a = aB + (d * i) / m;
    arc.push([c[0] + r * Math.cos(a), c[1] + r * Math.sin(a)]);
  }
  return [...keep, ...arc];
}

export interface FinalOptions {
  canvas: HTMLCanvasElement;
  views: HTMLCanvasElement[];
  mobile: boolean;
  getProgress: () => number;
}

export class FinalScene {
  private renderer: THREE.WebGLRenderer;
  private scene = new THREE.Scene();
  private camera = new THREE.PerspectiveCamera(35, 1, 0.5, 80);
  private envRT: THREE.WebGLRenderTarget;
  private logo = new THREE.Group();
  private logoHolder = new THREE.Group();
  private rings: THREE.Mesh[] = [];
  private dust!: THREE.Points;
  private glow!: THREE.Mesh;
  private raf = 0;
  private active = false;
  private last = performance.now();
  private time = 0;
  private p = 0;
  private mx = 0;
  private my = 0;
  private smx = 0;
  private smy = 0;
  private w = 1;
  private h = 1;
  private narrow = false;
  private fit = 0;
  private resizePending = false;
  private ro: ResizeObserver;
  private onMove = (e: PointerEvent) => {
    if (e.pointerType !== "mouse") return;
    this.mx = (e.clientX / window.innerWidth) * 2 - 1;
    this.my = (e.clientY / window.innerHeight) * 2 - 1;
  };

  constructor(private o: FinalOptions) {
    const { renderer, envMap, envRT } = createRenderer(o.canvas, o.mobile, 0.5);
    this.renderer = renderer;
    this.envRT = envRT;
    this.scene.environment = envMap;
    this.scene.environmentIntensity = 0.55;
    this.scene.fog = new THREE.Fog(0x05070c, 12, 30);
    this.build();
    this.resize();
    this.ro = new ResizeObserver(() => { this.resizePending = true; });
    this.ro.observe(o.canvas);
    if (!o.mobile) window.addEventListener("pointermove", this.onMove, { passive: true });
    document.addEventListener("visibilitychange", this.onVisibility);
    this.onVisibility();
  }

  private build() {
    const { scene, renderer } = this;
    const mobile = this.o.mobile;

    const key = new THREE.DirectionalLight(0xffffff, 2.6);
    key.position.set(3, 5, 6);
    scene.add(key);
    const rim = new THREE.PointLight(0x3d8bff, 60, 30);
    rim.position.set(-5, 1.5, -2);
    scene.add(rim);
    const rim2 = new THREE.PointLight(0x8fb8ff, 30, 30);
    rim2.position.set(5, -2, 3);
    scene.add(rim2);
    scene.add(new THREE.AmbientLight(0xffffff, 0.15));

    // Logo NCR en volume : même géométrie que le logo officiel (3 barres inclinées + point)
    const barMat = new THREE.MeshPhysicalMaterial({
      color: 0xf2f5fb,
      metalness: 0.55,
      roughness: 0.22,
      clearcoat: 1,
      clearcoatRoughness: 0.12,
      transparent: true,
      opacity: 0.76,
    });
    const U = 0.0076; // unités monde par unité du symbole
    const cx0 = LOGO.barW / 2;
    const cy0 = (LOGO.yMin + LOGO.yMax) / 2;
    const depth = 0.2;
    const bev = 0.035;
    const extrude = (pts: [number, number][]) => {
      const shape = new THREE.Shape();
      pts.forEach(([x, y], i) => {
        const X = (x - cx0) * U;
        const Y = -(y - cy0) * U;
        if (i === 0) shape.moveTo(X, Y);
        else shape.lineTo(X, Y);
      });
      shape.closePath();
      const g = new THREE.ExtrudeGeometry(shape, {
        depth,
        bevelEnabled: true,
        bevelThickness: bev,
        bevelSize: bev,
        bevelOffset: -bev,
        bevelSegments: mobile ? 3 : 6,
        curveSegments: 1,
      });
      g.translate(0, 0, -depth / 2);
      return g;
    };
    const seg = mobile ? 8 : 16;
    const bars: [number, number, boolean][] = [
      [LOGO.topY, 0, false],
      [LOGO.midY, LOGO.midX, true],
      [LOGO.botY, 0, false],
    ];
    bars.forEach(([yy, x0, notch]) => {
      let pts = skewedRoundedRect(x0, yy, LOGO.barW - x0, LOGO.barH, LOGO.radius, seg);
      if (notch) pts = cutByCircle(densify(pts, 1), [LOGO.dot.x, LOGO.dot.y], LOGO.cut);
      this.logo.add(new THREE.Mesh(extrude(pts), barMat));
    });
    const dot = new THREE.Mesh(
      new THREE.SphereGeometry(LOGO.dot.r * U, 40, 28),
      new THREE.MeshStandardMaterial({
        color: 0x0a6cff,
        emissive: 0x0a6cff,
        emissiveIntensity: 0.72,
        roughness: 0.25,
        transparent: true,
        opacity: 0.82,
      })
    );
    dot.scale.z = 0.62;
    dot.position.set((LOGO.dot.x - cx0) * U, -(LOGO.dot.y - cy0) * U, 0);
    this.logo.add(dot);
    this.logoHolder.add(this.logo);
    this.logoHolder.scale.setScalar(0.88);
    this.logoHolder.position.y = mobile ? -0.62 : -0.78;
    scene.add(this.logoHolder);

    // halo
    this.glow = new THREE.Mesh(
      new THREE.PlaneGeometry(mobile ? 7 : 10, mobile ? 7 : 10),
      new THREE.MeshBasicMaterial({
        map: radialTexture([
          [0, "rgba(40,120,255,0.38)"],
          [0.35, "rgba(10,108,255,0.1)"],
          [1, "rgba(10,108,255,0)"],
        ]),
        transparent: true,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
        fog: false,
        toneMapped: false,
      })
    );
    this.glow.position.z = -1.6;
    scene.add(this.glow);

    // anneaux orbitaux
    [2.2, 3.1, 4.2].forEach((rad, i) => {
      const ring = new THREE.Mesh(
        new THREE.TorusGeometry(rad, 0.007, 8, 180),
        new THREE.MeshBasicMaterial({ color: 0x7db1ff, transparent: true, opacity: 0.4 - i * 0.1, fog: false })
      );
      ring.rotation.x = Math.PI / 2.25;
      ring.rotation.y = 0.2 * (i - 1);
      this.rings.push(ring);
      scene.add(ring);
    });

    // poussière lumineuse
    const n = mobile ? 140 : 320;
    const pos = new Float32Array(n * 3);
    for (let i = 0; i < n; i++) {
      const rad = 3 + Math.random() * 9;
      const th = Math.random() * Math.PI * 2;
      const ph = Math.acos(2 * Math.random() - 1);
      pos[i * 3] = rad * Math.sin(ph) * Math.cos(th);
      pos[i * 3 + 1] = rad * Math.sin(ph) * Math.sin(th) * 0.6;
      pos[i * 3 + 2] = rad * Math.cos(ph) - 2;
    }
    const pg = new THREE.BufferGeometry();
    pg.setAttribute("position", new THREE.BufferAttribute(pos, 3));
    this.dust = new THREE.Points(
      pg,
      new THREE.PointsMaterial({ size: 0.035, color: 0xaecbff, transparent: true, opacity: 0.55, depthWrite: false })
    );
    scene.add(this.dust);

    // interfaces en arrière-plan (profondeur cinématographique)
    const angles = mobile ? [-0.75, 0.75] : [-1.25, -0.72, 0, 0.72, 1.25];
    angles.forEach((th, i) => {
      const cv = this.o.views[mobile ? 0 : (i + 1) % this.o.views.length];
      const m = new THREE.Mesh(
        new THREE.PlaneGeometry((4 * cv.width) / cv.height, 4),
        new THREE.MeshBasicMaterial({
          map: canvasTexture(cv, renderer),
          color: 0x555c6c,
          transparent: true,
          opacity: 0.85,
          toneMapped: false,
        })
      );
      const R = 11;
      m.position.set(Math.sin(th) * R, (i % 2 ? 0.6 : -0.4) + 0.3, -Math.cos(th) * R + 1);
      m.rotation.y = -th * 0.92;
      scene.add(m);
    });
  }

  private resize() {
    const c = this.o.canvas;
    this.w = c.clientWidth || 1;
    this.h = c.clientHeight || 1;
    applyPixelRatio(this.renderer, this.w, this.h, this.o.mobile);
    this.renderer.setSize(this.w, this.h, false);
    this.camera.aspect = this.w / this.h;
    this.narrow = window.innerWidth < 1024;
    const tanH = Math.tan(THREE.MathUtils.degToRad(this.camera.fov / 2));
    this.fit = 2.6 / (0.6 * 2 * tanH * this.camera.aspect);
    this.camera.setViewOffset(this.w, this.h, 0, (this.narrow ? 0.14 : 0.1) * this.h, this.w, this.h);
    this.camera.updateProjectionMatrix();
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
    const dt = Math.min(0.05, Math.max(0, (now - this.last) / 1000));
    this.last = now;
    this.time += dt;
    if (this.resizePending) { this.resizePending = false; this.resize(); }
    this.p += (this.o.getProgress() - this.p) * (1 - Math.exp(-dt * 5));
    this.smx += (this.mx - this.smx) * (1 - Math.exp(-dt * 3));
    this.smy += (this.my - this.smy) * (1 - Math.exp(-dt * 3));

    const e = sstep(0, 1, this.p);
    const dist = Math.max(lerp(15, 10, e), this.narrow ? this.fit : 0);
    const az = Math.sin(this.time * 0.18) * 0.12 + this.smx * 0.1;
    const el = 0.06 - this.smy * 0.04 + (1 - e) * 0.12;
    this.camera.position.set(dist * Math.sin(az), dist * Math.sin(el), dist * Math.cos(az));
    this.camera.lookAt(0, 0, 0);

    this.logo.rotation.y = Math.sin(this.time * 0.45) * 0.45 + this.smx * 0.15;
    this.logo.rotation.x = Math.sin(this.time * 0.35) * 0.05;
    const logoBaseY = this.o.mobile ? -0.62 : -0.78;
    this.logoHolder.position.y = logoBaseY + Math.sin(this.time * 0.8) * 0.04;
    this.rings.forEach((r, i) => (r.rotation.z += dt * (0.05 + i * 0.03) * (i % 2 ? -1 : 1)));
    this.dust.rotation.y += dt * 0.02;
    const gm = this.glow.material as THREE.MeshBasicMaterial;
    gm.opacity = 0.48 + Math.sin(this.time * 0.7) * 0.06;

    this.renderer.render(this.scene, this.camera);
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
