import { FormEvent, useEffect, useMemo, useState } from 'react';
import { createPortal } from 'react-dom';
import { useLocation } from 'react-router-dom';
import { useOrganization } from '../contexts/OrganizationContext';
import { supabase } from '../lib/supabase';
import { Icon } from './Icon';

interface AccessBrand {
  id: string;
  name: string;
  logo_url: string | null;
  compact_logo_url: string | null;
  primary_color: string;
  is_primary: boolean;
}

interface AccessMember {
  user_id: string;
  full_name: string;
  email: string;
  role: string;
  brand_scope_mode: 'all' | 'selected';
  brand_ids: string[];
}

interface AccessPayload {
  brands: AccessBrand[];
  members: AccessMember[];
}

interface LocationSite {
  id: string;
  name: string;
  brand_id: string | null;
  brand_name: string | null;
}

interface SharedLocation {
  id: string;
  name: string;
  code: string | null;
  address: string | null;
  postal_code: string | null;
  city: string | null;
  phone: string | null;
  email: string | null;
  timezone: string;
  is_primary: boolean;
  status: 'active' | 'inactive' | 'archived';
  sites: LocationSite[];
}

interface AccessibleSite {
  id: string;
  name: string;
  brand_id: string | null;
  brand_name: string | null;
  location_id: string | null;
  location_name: string | null;
}

type MemberDraft = { mode: 'all' | 'selected'; brandIds: string[] };

function emptyLocation() {
  return { name: '', code: '', address: '', postalCode: '', city: '', phone: '', email: '', timezone: 'Europe/Paris', isPrimary: false };
}

