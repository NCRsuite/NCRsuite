import { useEffect, useMemo, useState } from 'react';
import { useOrganization } from '../contexts/OrganizationContext';
import { supabase } from '../lib/supabase';
import { Icon } from './Icon';

type BrandDomainStatus = 'not_configured' | 'pending' | 'verified' | 'active' | 'error';

interface MetierBrand {
  id: string;
  name: string;
  code: string | null;
  logo_url: string | null;
  compact_logo_url: string | null;
  primary_color: string;
  platform_subdomain: string | null;
  platform_domain: string | null;
  custom_domain: string | null;
  custom_domain_status: BrandDomainStatus;
  is_primary: boolean;
  status: 'active' | 'inactive' | 'archived';
  active_sites: number;
}

interface MetierBrandSite {
  id: string;
  name: string;
  code: string | null;
  city: string | null;
  is_primary: boolean;
  brand_id: string | null;
}

const statusLabels: Record<BrandDomainStatus, string> = {
  not_configured: 'Non configuré',
  pending: 'Validation DNS en attente',
  verified: 'Domaine vérifié',
  active: 'Domaine actif',
  error: 'Configuration à corriger'
};

const allowedLogoTypes = ['image/png', 'image/jpeg', 'image/webp'];

function logoExtension(file: File) {
  if (file.type === 'image/png') return 'png';
  if (file.type === 'image/webp') return 'webp';
  return 'jpg';
}

