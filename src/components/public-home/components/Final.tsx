import { useEffect, useRef } from "react";
import { ArrowRight, Globe } from "lucide-react";
import { FinalScene } from "../three/FinalScene";
import { scrollGeometry } from "../three/scrollGeometry";
import { LogoMark } from "./Logo";
import { TRIAL_URL, CONTACT_URL } from "../data";
import { useReveal } from "./useReveal";

interface Props {
  effects: boolean;
  views: HTMLCanvasElement[] | null;
  onFail: () => void;
}

export default function Final({ effects, views, onFail }: Props) {
  const secRef = useRef<HTMLElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  useReveal(secRef);

  useEffect(() => {
    if (!effects || !views || !canvasRef.current || !secRef.current) return;
    const sec = secRef.current;
    let scene: FinalScene | null = null;
    const geometry = scrollGeometry(sec);
    const io = new IntersectionObserver(([entry]) => {
      if (entry.isIntersecting && !scene) {
        try {
          scene = new FinalScene({ canvas: canvasRef.current!, views, mobile: window.innerWidth < 1024, getProgress: geometry.final });
        } catch (e) { console.warn("WebGL indisponible pour la scène finale.", e); onFail(); }
      }
      scene?.setActive(entry.isIntersecting);
    }, { rootMargin: "120px" });
    io.observe(sec);
    return () => { io.disconnect(); geometry.dispose(); scene?.dispose(); };

  }, [effects, views, onFail]);

  return (
    <section
      ref={secRef}
      id="final"
      aria-labelledby="final-title"
      className="relative isolate overflow-hidden text-white"
      style={{ background: "radial-gradient(900px 700px at 50% 35%, #0c1f45 0%, #05070c 65%)" }}
    >
      {effects ? (
        <canvas ref={canvasRef} className="absolute inset-0 -z-10 h-full w-full" aria-hidden="true" />
      ) : (
        <div aria-hidden="true" className="absolute inset-x-0 top-[14%] -z-10 flex justify-center">
          <div className="relative">
            <div className="absolute inset-0 -m-16 rounded-full bg-brand/30 blur-3xl" />
            <LogoMark ink="#ffffff" className="relative h-36 w-auto sm:h-48" />
          </div>
        </div>
      )}
      <div className="pointer-events-none absolute inset-x-0 bottom-0 -z-10 h-1/2 bg-gradient-to-t from-night via-night/70 to-transparent" />

      <div className="relative mx-auto flex min-h-[100dvh] w-[min(92vw,900px)] flex-col items-center justify-center pb-16 pt-24 text-center">
        <h2
          id="final-title"
          data-reveal
          className="text-[clamp(2.3rem,6.4vw,5.25rem)] font-semibold leading-[1.03] tracking-[-0.04em]"
        >
          Passez à une
          <br />
          gestion plus simple.
        </h2>
        <p data-reveal data-delay="0.08" className="mt-5 max-w-xl text-[1.05rem] leading-relaxed text-slate-400">
          Présentez votre activité. Après validation, découvrez la formule Professionnelle pendant 7 jours, sans carte bancaire.
        </p>
        <div data-reveal data-delay="0.14" className="mt-9 flex w-full flex-col items-center gap-6">
          <a href={TRIAL_URL} className="btn btn-light !h-14 !px-8 !text-base">
            Demander mon essai gratuit
            <ArrowRight size={18} aria-hidden="true" />
          </a>
          <a
            href={CONTACT_URL}
            className="group inline-flex items-center gap-3 rounded-full border border-white/10 bg-white/5 px-6 py-3 text-[clamp(1.25rem,3vw,1.75rem)] font-semibold tracking-tight text-white backdrop-blur transition hover:border-white/25 hover:bg-white/10"
          >
            <Globe size={22} className="text-[#6aa5ff]" aria-hidden="true" />
            contact@ncr-suite.fr
          </a>
        </div>
      </div>
    </section>
  );
}
