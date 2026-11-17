import { useRef } from "react";
import { ArrowRight, Check, Users } from "lucide-react";
import { VERTICALS, verticalStyle } from "../verticals";
import { OFFERS } from "../offers";
import { SITE_URL, TRIAL_URL } from "../data";
import { useReveal } from "./useReveal";

const euro = new Intl.NumberFormat("fr-FR", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

export default function Offres({ activeVertical, onSelect }: { activeVertical: number; onSelect: (index: number) => void }) {
  const ref = useRef<HTMLElement>(null);
  const active = Math.max(0, activeVertical);
  const setActive = onSelect;
  useReveal(ref);
  const onKey = (e: React.KeyboardEvent<HTMLDivElement>) => {
    const keys = ["ArrowRight", "ArrowLeft", "Home", "End"];
    if (!keys.includes(e.key)) return;
    e.preventDefault();
    const next = e.key === "Home" ? 0 : e.key === "End" ? OFFERS.length - 1 : (active + (e.key === "ArrowRight" ? 1 : -1) + OFFERS.length) % OFFERS.length;
    setActive(next);
    document.getElementById(`offer-tab-${next}`)?.focus();
  };
  return (
    <section id="offres" style={verticalStyle(active)} ref={ref} aria-labelledby="offres-title" className="relative overflow-hidden bg-paper py-24 lg:py-36">
      <div aria-hidden="true" className="pointer-events-none absolute -top-40 left-1/2 h-[600px] w-[900px] -translate-x-1/2 rounded-full bg-brand/5 blur-3xl" />
      <div className="relative mx-auto w-[min(92vw,1280px)]">
        <div className="mx-auto max-w-3xl text-center" data-reveal>
          <p className="eyebrow">Les offres NCR Suite</p>
          <h2 id="offres-title" className="mt-4 text-[clamp(2rem,4.6vw,3.75rem)] font-semibold leading-[1.05] tracking-[-0.035em]">Votre métier.<br /><span className="text-slate-500">Votre niveau d’équipement.</span></h2>
          <p className="mt-5 text-lg leading-relaxed text-slate-600">Un socle pour démarrer, des fonctions pour évoluer. Retrouvez les formules de votre activité.</p>
        </div>
        <div role="tablist" aria-label="Tarifs par métier" onKeyDown={onKey} className="mx-auto mt-10 flex w-fit max-w-full flex-wrap justify-center gap-2 rounded-3xl border border-slate-200 bg-white/70 p-2 shadow-sm">
          {OFFERS.map((b, i) => <button key={b.key} id={`offer-tab-${i}`} role="tab" aria-selected={active === i} aria-controls={`offer-panel-${i}`} tabIndex={active === i ? 0 : -1} onClick={() => setActive(i)} className={`min-h-11 rounded-full px-5 py-3 text-sm font-semibold transition ${active === i ? "bg-[var(--vertical-accent)] text-white shadow-lg" : "text-slate-600 hover:bg-slate-100"}`}>{b.name}</button>)}
        </div>
        {OFFERS.map((b, i) => <div key={b.key} id={`offer-panel-${i}`} role="tabpanel" aria-labelledby={`offer-tab-${i}`} hidden={active !== i} tabIndex={0} className="mt-10">
          <div className="mb-6 flex flex-wrap items-center justify-between gap-3 px-1">
            <p className="text-lg font-semibold"><span className="mr-2 inline-block h-2 w-2 rounded-full" style={{ background: VERTICALS[i].accent }} />{b.label}</p>
            <p className="text-sm text-slate-600">Prix HT / mois · Activation après validation</p>
          </div>
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            {b.plans.map(plan => <article key={plan.key} className={`relative flex min-w-0 flex-col rounded-[1.75rem] border p-6 transition duration-300 hover:-translate-y-1 lg:p-7 ${plan.recommended ? "border-[var(--vertical-accent)] bg-white shadow-[0_18px_60px_-28px_rgba(10,108,255,0.4)] ring-1 ring-[var(--vertical-accent)]" : "border-slate-200 bg-white/85 shadow-sm"}`}>
              <div className="mb-5 flex h-6 items-center justify-between gap-2 text-[0.65rem] font-semibold uppercase tracking-widest text-slate-500"><span>NCR Suite</span>{plan.recommended && <span className="rounded-full bg-[var(--vertical-soft)] px-2 py-1 text-[var(--vertical-accent)]">Recommandée</span>}{plan.custom && <span>Sur mesure</span>}</div>
              <h3 className="text-xl font-semibold tracking-tight">{plan.name}</h3>
              <div className="mt-5"><p className="h-5 text-xs text-slate-600">{plan.custom ? "À partir de" : "Abonnement mensuel"}</p><p className="mt-1 text-[2.6rem] font-semibold leading-tight tracking-[-0.05em]">{euro.format(plan.monthlyPriceCents / 100)} <span className="text-xl">€</span></p><p className="mt-1 text-sm text-slate-500">HT / mois</p></div>
              <p className="mt-5 min-h-[4.5rem] text-sm leading-relaxed text-slate-600">{plan.summary}</p>
              <p className="mt-5 flex items-center gap-2 border-y border-slate-100 py-4 text-sm font-medium"><Users size={16} aria-hidden="true" />{plan.memberLimit === 1 ? "1 accès inclus" : `Jusqu’à ${plan.memberLimit} accès`}</p>
              <ul className="my-6 space-y-3 text-sm leading-relaxed text-slate-700">{plan.highlights.map(h => <li key={h} className="flex items-start gap-2"><Check className="mt-1 shrink-0 text-[var(--vertical-accent)]" size={14} aria-hidden="true" />{h}</li>)}</ul>
              <a href={`${SITE_URL}/demande-acces?metier=${b.key}&offre=${plan.key}&essai=7&utm_source=vitrine&utm_medium=cta&utm_campaign=essai-7-jours&utm_content=offre-${b.key}-${plan.key}`} aria-label={`Demander l’essai gratuit — ${b.name}, offre ${plan.name}`} className={`btn mt-auto !px-3 !text-sm ${plan.recommended ? "btn-primary" : "btn-ghost"}`}>Essayer 7 jours <ArrowRight size={15} aria-hidden="true" /></a>
            </article>)}
          </div>
        </div>)}
        <div className="mt-8 grid gap-6 rounded-3xl border border-slate-200 bg-white/60 p-6 md:grid-cols-[1.3fr_1fr] md:p-8">
          <div><h3 className="font-semibold">7 jours pour découvrir votre environnement</h3><p className="mt-2 text-sm leading-relaxed text-slate-600">Après validation de votre demande, l’essai gratuit porte sur la formule Professionnelle, sans carte bancaire ni contrat d’abonnement à signer au démarrage.</p><a className="mt-3 inline-flex items-center gap-2 text-sm font-semibold text-brand" href={TRIAL_URL}>Demander mon essai <ArrowRight size={14} aria-hidden="true" /></a></div>
          <div><h3 className="font-semibold">Des modules pour accompagner votre évolution</h3><p className="mt-2 text-sm leading-relaxed text-slate-600">Comparaison avec les modules à la carte et montée en gamme signalée avant tout surcoût. Pour Métier, la configuration et le tarif contractuel final sont définis avant l’ouverture.</p><a href={`${SITE_URL}/#offres`} className="mt-3 inline-flex items-center gap-2 text-sm font-semibold text-brand">Consulter le catalogue officiel <ArrowRight size={14} aria-hidden="true" /></a></div>
        </div>
      </div>
    </section>
  );
}
