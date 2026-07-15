import { FormEvent, useCallback, useEffect, useState } from 'react';
import { Icon } from '../components/Icon';
import { useOrganization } from '../contexts/OrganizationContext';
import { supabase } from '../lib/supabase';
import type { OrganizationSite } from '../types';

interface SiteForm {
  id: string | null;
  name: string;
  code: string;
  address: string;
  postalCode: string;
  city: string;
  phone: string;
  email: string;
  timezone: string;
  isPrimary: boolean;
}

const emptyForm = (): SiteForm => ({
  id: null,
  name: '',
  code: '',
  address: '',
  postalCode: '',
  city: '',
  phone: '',
  email: '',
  timezone: 'Europe/Paris',
  isPrimary: false
});

export function TrainingSitesPage() {
  const { organization, refreshSites } = useOrganization();
  const [form, setForm] = useState<SiteForm>(emptyForm);
  const [managedSites, setManagedSites] = useState<OrganizationSite[]>([]);
  const [loadingSites, setLoadingSites] = useState(true);
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [busyId, setBusyId] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  useEffect(() => {
    if (!open) setForm(emptyForm());
  }, [open]);

  const loadManagedSites = useCallback(async () => {
    if (!organization || !supabase) return;
    setLoadingSites(true);
    const { data, error: listError } = await supabase
      .from('organization_sites')
      .select('id,organization_id,name,code,address,postal_code,city,phone,email,timezone,is_primary,status,created_at,updated_at')
      .eq('organization_id', organization.id)
      .neq('status', 'archived')
      .order('is_primary', { ascending: false })
      .order('name');
    if (listError) setError(listError.message);
    else setManagedSites((data ?? []) as OrganizationSite[]);
    setLoadingSites(false);
  }, [organization?.id]);

  useEffect(() => { void loadManagedSites(); }, [loadManagedSites]);

  if (!organization) return null;
  const trainingOrganization = organization;
  const canManage = ['owner', 'admin'].includes(trainingOrganization.role ?? 'viewer');

  function edit(site: OrganizationSite) {
    setForm({
      id: site.id,
      name: site.name,
      code: site.code ?? '',
      address: site.address ?? '',
      postalCode: site.postal_code ?? '',
      city: site.city ?? '',
      phone: site.phone ?? '',
      email: site.email ?? '',
      timezone: site.timezone || 'Europe/Paris',
      isPrimary: site.is_primary
    });
    setOpen(true);
  }

  async function save(event: FormEvent) {
    event.preventDefault();
    if (!supabase || !canManage) return;
    setSaving(true); setError(''); setSuccess('');
    try {
      const { error: rpcError } = await supabase.rpc('training_upsert_site', {
        p_organization_id: trainingOrganization.id,
        p_site_id: form.id,
        p_name: form.name,
        p_code: form.code || null,
        p_address: form.address || null,
        p_postal_code: form.postalCode || null,
        p_city: form.city || null,
        p_phone: form.phone || null,
        p_email: form.email || null,
        p_timezone: form.timezone,
        p_is_primary: form.isPrimary
      });
      if (rpcError) throw rpcError;
      setOpen(false);
      refreshSites();
      await loadManagedSites();
      setSuccess(form.id ? 'L’établissement a été mis à jour.' : 'L’établissement a été créé.');
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Enregistrement impossible.');
    } finally { setSaving(false); }
  }

  async function setStatus(site: OrganizationSite, status: 'active' | 'inactive' | 'archived') {
    if (!supabase || !canManage) return;
    if (status === 'archived' && !window.confirm(`Archiver l’établissement « ${site.name} » ?`)) return;
    setBusyId(site.id); setError(''); setSuccess('');
    try {
      const { error: rpcError } = await supabase.rpc('training_set_site_status', {
        p_organization_id: trainingOrganization.id,
        p_site_id: site.id,
        p_status: status
      });
      if (rpcError) throw rpcError;
      refreshSites();
      await loadManagedSites();
      setSuccess(status === 'active' ? 'L’établissement est actif.' : status === 'inactive' ? 'L’établissement a été désactivé.' : 'L’établissement a été archivé.');
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Modification impossible.');
    } finally { setBusyId(''); }
  }

  return (
    <div className="page training-page">
      <header className="page-header">
        <div><p className="eyebrow">FORMATION · MULTI-SITE</p><h1>Établissements</h1><p>Rattachez les formations, les sessions et les documents au bon site.</p></div>
        {canManage && <button className="primary-button" type="button" onClick={() => { setForm(emptyForm()); setOpen(true); }}><Icon name="plus" size={18} />Ajouter un établissement</button>}
      </header>

      {error && <div className="error-message page-message" role="alert">{error}</div>}
      {success && <div className="success-message page-message" role="status">{success}</div>}

      {open && (
        <section className="panel training-form-panel">
          <div className="panel-header"><div><p className="eyebrow">ÉTABLISSEMENT</p><h2>{form.id ? 'Modifier le site' : 'Nouveau site'}</h2></div><button className="secondary-button compact-button" type="button" onClick={() => setOpen(false)}>Fermer</button></div>
          <form className="training-form-grid" onSubmit={save}>
            <label>Nom *<input required minLength={2} maxLength={120} value={form.name} onChange={(event) => setForm({ ...form, name: event.target.value })} /></label>
            <label>Code interne<input maxLength={30} value={form.code} onChange={(event) => setForm({ ...form, code: event.target.value })} placeholder="Ex. NICE-01" /></label>
            <label className="full-field">Adresse<input maxLength={300} value={form.address} onChange={(event) => setForm({ ...form, address: event.target.value })} /></label>
            <label>Code postal<input maxLength={20} value={form.postalCode} onChange={(event) => setForm({ ...form, postalCode: event.target.value })} /></label>
            <label>Ville<input maxLength={120} value={form.city} onChange={(event) => setForm({ ...form, city: event.target.value })} /></label>
            <label>Téléphone<input type="tel" value={form.phone} onChange={(event) => setForm({ ...form, phone: event.target.value })} /></label>
            <label>E-mail<input type="email" value={form.email} onChange={(event) => setForm({ ...form, email: event.target.value })} /></label>
            <label className="full-field toggle-card"><input type="checkbox" checked={form.isPrimary} onChange={(event) => setForm({ ...form, isPrimary: event.target.checked })} /><span><strong>Établissement principal</strong><small>Utilisé comme site de référence pour l’organisme.</small></span></label>
            <div className="form-actions full-field"><button className="secondary-button" type="button" onClick={() => setOpen(false)}>Annuler</button><button className="primary-button" disabled={saving}>{saving ? 'Enregistrement…' : 'Enregistrer'}</button></div>
          </form>
        </section>
      )}

      <section className="panel training-list-panel">
        <div className="panel-header"><div><p className="eyebrow">ÉTABLISSEMENTS</p><h2>{managedSites.length} établissement{managedSites.length > 1 ? 's' : ''}</h2></div></div>
        {loadingSites ? <div className="training-empty"><span>Chargement des établissements…</span></div> : managedSites.length === 0 ? <div className="training-empty"><Icon name="building" size={30} /><strong>Aucun établissement</strong><span>Ajoutez le premier site avant de créer des formations multi-sites.</span></div> : (
          <div className="metier-site-list">
            {managedSites.map((site) => (
              <article key={site.id} className={`metier-site-card ${site.status}`}>
                <span className="metier-site-icon"><Icon name="building" size={22} /></span>
                <div className="metier-site-main"><strong>{site.name}</strong><span>{[site.address, site.postal_code, site.city].filter(Boolean).join(' · ') || 'Adresse non renseignée'}</span><small>{site.code ? `Code ${site.code} · ` : ''}{site.email || site.phone || site.timezone}</small></div>
                <div className="metier-site-badges">{site.is_primary && <span className="status-chip active">Principal</span>}<span className={`status-chip ${site.status === 'active' ? 'active' : 'inactive'}`}>{site.status === 'active' ? 'Actif' : 'Inactif'}</span></div>
                {canManage && <div className="metier-site-actions"><button className="secondary-button compact-button" type="button" onClick={() => edit(site)}>Modifier</button><button className="secondary-button compact-button" type="button" disabled={busyId === site.id} onClick={() => void setStatus(site, site.status === 'active' ? 'inactive' : 'active')}>{site.status === 'active' ? 'Désactiver' : 'Réactiver'}</button><button className="danger-text-button" type="button" onClick={() => void setStatus(site, 'archived')}>Archiver</button></div>}
              </article>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
