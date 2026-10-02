import { scrollGeometry } from "../three/scrollGeometry";
import { useEffect, useRef } from "react";
import { ArrowRight, Check } from "lucide-react";
import { CHAPTERS, TRIAL_URL } from "../data";
import { StoryScene } from "../three/StoryScene";
import { sstep } from "../three/common";
import VerticalSelector from "./VerticalSelector";
import { VERTICALS, verticalStyle } from "../verticals";
import { gsap } from "./useReveal";

interface Props {
  activeVertical: number;
  onSelect: (index: number) => void;
  effects: boolean;
  views: HTMLCanvasElement[] | null;
  images: string[] | null;
  onFail: () => void;
}

function HeroText({ onDiscover, active, onSelect }: { onDiscover: () => void; active: number; onSelect: (index: number) => void }) {
  const v = VERTICALS[active];
  return (
    <div className="hero-copy flex flex-col items-center px-5 text-center" style={verticalStyle(active)}>
      <p data-intro className="hero-kicker">NCR SUITE · LA PLATEFORME DE GESTION MULTI-MÉTIER</p>
      <h1 data-intro className="hero-title">Une plateforme.<br /><span className="text-slate-500">Cinq expériences métier.</span></h1>
      <p data-intro className="hero-description">Votre activité a ses propres contraintes. NCR Suite adapte ses outils et son environnement, sur un socle commun de gestion.</p>
      <div data-intro className="mt-5 w-full max-w-4xl"><VerticalSelector active={active} onChange={onSelect} /></div>
      <div className="hero-context" aria-live="polite" aria-atomic="true">
        <strong>{v ? `NCR Suite · ${v.label}` : "Une marque. Un socle commun. Votre métier."}</strong>
        <span>{v ? v.features.join(" · ") : "Choisissez votre métier pour voir l’interface et les usages s’adapter."}</span>
      </div>
      <div data-intro className="hero-actions">
        <a href={TRIAL_URL} className="btn btn-primary">Essai gratuit de 7 jours <ArrowRight size={16} aria-hidden="true" /></a>
        <button type="button" onClick={onDiscover} className="btn btn-ghost">Explorer les cinq univers</button>
      </div>
      <p className="mt-3 text-[0.65rem] leading-relaxed text-slate-500">Essai Professionnelle après validation · Sans carte bancaire<br />Mockups illustratifs · Fonctions selon l’offre et les modules</p>
    </div>
  );
}

function ChapterText({ c, i }: { c: (typeof CHAPTERS)[number]; i: number }) {
  return (
    <>
      <p className="eyebrow mb-3" style={{ color: c.accent }}>
        {c.label} · Univers {i + 1} / {CHAPTERS.length}
      </p>
      <h2 className="text-[clamp(1.75rem,3.4vw,3.1rem)] font-semibold leading-[1.06] tracking-[-0.03em] text-ink">{c.title}</h2>
      <p className="mt-3 text-[0.98rem] leading-relaxed text-slate-600 lg:mt-4 lg:text-[1.05rem]">{c.text}</p>
      <ul className="mt-5 hidden space-y-2.5 lg:block">
        {c.points.map((p) => (
          <li key={p} className="flex items-center gap-3 text-[0.95rem] font-medium text-slate-800">
            <span className="flex h-5 w-5 items-center justify-center rounded-full" style={{ background: c.soft, color: c.accent }}>
              <Check size={12} strokeWidth={3} aria-hidden="true" />
            </span>
            {p}
          </li>
        ))}
      </ul>
    </>
  );
}

