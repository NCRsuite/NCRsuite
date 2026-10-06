import { Logo } from "./Logo";
import { SITE_URL, LOGIN_URL, TRIAL_URL, CONTACT_URL } from "../data";

export default function Footer() {
  return (
    <footer className="bg-night text-slate-400">
      <div className="mx-auto flex w-[min(92vw,1180px)] flex-col items-center justify-between gap-6 border-t border-white/10 py-10 md:flex-row">
        <div className="flex flex-col items-center gap-3 md:items-start">
          <Logo dark />
          <p className="text-[0.8rem] uppercase tracking-[0.16em] text-slate-400">Une suite. Tous vos métiers. Une seule plateforme.</p>
        </div>
        <nav aria-label="Pied de page" className="flex flex-wrap items-center justify-center gap-x-6 gap-y-2 text-sm">
          <a className="hover:text-white" href="#plateforme">Plateforme</a>
          <a className="hover:text-white" href="#metiers">Métiers</a>
          <a className="hover:text-white" href="#produit">Produit</a>
          <a className="hover:text-white" href="#offres">Offres</a>
          <a className="hover:text-white" href="#faq">FAQ</a>
          <a className="hover:text-white" href={LOGIN_URL}>Se connecter</a>
          <a className="hover:text-white" href={TRIAL_URL}>Essai gratuit de 7 jours</a>
          <a className="hover:text-white" href={`${SITE_URL}/mentions-legales`}>Mentions légales</a>
          <a className="hover:text-white" href={`${SITE_URL}/confidentialite`}>Confidentialité</a>
          <a className="font-semibold text-white" href={CONTACT_URL}>contact@ncr-suite.fr</a>
        </nav>
      </div>
      <p className="pb-10 text-center text-xs text-slate-400">© {new Date().getFullYear()} NCR Suite — Tous droits réservés.</p>
    </footer>
  );
}
