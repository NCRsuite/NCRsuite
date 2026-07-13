import { FormEvent, useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Icon } from '../components/Icon';
import { useAuth } from '../contexts/AuthContext';
import { useOrganization } from '../contexts/OrganizationContext';
import { supabase } from '../lib/supabase';

interface ClientRecord {
  id: string;
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
  const [searchParams, setSearchParams] = useSearchParams();
  const [clients, setClients] = useState<ClientRecord[]>([]);
  const [form, setForm] = useState<ClientFormState>(emptyForm);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [query, setQuery] = useState('');
  const formOpen = searchParams.get('new') === '1';

  useEffect(() => {
    if (!organization) return;
    const organizationId = organization.id;
    let active = true;

    async function loadClients() {
      setLoading(true);
      setError('');

      if (demoMode || !supabase) {
        const stored = localStorage.getItem(`ncr-suite-demo-clients-${organizationId}`);
        const rows = stored ? JSON.parse(stored) as ClientRecord[] : [];
        if (active) {
          setClients(rows);
          setLoading(false);
        }
        return;
      }

      const { data, error: loadError } = await supabase
        .from('clients')
        .select('id,first_name,last_name,email,phone,notes,status,created_at')
        .eq('organization_id', organizationId)
        .neq('status', 'archived')
        .order('created_at', { ascending: false });

      if (!active) return;
      if (loadError) {
        setError(`Impossible de charger les clients : ${loadError.message}`);
      } else {
        setClients((data ?? []) as ClientRecord[]);
      }
      setLoading(false);
    }

    loadClients();
    return () => { active = false; };
  }, [organization, demoMode]);

  const filteredClients = useMemo(() => {
    const needle = query.trim().toLocaleLowerCase('fr');
    if (!needle) return clients;
    return clients.filter((client) => {
      const text = [client.first_name, client.last_name, client.email, client.phone]
        .filter(Boolean)
        .join(' ')
        .toLocaleLowerCase('fr');
      return text.includes(needle);
    });
  }, [clients, query]);

