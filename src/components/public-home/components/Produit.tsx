import { useEffect, useRef, useState } from "react";
import { VERTICALS, verticalStyle } from "../verticals";
import { PANELS } from "../data";

const desktopQuery = "(min-width: 1024px) and (min-height: 760px) and (hover: hover) and (pointer: fine) and (prefers-reduced-motion: no-preference)";
export default function Produit({ images, activeVertical, onSelect }: { images: string[] | null; activeVertical: number; onSelect: (index: number) => void }) {
  const ref = useRef<HTMLElement>(null);
  const track = useRef<HTMLDivElement>(null);
  const progress = useRef<HTMLSpanElement>(null);
  const [desktop, setDesktop] = useState(false);
  const [active, setActive] = useState(Math.max(0, activeVertical));
  const current = useRef(active);
  const select = useRef(onSelect);
  select.current = onSelect;
  const geometry = useRef({ top: 0, travel: 1, step: 1 });
  const navigate = useRef<(i: number) => void>(() => {});

  useEffect(() => {
    const media = window.matchMedia(desktopQuery);
    const update = () => setDesktop(media.matches);
    update(); media.addEventListener("change", update);
    return () => media.removeEventListener("change", update);
  }, []);

  useEffect(() => {
    const section = ref.current!, rail = track.current!;
    let raf = 0, visible = false;
    const commit = (i: number) => {
      if (current.current === i) return;
      current.current = i; setActive(i); select.current(i);
    };
    const measure = () => {
      const first = rail.firstElementChild as HTMLElement;
      geometry.current = { top: section.getBoundingClientRect().top + window.scrollY, travel: Math.max(1, section.offsetHeight - window.innerHeight), step: first ? first.offsetWidth + 24 : 1 };
      schedule();
    };
    const draw = () => {
      raf = 0;
      if (!visible || document.hidden) return;
      const g = geometry.current;
      const position = desktop ? Math.max(0, Math.min(4, (window.scrollY - g.top) / g.travel * 4)) : Math.max(0, Math.min(4, rail.scrollLeft / g.step));
      if (desktop) {
        rail.style.transform = `translate3d(${-position * g.step}px,0,0)`;
        Array.from(rail.children).forEach((node, i) => {
          const distance = Math.min(1, Math.abs(i - position));
          const el = node as HTMLElement;
          el.style.opacity = String(1 - distance * 0.45);
          el.style.transform = `scale(${1 - distance * 0.06})`;
        });
      }
      if (progress.current) progress.current.style.transform = `scaleX(${(position + 1) / 5})`;
      commit(Math.round(position));
    };
    function schedule() { if (!raf && visible && !document.hidden) raf = requestAnimationFrame(draw); }
    navigate.current = (i) => {
      const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
      if (desktop) window.scrollTo({ top: geometry.current.top + geometry.current.travel * i / 4, behavior: "smooth" });
      else rail.scrollTo({ left: geometry.current.step * i, behavior: reduced ? "auto" : "smooth" });
      commit(i);
    };
    const io = new IntersectionObserver(([entry]) => { visible = entry.isIntersecting; if (visible) { measure(); schedule(); } else { cancelAnimationFrame(raf); raf = 0; } });
    io.observe(section);
    const ro = new ResizeObserver(measure); ro.observe(section); ro.observe(rail);
    const visibility = () => { if (document.hidden) { cancelAnimationFrame(raf); raf = 0; } else schedule(); };
    window.addEventListener("scroll", schedule, { passive: true });
    rail.addEventListener("scroll", schedule, { passive: true });
    document.addEventListener("visibilitychange", visibility);
    rail.style.transform = "";
    Array.from(rail.children).forEach(node => { (node as HTMLElement).style.cssText = ""; });
    measure();
    return () => { cancelAnimationFrame(raf); io.disconnect(); ro.disconnect(); window.removeEventListener("scroll", schedule); rail.removeEventListener("scroll", schedule); document.removeEventListener("visibilitychange", visibility); };
  }, [desktop]);

  useEffect(() => {
    const i = Math.max(0, activeVertical);
    if (!desktop && current.current !== i) {
      current.current = i;
      setActive(i);
      track.current?.scrollTo({ left: geometry.current.step * i, behavior: "auto" });
    }
  }, [activeVertical, desktop]);

  const onKey = (e: React.KeyboardEvent) => {
    if (!["ArrowRight", "ArrowLeft", "Home", "End"].includes(e.key)) return;
    e.preventDefault();
    const next = e.key === "Home" ? 0 : e.key === "End" ? 4 : (active + (e.key === "ArrowRight" ? 1 : 4)) % 5;
    navigate.current(next); document.getElementById(`tab-${next + 1}`)?.focus({ preventScroll: true });
  };
  return <section id="produit" ref={ref} aria-labelledby="produit-title" className={`product-carousel ${desktop ? "is-pinned" : ""}`} style={verticalStyle(active)}>
    <div className="product-sticky">
      <div className="product-heading">
        <p className="eyebrow !text-[#6aa5ff]">Produit</p>
        <h2 id="produit-title" className="mt-3 text-[clamp(2rem,3.7vw,3.5rem)] font-semibold leading-[1.05] tracking-[-0.035em]">Un même ADN. Des outils qui changent.</h2>
        <p className="mt-4 text-slate-400">Un planning de vacations ne ressemble pas à un agenda de salon. Explorez cinq environnements avec leurs priorités, leurs écrans et leur vocabulaire. Mockups illustratifs ; fonctions selon l’offre et les modules.</p>
      </div>
      <div className="product-window">
        <div ref={track} className="product-track" aria-label="Les cinq interfaces métier">
          {VERTICALS.map((v, i) => <figure key={v.key} className="product-slide" aria-label={v.label}>
            <div className="product-device">
              {images ? <img src={images[i + 1]} alt={`Illustration NCR Suite — ${v.label}, sans données réelles`} loading="lazy" decoding="async" draggable={false} /> : <div className="product-placeholder" />}
            </div>
          </figure>)}
        </div>
      </div>
      <div className="product-controls">
        <div role="tablist" aria-label="Écrans NCR Suite" onKeyDown={onKey} className="flex flex-wrap justify-center gap-2">
          {VERTICALS.map((v, i) => <button key={v.key} type="button" role="tab" id={`tab-${i + 1}`} aria-controls="panel-caption" aria-selected={active === i} tabIndex={active === i ? 0 : -1} onClick={() => navigate.current(i)} className="rounded-full px-3 py-2 text-xs font-medium" style={{ background: active === i ? v.soft : "#ffffff0d", color: active === i ? v.accent : "#cbd5e1" }}>{v.label}</button>)}
        </div>
        <div className="product-progress" aria-hidden="true"><span ref={progress} /></div>
        <div id="panel-caption" role="tabpanel" aria-labelledby={`tab-${active + 1}`} className="product-caption">
          <strong style={{ color: VERTICALS[active].soft }}>0{active + 1} — 05 · {VERTICALS[active].label}</strong>
          <p className="mt-1 text-sm text-slate-400">{PANELS[active + 1].text}</p>
        </div>
      </div>
    </div>
  </section>;
}