export function MetierBrandsWorkspacePanel({ organizationId, siteLimit, canManage }: {
  organizationId: string;
  siteLimit: number;
  canManage: boolean;
}) {
  const { organization, refreshOrganizations } = useOrganization();
  const [brands, setBrands] = useState<MetierBrand[]>([]);
  const [sites, setSites] = useState<MetierBrandSite[]>([]);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [showEditor, setShowEditor] = useState(false);
  const [name, setName] = useState('');
  const [code, setCode] = useState('');
  const [logoUrl, setLogoUrl] = useState('');
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [compactLogoUrl, setCompactLogoUrl] = useState('');
  const [compactLogoFile, setCompactLogoFile] = useState<File | null>(null);
  const [primaryColor, setPrimaryColor] = useState('#2997ff');
  const [customDomain, setCustomDomain] = useState('');
  const [isPrimary, setIsPrimary] = useState(false);
  const [busy, setBusy] = useState('');
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(true);
  const [showNcrBranding, setShowNcrBranding] = useState(true);

  const activeBrands = useMemo(() => brands.filter((brand) => brand.status === 'active'), [brands]);
  const whiteLabelEnabled = organization?.id === organizationId && organization.plan === 'metier' && organization.white_label_enabled === true;

  async function load() {
    if (!supabase) return;
    setLoading(true);
    const [brandsResult, sitesResult] = await Promise.all([
      supabase.rpc('metier_list_brands', { p_organization_id: organizationId }),
      supabase.rpc('metier_list_sites_for_branding', { p_organization_id: organizationId })
    ]);
    if (brandsResult.error) setError(brandsResult.error.message);
    else setBrands((Array.isArray(brandsResult.data) ? brandsResult.data : []) as MetierBrand[]);
    if (sitesResult.error) setError(sitesResult.error.message);
    else setSites((Array.isArray(sitesResult.data) ? sitesResult.data : []) as MetierBrandSite[]);
    setLoading(false);
  }

  useEffect(() => {
    setShowEditor(false);
    setEditingId(null);
    setLogoFile(null);
    setCompactLogoFile(null);
    setError('');
    setMessage('');
    void load();
  }, [organizationId]);

  useEffect(() => {
    if (organization?.id !== organizationId) return;
    setShowNcrBranding(organization.show_ncr_branding ?? true);
  }, [organization?.id, organization?.show_ncr_branding, organizationId]);

  function newBrand() {
    setEditingId(null);
    setName('');
    setCode('');
    setLogoUrl('');
    setLogoFile(null);
    setCompactLogoUrl('');
    setCompactLogoFile(null);
    setPrimaryColor('#2997ff');
    setCustomDomain('');
    setIsPrimary(brands.length === 0);
    setShowEditor(true);
    setError('');
    setMessage('');
  }

  function editBrand(brand: MetierBrand) {
    setEditingId(brand.id);
    setName(brand.name);
    setCode(brand.code ?? '');
    setLogoUrl(brand.logo_url ?? '');
    setLogoFile(null);
    setCompactLogoUrl(brand.compact_logo_url ?? '');
    setCompactLogoFile(null);
    setPrimaryColor(brand.primary_color || '#2997ff');
    setCustomDomain(brand.custom_domain ?? '');
    setIsPrimary(brand.is_primary);
    setShowEditor(true);
    setError('');
    setMessage('');
  }

  function selectLogo(file: File | undefined, kind: 'main' | 'compact') {
    if (!file) return;
    setError('');
    if (!allowedLogoTypes.includes(file.type)) {
      setError('Le logo doit être au format PNG, JPG ou WebP.');
      return;
    }
    if (file.size > 2 * 1024 * 1024) {
      setError('Le logo ne doit pas dépasser 2 Mo.');
      return;
    }
    if (kind === 'main') setLogoFile(file);
    else setCompactLogoFile(file);
  }

  async function uploadLogo(file: File, kind: 'main' | 'compact') {
    if (!supabase) throw new Error('Le service de données est indisponible.');
    const path = `${organizationId}/brand-${kind}-${editingId ?? crypto.randomUUID()}-${Date.now()}.${logoExtension(file)}`;
    const { error: uploadError } = await supabase.storage
      .from('organization-branding')
      .upload(path, file, { contentType: file.type, cacheControl: '3600', upsert: false });
    if (uploadError) throw uploadError;
    return supabase.storage.from('organization-branding').getPublicUrl(path).data.publicUrl;
  }

  async function saveBrand() {
    if (!supabase || !canManage || busy) return;
    if (name.trim().length < 2) {
      setError('Le nom de l’enseigne doit contenir au moins 2 caractères.');
      return;
    }
    setBusy('brand');
    setError('');
    setMessage('');
    try {
      let nextLogoUrl = logoUrl.trim() || null;
      let nextCompactLogoUrl = compactLogoUrl.trim() || null;
      if (logoFile) nextLogoUrl = await uploadLogo(logoFile, 'main');
      if (compactLogoFile) nextCompactLogoUrl = await uploadLogo(compactLogoFile, 'compact');

      const { data: savedBrandId, error: requestError } = await supabase.rpc('metier_upsert_brand', {
        p_organization_id: organizationId,
        p_brand_id: editingId,
        p_name: name.trim(),
        p_code: code.trim() || null,
        p_logo_url: nextLogoUrl,
        p_primary_color: primaryColor,
        p_custom_domain: customDomain.trim() || null,
        p_is_primary: isPrimary
      });
      if (requestError) throw requestError;

      const brandId = typeof savedBrandId === 'string' ? savedBrandId : editingId;
      if (!brandId) throw new Error('Enseigne enregistrée mais identifiant indisponible.');

      const { error: logoError } = await supabase.rpc('metier_update_brand_logos', {
        p_organization_id: organizationId,
        p_brand_id: brandId,
        p_logo_url: nextLogoUrl,
        p_compact_logo_url: nextCompactLogoUrl
      });
      if (logoError) throw logoError;

      setMessage(customDomain.trim()
        ? 'L’enseigne est enregistrée. Son adresse NCR Suite est automatique ; le domaine externe reste à valider par NCR.'
        : 'L’enseigne est enregistrée avec son adresse NCR Suite automatique.');
      setShowEditor(false);
      setEditingId(null);
      setLogoFile(null);
      setCompactLogoFile(null);
      await load();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Enregistrement impossible.');
    } finally {
      setBusy('');
    }
  }

  async function updateWhiteLabelPreference(nextVisible: boolean) {
    if (!supabase || !canManage || !whiteLabelEnabled || busy) return;
    setBusy('branding');
    setError('');
    setMessage('');
    const { error: requestError } = await supabase.rpc('metier_update_branding_preference', {
      p_organization_id: organizationId,
      p_show_ncr_branding: nextVisible
    });
    setBusy('');
    if (requestError) {
      setError(requestError.message);
      return;
    }
    setShowNcrBranding(nextVisible);
    refreshOrganizations();
    setMessage(nextVisible ? 'La mention NCR Suite reste visible.' : 'La mention « Propulsé par NCR Suite » est maintenant masquée.');
  }

  async function archiveBrand(brand: MetierBrand) {
    if (!supabase || !canManage || busy || brand.is_primary) return;
    if (!window.confirm(`Archiver l’enseigne « ${brand.name} » ?`)) return;
    setBusy(`archive-${brand.id}`);
    const { error: requestError } = await supabase.rpc('metier_set_brand_status', {
      p_organization_id: organizationId,
      p_brand_id: brand.id,
      p_status: 'archived'
    });
    setBusy('');
    if (requestError) setError(requestError.message);
    else {
      setMessage('L’enseigne a été archivée et ses établissements ont été réaffectés.');
      await load();
    }
  }

  async function assignSite(site: MetierBrandSite, brandId: string) {
    if (!supabase || !canManage || busy || !brandId) return;
    setBusy(`site-${site.id}`);
    const { error: requestError } = await supabase.rpc('metier_assign_site_brand', {
      p_organization_id: organizationId,
      p_site_id: site.id,
      p_brand_id: brandId
    });
    setBusy('');
    if (requestError) setError(requestError.message);
    else {
      setMessage(`${site.name} a été rattaché à l’enseigne sélectionnée.`);
      await load();
    }
  }

  if (loading) return <section className="panel list-state">Chargement des enseignes…</section>;

  return (
    <section className="panel metier-domain-card">
      <div className="panel-header">
        <div><p className="eyebrow">MULTI-ENSEIGNE</p><h2>Identités, adresses et établissements</h2><p className="muted">Chaque enseigne reçoit automatiquement une adresse NCR Suite. Un domaine appartenant au client peut être ajouté en option.</p></div>
        {canManage && <button type="button" className="secondary-button" onClick={newBrand} disabled={brands.length >= siteLimit}><Icon name="building" size={16} /> Ajouter une enseigne</button>}
      </div>

      {error && <div className="error-message page-message" role="alert">{error}</div>}
      {message && <div className="success-message page-message" role="status">{message}</div>}

      <div className="branding-attribution-setting" style={{ marginBottom: 18 }}>
        <div>
          <strong>Marque blanche · « Propulsé par NCR Suite »</strong>
          <span>{whiteLabelEnabled
            ? 'La marque blanche est activée pour votre contrat Métier. Vous pouvez choisir si la mention NCR Suite reste visible.'
            : 'La marque blanche n’est pas encore activée dans ce contrat Métier. NCR Suite reste visible.'}</span>
        </div>
        <label className="switch-field">
          <input
            type="checkbox"
            checked={showNcrBranding}
            onChange={(event) => void updateWhiteLabelPreference(event.target.checked)}
            disabled={!canManage || !whiteLabelEnabled || busy === 'branding'}
          />
          <span aria-hidden="true" />
          <b>{showNcrBranding ? 'Visible' : 'Masquée'}</b>
        </label>
      </div>

      <div className="metier-role-list">
        {brands.map((brand) => {
          const listLogo = brand.compact_logo_url || brand.logo_url;
          return (
            <article key={brand.id}>
              {listLogo
                ? <img src={listLogo} alt="" style={{ width: 38, height: 38, objectFit: 'contain', borderRadius: 10, flex: '0 0 auto' }} />
                : <span style={{ width: 12, height: 12, borderRadius: 99, background: brand.primary_color, flex: '0 0 auto' }} />}
              <div>
                <strong>{brand.name}{brand.is_primary ? ' · principale' : ''}</strong>
                <span>{brand.active_sites} établissement(s){brand.code ? ` · ${brand.code}` : ''}</span>
                <small><b>Incluse :</b> {brand.platform_domain ? `https://${brand.platform_domain}` : 'Adresse NCR Suite en préparation'}</small>
                <small>{brand.custom_domain ? <><b>Domaine client :</b> {brand.custom_domain} · {statusLabels[brand.custom_domain_status]}</> : 'Domaine client : optionnel'}</small>
              </div>
              {canManage && <div><button type="button" className="secondary-button compact-button" onClick={() => editBrand(brand)}>Modifier</button>{!brand.is_primary && <button type="button" className="danger-text-button" onClick={() => void archiveBrand(brand)} disabled={busy === `archive-${brand.id}`}>Archiver</button>}</div>}
            </article>
          );
        })}
      </div>

      {showEditor && (
        <div className="form-grid" style={{ marginTop: 18 }}>
          <label>Nom de l’enseigne<input required minLength={2} maxLength={120} value={name} onChange={(event) => setName(event.target.value)} /></label>
          <label>Code interne<input maxLength={40} value={code} onChange={(event) => setCode(event.target.value.toUpperCase())} /></label>

          <div className="full-field">
            <strong>Logo principal</strong>
            <div style={{ display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap', marginTop: 8 }}>
              <label className="secondary-button compact-button">Choisir le logo principal<input hidden type="file" accept="image/png,image/jpeg,image/webp" onChange={(event) => selectLogo(event.target.files?.[0], 'main')} /></label>
              <input value={logoUrl} onChange={(event) => setLogoUrl(event.target.value)} placeholder="ou https://…" style={{ flex: '1 1 260px' }} />
              {(logoUrl || logoFile) && <button type="button" className="danger-text-button" onClick={() => { setLogoFile(null); setLogoUrl(''); }}>Retirer</button>}
            </div>
            <small>Utilisé sur la connexion, les écrans de marque et comme logo principal de l’enseigne.</small>
          </div>

          <div className="full-field">
            <strong>Logo compact / icône</strong>
            <div style={{ display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap', marginTop: 8 }}>
              <label className="secondary-button compact-button">Choisir le logo compact<input hidden type="file" accept="image/png,image/jpeg,image/webp" onChange={(event) => selectLogo(event.target.files?.[0], 'compact')} /></label>
              <input value={compactLogoUrl} onChange={(event) => setCompactLogoUrl(event.target.value)} placeholder="ou https://…" style={{ flex: '1 1 260px' }} />
              {(compactLogoUrl || compactLogoFile) && <button type="button" className="danger-text-button" onClick={() => { setCompactLogoFile(null); setCompactLogoUrl(''); }}>Retirer</button>}
            </div>
            <small>Conseillé en format carré ou pictogramme. Utilisé dans la barre latérale, le menu mobile, le chargement et le favicon. S’il est vide, NCR Suite utilise automatiquement le logo principal en le redimensionnant.</small>
          </div>

          <label>Couleur<input type="color" value={primaryColor} onChange={(event) => setPrimaryColor(event.target.value)} /></label>
          <label className="full-field">Domaine propre du client · optionnel<input value={customDomain} onChange={(event) => setCustomDomain(event.target.value.toLowerCase().replace(/^https?:\/\//, '').replace(/\/$/, ''))} placeholder="gestion.mon-entreprise.fr" /><small>L’adresse *.ncr-suite.fr reste attribuée automatiquement. Ce domaine externe est un alias premium et repasse en validation DNS après chaque modification.</small></label>
          <label className="full-field admin-checkbox-field"><input type="checkbox" checked={isPrimary} onChange={(event) => setIsPrimary(event.target.checked)} /><span><strong>Enseigne principale</strong><small>Elle sert d’identité par défaut pour cet espace Métier.</small></span></label>
          <div className="modal-actions full-field"><button type="button" className="secondary-button" onClick={() => { setShowEditor(false); setLogoFile(null); setCompactLogoFile(null); }}>Annuler</button><button type="button" className="primary-button" onClick={() => void saveBrand()} disabled={busy === 'brand'}>{busy === 'brand' ? 'Enregistrement…' : 'Enregistrer l’enseigne'}</button></div>
        </div>
      )}

      <div className="metier-member-role-list" style={{ marginTop: 18 }}>
        {sites.map((site) => (
          <label key={site.id} className="metier-member-role-row"><span className="team-avatar">{site.name.slice(0, 1).toUpperCase()}</span><span><strong>{site.name}{site.is_primary ? ' · principal' : ''}</strong><small>{[site.code, site.city].filter(Boolean).join(' · ') || 'Établissement actif'}</small></span><select value={site.brand_id ?? activeBrands[0]?.id ?? ''} onChange={(event) => void assignSite(site, event.target.value)} disabled={!canManage || busy === `site-${site.id}` || activeBrands.length === 0}>{activeBrands.map((brand) => <option key={brand.id} value={brand.id}>{brand.name}{brand.is_primary ? ' · principale' : ''}</option>)}</select></label>
        ))}
      </div>

      <div className="info-message">Adresse NCR Suite incluse : automatique et sans réglage DNS client. Domaine propre : optionnel et soumis à validation technique. Avec la marque blanche active, la sidebar utilise le logo compact et les écrans de connexion utilisent le logo principal.</div>
    </section>
  );
}
