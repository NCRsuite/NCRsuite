import { useEffect, useState, useRef } from "react";
import { Menu, X } from "lucide-react";
import { Logo } from "./Logo";
import { TRIAL_URL, LOGIN_URL } from "../data";

const NAV = [
  { href: "#plateforme", label: "Univers" },
  { href: "#socle", label: "Socle" },
  { href: "#produit", label: "Produit" },
  { href: "#offres", label: "Offres" },
  { href: "#faq", label: "FAQ" },
];

function Toggle3D({ on, onToggle }: { on: boolean; onToggle: () => void }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={on}
      onClick={onToggle}
      title="Activer ou désactiver les effets 3D"
      className="flex items-center gap-2 rounded-full px-2 py-1.5 text-[0.78rem] font-medium text-slate-600 transition hover:text-ink"
    >
      <span>Effets 3D</span>
      <span className={`relative h-[18px] w-8 rounded-full transition-colors ${on ? "bg-brand" : "bg-slate-300"}`}>
        <span
          className={`absolute top-[2px] h-[14px] w-[14px] rounded-full bg-white shadow transition-all ${on ? "left-[16px]" : "left-[2px]"}`}
        />
      </span>
    </button>
  );
}

export default function Header({ effects, onToggle }: { effects: boolean; onToggle: () => void }) {
  const [scrolled, setScrolled] = useState(false);
  const [open, setOpen] = useState(false);
  const menuButton = useRef<HTMLButtonElement>(null);
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") { setOpen(false); menuButton.current?.focus(); } };
    const onResize = () => { if (window.innerWidth >= 1024) setOpen(false); };
    document.addEventListener("keydown", onKey);
    window.addEventListener("resize", onResize);
    return () => { document.removeEventListener("keydown", onKey); window.removeEventListener("resize", onResize); };
  }, [open]);

  useEffect(() => {
    let previous = false;
    const on = () => { const next = window.scrollY > 24; if (next !== previous) { previous = next; setScrolled(next); } };
    on();
    window.addEventListener("scroll", on, { passive: true });
    return () => window.removeEventListener("scroll", on);
  }, []);

  return (
    <header className="fixed inset-x-0 top-0 z-50">
      <a href="#contenu" className="sr-only-focusable absolute left-4 top-3 z-50 rounded-lg bg-white px-4 py-2 text-sm font-semibold shadow">
        Aller au contenu
      </a>
      <div
        className={`mx-auto mt-3 flex h-14 w-[min(94vw,1180px)] items-center justify-between rounded-full px-4 pl-5 transition-all duration-500 ${
          scrolled || open
            ? "border border-white/70 bg-white/75 shadow-[0_10px_40px_-16px_rgba(16,24,40,0.3)] backdrop-blur-md"
            : "border border-transparent bg-transparent"
        }`}
      >
        <a href="#plateforme" aria-label="NCR Suite — accueil">
          <Logo />
        </a>
        <nav aria-label="Navigation principale" className="hidden items-center gap-1 lg:flex">
          {NAV.map((n) => (
            <a key={n.href} href={n.href} className="rounded-full px-3.5 py-2 text-[0.88rem] font-medium text-slate-600 transition hover:bg-black/5 hover:text-ink">
              {n.label}
            </a>
          ))}
        </nav>
        <div className="flex items-center gap-1.5">
          <div className="hidden lg:block">
            <Toggle3D on={effects} onToggle={onToggle} />
          </div>
          <a href={LOGIN_URL} className="hidden rounded-full px-3 py-2 text-sm font-medium text-slate-600 hover:bg-black/5 xl:inline-flex">Connexion</a>
          <a href={TRIAL_URL} className="btn btn-primary !h-9 !px-4 !text-[0.85rem]">
            Essai 7 jours
          </a>
          <button
            type="button"
            className="flex h-9 w-9 items-center justify-center rounded-full text-ink hover:bg-black/5 lg:hidden"
            aria-label={open ? "Fermer le menu" : "Ouvrir le menu"}
            ref={menuButton}
            aria-controls="mobile-nav"
            aria-expanded={open}
            onClick={() => setOpen((v) => !v)}
          >
            {open ? <X size={20} /> : <Menu size={20} />}
          </button>
        </div>
      </div>
      {open && (
        <nav id="mobile-nav" aria-label="Menu mobile" className="mx-auto mt-2 w-[min(94vw,1180px)] rounded-3xl border border-white/70 bg-white/90 p-3 shadow-xl backdrop-blur-md lg:hidden">
          {NAV.map((n) => (
            <a key={n.href} href={n.href} onClick={() => setOpen(false)} className="block rounded-2xl px-4 py-3 text-base font-medium text-ink hover:bg-black/5">
              {n.label}
            </a>
          ))}
          <a href={LOGIN_URL} className="block rounded-2xl px-4 py-3 font-medium text-ink">Se connecter</a>
          <div className="mt-1 border-t border-black/5 px-2 pt-2">
            <Toggle3D on={effects} onToggle={onToggle} />
          </div>
        </nav>
      )}
    </header>
  );
}
