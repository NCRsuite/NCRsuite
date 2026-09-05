import { FormEvent, useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { BeautyClientCrmPanel } from '../components/BeautyClientCrmPanel';
import { Icon } from '../components/Icon';
import { useAuth } from '../contexts/AuthContext';
import { useOrganization } from '../contexts/OrganizationContext';
import { useBeautyEnseigneContext } from '../hooks/useBeautyEnseigneContext';
import { supabase } from '../lib/supabase';

interface ClientRecord {
  id: string;
  company_id?: string | null;
  first_name: string;
  last_name: string | null;
  email: string | null;
  phone: string | null;
  notes: string | null;
  status: 'active' | 'inactive' | 'archived';
  created_at: string;
}

interface ClientFormState {
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  notes: string;
}

const activityLabels = {
  general: 'Généraliste',
  hair: 'Coiffure',
  barber: 'Barber',
  nails: 'Onglerie',
  lashes: 'Cils',
  aesthetics: 'Esthétique'
} as const;

type ClientProfileActivity = keyof typeof activityLabels;

const CLIENT_PAGE_SIZE = 100;

const emptyForm: ClientFormState = {
  firstName: '',
  lastName: '',
  email: '',
  phone: '',
  notes: ''
};

function normalizeNullable(value: string) {
  const normalized = value.trim();
  return normalized.length > 0 ? normalized : null;
}

export function ClientsPage() {
  const { organization } = useOrganization();
  const { user, demoMode } = useAuth();
  const { beautyMode, selectedEnseigne, selectedEnseigneId, loading: enseigneLoading } = useBeautyEnseigneContext();
  const [searchParams, setSearchParams] = useSearchParams();
  const [clients, setClients] = useState<ClientRecord[]>([]);
  const [form, setForm] = useState<ClientFormState>(emptyForm);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [query, setQuery] = useState('');
  const [serverQuery, setServerQuery] = useState('');
  const [totalClients, setTotalClients] = useState(0);
  const [loadingMoreClients, setLoadingMoreClients] = useState(false);
  const [selectedClient, setSelectedClient] = useState<ClientRecord | null>(null);
  const [savingActivity, setSavingActivity] = useState(false);
  const formOpen = searchParams.get('new') === '1';
  const canManage = ['owner', 'admin', 'manager'].includes(organization?.role ?? 'viewer');

  useEffect(() => {
    if (!beautyMode || demoMode) {
      setServerQuery('');
      return;
    }
    const timeout = window.setTimeout(() => setServerQuery(query.trim()), query.trim() ? 280 : 0);
    return () => window.clearTimeout(timeout);
  }, [query, beautyMode, demoMode]);

  useEffect(() => {
    if (!organization) return;
    const organizationId = organization.id;
    let active = true;

    async function loadClients() {
      if (beautyMode && enseigneLoading) return;
      setLoading(true);
      setError('');

      if (beautyMode && !selectedEnseigneId) {
        if (active) {
          setClients([]);
          setTotalClients(0);
          setLoading(false);
        }
        return;
      }

      if (demoMode || !supabase) {
        const stored = localStorage.getItem(`ncr-suite-demo-clients-${organizationId}`);
        const rows = stored ? JSON.parse(stored) as ClientRecord[] : [];
        const scoped = beautyMode ? rows.filter((row) => row.company_id === selectedEnseigneId) : rows;
        if (active) {
          setClients(scoped);
          setTotalClients(scoped.length);
          setLoading(false);
        }
        return;
      }

      if (beautyMode && selectedEnseigneId) {
        const { data, error: loadError } = await supabase.rpc('beauty_client_directory', {
          p_organization_id: organizationId,
          p_company_id: selectedEnseigneId,
          p_search: serverQuery || null,
          p_limit: CLIENT_PAGE_SIZE,
          p_offset: 0,
          p_active_only: false
        });
        if (!active) return;
        if (loadError) {
          setError(`Impossible de charger les clients : ${loadError.message}`);
          setClients([]);
          setTotalClients(0);
        } else {
          const payload = (data ?? { total: 0, items: [] }) as { total: number; items: ClientRecord[] };
          setClients(Array.isArray(payload.items) ? payload.items : []);
          setTotalClients(Number(payload.total ?? 0));
        }
        setLoading(false);
        return;
      }

      const { data, error: loadError } = await supabase
        .from('clients')
        .select('id,company_id,first_name,last_name,email,phone,notes,status,created_at')
        .eq('organization_id', organizationId)
        .neq('status', 'archived')
        .order('created_at', { ascending: false });

      if (!active) return;
      if (loadError) setError(`Impossible de charger les clients : ${loadError.message}`);
      else {
        const rows = (data ?? []) as ClientRecord[];
        setClients(rows);
        setTotalClients(rows.length);
      }
      setLoading(false);
    }

    void loadClients();
    return () => { active = false; };
  }, [organization?.id, demoMode, beautyMode, selectedEnseigneId, enseigneLoading, serverQuery]);

  useEffect(() => {
    setSearchParams({});
    setForm(emptyForm);
    setQuery('');
    setServerQuery('');
    setTotalClients(0);
    setSuccess('');
    setSelectedClient(null);
  }, [selectedEnseigneId]);

  const filteredClients = beautyMode && !demoMode
    ? clients
    : (() => {
        const needle = query.trim().toLocaleLowerCase('fr');
        if (!needle) return clients;
        return clients.filter((client) => {
          const text = [client.first_name, client.last_name, client.email, client.phone]
            .filter(Boolean).join(' ').toLocaleLowerCase('fr');
          return text.includes(needle);
        });
      })();

  async function loadMoreBeautyClients() {
    if (!organization || !selectedEnseigneId || !beautyMode || demoMode || !supabase || loadingMoreClients) return;
    setLoadingMoreClients(true);
    setError('');
    const { data, error: loadError } = await supabase.rpc('beauty_client_directory', {
      p_organization_id: organization.id,
      p_company_id: selectedEnseigneId,
      p_search: serverQuery || null,
      p_limit: CLIENT_PAGE_SIZE,
      p_offset: clients.length,
      p_active_only: false
    });
    if (loadError) {
      setError(`Impossible de charger la suite : ${loadError.message}`);
    } else {
      const payload = (data ?? { total: 0, items: [] }) as { total: number; items: ClientRecord[] };
      const next = Array.isArray(payload.items) ? payload.items : [];
      setClients((current) => {
        const seen = new Set(current.map((client) => client.id));
        return [...current, ...next.filter((client) => !seen.has(client.id))];
      });
      setTotalClients(Number(payload.total ?? 0));
    }
    setLoadingMoreClients(false);
  }

  function openForm() {
    if (!canManage || (beautyMode && !selectedEnseigneId)) return;
    setError('');
    setSuccess('');
    setSearchParams({ new: '1' });
  }

  function closeForm() {
    setForm(emptyForm);
    setError('');
    setSearchParams({});
  }

  async function handleCreateClient(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!organization || !user || !canManage) return;
    if (beautyMode && !selectedEnseigneId) {
      setError('Créez ou sélectionnez d’abord une enseigne.');
      return;
    }

    const firstName = form.firstName.trim();
    if (firstName.length < 2) {
      setError('Le prénom ou le nom du client doit contenir au moins 2 caractères.');
      return;
    }

    setSaving(true);
    setError('');
    setSuccess('');

    const payload = {
      organization_id: organization.id,
      ...(beautyMode ? { company_id: selectedEnseigneId } : {}),
      first_name: firstName,
      last_name: normalizeNullable(form.lastName),
      email: normalizeNullable(form.email)?.toLowerCase() ?? null,
      phone: normalizeNullable(form.phone),
      notes: normalizeNullable(form.notes),
      created_by: user.id
    };

    try {
      let created: ClientRecord;

      if (demoMode || !supabase) {
        created = {
          id: crypto.randomUUID(),
          company_id: beautyMode ? selectedEnseigneId : null,
          first_name: payload.first_name,
          last_name: payload.last_name,
          email: payload.email,
          phone: payload.phone,
          notes: payload.notes,
          status: 'active',
          created_at: new Date().toISOString()
        };
        const stored = localStorage.getItem(`ncr-suite-demo-clients-${organization.id}`);
        const allRows = stored ? JSON.parse(stored) as ClientRecord[] : [];
        localStorage.setItem(`ncr-suite-demo-clients-${organization.id}`, JSON.stringify([created, ...allRows]));
      } else {
        const { data, error: insertError } = await supabase
          .from('clients')
          .insert(payload)
          .select('id,company_id,first_name,last_name,email,phone,notes,status,created_at')
          .single();
        if (insertError) throw insertError;
        created = data as ClientRecord;
      }

      setClients((current) => [created, ...current.filter((client) => client.id !== created.id)]);
      if (beautyMode && !serverQuery) setTotalClients((current) => current + 1);
      setForm(emptyForm);
      setSuccess(beautyMode && selectedEnseigne ? `Client ajouté à ${selectedEnseigne.name}.` : 'Le client a bien été créé.');
      setSearchParams({});
    } catch (caught) {
      const message = caught instanceof Error ? caught.message : 'Une erreur inconnue est survenue.';
      setError(`Création impossible : ${message}`);
    } finally {
      setSaving(false);
    }
  }

  async function updateClientProfileActivity(activity: ClientProfileActivity) {
    if (!organization || !selectedEnseigneId || !supabase || !canManage) return;
    setSavingActivity(true);
    setError('');
    setSuccess('');
    const { error: updateError } = await supabase.rpc('metier_update_company_client_profile_activity', {
      p_organization_id: organization.id,
      p_company_id: selectedEnseigneId,
      p_activity: activity
    });
    if (updateError) setError(updateError.message);
    else {
      setSuccess(`Profil métier : ${activityLabels[activity]}.`);
      window.dispatchEvent(new CustomEvent('ncr:metier-structure-changed'));
    }
    setSavingActivity(false);
  }

  async function archiveClient(client: ClientRecord) {
    if (!organization || !canManage || !window.confirm(`Archiver ${client.first_name}${client.last_name ? ` ${client.last_name}` : ''} ?`)) return;
    setError('');

    try {
      if (demoMode || !supabase) {
        const stored = localStorage.getItem(`ncr-suite-demo-clients-${organization.id}`);
        const allRows = stored ? JSON.parse(stored) as ClientRecord[] : [];
        const next = allRows.filter((row) => row.id !== client.id);
        localStorage.setItem(`ncr-suite-demo-clients-${organization.id}`, JSON.stringify(next));
      } else {
        let request = supabase.from('clients').update({ status: 'archived' })
          .eq('organization_id', organization.id).eq('id', client.id);
        if (beautyMode && selectedEnseigneId) request = request.eq('company_id', selectedEnseigneId);
        const { error: archiveError } = await request;
        if (archiveError) throw archiveError;
      }
      setClients((current) => current.filter((row) => row.id !== client.id));
      if (beautyMode) setTotalClients((current) => Math.max(0, current - 1));
      if (selectedClient?.id === client.id) setSelectedClient(null);
      setSuccess('Le client a été archivé.');
    } catch (caught) {
      const message = caught instanceof Error ? caught.message : 'Une erreur inconnue est survenue.';
      setError(`Archivage impossible : ${message}`);
    }
  }

  if (!organization) return null;
  const scopeLabel = beautyMode ? selectedEnseigne?.name : organization.name;

  return (
    <div className="page clients-page">
      <header className="page-header">
        <div>
          <p className="eyebrow">RELATION CLIENT</p>
          <h1>Clients</h1>
          <p>{beautyMode
            ? selectedEnseigne ? `Répertoire client propre à l’enseigne ${selectedEnseigne.name}.` : 'Créez une enseigne pour commencer à constituer son fichier clients.'
            : `Créez et retrouvez les fiches clients de ${organization.name}.`}</p>
        </div>
        <div className="client-header-actions" style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          {beautyMode && canManage && selectedEnseigneId && <Link className="secondary-button" to="/crm"><Icon name="chart" size={17}/> CRM & segments</Link>}
          {beautyMode && canManage && selectedEnseigneId && <Link className="secondary-button" to="/donnees-rgpd"><Icon name="shield" size={17}/> Données & RGPD</Link>}
          {canManage && (
            <button className="primary-button" type="button" onClick={openForm} disabled={beautyMode && !selectedEnseigneId}>
              <Icon name="users" size={18} />Créer un client
            </button>
          )}
        </div>
      </header>

      {beautyMode && !selectedEnseigneId && !enseigneLoading && (
        <div className="info-message page-message" role="status">
          Aucune enseigne n’est encore configurée dans ce centre. Créez d’abord une enseigne dans « Centre & enseignes ».
        </div>
      )}

      {formOpen && canManage && (!beautyMode || selectedEnseigneId) && (
        <section className="panel client-form-panel" aria-labelledby="new-client-title">
          <div className="panel-header">
            <div><p className="eyebrow">NOUVELLE FICHE</p><h2 id="new-client-title">Créer un client</h2>{beautyMode && selectedEnseigne && <small>Enseigne : {selectedEnseigne.name}</small>}</div>
            <button className="secondary-button compact-button" type="button" onClick={closeForm}>Fermer</button>
          </div>

          <form className="client-form" onSubmit={handleCreateClient}>
            <label>Prénom ou nom principal <span aria-hidden="true">*</span><input autoFocus required minLength={2} value={form.firstName} onChange={(event) => setForm((current) => ({ ...current, firstName: event.target.value }))} placeholder="Ex. Camille" /></label>
            <label>Nom de famille<input value={form.lastName} onChange={(event) => setForm((current) => ({ ...current, lastName: event.target.value }))} placeholder="Ex. Martin" /></label>
            <label>Téléphone<input inputMode="tel" value={form.phone} onChange={(event) => setForm((current) => ({ ...current, phone: event.target.value }))} placeholder="06 00 00 00 00" /></label>
            <label>Adresse e-mail<input type="email" value={form.email} onChange={(event) => setForm((current) => ({ ...current, email: event.target.value }))} placeholder="client@exemple.fr" /></label>
            <label className="full-field">Notes internes<textarea value={form.notes} onChange={(event) => setForm((current) => ({ ...current, notes: event.target.value }))} placeholder="Préférences, allergies, informations utiles…" rows={4} /></label>
            <div className="form-actions full-field"><button className="secondary-button" type="button" onClick={closeForm}>Annuler</button><button className="primary-button" type="submit" disabled={saving}>{saving ? 'Création…' : 'Enregistrer le client'}</button></div>
          </form>
        </section>
      )}

      {error && <div className="error-message page-message" role="alert">{error}</div>}
      {success && <div className="success-message page-message" role="status">{success}</div>}

      <section className="panel clients-list-panel">
        <div className="clients-toolbar">
          <div><p className="eyebrow">RÉPERTOIRE{scopeLabel ? ` · ${scopeLabel}` : ''}</p><h2>{beautyMode && !demoMode ? totalClients : clients.length} client{(beautyMode && !demoMode ? totalClients : clients.length) > 1 ? 's' : ''}</h2>{beautyMode && !demoMode && totalClients > clients.length && <small>{clients.length} fiche{clients.length > 1 ? 's' : ''} chargée{clients.length > 1 ? 's' : ''}</small>}</div>
          <div className="beauty-clients-toolbar-actions">
            {beautyMode && selectedEnseigne && <label className="beauty-client-activity-picker"><span>Profil métier</span><select value={selectedEnseigne.client_profile_activity ?? 'general'} disabled={!canManage || savingActivity} onChange={(event) => void updateClientProfileActivity(event.target.value as ClientProfileActivity)}>{Object.entries(activityLabels).map(([value,label]) => <option key={value} value={value}>{label}</option>)}</select></label>}
            <label className="search-field"><span className="sr-only">Rechercher un client</span><input type="search" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Rechercher un nom, un e-mail ou un téléphone" /></label>
          </div>
        </div>

        {loading || enseigneLoading ? (
          <div className="list-state">Chargement des clients…</div>
        ) : filteredClients.length === 0 ? (
          <div className="list-state empty-client-state">
            <div className="empty-icon"><Icon name="users" size={30} /></div>
            <h3>{(beautyMode && !demoMode ? totalClients : clients.length) === 0 && !query.trim() ? 'Aucun client pour le moment' : 'Aucun résultat'}</h3>
            <p>{(beautyMode && !demoMode ? totalClients : clients.length) === 0 && !query.trim() ? (beautyMode && selectedEnseigne ? `Aucun client n’est encore rattaché à ${selectedEnseigne.name}.` : 'Créez votre première fiche client pour commencer.') : 'Essayez une autre recherche.'}</p>
            {(beautyMode && !demoMode ? totalClients : clients.length) === 0 && !query.trim() && canManage && (!beautyMode || selectedEnseigneId) && <button className="primary-button" type="button" onClick={openForm}>Créer le premier client</button>}
          </div>
        ) : (
          <div className="client-table-wrap">
            <table className="client-table">
              <thead><tr><th>Client</th><th>Coordonnées</th><th>Ajouté le</th><th><span className="sr-only">Actions</span></th></tr></thead>
              <tbody>
                {filteredClients.map((client) => (
                  <tr key={client.id}>
                    <td data-label="Client"><div className="client-identity"><span>{client.first_name.slice(0, 1).toUpperCase()}</span><div><strong>{client.first_name}{client.last_name ? ` ${client.last_name}` : ''}</strong>{client.notes && <small>{client.notes}</small>}</div></div></td>
                    <td data-label="Coordonnées"><div className="client-contact"><span>{client.phone || 'Téléphone non renseigné'}</span><small>{client.email || 'E-mail non renseigné'}</small></div></td>
                    <td data-label="Ajouté le">{new Intl.DateTimeFormat('fr-FR', { dateStyle: 'medium' }).format(new Date(client.created_at))}</td>
                    <td className="table-actions" data-label="Actions"><div className="beauty-client-row-actions">{beautyMode && !demoMode && selectedEnseigneId && user && <button className="icon-text-button beauty-client-crm-open" type="button" onClick={() => setSelectedClient(client)}><Icon name="sparkles" size={14}/> Fiche client pro</button>}{canManage && <button className="icon-text-button danger" type="button" onClick={() => archiveClient(client)}>Archiver</button>}</div></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        {beautyMode && !demoMode && clients.length < totalClients && <div className="beauty-clients-load-more">
          <button className="secondary-button" type="button" disabled={loadingMoreClients} onClick={() => void loadMoreBeautyClients()}>
            {loadingMoreClients ? 'Chargement…' : `Charger ${Math.min(CLIENT_PAGE_SIZE, totalClients - clients.length)} cliente${Math.min(CLIENT_PAGE_SIZE, totalClients - clients.length) > 1 ? 's' : ''} de plus`}
          </button>
        </div>}
      </section>

      {beautyMode && selectedClient && selectedEnseigneId && user && (
        <BeautyClientCrmPanel
          organizationId={organization.id}
          companyId={selectedEnseigneId}
          client={selectedClient}
          userId={user.id}
          canManage={canManage}
          publicSlug={selectedEnseigne?.public_slug}
          onClose={() => setSelectedClient(null)}
        />
      )}
    </div>
  );
}
