import { useEffect, useMemo, useState } from 'react';
import { useParams } from 'react-router-dom';
import { formatRestaurantMoney } from '../features/restaurant/types';
import { supabase } from '../lib/supabase';

interface PublicMenuPayload { organization_name: string; public_name: string | null; primary_color: string; logo_url: string | null; menu_enabled: boolean; items: Array<{ id: string; category_name: string; name: string; description_fr: string | null; description_en: string | null; description_es: string | null; description_it: string | null; price_cents: number; allergens: string[]; vegetarian: boolean; vegan: boolean; featured: boolean }>; }

type Language = 'fr' | 'en' | 'es' | 'it';
const languageLabels: Record<Language, string> = { fr: 'FR', en: 'EN', es: 'ES', it: 'IT' };

export function PublicRestaurantMenuPage() {
  const { slug = '' } = useParams(); const [payload, setPayload] = useState<PublicMenuPayload | null>(null); const [language, setLanguage] = useState<Language>('fr'); const [loading, setLoading] = useState(true); const [error, setError] = useState('');
  useEffect(() => { if (!supabase || !slug) { setLoading(false); return; } let active = true; supabase.rpc('get_public_restaurant_menu', { p_slug: slug }).then(({ data, error: loadError }) => { if (!active) return; if (loadError) setError(loadError.message); else setPayload((Array.isArray(data) ? data[0] : data) as PublicMenuPayload | null); setLoading(false); }); return () => { active = false; }; }, [slug]);
  const groups = useMemo(() => { const map = new Map<string, PublicMenuPayload['items']>(); (payload?.items ?? []).forEach((item) => map.set(item.category_name, [...(map.get(item.category_name) ?? []), item])); return [...map.entries()]; }, [payload]);
  function description(item: PublicMenuPayload['items'][number]) { return language === 'en' ? item.description_en || item.description_fr : language === 'es' ? item.description_es || item.description_fr : language === 'it' ? item.description_it || item.description_fr : item.description_fr; }
  if (loading) return <div className="public-restaurant-page"><div className="public-restaurant-loading">Chargement du menu…</div></div>;
  if (error || !payload?.menu_enabled) return <div className="public-restaurant-page"><div className="public-restaurant-error"><h1>Menu indisponible</h1><p>{error || 'Ce restaurant n’a pas activé son menu public.'}</p></div></div>;
  return <div className="public-restaurant-page" style={{ '--restaurant-brand': payload.primary_color } as React.CSSProperties}><header className="public-restaurant-header">{payload.logo_url && <img src={payload.logo_url} alt=""/>}<div><span>MENU</span><h1>{payload.public_name || payload.organization_name}</h1></div><nav>{(Object.keys(languageLabels) as Language[]).map((value) => <button key={value} className={language === value ? 'active' : ''} onClick={() => setLanguage(value)}>{languageLabels[value]}</button>)}</nav></header><main className="public-restaurant-menu">{groups.map(([category, items]) => <section key={category}><h2>{category}</h2><div>{items.map((item) => <article key={item.id} className={item.featured ? 'featured' : ''}><div><h3>{item.name}</h3><p>{description(item)}</p><div className="public-menu-tags">{item.vegetarian && <span>Végétarien</span>}{item.vegan && <span>Végan</span>}{item.allergens.map((allergen) => <span key={allergen} className="allergen">{allergen}</span>)}</div></div><strong>{formatRestaurantMoney(item.price_cents)}</strong></article>)}</div></section>)}</main><footer className="public-restaurant-footer">Menu numérique propulsé par NCR Suite</footer></div>;
}
