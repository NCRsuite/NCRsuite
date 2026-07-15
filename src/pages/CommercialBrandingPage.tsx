import { CSSProperties, FormEvent, useEffect, useMemo, useState } from 'react';
import { Icon } from '../components/Icon';
import { organizationHasFeature } from '../config/planEntitlements';
import { useOrganization } from '../contexts/OrganizationContext';
import { supabase } from '../lib/supabase';

const allowedTypes = ['image/png', 'image/jpeg', 'image/webp'];

function normalizeSlug(value: string) {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 60);
}

function extensionFor(file: File) {
  if (file.type === 'image/png') return 'png';
  if (file.type === 'image/webp') return 'webp';
  return 'jpg';
}

function CoiffureCommercialBrandingPage() {
  const { organization, updateCommercialBranding } = useOrganization();
  const [publicName, setPublicName] = useState('');
  const [slug, setSlug] = useState('');
  const [primaryColor, setPrimaryColor] = useState('#2997ff');
  const [logoUrl, setLogoUrl] = useState<string | null>(null);
  const [bannerUrl, setBannerUrl] = useState<string | null>(null);
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [bannerFile, setBannerFile] = useState<File | null>(null);
  const [tagline, setTagline] = useState('');
  const [address, setAddress] = useState('');
  const [hoursText, setHoursText] = useState('');
  const [practicalInfo, setPracticalInfo] = useState('');
  const [showNcrBranding, setShowNcrBranding] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    if (!organization) return;
    setPublicName(organization.public_name || organization.name);
    setSlug(organization.slug);
    setPrimaryColor(organization.primary_color || '#2997ff');
    setLogoUrl(organization.logo_url ?? null);
    setBannerUrl(organization.booking_banner_url ?? null);
    setTagline(organization.booking_tagline ?? 'Choisissez le créneau qui vous convient.');
    setAddress(organization.booking_address ?? '');
    setHoursText(organization.booking_hours_text ?? '');
    setPracticalInfo(organization.booking_practical_info ?? '');
    setShowNcrBranding(organization.show_ncr_branding ?? true);
    setLogoFile(null);
    setBannerFile(null);
  }, [organization]);

  const logoPreview = useMemo(() => logoFile ? URL.createObjectURL(logoFile) : logoUrl, [logoFile, logoUrl]);
  const bannerPreview = useMemo(() => bannerFile ? URL.createObjectURL(bannerFile) : bannerUrl, [bannerFile, bannerUrl]);

  useEffect(() => () => { if (logoFile && logoPreview) URL.revokeObjectURL(logoPreview); }, [logoFile, logoPreview]);
  useEffect(() => () => { if (bannerFile && bannerPreview) URL.revokeObjectURL(bannerPreview); }, [bannerFile, bannerPreview]);

  if (!organization) return null;

  const canManage = ['owner', 'admin', 'manager'].includes(organization.role ?? 'viewer');
  const hasProfessionalBranding = ['professionnelle', 'metier'].includes(organization.plan);
  const canHideNcrBranding = organization.plan === 'metier' && organization.white_label_enabled === true;
  const publicOrigin = organization.custom_domain && organization.custom_domain_status === 'active'
    ? `https://${organization.custom_domain}`
    : typeof window === 'undefined' ? '' : window.location.origin;
  const publicUrl = publicOrigin ? `${publicOrigin}/reserver/${slug || organization.slug}` : '';
  const previewStyle = { '--preview-accent': primaryColor } as CSSProperties;

  function selectFile(file: File | undefined, kind: 'logo' | 'banner') {
    if (!file) return;
    setError('');
    if (!allowedTypes.includes(file.type)) {
      setError('Utilisez une image PNG, JPG ou WebP.');
      return;
    }
    const limit = kind === 'logo' ? 2 * 1024 * 1024 : 5 * 1024 * 1024;
    if (file.size > limit) {
      setError(kind === 'logo' ? 'Le logo ne doit pas dépasser 2 Mo.' : 'La bannière ne doit pas dépasser 5 Mo.');
      return;
    }
    if (kind === 'logo') setLogoFile(file);
    else setBannerFile(file);
  }

  async function uploadAsset(file: File, kind: 'logo' | 'banner') {
    if (!supabase) throw new Error('Supabase n’est pas configuré.');
    if (!organization) throw new Error('Entreprise introuvable.');
    const path = `${organization.id}/${kind}-${Date.now()}.${extensionFor(file)}`;
    const { error: uploadError } = await supabase.storage
      .from('organization-branding')
      .upload(path, file, { cacheControl: '3600', upsert: false, contentType: file.type });
    if (uploadError) throw uploadError;
    return supabase.storage.from('organization-branding').getPublicUrl(path).data.publicUrl;
  }

  async function submit(event: FormEvent) {
    event.preventDefault();
    if (!canManage || !hasProfessionalBranding) return;
    setSaving(true);
    setMessage('');
    setError('');
    try {
      if (publicName.trim().length < 2) throw new Error('Indiquez un nom commercial valide.');
      if (!slug || slug !== normalizeSlug(slug)) throw new Error('Le lien public contient des caractères non autorisés.');

      let nextLogoUrl = logoUrl;
      let nextBannerUrl = bannerUrl;
      if (logoFile) nextLogoUrl = await uploadAsset(logoFile, 'logo');
      if (bannerFile) nextBannerUrl = await uploadAsset(bannerFile, 'banner');

      await updateCommercialBranding({
        publicName,
        slug,
        primaryColor,
        logoUrl: nextLogoUrl,
        bannerUrl: nextBannerUrl,
        tagline,
        address,
        hoursText,
        practicalInfo,
        showNcrBranding: canHideNcrBranding ? showNcrBranding : true
      });
      setLogoUrl(nextLogoUrl);
      setBannerUrl(nextBannerUrl);
      setLogoFile(null);
      setBannerFile(null);
      setMessage('La personnalisation commerciale a été enregistrée.');
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Enregistrement impossible.');
    } finally {
      setSaving(false);
    }
  }

  if (!hasProfessionalBranding) {
    return (
      <div className="page commercial-branding-page">
        <header className="page-header"><div><p className="eyebrow">OFFRE PROFESSIONNELLE</p><h1>Personnalisation</h1><p>Créez une page de réservation à l’image de votre établissement.</p></div></header>
        <section className="panel upgrade-panel commercial-upgrade-panel">
          <div className="upgrade-icon"><Icon name="sparkles" size={26} /></div>
          <div>
            <p className="eyebrow">FONCTION VERROUILLÉE</p>
            <h2>Disponible avec l’offre Professionnelle</h2>
            <p>Ajoutez votre logo, une bannière, vos couleurs, votre adresse, vos horaires et un lien public personnalisé. Les e-mails de rendez-vous reprendront également votre identité.</p>
          </div>
          <span className="plan-lock-badge">39,90 € HT / mois</span>
        </section>
        <section className="branding-benefits-grid">
          <article className="panel"><Icon name="sparkles" size={22} /><strong>Identité complète</strong><span>Logo, couleur et bannière.</span></article>
          <article className="panel"><Icon name="calendar" size={22} /><strong>Page client</strong><span>Lien de réservation personnalisable.</span></article>
          <article className="panel"><Icon name="file" size={22} /><strong>E-mails harmonisés</strong><span>Messages aux couleurs de l’établissement.</span></article>
        </section>
      </div>
    );
  }

  return (
    <div className="page commercial-branding-page">
      <header className="page-header">
        <div><p className="eyebrow">OFFRE PROFESSIONNELLE</p><h1>Personnalisation</h1><p>Configurez l’identité visible par vos clients sans modifier la structure sobre de NCR Suite.</p></div>
        <a className="secondary-button" href={publicUrl} target="_blank" rel="noreferrer">Ouvrir la page publique</a>
      </header>

      {error && <div className="error-message page-message" role="alert">{error}</div>}
      {message && <div className="success-message page-message" role="status">{message}</div>}

      <div className="commercial-branding-layout">
        <form className="panel settings-form commercial-branding-form" onSubmit={submit}>
          <div><p className="eyebrow">IDENTITÉ CLIENT</p><h2>Votre établissement</h2><p className="muted">Ces informations apparaissent sur la réservation publique et dans les e-mails de rendez-vous.</p></div>

          <div className="branding-form-grid">
            <label>Nom commercial<input required minLength={2} maxLength={120} value={publicName} onChange={(event) => setPublicName(event.target.value)} disabled={!canManage} /></label>
            <label>Couleur principale<div className="branding-color-control"><input type="color" value={primaryColor} onChange={(event) => setPrimaryColor(event.target.value)} disabled={!canManage} /><code>{primaryColor}</code></div></label>
            <label className="full-field">Lien public personnalisé<div className="slug-control"><span>/reserver/</span><input required minLength={2} maxLength={60} value={slug} onChange={(event) => setSlug(normalizeSlug(event.target.value))} disabled={!canManage} /></div><small>{publicUrl}</small></label>
            <label className="full-field">Accroche de la page<textarea rows={2} maxLength={180} value={tagline} onChange={(event) => setTagline(event.target.value)} disabled={!canManage} placeholder="Ex. Prenez soin de vous, nous nous occupons du reste." /><small>{tagline.length}/180 caractères</small></label>
          </div>

          <div className="branding-upload-grid">
            <div className="branding-upload-card">
              <div className="branding-upload-preview logo-preview">{logoPreview ? <img src={logoPreview} alt="Aperçu du logo" /> : <span>{publicName.slice(0, 1).toUpperCase()}</span>}</div>
              <div><strong>Logo</strong><p>PNG, JPG ou WebP · 2 Mo maximum.</p><label className="secondary-button compact-button">Choisir un logo<input hidden type="file" accept="image/png,image/jpeg,image/webp" onChange={(event) => selectFile(event.target.files?.[0], 'logo')} disabled={!canManage} /></label>{(logoPreview || logoFile) && <button className="danger-text-button" type="button" onClick={() => { setLogoFile(null); setLogoUrl(null); }}>Retirer</button>}</div>
            </div>
            <div className="branding-upload-card">
              <div className="branding-upload-preview banner-preview">{bannerPreview ? <img src={bannerPreview} alt="Aperçu de la bannière" /> : <Icon name="sparkles" size={25} />}</div>
              <div><strong>Bannière</strong><p>Format paysage conseillé · 5 Mo maximum.</p><label className="secondary-button compact-button">Choisir une bannière<input hidden type="file" accept="image/png,image/jpeg,image/webp" onChange={(event) => selectFile(event.target.files?.[0], 'banner')} disabled={!canManage} /></label>{(bannerPreview || bannerFile) && <button className="danger-text-button" type="button" onClick={() => { setBannerFile(null); setBannerUrl(null); }}>Retirer</button>}</div>
            </div>
          </div>

          <div><p className="eyebrow">INFORMATIONS PRATIQUES</p><h2>Avant le rendez-vous</h2></div>
          <div className="branding-form-grid">
            <label className="full-field">Adresse<textarea rows={2} maxLength={500} value={address} onChange={(event) => setAddress(event.target.value)} disabled={!canManage} placeholder="12 avenue Exemple, 83600 Fréjus" /></label>
            <label className="full-field">Horaires affichés<textarea rows={3} maxLength={800} value={hoursText} onChange={(event) => setHoursText(event.target.value)} disabled={!canManage} placeholder="Lundi au samedi · 9 h 00 – 19 h 00" /></label>
            <label className="full-field">Informations pratiques<textarea rows={4} maxLength={1200} value={practicalInfo} onChange={(event) => setPracticalInfo(event.target.value)} disabled={!canManage} placeholder="Parking à proximité, accès PMR, arrivée conseillée 5 minutes avant…" /></label>
          </div>

          <div className="branding-attribution-setting">
            <div><strong>Mention « Propulsé par NCR Suite »</strong><span>{canHideNcrBranding ? 'L’option marque blanche a été activée par NCR : vous pouvez masquer cette mention.' : organization.plan === 'metier' ? 'La marque blanche doit être activée par NCR dans votre contrat Métier.' : 'La mention reste discrètement visible avec l’offre Professionnelle.'}</span></div>
            <label className="switch-field"><input type="checkbox" checked={showNcrBranding} onChange={(event) => setShowNcrBranding(event.target.checked)} disabled={!canManage || !canHideNcrBranding} /><span aria-hidden="true" /><b>{showNcrBranding ? 'Visible' : 'Masquée'}</b></label>
          </div>

          {canManage && <button className="primary-button" disabled={saving}>{saving ? 'Enregistrement…' : 'Enregistrer la personnalisation'}</button>}
        </form>

        <aside className="commercial-preview-column">
          <div className="commercial-preview-sticky">
            <div className="preview-heading"><div><p className="eyebrow">APERÇU EN DIRECT</p><h2>Page de réservation</h2></div><span>Mobile</span></div>
            <div className="booking-page-preview" style={previewStyle}>
              <div className="booking-preview-banner" style={bannerPreview ? { backgroundImage: `linear-gradient(180deg, rgba(0,0,0,.08), rgba(0,0,0,.55)), url(${bannerPreview})` } : undefined}>
                <div className="booking-preview-logo">{logoPreview ? <img src={logoPreview} alt="" /> : publicName.slice(0, 1).toUpperCase()}</div>
                <strong>{publicName || organization.name}</strong>
                <span>Réservation en ligne</span>
              </div>
              <div className="booking-preview-body">
                <small>PRENEZ RENDEZ-VOUS</small>
                <h3>{tagline || 'Choisissez le créneau qui vous convient.'}</h3>
                <p>{organization.booking_welcome_text || 'Sélectionnez une prestation et une disponibilité. Aucun compte client n’est nécessaire.'}</p>
                <div className="booking-preview-choice"><i /><div><strong>Votre prestation</strong><span>Durée et tarif affichés</span></div></div>
                {(address || hoursText) && <div className="booking-preview-info">{address && <span>📍 {address}</span>}{hoursText && <span>🕘 {hoursText}</span>}</div>}
                {(canHideNcrBranding ? showNcrBranding : true) && <footer>Propulsé par <b>NCR Suite</b></footer>}
              </div>
            </div>
          </div>
        </aside>
      </div>
    </div>
  );
}


