import { FormEvent, useEffect, useMemo, useState } from 'react';
import { Icon } from '../components/Icon';
import { useAuth } from '../contexts/AuthContext';
import { useOrganization } from '../contexts/OrganizationContext';
import { useBeautyEnseigneContext } from '../hooks/useBeautyEnseigneContext';
import { supabase } from '../lib/supabase';
import '../beautyResources.css';

type ResourceKind = 'chair' | 'cabin' | 'machine' | 'station' | 'room' | 'other';

interface BeautyResource {
  id: string;
  organization_id: string;
  company_id: string;
  site_id: string;
  name: string;
  kind: ResourceKind;
  capacity: number;
  notes: string | null;
  active: boolean;
  created_at: string;
}

interface ResourceRequirement {
  id: string;
  service_id: string;
  resource_id: string;
  quantity_required: number;
}

interface ServiceRecord {
  id: string;
  name: string;
  category_name: string | null;
  active: boolean;
}

interface ResourceForm {
  name: string;
  kind: ResourceKind;
  siteId: string;
  capacity: string;
  notes: string;
}

const kindLabels: Record<ResourceKind, string> = {
  chair: 'Fauteuil',
  cabin: 'Cabine',
  machine: 'Machine / appareil',
  station: 'Poste de travail',
  room: 'Salle / espace',
  other: 'Autre'
};

function emptyForm(siteId = ''): ResourceForm {
  return { name: '', kind: 'chair', siteId, capacity: '1', notes: '' };
}

