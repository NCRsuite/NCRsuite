import { useRef, useState } from "react";
import { Plus } from "lucide-react";
import { FAQ, BUSINESS_FAQ } from "../data";
import { useReveal } from "./useReveal";

export default function Faq() {
  const ref = useRef<HTMLElement>(null);
  useReveal(ref);
  const [business, setBusiness] = useState(BUSINESS_FAQ[0].key);
  return (
    <section id="faq" ref={ref} aria-labelledby="faq-title" className="bg-white pb-16 pt-24 lg:pb-20 lg:pt-28">
      <div className="mx-auto w-[min(92vw,820px)]">
        <div className="text-center">
          <p className="eyebrow" data-reveal>
            Questions fréquentes
          </p>
          <h2 id="faq-title" data-reveal data-delay="0.05" className="mt-4 text-[clamp(1.9rem,4vw,3rem)] font-semibold leading-[1.06] tracking-[-0.03em]">
            Tout ce qu’il faut savoir.
          </h2>
        </div>
        <div className="mt-12 divide-y divide-slate-200 border-y border-slate-200" data-reveal data-delay="0.1">
          {FAQ.map((f) => (
            <details key={f.q} className="group py-1">
              <summary className="flex cursor-pointer list-none items-center justify-between gap-6 rounded-xl py-5 text-left text-[1.05rem] font-semibold tracking-tight text-ink marker:hidden [&::-webkit-details-marker]:hidden">
                {f.q}
                <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-slate-100 text-slate-600 transition duration-300 group-open:rotate-45 group-open:bg-brand group-open:text-white">
                  <Plus size={17} aria-hidden="true" />
                </span>
              </summary>
              <p className="max-w-2xl pb-6 pr-12 leading-relaxed text-slate-600">{f.a}</p>
            </details>
          ))}
        </div>
        <div className="mt-12">
          <label htmlFor="faq-business" className="block text-sm font-semibold text-slate-700">Les questions de votre métier</label>
          <select id="faq-business" value={business} onChange={e => setBusiness(e.target.value)} className="mt-3 w-full rounded-2xl border border-slate-200 bg-paper p-4 text-base font-medium">
            {BUSINESS_FAQ.map(b => <option key={b.key} value={b.key}>{b.name}</option>)}
          </select>
          {BUSINESS_FAQ.map(b => <div key={b.key} hidden={b.key !== business} className="mt-5 divide-y divide-slate-200">
            {b.items.map(f => <details key={f.q} className="group py-1">
              <summary className="flex cursor-pointer list-none items-center justify-between gap-4 rounded-xl py-5 text-base font-semibold marker:hidden [&::-webkit-details-marker]:hidden">{f.q}<Plus size={17} aria-hidden="true" className="shrink-0 transition group-open:rotate-45" /></summary>
              <p className="pb-6 leading-relaxed text-slate-600">{f.a}</p>
            </details>)}
          </div>)}
          <p className="mt-5 text-xs leading-relaxed text-slate-500">Les fonctions dépendent de la formule et des modules activés. Consultez les offres de votre métier pour les inclusions.</p>
        </div>
      </div>
    </section>
  );
}
