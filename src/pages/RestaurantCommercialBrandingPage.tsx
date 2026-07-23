import { CSSProperties, FormEvent, useEffect, useMemo, useState } from 'react';
import { Icon } from '../components/Icon';
import { organizationHasFeature } from '../config/planEntitlements';
import { useAuth } from '../contexts/AuthContext';
import { useOrganization } from '../contexts/OrganizationContext';
import { supabase } from '../lib/supabase';
import { readJsonStorage, writeJsonStorage } from '../lib/safeStorage';

const allowedImageTypes = ['image/png', 'image/jpeg', 'image/webp'];

type RestaurantTheme = 'signature' | 'bistro' | 'gastronomique' | 'street' | 'mediterraneen' | 'minimal';
type RestaurantLayout = 'gallery' | 'editorial';

type RestaurantMenuSettings = {
  organization_id: string;
  theme_code: RestaurantTheme;
  layout_code: RestaurantLayout;
  secondary_color: string;
  cover_url: string | null;
  hero_eyebrow: string | null;
  hero_title: string | null;
  hero_description: string | null;
  show_category_nav: boolean;
  show_dish_images: boolean;
  show_allergens: boolean;
  show_dietary_badges: boolean;
  show_booking_button: boolean;
  booking_button_label: string | null;
};

const themeChoices: Array<{ id: RestaurantTheme; label: string; description: string; icon: string }> = [
  { id: 'signature', label: 'Signature', description: 'Chaleureux, élégant et polyvalent.', icon: '✦' },
  { id: 'bistro', label: 'Bistro', description: 'Convivial, traditionnel et authentique.', icon: '🍷' },
  { id: 'gastronomique', label: 'Gastronomique', description: 'Sombre, raffiné et haut de gamme.', icon: '✧' },
  { id: 'street', label: 'Street food', description: 'Énergique, direct et très visuel.', icon: '🔥' },
  { id: 'mediterraneen', label: 'Méditerranéen', description: 'Lumineux, frais et ensoleillé.', icon: '☀️' },
  { id: 'minimal', label: 'Minimal', description: 'Clair, moderne et sans surcharge.', icon: '◻︎' },
];

const defaultSettings: Omit<RestaurantMenuSettings, 'organization_id'> = {
  theme_code: 'signature',
  layout_code: 'gallery',
  secondary_color: '#d6a15d',
  cover_url: null,
  hero_eyebrow: 'La carte du moment',
  hero_title: 'Bienvenue à table',
  hero_description: 'Découvrez notre sélection, préparée avec soin et présentée dans la langue de votre choix.',
  show_category_nav: true,
  show_dish_images: true,
  show_allergens: true,
  show_dietary_badges: true,
  show_booking_button: true,
  booking_button_label: 'Réserver une table',
};

function normalizeSlug(value: string) {
  return value.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 60);
}

function extensionFor(file: File) {
  if (file.type === 'image/png') return 'png';
  if (file.type === 'image/webp') return 'webp';
  return 'jpg';
}

