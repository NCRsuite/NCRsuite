import { CSSProperties, useEffect, useMemo, useState } from 'react';
import { useParams } from 'react-router-dom';
import { formatRestaurantMoney } from '../features/restaurant/types';
import { supabase } from '../lib/supabase';

type Language = 'fr' | 'en' | 'es' | 'it';
type RestaurantTheme = 'signature' | 'bistro' | 'gastronomique' | 'street' | 'mediterraneen' | 'minimal';
type RestaurantLayout = 'gallery' | 'editorial';

interface PublicMenuItem {
  id: string;
  category_id: string;
  category_position: number;
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
  image_url: string | null;
}

interface PublicMenuPayload {
  organization_name: string;
  public_name: string | null;
  primary_color: string;
  secondary_color: string;
  logo_url: string | null;
  cover_url: string | null;
  theme_code: RestaurantTheme;
  layout_code: RestaurantLayout;
  hero_eyebrow: string;
  hero_title: string;
  hero_description: string;
  address: string | null;
  hours_text: string | null;
  practical_info: string | null;
  show_category_nav: boolean;
  show_dish_images: boolean;
  show_allergens: boolean;
  show_dietary_badges: boolean;
  booking_enabled: boolean;
  booking_button_label: string | null;
  show_ncr_branding: boolean;
  menu_enabled: boolean;
  items: PublicMenuItem[];
}

const languageLabels: Record<Language, string> = { fr: 'FR', en: 'EN', es: 'ES', it: 'IT' };

