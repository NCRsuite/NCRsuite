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

interface PublicMenuUiCopy {
  menu: string;
  vegetarian: string;
  vegan: string;
  powered: string;
  loading: string;
  unavailableTitle: string;
  unavailableMessage: string;
  languageNav: string;
  categorySingular: string;
  categoryPlural: string;
  dishSingular: string;
  dishPlural: string;
  heroEyebrow: string;
  heroTitle: string;
  heroDescription: string;
  selection: string;
  featured: string;
}

const ui: Record<Language, PublicMenuUiCopy> = {
  fr: {
    menu: 'MENU',
    vegetarian: 'Végétarien',
    vegan: 'Végan',
    powered: 'Menu numérique propulsé par NCR Suite',
    loading: 'Chargement du menu…',
    unavailableTitle: 'Menu indisponible',
    unavailableMessage: 'Ce restaurant n’a pas activé son menu public.',
    languageNav: 'Choisir la langue',
    categorySingular: 'catégorie',
    categoryPlural: 'catégories',
    dishSingular: 'proposition',
    dishPlural: 'propositions',
    heroEyebrow: 'La carte du moment',
    heroTitle: 'Bienvenue à table',
    heroDescription: 'Découvrez les plats, leurs descriptions et les allergènes dans la langue de votre choix.',
    selection: 'NOTRE SÉLECTION',
    featured: 'Suggestion du chef',
  },
  en: {
    menu: 'MENU',
    vegetarian: 'Vegetarian',
    vegan: 'Vegan',
    powered: 'Digital menu powered by NCR Suite',
    loading: 'Loading menu…',
    unavailableTitle: 'Menu unavailable',
    unavailableMessage: 'This restaurant has not enabled its public menu.',
    languageNav: 'Choose language',
    categorySingular: 'category',
    categoryPlural: 'categories',
    dishSingular: 'dish',
    dishPlural: 'dishes',
    heroEyebrow: "Today's menu",
    heroTitle: 'Welcome to our table',
    heroDescription: 'Discover our dishes, descriptions and allergens in your preferred language.',
    selection: 'OUR SELECTION',
    featured: "Chef's recommendation",
  },
  es: {
    menu: 'MENÚ',
    vegetarian: 'Vegetariano',
    vegan: 'Vegano',
    powered: 'Menú digital creado con NCR Suite',
    loading: 'Cargando el menú…',
    unavailableTitle: 'Menú no disponible',
    unavailableMessage: 'Este restaurante no ha activado su menú público.',
    languageNav: 'Elegir idioma',
    categorySingular: 'categoría',
    categoryPlural: 'categorías',
    dishSingular: 'plato',
    dishPlural: 'platos',
    heroEyebrow: 'La carta del momento',
    heroTitle: 'Bienvenido a nuestra mesa',
    heroDescription: 'Descubre los platos, sus descripciones y los alérgenos en el idioma que prefieras.',
    selection: 'NUESTRA SELECCIÓN',
    featured: 'Sugerencia del chef',
  },
  it: {
    menu: 'MENÙ',
    vegetarian: 'Vegetariano',
    vegan: 'Vegano',
    powered: 'Menù digitale creato con NCR Suite',
    loading: 'Caricamento del menù…',
    unavailableTitle: 'Menù non disponibile',
    unavailableMessage: 'Questo ristorante non ha attivato il menù pubblico.',
    languageNav: 'Scegli la lingua',
    categorySingular: 'categoria',
    categoryPlural: 'categorie',
    dishSingular: 'piatto',
    dishPlural: 'piatti',
    heroEyebrow: 'Il menù del momento',
    heroTitle: 'Benvenuti a tavola',
    heroDescription: 'Scopri i piatti, le descrizioni e gli allergeni nella lingua che preferisci.',
    selection: 'LA NOSTRA SELEZIONE',
    featured: 'Consiglio dello chef',
  },
};

