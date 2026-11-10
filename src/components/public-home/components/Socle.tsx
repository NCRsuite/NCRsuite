import { useRef } from "react";
import { COMMON, VERTICALS } from "../verticals";
import { VERTICAL_ICONS } from "./VerticalSelector";
import { Logo } from "./Logo";
import { useReveal } from "./useReveal";
export default function Socle() {
  const ref = useRef<HTMLElement>(null);
  useReveal(ref);
  return <section id="socle" ref={ref} aria-labelledby="socle-title" className="relative overflow-hidden bg-paper py-24 lg:py-32">
    <div className="relative mx-auto w-[min(92vw,1180px)]">
      <div className="mx-auto max-w-3xl text-center" data-reveal><p className="eyebrow">Une plateforme, plusieurs métiers</p><h2 id="socle-title" className="mt-4 text-[clamp(2rem,4.6vw,3.75rem)] font-semibold leading-[1.07] tracking-[-0.035em]">NCR Suite au centre.<br /><span className="text-slate-500">Votre métier aux commandes.</span></h2><p className="mt-5 text-lg leading-relaxed text-slate-600">Le socle relie votre gestion. Chaque environnement organise les outils autour du travail réel de vos équipes.</p></div>
      <div className="platform-hub" data-reveal>
        <div className="hub-brand"><Logo /><span>LE SOCLE COMMUN</span></div>
        <div className="hub-branches">{VERTICALS.map((v, i) => { const Icon = VERTICAL_ICONS[i]; return <div key={v.key} className="hub-branch" style={{ "--branch-accent": v.accent, "--branch-soft": v.soft } as React.CSSProperties}><Icon size={23} aria-hidden="true" /><strong>{v.label}</strong><span>{v.nav[1]} · {v.nav[2]}</span></div>; })}</div>
        <ul className="common-pillars" aria-label="Fonctions du socle commun">{COMMON.map(p => <li key={p}>{p}</li>)}</ul>
      </div>
      <p className="mx-auto mt-7 max-w-2xl text-center text-sm leading-relaxed text-slate-600">Le planning devient vacation, intervention, service ou rendez-vous. Les documents et les indicateurs suivent la même logique : celle de votre activité, selon l’offre et les modules activés.</p>
    </div>
  </section>;
}