  function openForm() {
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
    if (!organization || !user) return;

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
          first_name: payload.first_name,
          last_name: payload.last_name,
          email: payload.email,
          phone: payload.phone,
          notes: payload.notes,
          status: 'active',
          created_at: new Date().toISOString()
        };
        const next = [created, ...clients];
        localStorage.setItem(`ncr-suite-demo-clients-${organization.id}`, JSON.stringify(next));
      } else {
        const { data, error: insertError } = await supabase
          .from('clients')
          .insert(payload)
          .select('id,first_name,last_name,email,phone,notes,status,created_at')
          .single();

        if (insertError) throw insertError;
        created = data as ClientRecord;
      }

      setClients((current) => [created, ...current.filter((client) => client.id !== created.id)]);
      setForm(emptyForm);
      setSuccess('Le client a bien été créé.');
      setSearchParams({});
    } catch (caught) {
      const message = caught instanceof Error ? caught.message : 'Une erreur inconnue est survenue.';
      setError(`Création impossible : ${message}`);
    } finally {
      setSaving(false);
    }
  }

  async function archiveClient(client: ClientRecord) {
    if (!organization || !window.confirm(`Archiver ${client.first_name}${client.last_name ? ` ${client.last_name}` : ''} ?`)) return;
    setError('');

    try {
      if (demoMode || !supabase) {
        const next = clients.filter((row) => row.id !== client.id);
        localStorage.setItem(`ncr-suite-demo-clients-${organization.id}`, JSON.stringify(next));
      } else {
        const { error: archiveError } = await supabase
          .from('clients')
          .update({ status: 'archived' })
          .eq('organization_id', organization.id)
          .eq('id', client.id);
        if (archiveError) throw archiveError;
      }
      setClients((current) => current.filter((row) => row.id !== client.id));
      setSuccess('Le client a été archivé.');
    } catch (caught) {
      const message = caught instanceof Error ? caught.message : 'Une erreur inconnue est survenue.';
      setError(`Archivage impossible : ${message}`);
    }
  }

  if (!organization) return null;

  return (
    <div className="page clients-page">
      <header className="page-header">
        <div>
          <p className="eyebrow">RELATION CLIENT</p>
          <h1>Clients</h1>
          <p>Créez et retrouvez les fiches clients de {organization.name}.</p>
        </div>
        <button className="primary-button" type="button" onClick={openForm}>
          <Icon name="users" size={18} />Créer un client
        </button>
      </header>

      {formOpen && (
        <section className="panel client-form-panel" aria-labelledby="new-client-title">
          <div className="panel-header">
            <div>
              <p className="eyebrow">NOUVELLE FICHE</p>
              <h2 id="new-client-title">Créer un client</h2>
            </div>
            <button className="secondary-button compact-button" type="button" onClick={closeForm}>Fermer</button>
          </div>

          <form className="client-form" onSubmit={handleCreateClient}>
            <label>
              Prénom ou nom principal <span aria-hidden="true">*</span>
              <input
                autoFocus
                required
                minLength={2}
                value={form.firstName}
                onChange={(event) => setForm((current) => ({ ...current, firstName: event.target.value }))}
                placeholder="Ex. Camille"
              />
            </label>
            <label>
              Nom de famille
              <input
                value={form.lastName}
                onChange={(event) => setForm((current) => ({ ...current, lastName: event.target.value }))}
                placeholder="Ex. Martin"
              />
            </label>
            <label>
              Téléphone
              <input
                inputMode="tel"
                value={form.phone}
                onChange={(event) => setForm((current) => ({ ...current, phone: event.target.value }))}
                placeholder="06 00 00 00 00"
              />
            </label>
            <label>
              Adresse e-mail
              <input
                type="email"
                value={form.email}
                onChange={(event) => setForm((current) => ({ ...current, email: event.target.value }))}
                placeholder="client@exemple.fr"
              />
            </label>
            <label className="full-field">
              Notes internes
              <textarea
                value={form.notes}
                onChange={(event) => setForm((current) => ({ ...current, notes: event.target.value }))}
                placeholder="Préférences, allergies, informations utiles…"
                rows={4}
              />
            </label>

            <div className="form-actions full-field">
              <button className="secondary-button" type="button" onClick={closeForm}>Annuler</button>
              <button className="primary-button" type="submit" disabled={saving}>
                {saving ? 'Création…' : 'Enregistrer le client'}
              </button>
            </div>
          </form>
        </section>
      )}

      {error && <div className="error-message page-message" role="alert">{error}</div>}
      {success && <div className="success-message page-message" role="status">{success}</div>}

      <section className="panel clients-list-panel">
        <div className="clients-toolbar">
          <div>
            <p className="eyebrow">RÉPERTOIRE</p>
            <h2>{clients.length} client{clients.length > 1 ? 's' : ''}</h2>
          </div>
          <label className="search-field">
            <span className="sr-only">Rechercher un client</span>
            <input
              type="search"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Rechercher un nom, un e-mail ou un téléphone"
            />
          </label>
        </div>

        {loading ? (
          <div className="list-state">Chargement des clients…</div>
        ) : filteredClients.length === 0 ? (
          <div className="list-state empty-client-state">
            <div className="empty-icon"><Icon name="users" size={30} /></div>
            <h3>{clients.length === 0 ? 'Aucun client pour le moment' : 'Aucun résultat'}</h3>
            <p>{clients.length === 0 ? 'Créez votre première fiche client pour commencer.' : 'Essayez une autre recherche.'}</p>
            {clients.length === 0 && <button className="primary-button" type="button" onClick={openForm}>Créer le premier client</button>}
          </div>
        ) : (
          <div className="client-table-wrap">
            <table className="client-table">
              <thead>
                <tr>
                  <th>Client</th>
                  <th>Coordonnées</th>
                  <th>Ajouté le</th>
                  <th><span className="sr-only">Actions</span></th>
                </tr>
              </thead>
              <tbody>
                {filteredClients.map((client) => (
                  <tr key={client.id}>
                    <td>
                      <div className="client-identity">
                        <span>{client.first_name.slice(0, 1).toUpperCase()}</span>
                        <div>
                          <strong>{client.first_name}{client.last_name ? ` ${client.last_name}` : ''}</strong>
                          {client.notes && <small>{client.notes}</small>}
                        </div>
                      </div>
                    </td>
                    <td>
                      <div className="client-contact">
                        <span>{client.phone || 'Téléphone non renseigné'}</span>
                        <small>{client.email || 'E-mail non renseigné'}</small>
                      </div>
                    </td>
                    <td>{new Intl.DateTimeFormat('fr-FR', { dateStyle: 'medium' }).format(new Date(client.created_at))}</td>
                    <td className="table-actions">
                      <button className="icon-text-button danger" type="button" onClick={() => archiveClient(client)}>Archiver</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}
