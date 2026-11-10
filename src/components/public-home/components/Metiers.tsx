import { useRef } from "react";
import { ArrowUpRight, GraduationCap, ShieldCheck, Sparkles, Utensils, Scissors } from "lucide-react";
import { SECTORS, SITE_URL } from "../data";
import { useReveal } from "./useReveal";

const ICONS: Record<string, typeof GraduationCap> = {
  graduation: GraduationCap, shield: ShieldCheck, sparkles: Sparkles, utensils: Utensils, scissors: Scissors,
};

function TiltCard({ s }: { s: (typeof SECTORS)[number] }) {
  const ref = useRef<HTMLElement>(null);
  const Icon = ICONS[s.icon];

  const move = (e: React.PointerEvent<HTMLElement>) => {
    if (e.pointerType !== "mouse" || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const el = ref.current;
    if (!el) return;
    const r = el.getBoundingClientRect();
    const x = (e.clientX - r.left) / r.width;
    const y = (e.clientY - r.top) / r.height;
    el.classList.add("is-moving");
    el.style.setProperty("--rx", `${((0.5 - y) * 12).toFixed(2)}deg`);
    el.style.setProperty("--ry", `${((x - 0.5) * 14).toFixed(2)}deg`);
    el.style.setProperty("--mx", `${(x * 100).toFixed(1)}%`);
    el.style.setProperty("--my", `${(y * 100).toFixed(1)}%`);
  };
  const leave = () => {
    const el = ref.current;
    if (!el) return;
    el.classList.remove("is-moving");
    el.style.setProperty("--rx", "0deg");
    el.style.setProperty("--ry", "0deg");
  };

  return (
    <article
      ref={ref}
      onPointerMove={move}
      onPointerLeave={leave}
      className="tilt group relative flex min-h-[19rem] flex-col overflow-hidden rounded-[1.75rem] border border-slate-200/80 bg-white p-7 shadow-[0_1px_2px_rgba(16,24,40,0.04),0_18px_40px_-24px_rgba(16,24,40,0.18)] hover:shadow-[0_2px_4px_rgba(16,24,40,0.05),0_40px_70px_-28px_rgba(16,24,40,0.3)]"
      style={{ ["--accent" as string]: s.accent }}
    >
      {/* lueur d'accent */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -right-16 -top-16 h-56 w-56 rounded-full opacity-[0.14] blur-2xl transition-opacity duration-500 group-hover:opacity-30"
        style={{ background: s.accent }}
      />
      {/* reflet qui suit le pointeur */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 opacity-0 transition-opacity duration-300 group-hover:opacity-100"
        style={{ background: "radial-gradient(420px circle at var(--mx,50%) var(--my,0%), rgba(255,255,255,0.9), transparent 55%)" }}
      />
      <div
        className="relative flex h-14 w-14 items-center justify-center rounded-2xl text-white shadow-lg transition-transform duration-500 group-hover:-translate-y-1"
        style={{
          background: `linear-gradient(145deg, ${s.accent}, ${s.accent}cc)`,
          boxShadow: `0 14px 28px -10px ${s.accent}99`,
          transform: "translateZ(56px)",
        }}
      >
        <Icon size={26} strokeWidth={1.8} aria-hidden="true" />
      </div>
      <h3 className="relative mt-8 text-[1.35rem] font-semibold tracking-tight text-ink" style={{ transform: "translateZ(36px)" }}>
        {s.title}
      </h3>
      <p className="relative mt-2.5 text-[0.95rem] leading-relaxed text-slate-600" style={{ transform: "translateZ(22px)" }}>
        {s.text}
      </p>
      <div className="relative mt-auto flex items-end justify-between gap-4 pt-7" style={{ transform: "translateZ(30px)" }}>
        <ul className="flex flex-wrap gap-1.5">
          {s.tags.map((t) => (
            <li key={t} className="rounded-full bg-slate-100 px-3 py-1 text-[0.74rem] font-medium text-slate-600">
              {t}
            </li>
          ))}
        </ul>
        <a
          href={`${SITE_URL}${s.path}`}
          aria-label={`Découvrir NCR Suite ${s.title}`}
          className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-500 transition-all duration-300 group-hover:border-transparent group-hover:bg-(--c) group-hover:text-white"
          style={{ ["--c" as string]: s.accent }}
        >
          <ArrowUpRight size={17} aria-hidden="true" className="transition-transform duration-300 group-hover:rotate-12" />
        </a>
      </div>
    </article>
  );
}

export default function Metiers() {
  const ref = useRef<HTMLElement>(null);
  useReveal(ref);
  return (
    <section id="metiers" ref={ref} aria-labelledby="metiers-title" className="relative bg-white py-24 lg:py-36">
      <div className="mx-auto w-[min(92vw,1180px)]">
        <div className="mx-auto max-w-3xl text-center">
          <p className="eyebrow" data-reveal>
            Fonctions par métier
          </p>
          <h2 id="metiers-title" data-reveal data-delay="0.05" className="mt-4 text-[clamp(2rem,4.6vw,3.75rem)] font-semibold leading-[1.05] tracking-[-0.035em]">
            Les outils de votre quotidien.
          </h2>
          <p data-reveal data-delay="0.1" className="mt-5 text-[1.05rem] leading-relaxed text-slate-600 lg:text-lg">
            NCR Suite s’adapte à votre secteur : une base solide et commune, des modules qui épousent vos pratiques, vos
            documents et votre vocabulaire. Les fonctions disponibles dépendent de votre formule et des modules activés.
          </p>
        </div>
        <div className="metier-grid mt-14 grid gap-5 lg:mt-20 lg:gap-6">
          {SECTORS.map((s, i) => (
            <div key={s.title} data-reveal data-delay={(i % 3) * 0.08}>
              <TiltCard s={s} />
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
