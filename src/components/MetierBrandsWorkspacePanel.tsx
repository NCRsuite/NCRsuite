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

export function MetierBrandsWorkspacePanel({ organizationId, siteLimit, canManage }: {
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
  const [busy, setBusy] = useState('');
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(true);

  const activeBrands = useMemo(() => brands.filter((brand) => brand.status === 'active'), [brands]);

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
    setError('');
    setMessage('');
    void load();
  }, [organizationId]);

  function newBrand() {
    setEditingId(null);
    setName('');
    setCode('');
    setLogoUrl('');
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
    setPrimaryColor(brand.primary_color || '#2997ff');
    setCustomDomain(brand.custom_domain ?? '');
    setIsPrimary(brand.is_primary);
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
    setBusy('brand');
    setError('');
    setMessage('');
    const { error: requestError } = await supabase.rpc('metier_upsert_brand', {
      p_organization_id: organizationId,
      p_brand_id: editingId,
      p_name: name.trim(),
      p_code: code.trim() || null,
      p_logo_url: logoUrl.trim() || null,
      p_primary_color: primaryColor,
      p_custom_domain: customDomain.trim() || null,
      p_is_primary: isPrimary
    });
    setBusy('');
    if (requestError) setError(requestError.message);
    else {
      setMessage(customDomain.trim() ? 'L’enseigne a été enregistrée. NCR doit valider le domaine avant sa mise en service.' : 'L’enseigne a été enregistrée.');
      setShowEditor(false);
      setEditingId(null);
      await load();
    }
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
        <div><p className="eyebrow">MULTI-ENSEIGNE</p><h2>Identités et établissements</h2><p className="muted">Gérez plusieurs marques dans le même espace Métier et rattachez chaque établissement à la bonne enseigne.</p></div>
        {canManage && <button type="button" className="secondary-button" onClick={newBrand} disabled={brands.length >= siteLimit}><Icon name="building" size={16} /> Ajouter une enseigne</button>}
      </div>

      {error && <div className="error-message page-message" role="alert">{error}</div>}
      {message && <div className="success-message page-message" role="status">{message}</div>}

      <div className="metier-role-list">
        {brands.map((brand) => (
          <article key={brand.id}>
            <span style={{ width: 12, height: 12, borderRadius: 99, background: brand.primary_color, flex: '0 0 auto' }} />
            <div><strong>{brand.name}{brand.is_primary ? ' · principale' : ''}</strong><span>{brand.active_sites} établissement(s){brand.code ? ` · ${brand.code}` : ''}</span><small>{brand.custom_domain ? `${brand.custom_domain} · ${statusLabels[brand.custom_domain_status]}` : 'Aucun domaine personnalisé'}</small></div>
            {canManage && <div><button type="button" className="secondary-button compact-button" onClick={() => editBrand(brand)}>Modifier</button>{!brand.is_primary && <button type="button" className="danger-text-button" onClick={() => void archiveBrand(brand)} disabled={busy === `archive-${brand.id}`}>Archiver</button>}</div>}
          </article>
        ))}
      </div>

      {showEditor && (
        <div className="form-grid" style={{ marginTop: 18 }}>
          <label>Nom de l’enseigne<input required minLength={2} maxLength={120} value={name} onChange={(event) => setName(event.target.value)} /></label>
          <label>Code interne<input maxLength={40} value={code} onChange={(event) => setCode(event.target.value.toUpperCase())} /></label>
          <label>Logo<input value={logoUrl} onChange={(event) => setLogoUrl(event.target.value)} placeholder="https://…" /></label>
          <label>Couleur<input type="color" value={primaryColor} onChange={(event) => setPrimaryColor(event.target.value)} /></label>
          <label className="full-field">Domaine personnalisé<input value={customDomain} onChange={(event) => setCustomDomain(event.target.value.toLowerCase().replace(/^https?:\/\//, '').replace(/\/$/, ''))} placeholder="rdv.mon-enseigne.fr" /><small>Après ajout ou modification, le domaine repasse en validation DNS par NCR.</small></label>
          <label className="full-field admin-checkbox-field"><input type="checkbox" checked={isPrimary} onChange={(event) => setIsPrimary(event.target.checked)} /><span><strong>Enseigne principale</strong><small>Elle sert d’identité par défaut pour les nouveaux établissements.</small></span></label>
          <div className="modal-actions full-field"><button type="button" className="secondary-button" onClick={() => setShowEditor(false)}>Annuler</button><button type="button" className="primary-button" onClick={() => void saveBrand()} disabled={busy === 'brand'}>{busy === 'brand' ? 'Enregistrement…' : 'Enregistrer l’enseigne'}</button></div>
        </div>
      )}

      <div className="metier-member-role-list" style={{ marginTop: 18 }}>
        {sites.map((site) => (
          <label key={site.id} className="metier-member-role-row"><span className="team-avatar">{site.name.slice(0, 1).toUpperCase()}</span><span><strong>{site.name}{site.is_primary ? ' · principal' : ''}</strong><small>{[site.code, site.city].filter(Boolean).join(' · ') || 'Établissement actif'}</small></span><select value={site.brand_id ?? activeBrands[0]?.id ?? ''} onChange={(event) => void assignSite(site, event.target.value)} disabled={!canManage || busy === `site-${site.id}` || activeBrands.length === 0}>{activeBrands.map((brand) => <option key={brand.id} value={brand.id}>{brand.name}{brand.is_primary ? ' · principale' : ''}</option>)}</select></label>
        ))}
      </div>

      <div className="info-message">Le nom, le logo, la couleur et le domaine sont propres à chaque enseigne. L’activation technique d’un domaine reste validée par NCR afin d’éviter une configuration DNS incorrecte.</div>
    </section>
  );
}
