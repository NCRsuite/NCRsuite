import { GraduationCap, ShieldCheck, Sparkles, Utensils, Scissors, Layers } from "lucide-react";
import { VERTICALS } from "../verticals";
export const VERTICAL_ICONS = [GraduationCap, ShieldCheck, Sparkles, Utensils, Scissors];
export default function VerticalSelector({ active, onChange, label = "Choisir un univers métier", overview = true }: { active: number; onChange: (index: number) => void; label?: string; overview?: boolean }) {
  return <div className="vertical-selector" role="group" aria-label={label}>
    {overview && <button type="button" aria-pressed={active === -1} onClick={() => onChange(-1)} className="vertical-choice" style={{ "--choice-accent": "#25344b", "--choice-soft": "#eef2f7" } as React.CSSProperties}><Layers size={15} aria-hidden="true" /><span>NCR Suite</span></button>}
    {VERTICALS.map((v, i) => { const Icon = VERTICAL_ICONS[i]; return <button type="button" key={v.key} aria-pressed={active === i} onClick={() => onChange(i)} className="vertical-choice" style={{ "--choice-accent": v.accent, "--choice-soft": v.soft } as React.CSSProperties}><Icon size={15} aria-hidden="true" /><span>{v.label}</span></button>; })}
  </div>;
}
