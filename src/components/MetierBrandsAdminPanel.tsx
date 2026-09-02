import { useEffect, useMemo, useState } from 'react';
import { supabase } from '../lib/supabase';
import { Icon } from './Icon';

type BrandDomainStatus = 'not_configured' | 'pending' | 'verified' | 'active' | 'error';

interface MetierBrand {
  id: string;
  name: string;
  code: string | null;
  logo_url: string | null;
  primary_color: string;
  custom_domain: string | null;
  custom_domain_status: BrandDomainStatus;
  custom_domain_verified_at: string | null;
  is_primary: boolean;
  status: 'active' | 'inactive' | 'archived';
  active_sites: number;
  created_at: string;
}

interface MetierBrandSite {
  id: string;
  name: string;
  code: string | null;
  city: string | null;
  status: 'active' | 'inactive';
  is_primary: boolean;
  brand_id: string | null;
  brand_name: string | null;
}

const domainStatusLabels: Record<BrandDomainStatus, string> = {
  not_configured: 'Non configuré',
  pending: 'DNS en attente',
  verified: 'Vérifié',
  active: 'Actif',
  error: 'À corriger'
};

function errorMessage(error: unknown) {
  if (error && typeof error === 'object' && 'message' in error) {
    const message = String((error as { message?: unknown }).message ?? '').trim();
    if (message) return message;
  }
  return 'Impossible de mettre à jour les enseignes.';
}