export default function Story({ activeVertical, onSelect, effects, views, images, onFail }: Props) {
  const secRef = useRef<HTMLElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const blocks = useRef<(HTMLDivElement | null)[]>([]);
  const dots = useRef<(HTMLButtonElement | null)[]>([]);
  const cueRef = useRef<HTMLDivElement>(null);
  const hudRef = useRef<HTMLDivElement>(null);
  const hudLabel = useRef<HTMLSpanElement>(null);
  const hudBar = useRef<HTMLSpanElement>(null);
  const lastIdx = useRef(-1);
  const selectedRef = useRef(activeVertical);
  selectedRef.current = activeVertical;
  const selectorRef = useRef<HTMLDivElement>(null);
  const selectRef = useRef(onSelect);
  selectRef.current = onSelect;

  const go = (i: number) => {
    const sec = secRef.current;
    if (!sec) return;
    if (!effects) {
      document.getElementById(CHAPTERS[i - 1]?.id ?? "plateforme")?.scrollIntoView({ behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth" });
      return;
    }
    const total = sec.offsetHeight - window.innerHeight;
    const top = window.scrollY + sec.getBoundingClientRect().top + (i / 5) * total;
    window.scrollTo({ top, behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth" });
  };

  useEffect(() => {
    if (!effects || !views || !canvasRef.current || !secRef.current) return;
    const sec = secRef.current;
    const geometry = scrollGeometry(sec);
    let lastFrame = -1;
    const update = (s: number) => {
      if (Math.abs(lastFrame - s) < 0.0001) return;
      lastFrame = s;
      blocks.current.forEach((el, i) => {
        if (!el) return;
        // Keep neighbouring chapters overlapped: at the midpoint both remain
        // visible, so fast and slow scrolling can never expose an empty stage.
        const op = i === 0 ? 1 - sstep(0.18, 0.68, s) : 1 - sstep(0.35, 0.75, Math.abs(s - i));
        const ty = i === 0 ? -s * 70 : (i - s) * 46;
        el.style.opacity = op.toFixed(3);
        el.style.transform = `translate3d(0,${ty.toFixed(1)}px,0)`;
        el.style.pointerEvents = op > 0.5 ? "auto" : "none";
        el.toggleAttribute("inert", op < 0.5);
      });
      const cur = Math.round(s);
      if (selectorRef.current) {
        const shown = s > 0.5;
        selectorRef.current.style.opacity = shown ? "1" : "0";
        selectorRef.current.inert = !shown;
        selectorRef.current.style.pointerEvents = shown ? "auto" : "none";
      }
      dots.current.forEach((d, i) => d && (d.dataset.on = String(i === cur)));
      if (cueRef.current) cueRef.current.style.opacity = (1 - sstep(0.02, 0.22, s)).toFixed(3);
      if (hudRef.current) hudRef.current.style.opacity = sstep(0.35, 0.8, s).toFixed(3);
      if (hudBar.current) hudBar.current.style.transform = `scaleX(${(s / 5).toFixed(4)})`;
      if (hudLabel.current && cur !== lastIdx.current) {
        lastIdx.current = cur;
        if (cur > 0) selectRef.current(cur - 1);
        hudLabel.current.textContent = cur === 0 ? "Introduction" : `0${cur} — ${CHAPTERS[cur - 1].title}`;
      }
    };
    let scene: StoryScene | null = null;
    try {
      scene = new StoryScene({
        canvas: canvasRef.current,
        views,
        mobile: window.innerWidth < 1024,
        getHeroView: () => selectedRef.current + 1,
        getHeroBottom: () => {
          const el = blocks.current[0];
          const par = el?.parentElement as HTMLElement | null;
          return el && par ? par.offsetTop + el.offsetTop + el.offsetHeight : 0;
        },
        getProgress: geometry.story,
        onFrame: update,
      });
    } catch (e) {
      console.warn("WebGL indisponible, version statique activée.", e);
      geometry.dispose();
      onFail();
      return;
    }
    const io = new IntersectionObserver(([e]) => scene?.setActive(e.isIntersecting), { rootMargin: "100px" });
    io.observe(sec);
    update(0);
    const cv = canvasRef.current;
    const raf = requestAnimationFrame(() => {
      cv.style.opacity = "1";
    });
    const intro = blocks.current[0]
      ? gsap.from(blocks.current[0].querySelectorAll("[data-intro]"), {
          y: 34,
          opacity: 0,
          duration: 1.1,
          stagger: 0.1,
          delay: 0.2,
          ease: "power3.out",
          clearProps: "transform,opacity",
        })
      : null;
    return () => {
      cancelAnimationFrame(raf);
      geometry.dispose();
      intro?.kill();
      io.disconnect();
      scene?.dispose();
    };
  }, [effects, views, onFail]);

  /* ---------- Version statique / simplifiée (sans WebGL) ---------- */
  if (!effects) {
    return (
      <section id="plateforme" ref={secRef} aria-label="Présentation de la plateforme" className="relative">
        <div className="relative overflow-hidden bg-gradient-to-b from-[#fbfcfe] to-[#eef2f9] pb-16 pt-28 lg:pt-36">
          <HeroText active={activeVertical} onSelect={onSelect} onDiscover={() => go(1)} />
          <div className="mx-auto mt-8 w-[min(92vw,1000px)] max-[819px]:max-w-[480px]">
            <div className="rounded-[1.6rem] bg-[#14171d] p-2.5 shadow-[0_50px_100px_-30px_rgba(16,24,40,0.45)] sm:p-3.5">
              {images ? (
                <img key={activeVertical} src={images[activeVertical + 1]} alt={`Illustration NCR Suite — ${VERTICALS[activeVertical]?.label ?? "plateforme multi-métier"}`} className="preview-enter aspect-[4/5] min-[820px]:aspect-[1.6] w-full rounded-2xl" />
              ) : (
                <div className="aspect-[4/5] min-[820px]:aspect-[1.6] w-full rounded-2xl bg-slate-100" />
              )}
            </div>
          </div>
        </div>
        {CHAPTERS.map((c, i) => (
          <div key={c.id} id={c.id} className={i % 2 ? "bg-[#f4f6fa]" : "bg-white"}>
            <div
              className={`mx-auto grid max-w-6xl items-center gap-10 px-5 py-16 lg:grid-cols-2 lg:gap-16 lg:py-24 ${
                i % 2 ? "lg:[&>*:first-child]:order-2" : ""
              }`}
            >
              <div>
                <ChapterText c={c} i={i} />
              </div>
              <div className="max-[819px]:mx-auto max-[819px]:w-full max-[819px]:max-w-[480px] rounded-[1.4rem] bg-[#14171d] p-2 shadow-[0_40px_80px_-30px_rgba(16,24,40,0.4)] sm:p-3">
                {images ? (
                  <img src={images[c.view]} alt={`Illustration NCR Suite — ${c.title}, sans données réelles`} loading="lazy" className="aspect-[4/5] min-[820px]:aspect-[1.6] w-full rounded-xl" />
                ) : (
                  <div className="aspect-[4/5] min-[820px]:aspect-[1.6] w-full rounded-xl bg-slate-100" />
                )}
              </div>
            </div>
          </div>
        ))}
      </section>
    );
  }

  /* ---------- Version 3D immersive ---------- */
  return (
    <section id="plateforme" ref={secRef} aria-label="Présentation de la plateforme" className="relative" style={{ height: "calc(100dvh + 5 * 72dvh)" }}>
      <div className="sticky top-0 h-[100dvh] w-full overflow-hidden bg-gradient-to-b from-[#fbfcfe] via-[#f3f6fb] to-[#e9eef7]">
        <canvas
          ref={canvasRef}
          className="absolute inset-0 h-full w-full transition-opacity duration-[1400ms] ease-out"
          style={{ opacity: 0 }}
          aria-hidden="true"
        />

        <div className="pointer-events-none absolute inset-x-0 top-0 pt-[5.5rem] lg:pt-28 [@media(max-height:820px)]:lg:!pt-24">
          <div ref={(el) => { blocks.current[0] = el; }} className="will-change-transform">
            <HeroText active={activeVertical} onSelect={onSelect} onDiscover={() => go(1)} />
          </div>
        </div>

        <div ref={selectorRef} className="story-selector absolute inset-x-4 top-20 z-20 opacity-0" {...({ inert: "" } as Record<string, string>)}>
          <VerticalSelector active={activeVertical} overview={false} onChange={index => { onSelect(index); go(index + 1); }} label="Parcourir les cinq univers en 3D" />
        </div>
        {CHAPTERS.map((c, i) => (
          <div
            key={c.id}
            id={c.id}
            className={`pointer-events-none absolute inset-x-4 bottom-5 lg:inset-x-auto lg:bottom-auto lg:top-1/2 lg:-translate-y-1/2 lg:w-[min(28vw,420px)] ${
              i % 2 === 0 ? "lg:left-[5vw]" : "lg:right-[5vw]"
            }`}
          >
            <div
              ref={(el) => { blocks.current[i + 1] = el; }}
              className="glass-m rounded-3xl p-5 opacity-0 will-change-transform sm:p-6 lg:p-0"
            >
              <ChapterText c={c} i={i} />
            </div>
          </div>
        ))}

        <div ref={cueRef} aria-hidden="true" className="pointer-events-none absolute inset-x-0 bottom-5 flex flex-col items-center gap-2 text-[0.68rem] font-medium uppercase tracking-[0.2em] text-slate-500">
          Faire défiler
          <span className="relative block h-9 w-px overflow-hidden bg-slate-300">
            <span className="absolute inset-x-0 top-0 h-3 animate-[cue_1.8s_ease-in-out_infinite] bg-brand" />
          </span>
        </div>

        <div
          ref={hudRef}
          aria-hidden="true"
          className="pointer-events-none absolute bottom-6 left-1/2 hidden w-[min(340px,40vw)] -translate-x-1/2 flex-col items-center gap-2.5 opacity-0 lg:flex"
        >
          <span ref={hudLabel} className="text-[0.72rem] font-semibold uppercase tracking-[0.16em] text-slate-600" />
          <span className="block h-[3px] w-full overflow-hidden rounded-full bg-slate-300/60">
            <span ref={hudBar} className="block h-full origin-left rounded-full bg-brand" style={{ transform: "scaleX(0)" }} />
          </span>
        </div>

        <nav aria-label="Séquences métier" className="absolute right-5 top-1/2 z-10 hidden -translate-y-1/2 flex-col gap-3 lg:flex">
          {[0, ...CHAPTERS.map((_, i) => i + 1)].map((i) => (
            <button
              key={i}
              ref={(el) => { dots.current[i] = el; }}
              type="button"
              onClick={() => go(i)}
              aria-label={i === 0 ? "Introduction" : CHAPTERS[i - 1].title}
              className="group flex h-4 w-4 items-center justify-center"
            >
              <span className="h-1.5 w-1.5 rounded-full bg-slate-400/60 transition-all duration-300 group-data-[on=true]:h-3 group-data-[on=true]:w-1.5 group-data-[on=true]:bg-brand group-hover:bg-brand" />
            </button>
          ))}
        </nav>
      </div>
    </section>
  );
}