export function RestaurantCommercialBrandingPage() {
  const { organization, updateCommercialBranding } = useOrganization();
  const { demoMode } = useAuth();
  const [publicName, setPublicName] = useState('');
  const [slug, setSlug] = useState('');
  const [primaryColor, setPrimaryColor] = useState('#7f1d1d');
  const [secondaryColor, setSecondaryColor] = useState('#d6a15d');
  const [logoUrl, setLogoUrl] = useState<string | null>(null);
  const [coverUrl, setCoverUrl] = useState<string | null>(null);
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [coverFile, setCoverFile] = useState<File | null>(null);
  const [theme, setTheme] = useState<RestaurantTheme>('signature');
  const [layout, setLayout] = useState<RestaurantLayout>('gallery');
  const [tagline, setTagline] = useState('');
  const [heroEyebrow, setHeroEyebrow] = useState('');
  const [heroTitle, setHeroTitle] = useState('');
  const [heroDescription, setHeroDescription] = useState('');
  const [address, setAddress] = useState('');
  const [hoursText, setHoursText] = useState('');
  const [practicalInfo, setPracticalInfo] = useState('');
  const [showCategoryNav, setShowCategoryNav] = useState(true);
  const [showDishImages, setShowDishImages] = useState(true);
  const [showAllergens, setShowAllergens] = useState(true);
  const [showDietaryBadges, setShowDietaryBadges] = useState(true);
  const [showBookingButton, setShowBookingButton] = useState(true);
  const [bookingButtonLabel, setBookingButtonLabel] = useState('Réserver une table');
  const [showNcrBranding, setShowNcrBranding] = useState(true);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  const logoPreview = useMemo(() => logoFile ? URL.createObjectURL(logoFile) : logoUrl, [logoFile, logoUrl]);
  const coverPreview = useMemo(() => coverFile ? URL.createObjectURL(coverFile) : coverUrl, [coverFile, coverUrl]);

  useEffect(() => () => {
    if (logoFile && logoPreview) URL.revokeObjectURL(logoPreview);
    if (coverFile && coverPreview) URL.revokeObjectURL(coverPreview);
  }, [logoFile, logoPreview, coverFile, coverPreview]);

  useEffect(() => {
    const currentOrganization = organization;
    if (!currentOrganization) return;
    setPublicName(currentOrganization.public_name || currentOrganization.name);
    setSlug(currentOrganization.slug);
    setPrimaryColor(currentOrganization.primary_color || '#7f1d1d');
    setLogoUrl(currentOrganization.logo_url ?? null);
    setTagline(currentOrganization.booking_tagline ?? 'Une cuisine qui se découvre aussi avec les yeux.');
    setAddress(currentOrganization.booking_address ?? '');
    setHoursText(currentOrganization.booking_hours_text ?? '');
    setPracticalInfo(currentOrganization.booking_practical_info ?? '');
    setShowNcrBranding(currentOrganization.show_ncr_branding ?? true);
    setLogoFile(null);
    setCoverFile(null);

    const organizationId = currentOrganization.id;
    const organizationBannerUrl = currentOrganization.booking_banner_url ?? null;

    let active = true;
    async function loadSettings() {
      setLoading(true);
      setError('');
      try {
        let settings: RestaurantMenuSettings | null = null;
        if (demoMode || !supabase) {
          settings = readJsonStorage<RestaurantMenuSettings | null>(`ncr-restaurant-public-branding-${organizationId}`, null);
        } else {
          const { data, error: loadError } = await supabase.from('restaurant_public_menu_settings').select('*').eq('organization_id', organizationId).maybeSingle();
          if (loadError) throw loadError;
          settings = data as RestaurantMenuSettings | null;
        }
        if (!active) return;
        const resolved = { ...defaultSettings, ...(settings ?? {}) };
        setTheme(resolved.theme_code);
        setLayout(resolved.layout_code);
        setSecondaryColor(resolved.secondary_color);
        setCoverUrl(resolved.cover_url ?? organizationBannerUrl);
        setHeroEyebrow(resolved.hero_eyebrow ?? '');
        setHeroTitle(resolved.hero_title ?? '');
        setHeroDescription(resolved.hero_description ?? '');
        setShowCategoryNav(resolved.show_category_nav);
        setShowDishImages(resolved.show_dish_images);
        setShowAllergens(resolved.show_allergens);
        setShowDietaryBadges(resolved.show_dietary_badges);
        setShowBookingButton(resolved.show_booking_button);
        setBookingButtonLabel(resolved.booking_button_label ?? 'Réserver une table');
      } catch (caught) {
        if (active) setError(caught instanceof Error ? caught.message : 'Chargement de la personnalisation impossible.');
      } finally {
        if (active) setLoading(false);
      }
    }
    void loadSettings();
    return () => { active = false; };
  }, [organization?.id, demoMode]);

  if (!organization) return null;
  const currentOrganization = organization;

  const canManage = ['owner', 'admin', 'manager'].includes(currentOrganization.role ?? 'viewer');
  const hasBranding = organizationHasFeature(currentOrganization, 'commercial_branding');
  const canHideNcrBranding = organizationHasFeature(currentOrganization, 'white_label');
  const publicOrigin = currentOrganization.custom_domain && currentOrganization.custom_domain_status === 'active'
    ? `https://${currentOrganization.custom_domain}`
    : typeof window === 'undefined' ? '' : window.location.origin;
  const publicUrl = publicOrigin ? `${publicOrigin}/r/${slug || currentOrganization.slug}/menu` : '';
  const previewStyle = {
    '--restaurant-brand': primaryColor,
    '--restaurant-secondary': secondaryColor,
    '--restaurant-cover-image': coverPreview ? `url("${coverPreview}")` : 'none',
  } as CSSProperties;

  function selectFile(file: File | undefined, kind: 'logo' | 'cover') {
    if (!file) return;
    setError('');
    if (!allowedImageTypes.includes(file.type)) { setError('Utilise une image PNG, JPG ou WebP.'); return; }
    const limit = kind === 'logo' ? 2 * 1024 * 1024 : 5 * 1024 * 1024;
    if (file.size > limit) { setError(kind === 'logo' ? 'Le logo ne doit pas dépasser 2 Mo.' : 'La couverture ne doit pas dépasser 5 Mo.'); return; }
    if (kind === 'logo') setLogoFile(file); else setCoverFile(file);
  }

  async function uploadAsset(file: File, kind: 'restaurant-logo' | 'restaurant-cover') {
    if (!supabase) throw new Error('Supabase n’est pas configuré.');
    const path = `${currentOrganization.id}/restaurant/${kind}-${Date.now()}.${extensionFor(file)}`;
    const { error: uploadError } = await supabase.storage.from('organization-branding').upload(path, file, { cacheControl: '3600', upsert: false, contentType: file.type });
    if (uploadError) throw uploadError;
    return supabase.storage.from('organization-branding').getPublicUrl(path).data.publicUrl;
  }

  async function submit(event: FormEvent) {
    event.preventDefault();
    if (!canManage || !hasBranding) return;
    setSaving(true); setError(''); setMessage('');
    try {
      if (publicName.trim().length < 2) throw new Error('Indique un nom d’enseigne valide.');
      if (!slug || slug !== normalizeSlug(slug)) throw new Error('Le lien public contient des caractères non autorisés.');
      if (!/^#[0-9a-fA-F]{6}$/.test(primaryColor) || !/^#[0-9a-fA-F]{6}$/.test(secondaryColor)) throw new Error('Une couleur est invalide.');
      if (heroTitle.trim().length > 140 || heroDescription.trim().length > 420) throw new Error('Le texte d’accueil est trop long.');

      let nextLogoUrl = logoUrl;
      let nextCoverUrl = coverUrl;
      if (logoFile) nextLogoUrl = await uploadAsset(logoFile, 'restaurant-logo');
      if (coverFile) nextCoverUrl = await uploadAsset(coverFile, 'restaurant-cover');

      await updateCommercialBranding({
        publicName, slug, primaryColor, logoUrl: nextLogoUrl, bannerUrl: nextCoverUrl,
        tagline, address, hoursText, practicalInfo,
        showNcrBranding: canHideNcrBranding ? showNcrBranding : true,
      });

      const settings: RestaurantMenuSettings = {
        organization_id: currentOrganization.id,
        theme_code: theme,
        layout_code: layout,
        secondary_color: secondaryColor,
        cover_url: nextCoverUrl,
        hero_eyebrow: heroEyebrow.trim() || null,
        hero_title: heroTitle.trim() || null,
        hero_description: heroDescription.trim() || null,
        show_category_nav: showCategoryNav,
        show_dish_images: showDishImages,
        show_allergens: showAllergens,
        show_dietary_badges: showDietaryBadges,
        show_booking_button: showBookingButton,
        booking_button_label: bookingButtonLabel.trim() || null,
      };

      if (demoMode || !supabase) {
        writeJsonStorage(`ncr-restaurant-public-branding-${currentOrganization.id}`, settings);
      } else {
        const { error: rpcError } = await supabase.rpc('update_restaurant_public_menu_settings', {
          p_organization_id: currentOrganization.id,
          p_theme_code: theme,
          p_layout_code: layout,
          p_secondary_color: secondaryColor,
          p_cover_url: nextCoverUrl,
          p_hero_eyebrow: settings.hero_eyebrow,
          p_hero_title: settings.hero_title,
          p_hero_description: settings.hero_description,
          p_show_category_nav: showCategoryNav,
          p_show_dish_images: showDishImages,
          p_show_allergens: showAllergens,
          p_show_dietary_badges: showDietaryBadges,
          p_show_booking_button: showBookingButton,
          p_booking_button_label: settings.booking_button_label,
        });
        if (rpcError) throw rpcError;
      }

      setLogoUrl(nextLogoUrl); setCoverUrl(nextCoverUrl); setLogoFile(null); setCoverFile(null);
      setMessage('L’identité du menu public a été enregistrée.');
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Enregistrement impossible.');
    } finally { setSaving(false); }
  }

  if (!hasBranding) return <div className="page restaurant-branding-page"><header className="page-header"><div><p className="eyebrow">RESTAURATION</p><h1>Identité du menu public</h1></div></header><section className="panel upgrade-panel"><Icon name="lock" size={24}/><div><h2>Disponible avec le menu QR Essentielle</h2><p>Personnalise le menu public avec l’enseigne, les couleurs, les photos et un thème dédié à la restauration.</p></div></section></div>;

  return <div className="page restaurant-page restaurant-branding-page restaurant-premium-workspace">
    <header className="page-header restaurant-branding-admin-header"><div><p className="eyebrow">RESTAURATION · IDENTITÉ PUBLIQUE</p><h1>Menu à l’image de l’enseigne</h1><p>Compose une expérience QR moderne, gourmande et immédiatement reconnaissable par les clients.</p></div><a className="secondary-button" href={publicUrl} target="_blank" rel="noreferrer"><Icon name="eye" size={18}/>Ouvrir le menu public</a></header>
    {error && <div className="error-message page-message" role="alert">{error}</div>}
    {message && <div className="success-message page-message" role="status">{message}</div>}

    <div className="restaurant-branding-layout">
      <form className="panel restaurant-branding-form" onSubmit={submit}>
        <section className="restaurant-branding-section"><div><p className="eyebrow">ENSEIGNE</p><h2>Identité principale</h2><p>Nom, logo, couleurs et adresse visibles dès l’ouverture du menu.</p></div><div className="branding-form-grid">
          <label>Nom public<input required minLength={2} maxLength={120} value={publicName} onChange={(event) => setPublicName(event.target.value)} disabled={!canManage}/></label>
          <label>Couleur principale<div className="branding-color-control"><input type="color" value={primaryColor} onChange={(event) => setPrimaryColor(event.target.value)} disabled={!canManage}/><code>{primaryColor}</code></div></label>
          <label>Couleur secondaire<div className="branding-color-control"><input type="color" value={secondaryColor} onChange={(event) => setSecondaryColor(event.target.value)} disabled={!canManage}/><code>{secondaryColor}</code></div></label>
          <label className="full-field">Lien public<div className="slug-control"><span>/r/</span><input required value={slug} onChange={(event) => setSlug(normalizeSlug(event.target.value))} disabled={!canManage}/><span>/menu</span></div><small>{publicUrl}</small></label>
          <label className="full-field">Signature courte<textarea rows={2} maxLength={180} value={tagline} onChange={(event) => setTagline(event.target.value)} disabled={!canManage} placeholder="Ex. Cuisine de saison, produits frais et plaisir partagé."/></label>
        </div></section>

        <section className="restaurant-branding-section"><div><p className="eyebrow">VISUELS</p><h2>Logo et couverture</h2><p>La couverture installe immédiatement l’ambiance du restaurant.</p></div><div className="restaurant-branding-upload-grid">
          <article className="restaurant-branding-upload"><div className="restaurant-branding-logo-preview">{logoPreview ? <img src={logoPreview} alt="Aperçu du logo"/> : <span>{publicName.slice(0,1).toUpperCase()}</span>}</div><div><strong>Logo</strong><p>PNG, JPG ou WebP · 2 Mo maximum.</p><label className="secondary-button compact-button">Choisir<input hidden type="file" accept="image/png,image/jpeg,image/webp" onChange={(event) => selectFile(event.target.files?.[0], 'logo')} disabled={!canManage}/></label>{logoPreview && <button type="button" className="danger-text-button" onClick={() => { setLogoFile(null); setLogoUrl(null); }}>Retirer</button>}</div></article>
          <article className="restaurant-branding-upload cover"><div className="restaurant-branding-cover-preview">{coverPreview ? <img src={coverPreview} alt="Aperçu de la couverture"/> : <span>Photo d’ambiance</span>}</div><div><strong>Couverture du menu</strong><p>Format paysage recommandé · 5 Mo maximum.</p><label className="secondary-button compact-button">Choisir<input hidden type="file" accept="image/png,image/jpeg,image/webp" onChange={(event) => selectFile(event.target.files?.[0], 'cover')} disabled={!canManage}/></label>{coverPreview && <button type="button" className="danger-text-button" onClick={() => { setCoverFile(null); setCoverUrl(null); }}>Retirer</button>}</div></article>
        </div></section>

        <section className="restaurant-branding-section"><div><p className="eyebrow">AMBIANCE</p><h2>Choisir un univers</h2><p>Chaque thème conserve les couleurs et l’enseigne du restaurant.</p></div><div className="restaurant-theme-grid">{themeChoices.map((choice) => <button key={choice.id} type="button" className={theme === choice.id ? 'active' : ''} onClick={() => setTheme(choice.id)} disabled={!canManage}><span>{choice.icon}</span><strong>{choice.label}</strong><small>{choice.description}</small></button>)}</div><div className="restaurant-layout-choice"><label><input type="radio" name="restaurant-layout" checked={layout === 'gallery'} onChange={() => setLayout('gallery')}/>Cartes visuelles</label><label><input type="radio" name="restaurant-layout" checked={layout === 'editorial'} onChange={() => setLayout('editorial')}/>Carte éditoriale</label></div></section>

        <section className="restaurant-branding-section"><div><p className="eyebrow">ACCUEIL</p><h2>Texte du menu</h2></div><div className="branding-form-grid">
          <label>Surtitre<input maxLength={80} value={heroEyebrow} onChange={(event) => setHeroEyebrow(event.target.value)} disabled={!canManage} placeholder="La carte du moment"/></label>
          <label>Titre principal<input maxLength={140} value={heroTitle} onChange={(event) => setHeroTitle(event.target.value)} disabled={!canManage} placeholder="Bienvenue à table"/></label>
          <label className="full-field">Texte d’accueil<textarea rows={3} maxLength={420} value={heroDescription} onChange={(event) => setHeroDescription(event.target.value)} disabled={!canManage}/><small>{heroDescription.length}/420</small></label>
          <label className="full-field">Adresse<input maxLength={500} value={address} onChange={(event) => setAddress(event.target.value)} disabled={!canManage}/></label>
          <label>Horaires<textarea rows={3} maxLength={800} value={hoursText} onChange={(event) => setHoursText(event.target.value)} disabled={!canManage}/></label>
          <label>Informations pratiques<textarea rows={3} maxLength={1200} value={practicalInfo} onChange={(event) => setPracticalInfo(event.target.value)} disabled={!canManage}/></label>
        </div></section>

        <section className="restaurant-branding-section"><div><p className="eyebrow">AFFICHAGE</p><h2>Éléments visibles</h2></div><div className="restaurant-public-option-grid">
          <label><input type="checkbox" checked={showCategoryNav} onChange={(event) => setShowCategoryNav(event.target.checked)}/>Navigation rapide par catégorie</label>
          <label><input type="checkbox" checked={showDishImages} onChange={(event) => setShowDishImages(event.target.checked)}/>Photos des plats</label>
          <label><input type="checkbox" checked={showAllergens} onChange={(event) => setShowAllergens(event.target.checked)}/>Allergènes</label>
          <label><input type="checkbox" checked={showDietaryBadges} onChange={(event) => setShowDietaryBadges(event.target.checked)}/>Badges végétarien et végan</label>
          <label><input type="checkbox" checked={showBookingButton} onChange={(event) => setShowBookingButton(event.target.checked)}/>Bouton de réservation</label>
          {canHideNcrBranding && <label><input type="checkbox" checked={showNcrBranding} onChange={(event) => setShowNcrBranding(event.target.checked)}/>Mention NCR Suite</label>}
          {showBookingButton && <label className="full-field">Texte du bouton de réservation<input maxLength={80} value={bookingButtonLabel} onChange={(event) => setBookingButtonLabel(event.target.value)} disabled={!canManage}/></label>}
        </div></section>

        {canManage && <button className="primary-button restaurant-branding-save" disabled={saving || loading}>{saving ? 'Enregistrement…' : 'Publier cette identité'}</button>}
      </form>

      <aside className="restaurant-branding-preview-column"><div className={`restaurant-branding-preview restaurant-theme-${theme} restaurant-layout-${layout}`} style={previewStyle}><div className="restaurant-branding-preview-cover"><div className="restaurant-branding-preview-top">{logoPreview ? <img src={logoPreview} alt=""/> : <span>{publicName.slice(0,1).toUpperCase()}</span>}<small>FR · EN · ES · IT</small></div><div><em>{heroEyebrow || 'La carte du moment'}</em><h2>{heroTitle || publicName || 'Bienvenue à table'}</h2><p>{heroDescription || 'Une sélection pensée pour donner envie dès le premier regard.'}</p></div></div><div className="restaurant-branding-preview-nav"><span>Entrées</span><span>Plats</span><span>Desserts</span></div><div className="restaurant-branding-preview-dishes"><article><div className="restaurant-preview-photo">🍽️</div><div><small>Suggestion du chef</small><strong>Le plat signature</strong><p>Une description gourmande, claire et rassurante.</p></div><b>24 €</b></article><article><div className="restaurant-preview-photo">🍰</div><div><strong>Dessert de saison</strong><p>Une présentation soignée sur tous les écrans.</p></div><b>9 €</b></article></div>{showBookingButton && <button type="button">{bookingButtonLabel || 'Réserver une table'}</button>}</div></aside>
    </div>
  </div>;
}