function TrainingCommercialBrandingPage() {
  const { organization, refreshOrganizations } = useOrganization();
  const [publicName, setPublicName] = useState(organization?.public_name || organization?.name || '');
  const [primaryColor, setPrimaryColor] = useState(organization?.primary_color || '#2997ff');
  const [logoUrl, setLogoUrl] = useState<string | null>(organization?.logo_url || null);
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [address, setAddress] = useState(organization?.booking_address || '');
  const [contactEmail, setContactEmail] = useState(organization?.booking_contact_email || '');
  const [contactPhone, setContactPhone] = useState(organization?.booking_contact_phone || '');
  const [signatureText, setSignatureText] = useState(organization?.booking_practical_info || '');
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    if (!organization) return;
    setPublicName(organization.public_name || organization.name);
    setPrimaryColor(organization.primary_color || '#2997ff');
    setLogoUrl(organization.logo_url || null);
    setLogoFile(null);
    setAddress(organization.booking_address || '');
    setContactEmail(organization.booking_contact_email || '');
    setContactPhone(organization.booking_contact_phone || '');
    setSignatureText(organization.booking_practical_info || '');
  }, [organization?.id]);

  const logoPreview = useMemo(() => logoFile ? URL.createObjectURL(logoFile) : logoUrl, [logoFile, logoUrl]);
  useEffect(() => () => { if (logoFile && logoPreview) URL.revokeObjectURL(logoPreview); }, [logoFile, logoPreview]);

  if (!organization) return null;
  const trainingOrganization = organization;
  const canCustomize = organizationHasFeature(trainingOrganization, 'training_document_branding');
  const canManage = ['owner', 'admin'].includes(trainingOrganization.role ?? 'viewer');

  function selectLogo(file?: File) {
    if (!file) return;
    setError('');
    if (!allowedTypes.includes(file.type)) { setError('Le logo doit être au format PNG, JPG ou WebP.'); return; }
    if (file.size > 2 * 1024 * 1024) { setError('Le logo ne doit pas dépasser 2 Mo.'); return; }
    setLogoFile(file);
  }

  async function uploadLogo(file: File) {
    if (!supabase) throw new Error('Supabase est indisponible.');
    const path = `${trainingOrganization.id}/training-logo-${crypto.randomUUID()}.${extensionFor(file)}`;
    const { error: uploadError } = await supabase.storage.from('organization-branding').upload(path, file, { contentType: file.type, upsert: false });
    if (uploadError) throw uploadError;
    return supabase.storage.from('organization-branding').getPublicUrl(path).data.publicUrl;
  }

  async function submit(event: FormEvent) {
    event.preventDefault();
    if (!supabase || !canManage || !canCustomize) return;
    setSaving(true); setMessage(''); setError('');
    try {
      if (publicName.trim().length < 2) throw new Error('Indique un nom commercial valide.');
      let nextLogoUrl = logoUrl;
      if (logoFile) nextLogoUrl = await uploadLogo(logoFile);
      const { error: rpcError } = await supabase.rpc('update_training_branding', {
        p_organization_id: trainingOrganization.id,
        p_public_name: publicName,
        p_primary_color: primaryColor,
        p_logo_url: nextLogoUrl,
        p_address: address,
        p_contact_email: contactEmail,
        p_contact_phone: contactPhone,
        p_signature_text: signatureText
      });
      if (rpcError) throw rpcError;
      setLogoUrl(nextLogoUrl);
      setLogoFile(null);
      refreshOrganizations();
      setMessage('La personnalisation des documents et des e-mails a été enregistrée.');
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Enregistrement impossible.');
    } finally { setSaving(false); }
  }

  if (!canCustomize) {
    return (
      <div className="page commercial-branding-page">
        <header className="page-header"><div><p className="eyebrow">FORMATION · PERSONNALISATION</p><h1>Documents et e-mails</h1><p>Appliquez votre identité aux convocations, attestations, feuilles d’émargement et e-mails automatiques.</p></div></header>
        <section className="panel upgrade-panel commercial-upgrade-panel">
          <div className="upgrade-icon"><Icon name="sparkles" size={27} /></div>
          <div><p className="eyebrow">OFFRE ESSENTIELLE</p><h2>Personnalisation disponible à partir de l’offre Essentielle</h2><p>La formule Découverte utilise l’identité neutre NCR Suite. Essentielle ajoute votre logo, vos couleurs, vos coordonnées et votre signature dans les PDF et les e-mails Formation.</p></div>
          <span className="plan-lock-badge">Option supérieure</span>
        </section>
      </div>
    );
  }

  return (
    <div className="page commercial-branding-page">
      <header className="page-header"><div><p className="eyebrow">FORMATION · PERSONNALISATION</p><h1>Documents et e-mails</h1><p>Une identité unique pour les convocations, attestations, émargements et messages automatiques.</p></div></header>
      {error && <div className="error-message page-message" role="alert">{error}</div>}
      {message && <div className="success-message page-message" role="status">{message}</div>}
      <div className="commercial-branding-layout">
        <form className="panel settings-form commercial-branding-form" onSubmit={submit}>
          <div><p className="eyebrow">IDENTITÉ DE L’ORGANISME</p><h2>Informations affichées</h2><p className="muted">Ces réglages sont repris automatiquement lors des prochaines générations et des prochains envois.</p></div>
          <div className="branding-form-grid">
            <label>Nom affiché<input required minLength={2} maxLength={120} value={publicName} onChange={(event) => setPublicName(event.target.value)} disabled={!canManage} /></label>
            <label>Couleur principale<div className="branding-color-control"><input type="color" value={primaryColor} onChange={(event) => setPrimaryColor(event.target.value)} disabled={!canManage} /><code>{primaryColor}</code></div></label>
            <label className="full-field">Adresse<textarea rows={2} maxLength={500} value={address} onChange={(event) => setAddress(event.target.value)} disabled={!canManage} placeholder="Adresse de l’organisme ou du siège" /></label>
            <label>E-mail de contact<input type="email" maxLength={180} value={contactEmail} onChange={(event) => setContactEmail(event.target.value)} disabled={!canManage} /></label>
            <label>Téléphone<input maxLength={40} value={contactPhone} onChange={(event) => setContactPhone(event.target.value)} disabled={!canManage} /></label>
            <label className="full-field">Signature et mentions personnalisées<textarea rows={5} maxLength={1200} value={signatureText} onChange={(event) => setSignatureText(event.target.value)} disabled={!canManage} placeholder="Ex. L’équipe formation, coordonnées, consignes pratiques ou mentions à afficher en pied de document et d’e-mail." /></label>
          </div>
          <div className="branding-upload-card">
            <div className="branding-upload-preview logo-preview">{logoPreview ? <img src={logoPreview} alt="Aperçu du logo" /> : <span>{publicName.slice(0, 1).toUpperCase()}</span>}</div>
            <div><strong>Logo des documents et e-mails</strong><p>PNG, JPG ou WebP · 2 Mo maximum.</p><label className="secondary-button compact-button">Choisir un logo<input hidden type="file" accept="image/png,image/jpeg,image/webp" onChange={(event) => selectLogo(event.target.files?.[0])} disabled={!canManage} /></label>{logoPreview && <button className="danger-text-button" type="button" onClick={() => { setLogoFile(null); setLogoUrl(null); }}>Retirer</button>}</div>
          </div>
          {canManage && <button className="primary-button" disabled={saving}>{saving ? 'Enregistrement…' : 'Enregistrer la personnalisation'}</button>}
        </form>
        <aside className="commercial-preview-column">
          <div className="commercial-preview-sticky">
            <div className="preview-heading"><div><p className="eyebrow">APERÇU</p><h2>Attestation et e-mail</h2></div><span>Automatique</span></div>
            <div className="panel" style={{ borderTop: `5px solid ${primaryColor}` }}>
              <div className="branding-upload-preview logo-preview">{logoPreview ? <img src={logoPreview} alt="" /> : <span>{publicName.slice(0, 1).toUpperCase()}</span>}</div>
              <p className="eyebrow">ATTESTATION DE FORMATION</p><h3>{publicName || organization.name}</h3><p>Les convocations, attestations et feuilles d’émargement reprendront cette identité.</p>{address && <small>{address}</small>}
            </div>
            <div className="panel" style={{ borderLeft: `4px solid ${primaryColor}` }}><p className="eyebrow">E-MAIL AUTOMATIQUE</p><strong>{publicName || organization.name}</strong><p>Bonjour, votre document de formation est disponible.</p><small>{signatureText || `${contactEmail}${contactPhone ? ` · ${contactPhone}` : ''}` || 'Signature de l’organisme'}</small></div>
          </div>
        </aside>
      </div>
    </div>
  );
}

export function CommercialBrandingPage() {
  const { organization } = useOrganization();
  if (organization?.business_type === 'formation') return <TrainingCommercialBrandingPage />;
  return <CoiffureCommercialBrandingPage />;
}