export function MetierBrandsAdminPanel({ organizationId, siteLimit, canManage }: {
  organizationId: string;
  siteLimit: number;
  canManage: boolean;
}) {
  const [brands, setBrands] = useState<MetierBrand[]>([]);
  const [sites, setSites] = useState<MetierBrandSite[]>([]);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [showEditor, setShowEditor] = useState(false);
  const [name, setName] = useState('');
  const [code, setCode] = useState('');
  const [logoUrl, setLogoUrl] = useState('');
  const [primaryColor, setPrimaryColor] = useState('#2997ff');
  const [customDomain, setCustomDomain] = useState('');
  const [isPrimary, setIsPrimary] = useState(false);
  const [domainStatus, setDomainStatus] = useState<BrandDomainStatus>('not_configured');
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState('');
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');

  const activeBrands = useMemo(() => brands.filter((brand) => brand.status === 'active'), [brands]);

  async function load() {
    if (!supabase || !organizationId) return;
    setLoading(true);
    setError('');
    const [brandResponse, siteResponse] = await Promise.all([
      supabase.rpc('metier_list_brands', { p_organization_id: organizationId }),
      supabase.rpc('metier_list_sites_for_branding', { p_organization_id: organizationId })
    ]);
    if (brandResponse.error) setError(brandResponse.error.message);
    else setBrands((Array.isArray(brandResponse.data) ? brandResponse.data : []) as MetierBrand[]);
    if (siteResponse.error) setError(siteResponse.error.message);
    else setSites((Array.isArray(siteResponse.data) ? siteResponse.data : []) as MetierBrandSite[]);
    setLoading(false);
  }

  useEffect(() => {
    setEditingId(null);
    setShowEditor(false);
    setMessage('');
    void load();
  }, [organizationId]);

  function resetEditor() {
    setEditingId(null);
    setName('');
    setCode('');
    setLogoUrl('');
    setPrimaryColor('#2997ff');
    setCustomDomain('');
    setIsPrimary(brands.length === 0);
    setDomainStatus('not_configured');
    setShowEditor(true);
    setError('');
    setMessage('');
  }

  function editBrand(brand: MetierBrand) {
    setEditingId(brand.id);
    setName(brand.name);
    setCode(brand.code ?? '');
    setLogoUrl(brand.logo_url ?? '');
    setPrimaryColor(brand.primary_color || '#2997ff');
    setCustomDomain(brand.custom_domain ?? '');
    setIsPrimary(brand.is_primary);
    setDomainStatus(brand.custom_domain_status ?? 'not_configured');
    setShowEditor(true);
    setError('');
    setMessage('');
  }

  async function saveBrand() {
    if (!supabase || !canManage || busy) return;
    if (name.trim().length < 2) {
      setError('Le nom de l’enseigne doit contenir au moins 2 caractères.');
      return;
    }
    if (!/^#[0-9A-Fa-f]{6}$/.test(primaryColor)) {
      setError('La couleur principale est invalide.');
      return;
    }

    setBusy('brand');
    setError('');
    setMessage('');
    try {
      const { data, error: requestError } = await supabase.rpc('metier_upsert_brand', {
        p_organization_id: organizationId,
        p_brand_id: editingId,
        p_name: name.trim(),
        p_code: code.trim() || null,
        p_logo_url: logoUrl.trim() || null,
        p_primary_color: primaryColor,
        p_custom_domain: customDomain.trim() || null,
        p_is_primary: isPrimary
      });
      if (requestError) throw requestError;

      const savedId = String(data ?? editingId ?? '');
      if (savedId && customDomain.trim() && editingId && domainStatus !== 'pending') {
        const { error: statusError } = await supabase.rpc('metier_set_brand_domain_status', {
          p_organization_id: organizationId,
          p_brand_id: savedId,
          p_status: domainStatus
        });
        if (statusError) throw statusError;
      }

      setShowEditor(false);
      setEditingId(null);
      setMessage('L’enseigne a été enregistrée.');
      await load();
    } catch (cause) {
      setError(errorMessage(cause));
    } finally {
      setBusy('');
    }
  }

  async function archiveBrand(brand: MetierBrand) {
    if (!supabase || !canManage || busy) return;
    if (!window.confirm(`Archiver l’enseigne « ${brand.name} » ? Les établissements seront réaffectés à une autre enseigne active si elle existe.`)) return;
    setBusy(`brand-${brand.id}`);
    setError('');
    setMessage('');
    const { error: requestError } = await supabase.rpc('metier_set_brand_status', {
      p_organization_id: organizationId,
      p_brand_id: brand.id,
      p_status: 'archived'
    });
    setBusy('');
    if (requestError) setError(requestError.message);
    else {
      setMessage('L’enseigne a été archivée.');
      await load();
    }
  }

  async function assignSite(site: MetierBrandSite, brandId: string) {
    if (!supabase || !canManage || busy) return;
    setBusy(`site-${site.id}`);
    setError('');
    setMessage('');
    const { error: requestError } = await supabase.rpc('metier_assign_site_brand', {
      p_organization_id: organizationId,
      p_site_id: site.id,
      p_brand_id: brandId || null
    });
    setBusy('');
    if (requestError) setError(requestError.message);
    else {
      setMessage(`${site.name} a été rattaché à la bonne enseigne.`);
      await load();
    }
  }

  if (loading) return <section className="metier-admin-domain-section"><div className="list-state">Chargement des enseignes…</div></section>;

  return (
    <section className="metier-admin-domain-section">
      <div className="panel-header">
        <div>
          <p className="eyebrow">ENSEIGNES & ÉTABLISSEMENTS</p>
          <h3>Architecture multi-enseigne</h3>
          <p className="muted">Une entreprise Métier peut regrouper plusieurs enseignes, puis rattacher chaque établissement à la bonne identité. La capacité reste bornée par la limite contractuelle d’établissements ({siteLimit}).</p>
        </div>
        {canManage && <button type="button" className="secondary-button" onClick={resetEditor} disabled={brands.length >= siteLimit}><Icon name="building" size={16} /> Nouvelle enseigne</button>}
      </div>

      {error && <div className="error-message page-message" role="alert">{error}</div>}
      {message && <div className="success-message page-message" role="status">{message}</div>}

      <div className="metier-admin-module-group">
        <strong>{brands.length} enseigne(s) configurée(s)</strong>
        <div>
          {brands.map((brand) => (
            <label key={brand.id} className={brand.status === 'active' ? 'active' : ''} style={{ cursor: 'default' }}>
              <span style={{ display: 'flex', width: '100%', alignItems: 'center', gap: 10 }}>
                <i style={{ width: 12, height: 12, borderRadius: 99, background: brand.primary_color, flex: '0 0 auto' }} />
                <span style={{ minWidth: 0, flex: 1 }}>
                  <b>{brand.name}{brand.is_primary ? ' · principale' : ''}</b>
                  <small>{brand.active_sites} établissement(s){brand.custom_domain ? ` · ${brand.custom_domain}` : ''}</small>
                </span>
                {brand.custom_domain && <em>{domainStatusLabels[brand.custom_domain_status]}</em>}
                {canManage && <button type="button" className="text-button" onClick={() => editBrand(brand)}>Modifier</button>}
                {canManage && !brand.is_primary && <button type="button" className="text-button" onClick={() => void archiveBrand(brand)} disabled={busy === `brand-${brand.id}`}>Archiver</button>}
              </span>
            </label>
          ))}
        </div>
      </div>

      {showEditor && (
        <div className="metier-admin-form-grid" style={{ marginTop: 16 }}>
          <label>Nom de l’enseigne<input value={name} onChange={(event) => setName(event.target.value)} maxLength={120} placeholder="Ex. AZZERA CUT" required /></label>
          <label>Code interne<input value={code} onChange={(event) => setCode(event.target.value.toUpperCase())} maxLength={40} placeholder="Ex. CUT" /></label>
          <label>Logo de l’enseigne<input value={logoUrl} onChange={(event) => setLogoUrl(event.target.value)} placeholder="https://…" /></label>
          <label>Couleur principale<input type="color" value={primaryColor} onChange={(event) => setPrimaryColor(event.target.value)} /></label>
          <label>Domaine personnalisé<input value={customDomain} onChange={(event) => setCustomDomain(event.target.value.toLowerCase().replace(/^https?:\/\//, '').replace(/\/$/, ''))} placeholder="rdv.enseigne.fr" /><small>Une nouvelle adresse passe automatiquement en attente DNS.</small></label>
          {editingId && customDomain && <label>Statut DNS<select value={domainStatus} onChange={(event) => setDomainStatus(event.target.value as BrandDomainStatus)}><option value="pending">DNS en attente</option><option value="verified">Vérifié</option><option value="active">Actif</option><option value="error">À corriger</option></select></label>}
          <label className="admin-checkbox-field"><input type="checkbox" checked={isPrimary} onChange={(event) => setIsPrimary(event.target.checked)} /><span><strong>Enseigne principale</strong><small>Elle devient l’identité par défaut des nouveaux établissements.</small></span></label>
          <div style={{ display: 'flex', alignItems: 'end', gap: 10 }}>
            <button type="button" className="secondary-button" onClick={() => setShowEditor(false)} disabled={busy === 'brand'}>Annuler</button>
            <button type="button" className="primary-button" onClick={() => void saveBrand()} disabled={busy === 'brand'}>{busy === 'brand' ? 'Enregistrement…' : editingId ? 'Mettre à jour' : 'Créer l’enseigne'}</button>
          </div>
        </div>
      )}

      <div className="metier-admin-module-group" style={{ marginTop: 18 }}>
        <strong>Rattachement des établissements</strong>
        <div>
          {sites.length === 0 ? <div className="info-message">Aucun établissement n’est encore créé pour cet espace.</div> : sites.map((site) => (
            <label key={site.id} className="active" style={{ cursor: 'default' }}>
              <span style={{ width: '100%', display: 'grid', gridTemplateColumns: 'minmax(0, 1fr) minmax(180px, 260px)', gap: 12, alignItems: 'center' }}>
                <span><b>{site.name}{site.is_primary ? ' · principal' : ''}</b><small>{[site.code, site.city].filter(Boolean).join(' · ') || 'Établissement actif'}</small></span>
                <select value={site.brand_id ?? ''} onChange={(event) => void assignSite(site, event.target.value)} disabled={!canManage || busy === `site-${site.id}`}>
                  <option value="">Sans enseigne</option>
                  {activeBrands.map((brand) => <option key={brand.id} value={brand.id}>{brand.name}{brand.is_primary ? ' · principale' : ''}</option>)}
                </select>
              </span>
            </label>
          ))}
        </div>
      </div>

      <div className="info-message">Le domaine est préparé dans NCR Suite, mais son activation DNS reste une opération réelle à effectuer dans Cloudflare avant de passer le statut sur « Actif ».</div>
    </section>
  );
}