function detectInitialLanguage(): Language {
  if (typeof navigator === 'undefined') return 'fr';
  const browserLanguage = navigator.language.toLowerCase().slice(0, 2);
  return browserLanguage === 'en' || browserLanguage === 'es' || browserLanguage === 'it' ? browserLanguage : 'fr';
}

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

function publicMenuVisual(categoryName = '') {
  const value = categoryName.toLowerCase();
  if (value.includes('boisson') || value.includes('drink') || value.includes('bebida') || value.includes('vino') || value.includes('cocktail')) return '🥂';
  if (value.includes('entrée') || value.includes('starter') || value.includes('entrada') || value.includes('antipast')) return '🥗';
  if (value.includes('dessert') || value.includes('postre') || value.includes('dolc')) return '🍰';
  if (value.includes('menu') || value.includes('menú') || value.includes('menù')) return '📖';
  return '🍽️';
}

export function PublicRestaurantMenuPage() {
  const { slug = '' } = useParams();
  const [payload, setPayload] = useState<PublicMenuPayload | null>(null);
  const [language, setLanguage] = useState<Language>(detectInitialLanguage);
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

  const copy = ui[language];
  const categoryLabel = groups.length === 1 ? copy.categorySingular : copy.categoryPlural;
  const dishLabel = (payload?.items.length ?? 0) === 1 ? copy.dishSingular : copy.dishPlural;

  if (loading) return <div className="public-restaurant-page" lang={language}><div className="public-restaurant-loading">{copy.loading}</div></div>;
  if (error || !payload?.menu_enabled) return <div className="public-restaurant-page" lang={language}><div className="public-restaurant-error"><h1>{copy.unavailableTitle}</h1><p>{error || copy.unavailableMessage}</p></div></div>;

  return <div className="public-restaurant-page public-restaurant-premium-menu" lang={language} style={{ '--restaurant-brand': payload.primary_color } as React.CSSProperties}>
    <header className="public-restaurant-header">
      <div className="public-restaurant-brand-block">{payload.logo_url ? <img src={payload.logo_url} alt=""/> : <span className="public-restaurant-logo-fallback">🍽️</span>}<div><span>{copy.menu}</span><h1>{payload.public_name || payload.organization_name}</h1><p>{groups.length} {categoryLabel} · {payload.items.length} {dishLabel}</p></div></div>
      <nav aria-label={copy.languageNav}>{(Object.keys(languageLabels) as Language[]).map((value) => <button key={value} className={language === value ? 'active' : ''} onClick={() => setLanguage(value)} aria-pressed={language === value}>{languageLabels[value]}</button>)}</nav>
    </header>
    <div className="public-restaurant-hero"><span>{copy.heroEyebrow}</span><strong>{copy.heroTitle}</strong><p>{copy.heroDescription}</p></div>
    <main className="public-restaurant-menu">{groups.map(([category, items]) => <section key={category}><header className="public-menu-category-header"><span>{publicMenuVisual(category)}</span><div><small>{copy.selection}</small><h2>{category}</h2></div><i>{items.length}</i></header><div>{items.map((item) => <article key={item.id} className={item.featured ? 'featured' : ''}><span className="public-menu-dish-visual">{publicMenuVisual(category)}</span><div className="public-menu-dish-copy">{item.featured && <small className="public-menu-featured-badge">{copy.featured}</small>}<h3>{localizedName(item, language)}</h3>{localizedDescription(item, language) && <p>{localizedDescription(item, language)}</p>}<div className="public-menu-tags">{item.vegetarian && <span>🌿 {copy.vegetarian}</span>}{item.vegan && <span>🌱 {copy.vegan}</span>}{item.allergens.map((allergen) => <span key={allergen} className="allergen">{allergenTranslations[allergen]?.[language] || allergen}</span>)}</div></div><strong className="public-menu-dish-price">{formatRestaurantMoney(item.price_cents)}</strong></article>)}</div></section>)}</main>
    <footer className="public-restaurant-footer"><span>🍴</span>{copy.powered}</footer>
  </div>;
}
