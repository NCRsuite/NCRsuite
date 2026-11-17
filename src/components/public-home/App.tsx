import { useCallback, useEffect, useState } from "react";
import Header from "./components/Header";
import Story from "./components/Story";
import Socle from "./components/Socle";
import Metiers from "./components/Metiers";
import Produit from "./components/Produit";
import Avantages from "./components/Avantages";
import Offres from "./components/Offres";
import Faq from "./components/Faq";
import Final from "./components/Final";
import Footer from "./components/Footer";
import { isCompact } from "./three/common";
import { buildMobileView, buildView, VIEW_COUNT } from "./three/ui";

// One probe, released immediately: avoid accumulating WebGL contexts on resize.
const graphics = (() => {
  try {
    const canvas = document.createElement("canvas");
    const gl = canvas.getContext("webgl2") || canvas.getContext("webgl");
    if (!gl) return { available: false, maxTexture: 4096 };
    const maxTexture = gl.getParameter(gl.MAX_TEXTURE_SIZE) as number;
    gl.getExtension("WEBGL_lose_context")?.loseContext();
    return { available: true, maxTexture };
  } catch { return { available: false, maxTexture: 4096 }; }
})();

/** Échelle de dessin des écrans de bureau (base 1024×640) : 3x = 3072×1920 px, au-delà du Full HD. */
function desktopScale() {
  return Math.max(1.5, Math.min(2, graphics.maxTexture / 1024));
}

/** Échelle des écrans mobiles (base 480×600) : ~1200×1500 px, calée sur la densité de l'appareil pour éviter tout flou de mipmap. */
function mobileScale() {
  const dpr = window.devicePixelRatio || 1;
  return Math.max(1.75, Math.min(dpr >= 3 ? 2 : 1.75, graphics.maxTexture / 600));
}

interface Assets {
  views: HTMLCanvasElement[];
  images: string[] | null;
}


const toUrl = (c: HTMLCanvasElement) =>
  new Promise<string>((res) =>
    c.toBlob((b) => res(b ? URL.createObjectURL(b) : c.toDataURL("image/jpeg", 0.92)), "image/jpeg", 0.92)
  );

export default function App() {
  const [effects, setEffects] = useState(() => {
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    return !reduced && graphics.available && !((window.innerHeight < 540 && window.innerWidth < 1024) || (window.innerHeight < 700 && window.innerWidth < 640));
  });
  const [activeVertical, setActiveVertical] = useState(-1);
  const [assets, setAssets] = useState<Assets | null>(null);
  const [compact, setCompact] = useState(() => isCompact());

  useEffect(() => {
    const preference = window.matchMedia("(prefers-reduced-motion: reduce)");
    const onChange = () => { if (preference.matches) setEffects(false); };
    preference.addEventListener("change", onChange);
    return () => preference.removeEventListener("change", onChange);
  }, []);

  // bascule portrait/paysage ou redimensionnement : on régénère l'interface adaptée
  useEffect(() => {
    const on = () => {
      setCompact(isCompact());
      if ((window.innerHeight < 540 && window.innerWidth < 1024) || (window.innerHeight < 700 && window.innerWidth < 640)) setEffects(false);
    };
    window.addEventListener("resize", on);
    return () => window.removeEventListener("resize", on);
  }, []);

  // Les interfaces sont dessinées une fois les polices chargées
  useEffect(() => {
    let cancelled = false;
    const timers = new Set<ReturnType<typeof setTimeout>>();
    const delay = (ms: number) => new Promise<void>(resolve => {
      const id = setTimeout(() => { timers.delete(id); resolve(); }, ms);
      timers.add(id);
    });
    const urls: string[] = [];
    const imageUrl = async (canvas: HTMLCanvasElement) => {
      const url = await toUrl(canvas);
      if (cancelled) URL.revokeObjectURL(url);
      else urls.push(url);
      return url;
    };
    setAssets(null);
    const run = async () => {
      try {
        const fonts = document.fonts;
        if (fonts) {
          await Promise.race([
            Promise.all([400, 500, 600, 700, 800].map((w) => fonts.load(`${w} 16px NCRHomeInter`))),
            delay(2500),
          ]);
        }
      } catch {
        /* polices système en repli */
      }
      if (cancelled) return;
      // un écran par tâche : pas de long blocage du thread principal
      const views: HTMLCanvasElement[] = [];
      if (compact) {
        const ms = mobileScale();
        for (let i = 0; i < VIEW_COUNT; i++) {
          views.push(buildMobileView(i, ms));
          await delay(0);
          if (cancelled) return;
        }
        setAssets({ views, images: null });
        // Reuse the portrait canvases on small screens, including the static fallback.
        const images = await Promise.all(views.map(imageUrl));
        if (cancelled) return;
        setAssets({ views, images });
      } else {
        const scale = desktopScale();
        for (let i = 0; i < VIEW_COUNT; i++) {
          views.push(buildView(i, scale));
          await delay(0);
          if (cancelled) return;
        }
        setAssets({ views, images: null });
        const images = await Promise.all(views.map(imageUrl));
        if (!cancelled) setAssets({ views, images });
      }
    };
    void run().catch(() => { if (!cancelled) setEffects(false); });
    return () => {
      cancelled = true;
      timers.forEach(clearTimeout);
      timers.clear();
      urls.forEach(url => URL.revokeObjectURL(url));
    };
  }, [compact]);

  const fail = useCallback(() => setEffects(false), []);

  return (
    <>
      <Header effects={effects} onToggle={() => setEffects((v) => !v)} />
      <main id="contenu">
        <Story activeVertical={activeVertical} onSelect={setActiveVertical} effects={effects} views={assets?.views ?? null} images={assets?.images ?? null} onFail={fail} />
        <Socle />
        <Metiers />
        <Produit activeVertical={activeVertical} onSelect={setActiveVertical} images={assets?.images ?? null} />
        <Avantages />
        <Offres activeVertical={activeVertical} onSelect={setActiveVertical} />
        <Faq />
        <Final effects={effects} views={assets?.views ?? null} onFail={fail} />
      </main>
      <Footer />
    </>
  );
}
