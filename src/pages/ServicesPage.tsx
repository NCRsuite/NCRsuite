import { FormEvent, useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Icon } from '../components/Icon';
import { useAuth } from '../contexts/AuthContext';
import { useOrganization } from '../contexts/OrganizationContext';
import { useBeautyEnseigneContext } from '../hooks/useBeautyEnseigneContext';
import { supabase } from '../lib/supabase';

interface ServiceRecord {
  id: string;
  company_id?: string | null;
  name: string;
  description: string | null;
  duration_minutes: number;
  price_cents: number;
  active: boolean;
  created_at: string;
}

interface ServiceFormState {
  name: string;
  description: string;
  durationMinutes: string;
  price: string;
}

type StatusFilter = 'all' | 'active' | 'inactive';

const emptyForm: ServiceFormState = { name: '', description: '', durationMinutes: '30', price: '' };
const currencyFormatter = new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR' });

function normalizeNullable(value: string) {
  const normalized = value.trim();
  return normalized.length > 0 ? normalized : null;
}

function formatDuration(minutes: number) {
  if (minutes < 60) return `${minutes} min`;
  const hours = Math.floor(minutes / 60);
  const remainingMinutes = minutes % 60;
  return remainingMinutes > 0 ? `${hours} h ${remainingMinutes.toString().padStart(2, '0')}` : `${hours} h`;
}

function parsePriceToCents(value: string) {
  const normalized = value.trim().replace(/\s/g, '').replace(',', '.');
  if (!/^\d+(?:\.\d{1,2})?$/.test(normalized)) return null;
  const [euros, decimals = ''] = normalized.split('.');
  return Number(euros) * 100 + Number(decimals.padEnd(2, '0'));
}

function serviceToForm(service: ServiceRecord): ServiceFormState {
  return {
    name: service.name,
    description: service.description ?? '',
    durationMinutes: String(service.duration_minutes),
    price: (service.price_cents / 100).toFixed(2).replace('.', ',')
  };
}