const ui: Record<Language, {
  menu: string; vegetarian: string; vegan: string; powered: string; loading: string;
  unavailableTitle: string; unavailableMessage: string; languageNav: string;
  selection: string; featured: string; book: string; address: string; hours: string;
  practical: string; categories: string; empty: string; allergens: string; scrollTop: string;
}> = {
  fr: { menu: 'La carte', vegetarian: 'Végétarien', vegan: 'Végan', powered: 'Menu numérique propulsé par NCR Suite', loading: 'Préparation du menu…', unavailableTitle: 'Menu indisponible', unavailableMessage: 'Ce restaurant n’a pas activé son menu public.', languageNav: 'Choisir la langue', selection: 'Notre sélection', featured: 'Suggestion du chef', book: 'Réserver une table', address: 'Adresse', hours: 'Horaires', practical: 'À savoir', categories: 'Catégories', empty: 'La carte est en cours de préparation.', allergens: 'Allergènes', scrollTop: 'Revenir en haut' },
  en: { menu: 'Menu', vegetarian: 'Vegetarian', vegan: 'Vegan', powered: 'Digital menu powered by NCR Suite', loading: 'Preparing the menu…', unavailableTitle: 'Menu unavailable', unavailableMessage: 'This restaurant has not enabled its public menu.', languageNav: 'Choose language', selection: 'Our selection', featured: "Chef's recommendation", book: 'Book a table', address: 'Address', hours: 'Opening hours', practical: 'Good to know', categories: 'Categories', empty: 'The menu is being prepared.', allergens: 'Allergens', scrollTop: 'Back to top' },
  es: { menu: 'La carta', vegetarian: 'Vegetariano', vegan: 'Vegano', powered: 'Menú digital creado con NCR Suite', loading: 'Preparando el menú…', unavailableTitle: 'Menú no disponible', unavailableMessage: 'Este restaurante no ha activado su menú público.', languageNav: 'Elegir idioma', selection: 'Nuestra selección', featured: 'Sugerencia del chef', book: 'Reservar una mesa', address: 'Dirección', hours: 'Horarios', practical: 'Información', categories: 'Categorías', empty: 'La carta está en preparación.', allergens: 'Alérgenos', scrollTop: 'Volver arriba' },
  it: { menu: 'Il menù', vegetarian: 'Vegetariano', vegan: 'Vegano', powered: 'Menù digitale creato con NCR Suite', loading: 'Preparazione del menù…', unavailableTitle: 'Menù non disponibile', unavailableMessage: 'Questo ristorante non ha attivato il menù pubblico.', languageNav: 'Scegli la lingua', selection: 'La nostra selezione', featured: 'Consiglio dello chef', book: 'Prenota un tavolo', address: 'Indirizzo', hours: 'Orari', practical: 'Informazioni', categories: 'Categorie', empty: 'Il menù è in preparazione.', allergens: 'Allergeni', scrollTop: 'Torna su' },
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

function detectInitialLanguage(): Language {
  if (typeof navigator === 'undefined') return 'fr';
  const browserLanguage = navigator.language.toLowerCase().slice(0, 2);
  return browserLanguage === 'en' || browserLanguage === 'es' || browserLanguage === 'it' ? browserLanguage : 'fr';
}

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

function categoryVisual(categoryName = '') {
  const value = categoryName.toLowerCase();
  if (value.includes('boisson') || value.includes('drink') || value.includes('bebida') || value.includes('vino') || value.includes('cocktail')) return '🥂';
  if (value.includes('entrée') || value.includes('starter') || value.includes('entrada') || value.includes('antipast') || value.includes('salade')) return '🥗';
  if (value.includes('dessert') || value.includes('postre') || value.includes('dolc') || value.includes('glace')) return '🍰';
  if (value.includes('pizza')) return '🍕';
  if (value.includes('burger')) return '🍔';
  if (value.includes('poisson') || value.includes('fish') || value.includes('pesce')) return '🐟';
  return '🍽️';
}

export function PublicRestaurantMenuPage() {
  const { slug = '' } = useParams();
  const [payload, setPayload] = useState<PublicMenuPayload | null>(null);
  const [language, setLanguage] = useState<Language>(detectInitialLanguage);
  const [activeCategory, setActiveCategory] = useState('');
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
    const map = new Map<string, { id: string; position: number; name: string; items: PublicMenuItem[] }>();
    (payload?.items ?? []).forEach((item) => {
      const current = map.get(item.category_id);
      if (current) current.items.push(item);
      else map.set(item.category_id, { id: item.category_id, position: item.category_position, name: localizedCategory(item, language), items: [item] });
    });
    return [...map.values()].sort((a, b) => a.position - b.position);
  }, [payload, language]);

  useEffect(() => {
    if (groups.length && !groups.some((group) => group.id === activeCategory)) setActiveCategory(groups[0].id);
  }, [groups, activeCategory]);

  const copy = ui[language];
  const restaurantName = payload?.public_name || payload?.organization_name || '';
  const customBookingLabel = payload?.booking_button_label?.trim();
  const bookingLabel = !customBookingLabel || customBookingLabel === 'Réserver une table' ? copy.book : customBookingLabel;

  function scrollToCategory(id: string) {
    setActiveCategory(id);
    document.getElementById(`menu-category-${id}`)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

  if (loading) return <div className="public-restaurant-page restaurant-public-loading-screen" lang={language}><div className="public-restaurant-loading"><span>✦</span><p>{copy.loading}</p></div></div>;
  if (error || !payload?.menu_enabled) return <div className="public-restaurant-page" lang={language}><div className="public-restaurant-error"><span>🍽️</span><h1>{copy.unavailableTitle}</h1><p>{error || copy.unavailableMessage}</p></div></div>;

  const pageStyle = {
    '--restaurant-brand': payload.primary_color || '#7f1d1d',
    '--restaurant-secondary': payload.secondary_color || '#d6a15d',
    '--restaurant-cover-image': payload.cover_url ? `url("${payload.cover_url}")` : 'none',
  } as CSSProperties;

  return <div className={`public-restaurant-page restaurant-public-v213 restaurant-theme-${payload.theme_code || 'signature'} restaurant-layout-${payload.layout_code || 'gallery'}`} lang={language} style={pageStyle}>
    <header className="restaurant-public-topbar">
      <a className="restaurant-public-brand" href="#restaurant-menu-top" aria-label={restaurantName}>
        {payload.logo_url ? <img src={payload.logo_url} alt=""/> : <span>{restaurantName.slice(0, 1).toUpperCase() || 'R'}</span>}
        <div><small>{copy.menu}</small><strong>{restaurantName}</strong></div>
      </a>
      <nav className="restaurant-public-languages" aria-label={copy.languageNav}>{(Object.keys(languageLabels) as Language[]).map((value) => <button key={value} className={language === value ? 'active' : ''} onClick={() => setLanguage(value)} aria-pressed={language === value}>{languageLabels[value]}</button>)}</nav>
    </header>

    <section id="restaurant-menu-top" className="restaurant-public-hero">
      <div className="restaurant-public-hero-overlay"/>
      <div className="restaurant-public-hero-content">
        <span>{payload.hero_eyebrow || copy.selection}</span>
        <h1>{payload.hero_title || restaurantName}</h1>
        <p>{payload.hero_description}</p>
        {payload.booking_enabled && <a href={`/r/${slug}/reserver`} className="restaurant-public-book-button">{bookingLabel}<b>→</b></a>}
      </div>
      <div className="restaurant-public-hero-mark">{payload.logo_url ? <img src={payload.logo_url} alt=""/> : <span>{restaurantName.slice(0, 1).toUpperCase()}</span>}</div>
    </section>

    {(payload.address || payload.hours_text || payload.practical_info) && <section className="restaurant-public-info-strip">
      {payload.address && <article><span>⌖</span><div><small>{copy.address}</small><p>{payload.address}</p></div></article>}
      {payload.hours_text && <article><span>◷</span><div><small>{copy.hours}</small><p>{payload.hours_text}</p></div></article>}
      {payload.practical_info && <article><span>i</span><div><small>{copy.practical}</small><p>{payload.practical_info}</p></div></article>}
    </section>}

    {payload.show_category_nav && groups.length > 1 && <nav className="restaurant-public-category-nav" aria-label={copy.categories}><div>{groups.map((group) => <button key={group.id} className={activeCategory === group.id ? 'active' : ''} onClick={() => scrollToCategory(group.id)}><span>{categoryVisual(group.name)}</span>{group.name}</button>)}</div></nav>}

    <main className="restaurant-public-menu-content">
      {groups.map((group) => <section id={`menu-category-${group.id}`} key={group.id} className="restaurant-public-category-section">
        <header><div><span>{categoryVisual(group.name)}</span><div><small>{copy.selection}</small><h2>{group.name}</h2></div></div><i>{group.items.length}</i></header>
        <div className="restaurant-public-dish-grid">{group.items.map((item) => {
          const description = localizedDescription(item, language);
          const hasImage = payload.show_dish_images && Boolean(item.image_url);
          return <article key={item.id} className={`restaurant-public-dish-card ${item.featured ? 'featured' : ''} ${hasImage ? 'has-image' : 'without-image'}`}>
            {hasImage ? <div className="restaurant-public-dish-image"><img src={item.image_url || ''} alt="" loading="lazy"/><span>{item.featured ? copy.featured : group.name}</span></div> : <div className="restaurant-public-dish-placeholder"><span>{categoryVisual(group.name)}</span></div>}
            <div className="restaurant-public-dish-body">
              <div className="restaurant-public-dish-heading"><div>{item.featured && <small>{copy.featured}</small>}<h3>{localizedName(item, language)}</h3></div><strong>{formatRestaurantMoney(item.price_cents)}</strong></div>
              {description && <p>{description}</p>}
              {((payload.show_dietary_badges && (item.vegetarian || item.vegan)) || (payload.show_allergens && item.allergens.length > 0)) && <div className="restaurant-public-dish-tags">
                {payload.show_dietary_badges && item.vegetarian && <span className="dietary">🌿 {copy.vegetarian}</span>}
                {payload.show_dietary_badges && item.vegan && <span className="dietary">🌱 {copy.vegan}</span>}
                {payload.show_allergens && item.allergens.map((allergen) => <span key={allergen} className="allergen" title={copy.allergens}>{allergenTranslations[allergen]?.[language] || allergen}</span>)}
              </div>}
            </div>
          </article>;
        })}</div>
      </section>)}
      {groups.length === 0 && <div className="restaurant-public-empty"><span>🍽️</span><h2>{copy.empty}</h2></div>}
    </main>

    <section className="restaurant-public-closing">
      <div><span>✦</span><h2>{restaurantName}</h2><p>{payload.hero_description}</p></div>
      {payload.booking_enabled && <a href={`/r/${slug}/reserver`}>{bookingLabel}<b>→</b></a>}
    </section>

    <footer className="restaurant-public-footer">
      <button type="button" onClick={() => document.getElementById('restaurant-menu-top')?.scrollIntoView({ behavior: 'smooth' })}>{copy.scrollTop} ↑</button>
      {payload.show_ncr_branding && <span>{copy.powered}</span>}
    </footer>
  </div>;
}