export function MetierWorkspaceEnhancements() {
  const route = useLocation();
  const { organization, refreshSites } = useOrganization();
  const [accessHost, setAccessHost] = useState<HTMLElement | null>(null);
  const [locationsHost, setLocationsHost] = useState<HTMLElement | null>(null);
  const [accessPayload, setAccessPayload] = useState<AccessPayload>({ brands: [], members: [] });
  const [drafts, setDrafts] = useState<Record<string, MemberDraft>>({});
  const [locations, setLocations] = useState<SharedLocation[]>([]);
  const [sites, setSites] = useState<AccessibleSite[]>([]);
  const [busy, setBusy] = useState('');
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [editingLocationId, setEditingLocationId] = useState<string | null>(null);
  const [locationForm, setLocationForm] = useState(emptyLocation());
  const [showLocationEditor, setShowLocationEditor] = useState(false);

  const active = route.pathname === '/offre-metier' && organization?.plan === 'metier';
  const canManage = ['owner', 'admin'].includes(organization?.role ?? 'viewer');

  async function loadAccess() {
    if (!active || !canManage || !organization || !supabase) return;
    const { data, error: requestError } = await supabase.rpc('metier_list_member_brand_access', { p_organization_id: organization.id });
    if (requestError) {
      setError(requestError.message);
      return;
    }
    const payload = (data ?? { brands: [], members: [] }) as AccessPayload;
    payload.brands = Array.isArray(payload.brands) ? payload.brands : [];
    payload.members = Array.isArray(payload.members) ? payload.members : [];
    setAccessPayload(payload);
    const nextDrafts: Record<string, MemberDraft> = {};
    payload.members.forEach((member) => {
      nextDrafts[member.user_id] = { mode: member.brand_scope_mode || 'all', brandIds: Array.isArray(member.brand_ids) ? member.brand_ids : [] };
    });
    setDrafts(nextDrafts);
  }

  async function loadLocations() {
    if (!active || !organization || !supabase) return;
    const [locationResult, siteResult] = await Promise.all([
      supabase.rpc('metier_list_locations', { p_organization_id: organization.id }),
      supabase.rpc('metier_list_accessible_sites', { p_organization_id: organization.id })
    ]);
    if (locationResult.error || siteResult.error) {
      setError(locationResult.error?.message || siteResult.error?.message || 'Chargement impossible.');
      return;
    }
    setLocations((Array.isArray(locationResult.data) ? locationResult.data : []) as SharedLocation[]);
    setSites((Array.isArray(siteResult.data) ? siteResult.data : []) as AccessibleSite[]);
  }

  useEffect(() => {
    if (!active) return;
    setError('');
    setMessage('');
    void loadLocations();
    if (canManage) void loadAccess();
  }, [active, organization?.id, canManage]);

  useEffect(() => {
    if (!active) {
      setAccessHost(null);
      setLocationsHost(null);
      return;
    }
    let accessNode: HTMLElement | null = null;
    let locationNode: HTMLElement | null = null;

    function ensureHosts() {
      const accessPanel = document.querySelector<HTMLElement>('.metier-member-roles-panel');
      if (accessPanel && !accessNode) {
        accessNode = document.createElement('div');
        accessNode.className = 'metier-enhancement-host metier-access-host';
        accessPanel.appendChild(accessNode);
        setAccessHost(accessNode);
      }
      if (!accessPanel && accessNode) {
        accessNode.remove();
        accessNode = null;
        setAccessHost(null);
      }

      const sitesPanel = document.querySelector<HTMLElement>('.metier-sites-panel');
      if (sitesPanel && !locationNode) {
        locationNode = document.createElement('div');
        locationNode.className = 'metier-enhancement-host metier-locations-host';
        sitesPanel.appendChild(locationNode);
        setLocationsHost(locationNode);
      }
      if (!sitesPanel && locationNode) {
        locationNode.remove();
        locationNode = null;
        setLocationsHost(null);
      }
    }

    ensureHosts();
    const observer = new MutationObserver(ensureHosts);
    observer.observe(document.body, { childList: true, subtree: true });
    return () => {
      observer.disconnect();
      accessNode?.remove();
      locationNode?.remove();
    };
  }, [active]);

  const locationById = useMemo(() => new Map(locations.map((location) => [location.id, location])), [locations]);

  function updateDraft(userId: string, patch: Partial<MemberDraft>) {
    setDrafts((current) => ({ ...current, [userId]: { ...(current[userId] ?? { mode: 'all', brandIds: [] }), ...patch } }));
  }

  function toggleDraftBrand(userId: string, brandId: string) {
    const current = drafts[userId] ?? { mode: 'selected' as const, brandIds: [] };
    const brandIds = current.brandIds.includes(brandId) ? current.brandIds.filter((id) => id !== brandId) : [...current.brandIds, brandId];
    updateDraft(userId, { mode: 'selected', brandIds });
  }

  async function saveMemberScope(member: AccessMember) {
    if (!organization || !supabase || !canManage) return;
    const draft = drafts[member.user_id] ?? { mode: 'all' as const, brandIds: [] };
    if (draft.mode === 'selected' && draft.brandIds.length === 0) {
      setError('Sélectionnez au moins une enseigne pour ce collaborateur.');
      return;
    }
    setBusy(`access-${member.user_id}`);
    setError('');
    setMessage('');
    const { error: requestError } = await supabase.rpc('metier_set_member_brand_access', {
      p_organization_id: organization.id,
      p_user_id: member.user_id,
      p_scope_mode: draft.mode,
      p_brand_ids: draft.mode === 'selected' ? draft.brandIds : []
    });
    setBusy('');
    if (requestError) setError(requestError.message);
    else {
      setMessage(`Périmètre de ${member.full_name} mis à jour.`);
      await loadAccess();
    }
  }

  function startNewLocation() {
    setEditingLocationId(null);
    setLocationForm(emptyLocation());
    setShowLocationEditor(true);
    setError('');
  }

  function editLocation(location: SharedLocation) {
    setEditingLocationId(location.id);
    setLocationForm({
      name: location.name,
      code: location.code ?? '',
      address: location.address ?? '',
      postalCode: location.postal_code ?? '',
      city: location.city ?? '',
      phone: location.phone ?? '',
      email: location.email ?? '',
      timezone: location.timezone || 'Europe/Paris',
      isPrimary: location.is_primary
    });
    setShowLocationEditor(true);
    setError('');
  }

  async function saveLocation(event: FormEvent) {
    event.preventDefault();
    if (!organization || !supabase || !canManage) return;
    setBusy('location-save');
    setError('');
    setMessage('');
    const { error: requestError } = await supabase.rpc('metier_upsert_location', {
      p_organization_id: organization.id,
      p_location_id: editingLocationId,
      p_name: locationForm.name,
      p_code: locationForm.code || null,
      p_address: locationForm.address || null,
      p_postal_code: locationForm.postalCode || null,
      p_city: locationForm.city || null,
      p_phone: locationForm.phone || null,
      p_email: locationForm.email || null,
      p_timezone: locationForm.timezone,
      p_is_primary: locationForm.isPrimary
    });
    setBusy('');
    if (requestError) setError(requestError.message);
    else {
      setMessage(editingLocationId ? 'Lieu physique mis à jour.' : 'Lieu physique créé.');
      setShowLocationEditor(false);
      setEditingLocationId(null);
      setLocationForm(emptyLocation());
      await loadLocations();
      refreshSites();
    }
  }

  async function assignSiteLocation(site: AccessibleSite, locationId: string) {
    if (!organization || !supabase || !canManage) return;
    setBusy(`site-location-${site.id}`);
    setError('');
    const { error: requestError } = await supabase.rpc('metier_assign_site_location', {
      p_organization_id: organization.id,
      p_site_id: site.id,
      p_location_id: locationId || null
    });
    setBusy('');
    if (requestError) setError(requestError.message);
    else {
      setMessage(`${site.name} est maintenant rattaché au lieu sélectionné.`);
      await loadLocations();
      refreshSites();
    }
  }

  async function archiveLocation(location: SharedLocation) {
    if (!organization || !supabase || !canManage) return;
    if (location.sites.length > 0) {
      setError('Réaffectez d’abord les établissements de ce lieu.');
      return;
    }
    if (!window.confirm(`Archiver le lieu « ${location.name} » ?`)) return;
    setBusy(`archive-location-${location.id}`);
    const { error: requestError } = await supabase.rpc('metier_set_location_status', {
      p_organization_id: organization.id,
      p_location_id: location.id,
      p_status: 'archived'
    });
    setBusy('');
    if (requestError) setError(requestError.message);
    else {
      setMessage('Lieu archivé.');
      await loadLocations();
    }
  }

  const accessPanel = canManage ? (
    <section className="metier-enhancement-section">
      <div className="metier-enhancement-heading"><div><p className="eyebrow">PÉRIMÈTRE PAR ENSEIGNE</p><h3>Qui voit quelle enseigne ?</h3><p>Le rôle contrôle les fonctions. Le périmètre contrôle les enseignes accessibles. Un seul compte peut accéder à une, plusieurs ou toutes les enseignes.</p></div></div>
      {message && <div className="success-message page-message" role="status">{message}</div>}
      {error && <div className="error-message page-message" role="alert">{error}</div>}
      <div className="metier-scope-list">
        {accessPayload.members.map((member) => {
          const locked = ['owner', 'admin'].includes(member.role);
          const draft = drafts[member.user_id] ?? { mode: member.brand_scope_mode, brandIds: member.brand_ids };
          return <article className="metier-scope-card" key={member.user_id}>
            <div className="metier-scope-person"><span className="team-avatar">{member.full_name.slice(0, 1).toUpperCase()}</span><span><strong>{member.full_name}</strong><small>{member.email} · {member.role}</small></span></div>
            {locked ? <div className="metier-scope-admin"><Icon name="shield" size={17} /> Toutes les enseignes · accès d’administration</div> : <>
              <label className="metier-scope-mode">Périmètre<select value={draft.mode} onChange={(event) => updateDraft(member.user_id, { mode: event.target.value as 'all' | 'selected' })}><option value="all">Toutes les enseignes</option><option value="selected">Enseignes sélectionnées</option></select></label>
              {draft.mode === 'selected' && <div className="metier-brand-checkboxes">{accessPayload.brands.map((brand) => <label key={brand.id}><input type="checkbox" checked={draft.brandIds.includes(brand.id)} onChange={() => toggleDraftBrand(member.user_id, brand.id)} /><span className="metier-brand-dot" style={{ background: brand.primary_color }} />{brand.name}</label>)}</div>}
              <button className="secondary-button compact-button" type="button" disabled={busy === `access-${member.user_id}`} onClick={() => void saveMemberScope(member)}>{busy === `access-${member.user_id}` ? 'Enregistrement…' : 'Enregistrer le périmètre'}</button>
            </>}
          </article>;
        })}
      </div>
    </section>
  ) : null;

  const locationsPanel = (
    <section className="metier-enhancement-section metier-shared-locations">
      <div className="metier-enhancement-heading"><div><p className="eyebrow">LIEUX PHYSIQUES PARTAGÉS</p><h3>Un bâtiment, plusieurs enseignes</h3><p>Un lieu contient l’adresse réelle. Plusieurs établissements appartenant à des enseignes différentes peuvent partager ce même lieu sans ressaisir l’adresse.</p></div>{canManage && <button className="secondary-button" type="button" onClick={startNewLocation}><Icon name="plus" size={16} /> Ajouter un lieu</button>}</div>
      {message && <div className="success-message page-message" role="status">{message}</div>}
      {error && <div className="error-message page-message" role="alert">{error}</div>}

      <div className="metier-location-grid">
        {locations.map((location) => <article className="metier-location-card" key={location.id}>
          <span className="metier-location-icon"><Icon name="building" size={20} /></span>
          <div><strong>{location.name}{location.is_primary ? ' · principal' : ''}</strong><span>{[location.address, location.postal_code, location.city].filter(Boolean).join(' · ') || 'Adresse à renseigner'}</span><small>{location.sites.length} établissement(s) rattaché(s){location.code ? ` · ${location.code}` : ''}</small>{location.sites.length > 0 && <div className="metier-location-brands">{location.sites.map((site) => <em key={site.id}>{site.brand_name || 'Enseigne'} · {site.name}</em>)}</div>}</div>
          {canManage && <div className="metier-location-actions"><button className="secondary-button compact-button" type="button" onClick={() => editLocation(location)}>Modifier</button>{location.sites.length === 0 && <button className="danger-text-button" type="button" disabled={busy === `archive-location-${location.id}`} onClick={() => void archiveLocation(location)}>Archiver</button>}</div>}
        </article>)}
      </div>

      {canManage && sites.length > 0 && <div className="metier-location-assignments"><h4>Rattachement des établissements</h4><p>Choisissez le lieu physique utilisé par chaque établissement. Plusieurs lignes peuvent pointer vers le même lieu.</p>{sites.map((site) => <label key={site.id}><span><strong>{site.brand_name || 'Enseigne'}</strong><small>{site.name}</small></span><select value={site.location_id ?? ''} disabled={busy === `site-location-${site.id}`} onChange={(event) => void assignSiteLocation(site, event.target.value)}><option value="">Aucun lieu partagé</option>{locations.filter((location) => location.status === 'active').map((location) => <option key={location.id} value={location.id}>{location.name}{location.city ? ` · ${location.city}` : ''}</option>)}</select>{site.location_id && <em>{locationById.get(site.location_id)?.name || site.location_name || 'Lieu partagé'}</em>}</label>)}</div>}

      {showLocationEditor && <form className="metier-location-form" onSubmit={saveLocation}>
        <div className="panel-header"><div><h4>{editingLocationId ? 'Modifier le lieu' : 'Nouveau lieu physique'}</h4></div><button className="icon-button" type="button" onClick={() => setShowLocationEditor(false)} aria-label="Fermer"><Icon name="close" size={18} /></button></div>
        <div className="form-grid"><label>Nom du lieu<input required minLength={2} value={locationForm.name} onChange={(event) => setLocationForm({ ...locationForm, name: event.target.value })} placeholder="Ex. Beauty House · bâtiment principal" /></label><label>Code interne<input value={locationForm.code} onChange={(event) => setLocationForm({ ...locationForm, code: event.target.value.toUpperCase() })} /></label><label className="full-field">Adresse<input value={locationForm.address} onChange={(event) => setLocationForm({ ...locationForm, address: event.target.value })} /></label><label>Code postal<input value={locationForm.postalCode} onChange={(event) => setLocationForm({ ...locationForm, postalCode: event.target.value })} /></label><label>Ville<input value={locationForm.city} onChange={(event) => setLocationForm({ ...locationForm, city: event.target.value })} /></label><label>Téléphone<input value={locationForm.phone} onChange={(event) => setLocationForm({ ...locationForm, phone: event.target.value })} /></label><label>E-mail<input type="email" value={locationForm.email} onChange={(event) => setLocationForm({ ...locationForm, email: event.target.value })} /></label><label>Fuseau horaire<input value={locationForm.timezone} onChange={(event) => setLocationForm({ ...locationForm, timezone: event.target.value })} /></label><label className="switch-field"><input type="checkbox" checked={locationForm.isPrimary} onChange={(event) => setLocationForm({ ...locationForm, isPrimary: event.target.checked })} /><span aria-hidden="true" /><b>Lieu principal</b></label></div>
        <div className="modal-actions"><button className="secondary-button" type="button" onClick={() => setShowLocationEditor(false)}>Annuler</button><button className="primary-button" type="submit" disabled={busy === 'location-save'}>{busy === 'location-save' ? 'Enregistrement…' : 'Enregistrer le lieu'}</button></div>
      </form>}
    </section>
  );

  if (!active) return null;
  return <>{accessHost && accessPanel && createPortal(accessPanel, accessHost)}{locationsHost && createPortal(locationsPanel, locationsHost)}</>;
}