export function ServicesPage() {
  const { organization } = useOrganization();
  const { demoMode } = useAuth();
  const { beautyMode, selectedEnseigne, selectedEnseigneId, loading: enseigneLoading } = useBeautyEnseigneContext();
  const [searchParams, setSearchParams] = useSearchParams();
  const [services, setServices] = useState<ServiceRecord[]>([]);
  const [form, setForm] = useState<ServiceFormState>(emptyForm);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [query, setQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('active');

  const formOpen = searchParams.get('new') === '1' || editingId !== null;
  const canManage = ['owner', 'admin', 'manager'].includes(organization?.role ?? 'viewer');

  useEffect(() => {
    if (!organization) return;
    const organizationId = organization.id;
    let active = true;

    async function loadServices() {
      if (beautyMode && enseigneLoading) return;
      setLoading(true);
      setError('');

      if (beautyMode && !selectedEnseigneId) {
        if (active) {
          setServices([]);
          setLoading(false);
        }
        return;
      }

      if (demoMode || !supabase) {
        const stored = localStorage.getItem(`ncr-suite-demo-services-${organizationId}`);
        const rows = stored ? JSON.parse(stored) as ServiceRecord[] : [];
        const scoped = beautyMode ? rows.filter((row) => row.company_id === selectedEnseigneId) : rows;
        if (active) {
          setServices(scoped);
          setLoading(false);
        }
        return;
      }

      let request = supabase
        .from('services')
        .select('id,company_id,name,description,duration_minutes,price_cents,active,created_at')
        .eq('organization_id', organizationId);
      if (beautyMode && selectedEnseigneId) request = request.eq('company_id', selectedEnseigneId);
      const { data, error: loadError } = await request
        .order('active', { ascending: false })
        .order('name', { ascending: true });

      if (!active) return;
      if (loadError) setError(`Impossible de charger les prestations : ${loadError.message}`);
      else setServices((data ?? []) as ServiceRecord[]);
      setLoading(false);
    }

    void loadServices();
    return () => { active = false; };
  }, [organization?.id, demoMode, beautyMode, selectedEnseigneId, enseigneLoading]);

  useEffect(() => {
    setEditingId(null);
    setForm(emptyForm);
    setSearchParams({});
    setQuery('');
    setSuccess('');
  }, [selectedEnseigneId]);

  const filteredServices = useMemo(() => {
    const needle = query.trim().toLocaleLowerCase('fr');
    return services.filter((service) => {
      const matchesStatus = statusFilter === 'all'
        || (statusFilter === 'active' && service.active)
        || (statusFilter === 'inactive' && !service.active);
      const matchesQuery = !needle || [service.name, service.description]
        .filter(Boolean).join(' ').toLocaleLowerCase('fr').includes(needle);
      return matchesStatus && matchesQuery;
    });
  }, [services, query, statusFilter]);

  const activeCount = services.filter((service) => service.active).length;

  function openCreateForm() {
    if (!canManage || (beautyMode && !selectedEnseigneId)) return;
    setEditingId(null);
    setForm(emptyForm);
    setError('');
    setSuccess('');
    setSearchParams({ new: '1' });
  }

  function openEditForm(service: ServiceRecord) {
    if (!canManage) return;
    setSearchParams({});
    setEditingId(service.id);
    setForm(serviceToForm(service));
    setError('');
    setSuccess('');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  function closeForm() {
    setEditingId(null);
    setForm(emptyForm);
    setError('');
    setSearchParams({});
  }

  async function handleSaveService(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!organization || !canManage) return;
    if (beautyMode && !selectedEnseigneId) {
      setError('Créez ou sélectionnez d’abord une enseigne.');
      return;
    }

    const name = form.name.trim();
    const durationMinutes = Number(form.durationMinutes);
    const priceCents = parsePriceToCents(form.price);
    if (name.length < 2) { setError('Le nom de la prestation doit contenir au moins 2 caractères.'); return; }
    if (!Number.isInteger(durationMinutes) || durationMinutes < 5 || durationMinutes > 720) { setError('La durée doit être comprise entre 5 minutes et 12 heures.'); return; }
    if (priceCents === null || priceCents < 0) { setError('Indiquez un tarif valide, avec au maximum deux décimales.'); return; }

    setSaving(true);
    setError('');
    setSuccess('');

    const payload = {
      organization_id: organization.id,
      ...(beautyMode ? { company_id: selectedEnseigneId } : {}),
      name,
      description: normalizeNullable(form.description),
      duration_minutes: durationMinutes,
      price_cents: priceCents
    };

    try {
      let saved: ServiceRecord;
      if (demoMode || !supabase) {
        const stored = localStorage.getItem(`ncr-suite-demo-services-${organization.id}`);
        const allRows = stored ? JSON.parse(stored) as ServiceRecord[] : [];
        const existing = allRows.find((service) => service.id === editingId);
        saved = {
          id: existing?.id ?? crypto.randomUUID(),
          company_id: beautyMode ? selectedEnseigneId : existing?.company_id ?? null,
          name: payload.name,
          description: payload.description,
          duration_minutes: payload.duration_minutes,
          price_cents: payload.price_cents,
          active: existing?.active ?? true,
          created_at: existing?.created_at ?? new Date().toISOString()
        };
        const next = existing ? allRows.map((service) => service.id === saved.id ? saved : service) : [saved, ...allRows];
        localStorage.setItem(`ncr-suite-demo-services-${organization.id}`, JSON.stringify(next));
      } else if (editingId) {
        let request = supabase.from('services').update({
          name: payload.name,
          description: payload.description,
          duration_minutes: payload.duration_minutes,
          price_cents: payload.price_cents
        }).eq('organization_id', organization.id).eq('id', editingId);
        if (beautyMode && selectedEnseigneId) request = request.eq('company_id', selectedEnseigneId);
        const { data, error: updateError } = await request
          .select('id,company_id,name,description,duration_minutes,price_cents,active,created_at').single();
        if (updateError) throw updateError;
        saved = data as ServiceRecord;
      } else {
        const { data, error: insertError } = await supabase.from('services').insert(payload)
          .select('id,company_id,name,description,duration_minutes,price_cents,active,created_at').single();
        if (insertError) throw insertError;
        saved = data as ServiceRecord;
      }

      setServices((current) => {
        const exists = current.some((service) => service.id === saved.id);
        return exists ? current.map((service) => service.id === saved.id ? saved : service) : [saved, ...current];
      });
      setSuccess(beautyMode && selectedEnseigne
        ? `${editingId ? 'Prestation mise à jour' : 'Prestation créée'} pour ${selectedEnseigne.name}.`
        : editingId ? 'La prestation a bien été mise à jour.' : 'La prestation a bien été créée.');
      setEditingId(null);
      setForm(emptyForm);
      setSearchParams({});
    } catch (caught) {
      const message = caught instanceof Error ? caught.message : 'Une erreur inconnue est survenue.';
      setError(`${editingId ? 'Modification' : 'Création'} impossible : ${message}`);
    } finally {
      setSaving(false);
    }
  }

  async function toggleServiceStatus(service: ServiceRecord) {
    if (!organization || !canManage) return;
    const nextActive = !service.active;
    const action = nextActive ? 'réactiver' : 'désactiver';
    if (!window.confirm(`Voulez-vous ${action} la prestation « ${service.name} » ?`)) return;
    setBusyId(service.id);
    setError('');
    setSuccess('');

    try {
      if (demoMode || !supabase) {
        const stored = localStorage.getItem(`ncr-suite-demo-services-${organization.id}`);
        const allRows = stored ? JSON.parse(stored) as ServiceRecord[] : [];
        const next = allRows.map((row) => row.id === service.id ? { ...row, active: nextActive } : row);
        localStorage.setItem(`ncr-suite-demo-services-${organization.id}`, JSON.stringify(next));
      } else {
        let request = supabase.from('services').update({ active: nextActive })
          .eq('organization_id', organization.id).eq('id', service.id);
        if (beautyMode && selectedEnseigneId) request = request.eq('company_id', selectedEnseigneId);
        const { error: updateError } = await request;
        if (updateError) throw updateError;
      }
      setServices((current) => current.map((row) => row.id === service.id ? { ...row, active: nextActive } : row));
      setSuccess(nextActive ? 'La prestation est de nouveau disponible.' : 'La prestation a été désactivée.');
    } catch (caught) {
      const message = caught instanceof Error ? caught.message : 'Une erreur inconnue est survenue.';
      setError(`Mise à jour impossible : ${message}`);
    } finally {
      setBusyId(null);
    }
  }

  if (!organization) return null;

  return (
    <div className="page services-page">
      <header className="page-header">
        <div>
          <p className="eyebrow">CATALOGUE</p>
          <h1>Prestations</h1>
          <p>{beautyMode
            ? selectedEnseigne ? `Catalogue propre à l’enseigne ${selectedEnseigne.name}.` : 'Créez une enseigne pour commencer à définir ses prestations.'
            : `Définissez les services, les durées et les tarifs proposés par ${organization.name}.`}</p>
        </div>
        {canManage && <button className="primary-button" type="button" onClick={openCreateForm} disabled={beautyMode && !selectedEnseigneId}><Icon name="sparkles" size={18} />Créer une prestation</button>}
      </header>

      {beautyMode && !selectedEnseigneId && !enseigneLoading && <div className="info-message page-message" role="status">Aucune enseigne n’est encore configurée. Créez-la d’abord dans « Centre & enseignes ».</div>}
      {!canManage && <div className="info-message page-message" role="status">Votre rôle permet de consulter les prestations, mais pas de les modifier.</div>}

      {formOpen && canManage && (!beautyMode || selectedEnseigneId) && (
        <section className="panel service-form-panel" aria-labelledby="service-form-title">
          <div className="panel-header">
            <div><p className="eyebrow">{editingId ? 'MODIFICATION' : 'NOUVELLE PRESTATION'}</p><h2 id="service-form-title">{editingId ? 'Modifier la prestation' : 'Créer une prestation'}</h2>{beautyMode && selectedEnseigne && <small>Enseigne : {selectedEnseigne.name}</small>}</div>
            <button className="secondary-button compact-button" type="button" onClick={closeForm}>Fermer</button>
          </div>
          <form className="service-form" onSubmit={handleSaveService}>
            <label className="service-name-field">Nom de la prestation <span aria-hidden="true">*</span><input autoFocus required minLength={2} value={form.name} onChange={(event) => setForm((current) => ({ ...current, name: event.target.value }))} placeholder="Ex. Coupe femme" /></label>
            <label>Durée <span aria-hidden="true">*</span><select required value={form.durationMinutes} onChange={(event) => setForm((current) => ({ ...current, durationMinutes: event.target.value }))}>{[15,20,30,45,60,75,90,105,120,150,180].map((minutes) => <option key={minutes} value={minutes}>{formatDuration(minutes)}</option>)}</select></label>
            <label>Tarif TTC en euros <span aria-hidden="true">*</span><div className="price-input"><input required inputMode="decimal" value={form.price} onChange={(event) => setForm((current) => ({ ...current, price: event.target.value }))} placeholder="Ex. 35,00" /><span>€</span></div></label>
            <label className="full-field">Description<textarea value={form.description} onChange={(event) => setForm((current) => ({ ...current, description: event.target.value }))} placeholder="Décrivez brièvement la prestation et ce qu’elle comprend…" rows={4} /></label>
            <div className="form-actions full-field"><button className="secondary-button" type="button" onClick={closeForm}>Annuler</button><button className="primary-button" type="submit" disabled={saving}>{saving ? 'Enregistrement…' : editingId ? 'Enregistrer les modifications' : 'Enregistrer la prestation'}</button></div>
          </form>
        </section>
      )}

      {error && <div className="error-message page-message" role="alert">{error}</div>}
      {success && <div className="success-message page-message" role="status">{success}</div>}

      <section className="service-summary-grid" aria-label="Résumé des prestations">
        <article className="panel service-summary-card"><span>Prestations actives</span><strong>{activeCount}</strong><small>disponible{activeCount > 1 ? 's' : ''} pour la planification</small></article>
        <article className="panel service-summary-card"><span>Durée moyenne</span><strong>{activeCount > 0 ? formatDuration(Math.round(services.filter((service) => service.active).reduce((total, service) => total + service.duration_minutes, 0) / activeCount)) : '—'}</strong><small>sur les prestations actives</small></article>
        <article className="panel service-summary-card"><span>Tarif moyen</span><strong>{activeCount > 0 ? currencyFormatter.format(services.filter((service) => service.active).reduce((total, service) => total + service.price_cents, 0) / activeCount / 100) : '—'}</strong><small>sur les prestations actives</small></article>
      </section>

      <section className="panel services-list-panel">
        <div className="services-toolbar">
          <div><p className="eyebrow">CATALOGUE{beautyMode && selectedEnseigne ? ` · ${selectedEnseigne.name}` : ''}</p><h2>{services.length} prestation{services.length > 1 ? 's' : ''}</h2></div>
          <div className="services-filters"><label className="search-field"><span className="sr-only">Rechercher une prestation</span><input type="search" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Rechercher une prestation" /></label><label className="status-filter"><span className="sr-only">Filtrer les prestations par statut</span><select value={statusFilter} onChange={(event) => setStatusFilter(event.target.value as StatusFilter)}><option value="active">Actives</option><option value="inactive">Inactives</option><option value="all">Toutes</option></select></label></div>
        </div>

        {loading || enseigneLoading ? <div className="list-state">Chargement des prestations…</div> : filteredServices.length === 0 ? (
          <div className="list-state empty-service-state"><div className="empty-icon"><Icon name="sparkles" size={30} /></div><h3>{services.length === 0 ? 'Aucune prestation pour le moment' : 'Aucun résultat'}</h3><p>{services.length === 0 ? (beautyMode && selectedEnseigne ? `Aucune prestation n’est encore rattachée à ${selectedEnseigne.name}.` : 'Créez votre catalogue avant d’ajouter les collaborateurs et les rendez-vous.') : 'Modifiez votre recherche ou le filtre sélectionné.'}</p>{services.length === 0 && canManage && (!beautyMode || selectedEnseigneId) && <button className="primary-button" type="button" onClick={openCreateForm}>Créer la première prestation</button>}</div>
        ) : (
          <div className="services-grid">{filteredServices.map((service) => <article className={`service-card${service.active ? '' : ' inactive'}`} key={service.id}><div className="service-card-topline"><div className="service-card-icon"><Icon name="sparkles" size={22} /></div><span className={`status-chip ${service.active ? 'active' : 'inactive'}`}>{service.active ? 'Active' : 'Inactive'}</span></div><div className="service-card-content"><h3>{service.name}</h3><p>{service.description || 'Aucune description renseignée.'}</p></div><div className="service-card-details"><span><Icon name="calendar" size={16} />{formatDuration(service.duration_minutes)}</span><strong>{currencyFormatter.format(service.price_cents / 100)}</strong></div>{canManage && <div className="service-card-actions"><button className="secondary-button compact-button" type="button" onClick={() => openEditForm(service)}>Modifier</button><button className={`icon-text-button ${service.active ? 'danger' : ''}`} type="button" disabled={busyId === service.id} onClick={() => toggleServiceStatus(service)}>{busyId === service.id ? 'Mise à jour…' : service.active ? 'Désactiver' : 'Réactiver'}</button></div>}</article>)}</div>
        )}
      </section>
    </div>
  );
}
