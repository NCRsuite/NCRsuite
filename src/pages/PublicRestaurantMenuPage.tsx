import { useEffect, useMemo, useState } from 'react';
import { useParams } from 'react-router-dom';
import { formatRestaurantMoney } from '../features/restaurant/types';
import { supabase } from '../lib/supabase';

type Language = 'fr' | 'en' | 'es' | 'it';

interface PublicMenuItem {
  id: string;
  category_name: string;
  category_name_en: string | null;
  category_name_es: string | null;
  category_name_it: string | null;
  name: string;
  name_en: string | null;
  name_es: string | null;
  name_it: string | null;
  description_fr: string | null;
  description_en: string | null;
  description_es: string | null;
  description_it: string | null;
  price_cents: number;
  allergens: string[];
  vegetarian: boolean;
  vegan: boolean;
  featured: boolean;
}

interface PublicMenuPayload {
  organization_name: string;
  public_name: string | null;
  primary_color: string;
  logo_url: string | null;
  menu_enabled: boolean;
  items: PublicMenuItem[];
}

const languageLabels: Record<Language, string> = { fr: 'FR', en: 'EN', es: 'ES', it: 'IT' };
const ui: Record<Language, { menu: string; vegetarian: string; vegan: string; powered: string }> = {
  fr: { menu: 'MENU', vegetarian: 'Végétarien', vegan: 'Végan', powered: 'Menu numérique propulsé par NCR Suite' },
  en: { menu: 'MENU', vegetarian: 'Vegetarian', vegan: 'Vegan', powered: 'Digital menu powered by NCR Suite' },
  es: { menu: 'MENÚ', vegetarian: 'Vegetariano', vegan: 'Vegano', powered: 'Menú digital creado con NCR Suite' },
  it: { menu: 'MENÙ', vegetarian: 'Vegetariano', vegan: 'Vegano', powered: 'Menù digitale creato con NCR Suite' },
};

const allergenTranslations: Record<string, Record<Language, string>> = {
  Gluten: { fr: 'Gluten', en: 'Gluten', es: 'Gluten', it: 'Glutine' },
  Crustacés: { fr: 'Crustacés', en: 'Crustaceans', es: 'Crustáceos', it: 'Crostacei' },
  Œufs: { fr: 'Œufs', en: 'Eggs', es: 'Huevos', it: 'Uova' },
  Poissons: { fr: 'Poissons', en: 'Fish', es: 'Pescado', it: 'Pesce' },
  Arachides: { fr: 'Arachides', en: 'Peanuts', es: 'Cacahuetes', it: 'Arachidi' },
  Soja: { fr: 'Soja', en: 'Soy', es: 'Soja', it: 'Soia' },
  Lait: { fr: 'Lait', en: 'Milk', es: 'Leche', it: 'Latte' },
  'Fruits à coque': { fr: 'Fruits à coque', en: 'Tree nuts', es: 'Frutos de cáscara', it: 'Frutta a guscio' },
  Céleri: { fr: 'Céleri', en: 'Celery', es: 'Apio', it: 'Sedano' },
  Moutarde: { fr: 'Moutarde', en: 'Mustard', es: 'Mostaza', it: 'Senape' },
  Sésame: { fr: 'Sésame', en: 'Sesame', es: 'Sésamo', it: 'Sesamo' },
  Sulfites: { fr: 'Sulfites', en: 'Sulphites', es: 'Sulfitos', it: 'Solfiti' },
  Lupin: { fr: 'Lupin', en: 'Lupin', es: 'Altramuces', it: 'Lupini' },
  Mollusques: { fr: 'Mollusques', en: 'Molluscs', es: 'Moluscos', it: 'Molluschi' },
};

function localizedName(item: PublicMenuItem, language: Language) {
  if (language === 'en') return item.name_en || item.name;
  if (language === 'es') return item.name_es || item.name;
  if (language === 'it') return item.name_it || item.name;
  return item.name;
}

function localizedCategory(item: PublicMenuItem, language: Language) {
  if (language === 'en') return item.category_name_en || item.category_name;
  if (language === 'es') return item.category_name_es || item.category_name;
  if (language === 'it') return item.category_name_it || item.category_name;
  return item.category_name;
}

function localizedDescription(item: PublicMenuItem, language: Language) {
  if (language === 'en') return item.description_en || item.description_fr;
  if (language === 'es') return item.description_es || item.description_fr;
  if (language === 'it') return item.description_it || item.description_fr;
  return item.description_fr;
}

export function PublicRestaurantMenuPage() {
  const { slug = '' } = useParams();
  const [payload, setPayload] = useState<PublicMenuPayload | null>(null);
  const [language, setLanguage] = useState<Language>('fr');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!supabase || !slug) { setLoading(false); return; }
    let active = true;
    supabase.rpc('get_public_restaurant_menu', { p_slug: slug }).then(({ data, error: loadError }) => {
      if (!active) return;
      if (loadError) setError(loadError.message);
      else setPayload((Array.isArray(data) ? data[0] : data) as PublicMenuPayload | null);
      setLoading(false);
    });
    return () => { active = false; };
  }, [slug]);

  const groups = useMemo(() => {
    const map = new Map<string, PublicMenuItem[]>();
    (payload?.items ?? []).forEach((item) => {
      const category = localizedCategory(item, language);
      map.set(category, [...(map.get(category) ?? []), item]);
    });
    return [...map.entries()];
  }, [payload, language]);

  if (loading) return <div className="public-restaurant-page"><div className="public-restaurant-loading">Chargement du menu…</div></div>;
  if (error || !payload?.menu_enabled) return <div className="public-restaurant-page"><div className="public-restaurant-error"><h1>Menu indisponible</h1><p>{error || 'Ce restaurant n’a pas activé son menu public.'}</p></div></div>;

  return <div className="public-restaurant-page" style={{ '--restaurant-brand': payload.primary_color } as React.CSSProperties}>
    <header className="public-restaurant-header">
      {payload.logo_url && <img src={payload.logo_url} alt=""/>}
      <div><span>{ui[language].menu}</span><h1>{payload.public_name || payload.organization_name}</h1></div>
      <nav>{(Object.keys(languageLabels) as Language[]).map((value) => <button key={value} className={language === value ? 'active' : ''} onClick={() => setLanguage(value)}>{languageLabels[value]}</button>)}</nav>
    </header>
    <main className="public-restaurant-menu">{groups.map(([category, items]) => <section key={category}><h2>{category}</h2><div>{items.map((item) => <article key={item.id} className={item.featured ? 'featured' : ''}><div><h3>{localizedName(item, language)}</h3>{localizedDescription(item, language) && <p>{localizedDescription(item, language)}</p>}<div className="public-menu-tags">{item.vegetarian && <span>{ui[language].vegetarian}</span>}{item.vegan && <span>{ui[language].vegan}</span>}{item.allergens.map((allergen) => <span key={allergen} className="allergen">{allergenTranslations[allergen]?.[language] || allergen}</span>)}</div></div><strong>{formatRestaurantMoney(item.price_cents)}</strong></article>)}</div></section>)}</main>
    <footer className="public-restaurant-footer">{ui[language].powered}</footer>
  </div>;
}
