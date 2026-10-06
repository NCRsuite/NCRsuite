import { useRef } from "react";
import { Globe2, Layers, ShieldCheck, Puzzle, Sparkles } from "lucide-react";
import { ADVANTAGES } from "../data";
import { useReveal } from "./useReveal";

const ICONS: Record<string, typeof Sparkles> = {
  sparkles: Sparkles,
  layers: Layers,
  globe: Globe2,
  puzzle: Puzzle,
  shield: ShieldCheck,
};

export default function Avantages() {
  const ref = useRef<HTMLElement>(null);
  useReveal(ref);
  return (
    <section id="avantages" ref={ref} aria-labelledby="avantages-title" className="bg-paper py-24 lg:py-36">
      <div className="mx-auto w-[min(92vw,1180px)]">
        <div className="mx-auto max-w-3xl text-center">
          <p className="eyebrow" data-reveal>
            Avantages
          </p>
          <h2 id="avantages-title" data-reveal data-delay="0.05" className="mt-4 text-[clamp(2rem,4.6vw,3.75rem)] font-semibold leading-[1.05] tracking-[-0.035em]">
            Tout ce qu’il faut. Rien de superflu.
          </h2>
        </div>
        <ul className="mt-14 grid gap-4 md:grid-cols-6 lg:mt-20 lg:gap-5">
          {ADVANTAGES.map((a, i) => {
            const Icon = ICONS[a.icon];
            const wide = i >= 3;
            return (
              <li
                key={a.title}
                data-reveal
                data-delay={(i % 3) * 0.07}
                className={`group relative overflow-hidden rounded-[1.75rem] border border-slate-200/70 bg-white p-7 shadow-[0_1px_2px_rgba(16,24,40,0.04)] transition duration-500 hover:-translate-y-1 hover:shadow-[0_30px_60px_-30px_rgba(16,24,40,0.25)] lg:p-8 ${
                  wide ? "md:col-span-3" : "md:col-span-2"
                } ${i === 4 ? "max-md:col-span-1" : ""}`}
              >
                <div
                  aria-hidden="true"
                  className="pointer-events-none absolute -right-10 -top-10 h-40 w-40 rounded-full bg-brand/10 opacity-0 blur-2xl transition-opacity duration-500 group-hover:opacity-100"
                />
                <div className="relative flex h-12 w-12 items-center justify-center rounded-2xl bg-brand/10 text-brand transition-colors duration-300 group-hover:bg-brand group-hover:text-white">
                  <Icon size={23} strokeWidth={1.8} aria-hidden="true" />
                </div>
                <h3 className="relative mt-7 text-[1.4rem] font-semibold tracking-tight">{a.title}</h3>
                <p className="relative mt-2.5 max-w-md text-[0.97rem] leading-relaxed text-slate-600">{a.text}</p>
              </li>
            );
          })}
        </ul>
      </div>
    </section>
  );
}