export function BeautyResourcesPage() {
  const { organization } = useOrganization();
  const { demoMode } = useAuth();
  const { beautyMode, selectedEnseigne, selectedEnseigneId, loading: enseigneLoading } = useBeautyEnseigneContext();
  const [resources, setResources] = useState<BeautyResource[]>([]);
  const [requirements, setRequirements] = useState<ResourceRequirement[]>([]);
  const [services, setServices] = useState<ServiceRecord[]>([]);
  const [form, setForm] = useState<ResourceForm>(emptyForm());
  const [editingId, setEditingId] = useState<string | null>(null);
  const [assigningId, setAssigningId] = useState<string | null>(null);
  const [assignmentQuantities, setAssignmentQuantities] = useState<Record<string, string>>({});
  const [siteFilter, setSiteFilter] = useState('all');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const canManage = ['owner', 'admin', 'manager'].includes(organization?.role ?? 'viewer');
  const sites = selectedEnseigne?.sites ?? [];
  const defaultSiteId = sites.find((site) => site.is_primary)?.id ?? sites[0]?.id ?? '';

  async function loadData() {
    if (!organization || !beautyMode || !selectedEnseigneId) {
      setResources([]);
      setRequirements([]);
      setServices([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    setError('');

    if (demoMode || !supabase) {
      const storedResources = localStorage.getItem(`ncr-suite-demo-beauty-resources-${organization.id}`);
      const storedRequirements = localStorage.getItem(`ncr-suite-demo-beauty-resource-requirements-${organization.id}`);
      const storedServices = localStorage.getItem(`ncr-suite-demo-services-${organization.id}`);
      const allResources = storedResources ? JSON.parse(storedResources) as BeautyResource[] : [];
      const allRequirements = storedRequirements ? JSON.parse(storedRequirements) as ResourceRequirement[] : [];
      const allServices = storedServices ? JSON.parse(storedServices) as Array<ServiceRecord & { company_id?: string | null }> : [];
      const scopedResources = allResources.filter((row) => row.company_id === selectedEnseigneId);
      setResources(scopedResources);
      setRequirements(allRequirements.filter((row) => scopedResources.some((resource) => resource.id === row.resource_id)));
      setServices(allServices.filter((row) => row.company_id === selectedEnseigneId).map((row) => ({ id: row.id, name: row.name, category_name: row.category_name ?? null, active: row.active })));
      setLoading(false);
      return;
    }

    const [resourceResult, requirementResult, serviceResult] = await Promise.all([
      supabase.from('beauty_resources')
        .select('id,organization_id,company_id,site_id,name,kind,capacity,notes,active,created_at')
        .eq('organization_id', organization.id)
        .eq('company_id', selectedEnseigneId)
        .order('active', { ascending: false })
        .order('name', { ascending: true }),
      supabase.from('beauty_service_resource_requirements')
        .select('id,service_id,resource_id,quantity_required')
        .eq('organization_id', organization.id)
        .eq('company_id', selectedEnseigneId),
      supabase.from('services')
        .select('id,name,category_name,active')
        .eq('organization_id', organization.id)
        .eq('company_id', selectedEnseigneId)
        .order('active', { ascending: false })
        .order('name', { ascending: true })
    ]);

    if (resourceResult.error) setError(`Impossible de charger les ressources : ${resourceResult.error.message}`);
    else if (requirementResult.error) setError(`Impossible de charger les affectations : ${requirementResult.error.message}`);
    else if (serviceResult.error) setError(`Impossible de charger les prestations : ${serviceResult.error.message}`);
    else {
      setResources((resourceResult.data ?? []) as BeautyResource[]);
      setRequirements((requirementResult.data ?? []) as ResourceRequirement[]);
      setServices((serviceResult.data ?? []) as ServiceRecord[]);
    }
    setLoading(false);
  }

  useEffect(() => { void loadData(); }, [organization?.id, selectedEnseigneId, beautyMode, demoMode]);

  useEffect(() => {
    setEditingId(null);
    setAssigningId(null);
    setAssignmentQuantities({});
    setForm(emptyForm(defaultSiteId));
    setSiteFilter('all');
    setSuccess('');
    setError('');
  }, [selectedEnseigneId, defaultSiteId]);

  const filteredResources = useMemo(
    () => siteFilter === 'all' ? resources : resources.filter((resource) => resource.site_id === siteFilter),
    [resources, siteFilter]
  );

  const activeCount = resources.filter((resource) => resource.active).length;
  const totalCapacity = resources.filter((resource) => resource.active).reduce((sum, resource) => sum + resource.capacity, 0);
  const configuredServices = new Set(requirements.map((requirement) => requirement.service_id)).size;

  const assignmentsByResource = useMemo(() => {
    const map = new Map<string, ResourceRequirement[]>();
    requirements.forEach((requirement) => {
      const rows = map.get(requirement.resource_id) ?? [];
      rows.push(requirement);
      map.set(requirement.resource_id, rows);
    });
    return map;
  }, [requirements]);

  function openCreate() {
    if (!canManage) return;
    setEditingId('new');
    setAssigningId(null);
    setForm(emptyForm(defaultSiteId));
    setError('');
    setSuccess('');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  function openEdit(resource: BeautyResource) {
    if (!canManage) return;
    setEditingId(resource.id);
    setAssigningId(null);
    setForm({
      name: resource.name,
      kind: resource.kind,
      siteId: resource.site_id,
      capacity: String(resource.capacity),
      notes: resource.notes ?? ''
    });
    setError('');
    setSuccess('');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  function closeForm() {
    setEditingId(null);
    setForm(emptyForm(defaultSiteId));
  }

  async function saveResource(event: FormEvent) {
    event.preventDefault();
    if (!organization || !selectedEnseigneId || !canManage) return;
    const name = form.name.trim();
    const capacity = Number(form.capacity);
    if (name.length < 2) { setError('Le nom de la ressource doit contenir au moins 2 caractères.'); return; }
    if (!form.siteId) { setError('Sélectionnez un établissement.'); return; }
    if (!Number.isInteger(capacity) || capacity < 1 || capacity > 100) { setError('La capacité doit être comprise entre 1 et 100.'); return; }

    setSaving(true);
    setError('');
    setSuccess('');
    try {
      if (demoMode || !supabase) {
        const key = `ncr-suite-demo-beauty-resources-${organization.id}`;
        const stored = localStorage.getItem(key);
        const allRows = stored ? JSON.parse(stored) as BeautyResource[] : [];
        const existing = editingId && editingId !== 'new' ? allRows.find((row) => row.id === editingId) : null;
        const saved: BeautyResource = {
          id: existing?.id ?? crypto.randomUUID(),
          organization_id: organization.id,
          company_id: selectedEnseigneId,
          site_id: existing?.site_id ?? form.siteId,
          name,
          kind: form.kind,
          capacity,
          notes: form.notes.trim() || null,
          active: existing?.active ?? true,
          created_at: existing?.created_at ?? new Date().toISOString()
        };
        const next = existing ? allRows.map((row) => row.id === saved.id ? saved : row) : [saved, ...allRows];
        localStorage.setItem(key, JSON.stringify(next));
      } else if (editingId && editingId !== 'new') {
        const { error: updateError } = await supabase.from('beauty_resources').update({
          name,
          kind: form.kind,
          capacity,
          notes: form.notes.trim() || null
        }).eq('organization_id', organization.id).eq('company_id', selectedEnseigneId).eq('id', editingId);
        if (updateError) throw updateError;
      } else {
        const { error: insertError } = await supabase.from('beauty_resources').insert({
          organization_id: organization.id,
          company_id: selectedEnseigneId,
          site_id: form.siteId,
          name,
          kind: form.kind,
          capacity,
          notes: form.notes.trim() || null
        });
        if (insertError) throw insertError;
      }
      await loadData();
      setEditingId(null);
      setForm(emptyForm(defaultSiteId));
      setSuccess(editingId && editingId !== 'new' ? 'La ressource a été mise à jour.' : 'La ressource a été créée.');
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Enregistrement impossible.');
    } finally {
      setSaving(false);
    }
  }

  async function toggleResource(resource: BeautyResource) {
    if (!organization || !selectedEnseigneId || !canManage) return;
    const nextActive = !resource.active;
    if (!window.confirm(`${nextActive ? 'Réactiver' : 'Désactiver'} « ${resource.name} » ?`)) return;
    setBusyId(resource.id);
    setError('');
    setSuccess('');
    try {
      if (demoMode || !supabase) {
        const key = `ncr-suite-demo-beauty-resources-${organization.id}`;
        const stored = localStorage.getItem(key);
        const rows = stored ? JSON.parse(stored) as BeautyResource[] : [];
        localStorage.setItem(key, JSON.stringify(rows.map((row) => row.id === resource.id ? { ...row, active: nextActive } : row)));
      } else {
        const { error: updateError } = await supabase.from('beauty_resources').update({ active: nextActive })
          .eq('organization_id', organization.id).eq('company_id', selectedEnseigneId).eq('id', resource.id);
        if (updateError) throw updateError;
      }
      await loadData();
      setSuccess(nextActive ? 'La ressource est de nouveau disponible.' : 'La ressource est désactivée et bloque les prestations qui en dépendent.');
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Mise à jour impossible.');
    } finally {
      setBusyId(null);
    }
  }

  function openAssignments(resource: BeautyResource) {
    const next: Record<string, string> = {};
    (assignmentsByResource.get(resource.id) ?? []).forEach((requirement) => {
      next[requirement.service_id] = String(requirement.quantity_required);
    });
    setAssignmentQuantities(next);
    setAssigningId(resource.id);
    setEditingId(null);
    setError('');
    setSuccess('');
  }

  async function saveAssignments(event: FormEvent) {
    event.preventDefault();
    if (!organization || !selectedEnseigneId || !assigningId || !canManage) return;
    const resource = resources.find((row) => row.id === assigningId);
    if (!resource) return;

    const rows = Object.entries(assignmentQuantities).map(([serviceId, raw]) => ({
      service_id: serviceId,
      quantity_required: Number(raw)
    }));
    if (rows.some((row) => !Number.isInteger(row.quantity_required) || row.quantity_required < 1 || row.quantity_required > resource.capacity)) {
      setError(`Chaque quantité doit être comprise entre 1 et la capacité de la ressource (${resource.capacity}).`);
      return;
    }

    setSaving(true);
    setError('');
    setSuccess('');
    try {
      if (demoMode || !supabase) {
        const key = `ncr-suite-demo-beauty-resource-requirements-${organization.id}`;
        const stored = localStorage.getItem(key);
        const allRows = stored ? JSON.parse(stored) as ResourceRequirement[] : [];
        const kept = allRows.filter((row) => row.resource_id !== assigningId);
        const nextRows: ResourceRequirement[] = rows.map((row) => ({
          id: crypto.randomUUID(),
          service_id: row.service_id,
          resource_id: assigningId,
          quantity_required: row.quantity_required
        }));
        localStorage.setItem(key, JSON.stringify([...kept, ...nextRows]));
      } else {
        const { error: rpcError } = await supabase.rpc('replace_beauty_resource_requirements', {
          p_organization_id: organization.id,
          p_company_id: selectedEnseigneId,
          p_resource_id: assigningId,
          p_requirements: rows
        });
        if (rpcError) throw rpcError;
      }
      await loadData();
      setAssigningId(null);
      setAssignmentQuantities({});
      setSuccess('Les prestations liées à cette ressource ont été enregistrées.');
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Affectation impossible.');
    } finally {
      setSaving(false);
    }
  }

  if (!organization) return null;
  if (!beautyMode) return <div className="page"><div className="info-message page-message">Les ressources réservables sont disponibles dans l’environnement Coiffure & beauté Métier.</div></div>;

  const assigningResource = resources.find((row) => row.id === assigningId) ?? null;

  return <div className="page beauty-resources-page">
    <header className="page-header">
      <div><p className="eyebrow">GESTION AVANCÉE</p><h1>Ressources</h1><p>{selectedEnseigne ? `Gérez les cabines, fauteuils, postes et machines de ${selectedEnseigne.name}.` : 'Sélectionnez une enseigne pour gérer ses ressources.'}</p></div>
      {canManage && <button className="primary-button" type="button" onClick={openCreate} disabled={!selectedEnseigneId || sites.length === 0}><Icon name="plus" size={18}/>Nouvelle ressource</button>}
    </header>

    {!selectedEnseigneId && !enseigneLoading && <div className="info-message page-message">Aucune enseigne Beauty sélectionnée.</div>}
    {selectedEnseigneId && sites.length === 0 && <div className="info-message page-message">Ajoutez d’abord un établissement à cette enseigne.</div>}
    {!canManage && <div className="info-message page-message">Votre rôle permet de consulter les ressources, mais pas de les modifier.</div>}
    {error && <div className="error-message page-message" role="alert">{error}</div>}
    {success && <div className="success-message page-message" role="status">{success}</div>}

    {editingId && canManage && <section className="panel beauty-resource-form-panel">
      <div className="panel-header"><div><p className="eyebrow">{editingId === 'new' ? 'NOUVELLE RESSOURCE' : 'MODIFICATION'}</p><h2>{editingId === 'new' ? 'Créer une ressource' : 'Modifier la ressource'}</h2><small>La capacité correspond au nombre d’utilisations simultanées possibles.</small></div><button className="secondary-button compact-button" type="button" onClick={closeForm}>Fermer</button></div>
      <form className="beauty-resource-form" onSubmit={saveResource}>
        <label>Nom <input required minLength={2} value={form.name} onChange={(event) => setForm((current) => ({ ...current, name: event.target.value }))} placeholder="Ex. Cabine 1, Laser, Fauteuils coiffure…" /></label>
        <label>Type <select value={form.kind} onChange={(event) => setForm((current) => ({ ...current, kind: event.target.value as ResourceKind }))}>{Object.entries(kindLabels).map(([value,label]) => <option key={value} value={value}>{label}</option>)}</select></label>
        <label>Établissement <select disabled={editingId !== 'new'} value={form.siteId} onChange={(event) => setForm((current) => ({ ...current, siteId: event.target.value }))}><option value="">Sélectionner</option>{sites.map((site) => <option key={site.id} value={site.id}>{site.name}</option>)}</select>{editingId !== 'new' && <small>Pour déplacer physiquement une ressource, recréez-la dans le bon établissement afin de préserver ses affectations.</small>}</label>
        <label>Capacité simultanée <input type="number" min={1} max={100} inputMode="numeric" value={form.capacity} onChange={(event) => setForm((current) => ({ ...current, capacity: event.target.value }))}/><small>Ex. 4 si « Fauteuils coiffure » représente 4 postes identiques.</small></label>
        <label className="full-field">Notes<textarea rows={3} maxLength={1000} value={form.notes} onChange={(event) => setForm((current) => ({ ...current, notes: event.target.value }))} placeholder="Référence machine, emplacement, informations internes…"/></label>
        <div className="form-actions full-field"><button type="button" className="secondary-button" onClick={closeForm}>Annuler</button><button type="submit" className="primary-button" disabled={saving}>{saving ? 'Enregistrement…' : 'Enregistrer'}</button></div>
      </form>
    </section>}

    {assigningResource && canManage && <section className="panel beauty-resource-assignment-panel">
      <div className="panel-header"><div><p className="eyebrow">PRESTATIONS LIÉES</p><h2>{assigningResource.name}</h2><small>Quand une prestation cochée est réservée, NCR Suite vérifie automatiquement la capacité de cette ressource.</small></div><button className="secondary-button compact-button" type="button" onClick={() => setAssigningId(null)}>Fermer</button></div>
      <form onSubmit={saveAssignments}>
        <div className="beauty-resource-service-list">{services.filter((service) => service.active).map((service) => {
          const checked = Object.prototype.hasOwnProperty.call(assignmentQuantities, service.id);
          return <label className={checked ? 'active' : ''} key={service.id}>
            <input type="checkbox" checked={checked} onChange={(event) => setAssignmentQuantities((current) => {
              const next = { ...current };
              if (event.target.checked) next[service.id] = '1'; else delete next[service.id];
              return next;
            })}/>
            <span><strong>{service.name}</strong><small>{service.category_name || 'Prestation'}</small></span>
            {checked && <span className="beauty-resource-quantity">Qté <input type="number" min={1} max={assigningResource.capacity} value={assignmentQuantities[service.id]} onChange={(event) => setAssignmentQuantities((current) => ({ ...current, [service.id]: event.target.value }))}/></span>}
          </label>;
        })}</div>
        {services.filter((service) => service.active).length === 0 && <div className="list-state">Aucune prestation active à associer.</div>}
        <div className="form-actions"><button type="button" className="secondary-button" onClick={() => setAssigningId(null)}>Annuler</button><button type="submit" className="primary-button" disabled={saving}>{saving ? 'Enregistrement…' : 'Enregistrer les affectations'}</button></div>
      </form>
    </section>}

    <section className="service-summary-grid beauty-resource-summary">
      <article className="panel service-summary-card"><span>Ressources actives</span><strong>{activeCount}</strong><small>dans cette enseigne</small></article>
      <article className="panel service-summary-card"><span>Capacité totale</span><strong>{totalCapacity}</strong><small>utilisations simultanées</small></article>
      <article className="panel service-summary-card"><span>Prestations configurées</span><strong>{configuredServices}</strong><small>avec au moins une ressource</small></article>
      <article className="panel service-summary-card"><span>Établissements</span><strong>{sites.length}</strong><small>pour cette enseigne</small></article>
    </section>

    <section className="panel beauty-resources-list-panel">
      <div className="beauty-resources-toolbar"><div><p className="eyebrow">RESSOURCES{selectedEnseigne ? ` · ${selectedEnseigne.name}` : ''}</p><h2>{resources.length} ressource{resources.length > 1 ? 's' : ''}</h2></div><label><span className="sr-only">Filtrer par établissement</span><select value={siteFilter} onChange={(event) => setSiteFilter(event.target.value)}><option value="all">Tous les établissements</option>{sites.map((site) => <option key={site.id} value={site.id}>{site.name}</option>)}</select></label></div>
      {loading || enseigneLoading ? <div className="list-state">Chargement des ressources…</div> : filteredResources.length === 0 ? <div className="list-state empty-service-state"><div className="empty-icon"><Icon name="tool" size={30}/></div><h3>Aucune ressource</h3><p>Ajoutez vos cabines, fauteuils, machines ou postes pour les intégrer automatiquement à la disponibilité des rendez-vous.</p>{canManage && sites.length > 0 && <button className="primary-button" type="button" onClick={openCreate}>Créer la première ressource</button>}</div> : <div className="beauty-resources-grid">{filteredResources.map((resource) => {
        const site = sites.find((row) => row.id === resource.site_id);
        const resourceRequirements = assignmentsByResource.get(resource.id) ?? [];
        const serviceNames = resourceRequirements.map((requirement) => services.find((service) => service.id === requirement.service_id)?.name).filter(Boolean) as string[];
        return <article className={`beauty-resource-card${resource.active ? '' : ' inactive'}`} key={resource.id}>
          <div className="beauty-resource-card-head"><span className="beauty-resource-card-icon"><Icon name={resource.kind === 'machine' ? 'tool' : resource.kind === 'room' || resource.kind === 'cabin' ? 'building' : 'briefcase'} size={21}/></span><div><span>{kindLabels[resource.kind]}</span><h3>{resource.name}</h3></div><em className={resource.active ? 'active' : 'inactive'}>{resource.active ? 'Active' : 'Inactive'}</em></div>
          <div className="beauty-resource-meta"><span><Icon name="map" size={14}/>{site?.name || 'Établissement'}</span><span><Icon name="users" size={14}/>Capacité {resource.capacity}</span></div>
          <div className="beauty-resource-services"><small>Prestations liées</small>{serviceNames.length > 0 ? <div>{serviceNames.slice(0,4).map((name) => <span key={name}>{name}</span>)}{serviceNames.length > 4 && <span>+{serviceNames.length-4}</span>}</div> : <p>Aucune prestation n’utilise encore cette ressource.</p>}</div>
          {resource.notes && <p className="beauty-resource-notes">{resource.notes}</p>}
          {canManage && <div className="beauty-resource-actions"><button className="secondary-button compact-button" type="button" onClick={() => openAssignments(resource)}>Prestations</button><button className="secondary-button compact-button" type="button" onClick={() => openEdit(resource)}>Modifier</button><button className={resource.active ? 'danger-text-button' : 'icon-text-button'} type="button" disabled={busyId === resource.id} onClick={() => void toggleResource(resource)}>{busyId === resource.id ? 'Mise à jour…' : resource.active ? 'Désactiver' : 'Réactiver'}</button></div>}
        </article>;
      })}</div>}
    </section>
  </div>;
}
