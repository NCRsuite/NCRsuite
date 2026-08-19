import { useEffect, useMemo, useState } from 'react';
import { businessPacks, businessTypeOptions } from '../config/businessPacks';
import { supabase } from '../lib/supabase';
import type { BusinessType } from '../types';
import { Icon } from './Icon';

type DistributedAccessType =
  | 'training_trainee'
  | 'training_trainer'
  | 'training_client'
  | 'security_client'
  | 'cleaning_client'
  | 'coiffure_client'
  | 'security_agent'
  | 'cleaning_agent'
  | 'restaurant_employee'
  | 'coiffure_staff';

interface DistributedAccess {
  access_type: DistributedAccessType;
  access_id: string;
  organization_id: string;
  organization_name: string;
  business_type: BusinessType;
  access_label: string;
  display_name: string;
  email: string | null;
  user_id: string;
  status: string;
  created_at: string;
  last_seen_at: string | null;
}

function dateTimeLabel(value: string | null) {
  if (!value) return 'Jamais';
  return new Intl.DateTimeFormat('fr-FR', { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(value));
}

function confirmationValue(access: DistributedAccess) {
  return (access.email || access.display_name).trim();
}

export function AdminDistributedAccessPanel() {
  const [accesses, setAccesses] = useState<DistributedAccess[]>([]);
  const [selected, setSelected] = useState<DistributedAccess | null>(null);
  const [search, setSearch] = useState('');
  const [domainFilter, setDomainFilter] = useState<'all' | BusinessType>('all');
  const [typeFilter, setTypeFilter] = useState('all');
  const [confirmation, setConfirmation] = useState('');
  const [loading, setLoading] = useState(true);
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');

  async function load(preserveSelection = true) {
    if (!supabase) return;
    setLoading(true);
    setError('');
    const { data, error: requestError } = await supabase.rpc('admin_list_distributed_accesses');
    if (requestError) {
      setAccesses([]);
      setSelected(null);
      setError(requestError.message);
    } else {
      const rows = (Array.isArray(data) ? data : []) as DistributedAccess[];
      setAccesses(rows);
      if (preserveSelection && selected) {
        const nextSelected = rows.find((row) => row.access_type === selected.access_type && row.access_id === selected.access_id) ?? null;
        setSelected(nextSelected);
        if (!nextSelected) setConfirmation('');
      }
    }
    setLoading(false);
  }

  useEffect(() => {
    void load(false);
  }, []);

  const accessTypes = useMemo(() => {
    const labels = new Map<string, string>();
    for (const access of accesses) labels.set(access.access_type, access.access_label);
    return Array.from(labels.entries()).sort((a, b) => a[1].localeCompare(b[1], 'fr'));
  }, [accesses]);

  const visibleAccesses = useMemo(() => {
    const needle = search.trim().toLocaleLowerCase('fr-FR');
    return accesses.filter((access) => {
      if (domainFilter !== 'all' && access.business_type !== domainFilter) return false;
      if (typeFilter !== 'all' && access.access_type !== typeFilter) return false;
      if (!needle) return true;
      return [access.organization_name, access.display_name, access.email ?? '', access.access_label]
        .some((value) => value.toLocaleLowerCase('fr-FR').includes(needle));
    });
  }, [accesses, domainFilter, typeFilter, search]);

  function selectAccess(access: DistributedAccess) {
    setSelected(access);
    setConfirmation('');
    setError('');
    setMessage('');
  }

  async function deleteSelectedAccess() {
    if (!supabase || !selected || deleting) return;
    if (confirmation.trim().toLocaleLowerCase('fr-FR') !== confirmationValue(selected).toLocaleLowerCase('fr-FR')) {
      setError(`Saisis exactement « ${confirmationValue(selected)} » pour confirmer.`);
      return;
    }

    setDeleting(true);
    setError('');
    setMessage('');
    const deleted = selected;
    const { data, error: requestError } = await supabase.rpc('admin_delete_distributed_access', {
      p_access_type: selected.access_type,
      p_access_id: selected.access_id
    });

    if (requestError) {
      setError(requestError.message);
      setDeleting(false);
      return;
    }

    if (!(data as { deleted?: boolean } | null)?.deleted) {
      setError('La suppression de l’accès n’a pas été confirmée par NCR Suite.');
      setDeleting(false);
      return;
    }

    setSelected(null);
    setConfirmation('');
    setMessage(`L’accès ${deleted.access_label.toLocaleLowerCase('fr-FR')} de ${deleted.display_name} a été supprimé. La fiche métier et son historique sont conservés.`);
    await load(false);
    setDeleting(false);
  }

  return (
    <div className="admin-access-page">
      <section className="admin-section-heading">
        <div>
          <p className="eyebrow">ACCÈS CRÉÉS PAR LES ENTREPRISES</p>
          <h1>Accès distribués</h1>
          <p>Supprime un droit de connexion secondaire sans toucher à l’entreprise, à l’abonnement ni aux données métier associées.</p>
        </div>
        <div className="admin-heading-stats">
          <span><small>Accès actifs</small><strong>{accesses.length}</strong></span>
        </div>
      </section>

      {error && <div className="error-message" role="alert">{error}</div>}
      {message && <div className="success-message" role="status">{message}</div>}
      <div className="info-message">
        Les comptes propriétaires et administrateurs d’entreprise ne sont jamais proposés ici. La suppression retire uniquement l’accès ciblé ; la fiche métier, les documents et l’historique restent conservés.
      </div>

      <section className="admin-access-layout">
        <article className="panel admin-access-list-panel">
          <div className="admin-access-filters">
            <label><Icon name="search" size={16} /><input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Entreprise, nom ou e-mail" /></label>
            <select value={domainFilter} onChange={(event) => setDomainFilter(event.target.value as 'all' | BusinessType)} aria-label="Filtrer par métier">
              <option value="all">Tous les métiers</option>
              {businessTypeOptions.map((domain) => <option key={domain.id} value={domain.id}>{domain.label}</option>)}
            </select>
            <select value={typeFilter} onChange={(event) => setTypeFilter(event.target.value)} aria-label="Filtrer par type d’accès">
              <option value="all">Tous les accès</option>
              {accessTypes.map(([value, label]) => <option key={value} value={value}>{label}</option>)}
            </select>
            <button type="button" className="icon-button" onClick={() => void load(true)} disabled={loading} aria-label="Actualiser les accès" title="Actualiser">
              <Icon name="refresh" size={17} />
            </button>
          </div>

          <div className="admin-access-list">
            {loading && <div className="admin-empty-state">Chargement des accès distribués…</div>}
            {!loading && visibleAccesses.length === 0 && (
              <div className="admin-positive-empty"><Icon name="check" size={24} /><div><strong>Aucun accès à afficher</strong><small>Aucun accès actif ne correspond aux filtres.</small></div></div>
            )}
            {!loading && visibleAccesses.map((access) => (
              <button
                key={`${access.access_type}:${access.access_id}`}
                type="button"
                className={selected?.access_type === access.access_type && selected?.access_id === access.access_id ? 'selected' : ''}
                onClick={() => selectAccess(access)}
              >
                <span className="admin-access-business-icon"><Icon name={businessPacks[access.business_type].icon} size={18} /></span>
                <span className="admin-access-copy">
                  <small>{access.organization_name} · {access.access_label}</small>
                  <strong>{access.display_name || access.email || 'Accès sans nom'}</strong>
                  <em>{access.email || 'Aucun e-mail renseigné'}</em>
                </span>
                <span className="admin-access-meta">
                  <span className="admin-access-status approved">Actif</span>
                  <time>{access.last_seen_at ? `Vu ${dateTimeLabel(access.last_seen_at)}` : 'Jamais connecté'}</time>
                </span>
                <Icon name="chevronRight" size={17} />
              </button>
            ))}
          </div>
        </article>

        <aside className="panel admin-access-editor">
          {!selected ? (
            <div className="admin-editor-empty">
              <span><Icon name="lock" size={28} /></span>
              <h2>Sélectionne un accès</h2>
              <p>Tu pourras vérifier l’entreprise et le type de compte avant de supprimer uniquement son droit de connexion.</p>
            </div>
          ) : (
            <>
              <header className="admin-access-editor-head">
                <span className="admin-access-business-icon large"><Icon name={businessPacks[selected.business_type].icon} size={24} /></span>
                <div>
                  <p className="eyebrow">{selected.access_label.toUpperCase()}</p>
                  <h2>{selected.display_name || selected.email}</h2>
                  <small>{selected.organization_name} · {businessPacks[selected.business_type].label}</small>
                </div>
                <span className="admin-access-status approved">Actif</span>
              </header>

              <dl className="admin-access-details">
                <div><dt>Entreprise</dt><dd>{selected.organization_name}</dd></div>
                <div><dt>Type d’accès</dt><dd>{selected.access_label}</dd></div>
                <div><dt>E-mail</dt><dd>{selected.email || 'Non renseigné'}</dd></div>
                <div><dt>Créé le</dt><dd>{dateTimeLabel(selected.created_at)}</dd></div>
                <div><dt>Dernière activité</dt><dd>{dateTimeLabel(selected.last_seen_at)}</dd></div>
                <div><dt>Compte Auth</dt><dd>Conservé</dd></div>
              </dl>

              <section className="admin-access-need">
                <strong>Ce qui sera supprimé</strong>
                <p>Uniquement l’accès à cet espace. La fiche {selected.access_label.toLocaleLowerCase('fr-FR')}, les missions/sessions, documents, signatures et autres historiques restent rattachés à l’entreprise.</p>
              </section>

              <label className="admin-access-note">
                Confirmation
                <input
                  value={confirmation}
                  onChange={(event) => setConfirmation(event.target.value)}
                  placeholder={confirmationValue(selected)}
                  autoComplete="off"
                />
                <small>Pour éviter toute erreur, saisis exactement : <strong>{confirmationValue(selected)}</strong></small>
              </label>

              <div className="form-actions">
                <button
                  type="button"
                  className="danger-button"
                  disabled={deleting || confirmation.trim().toLocaleLowerCase('fr-FR') !== confirmationValue(selected).toLocaleLowerCase('fr-FR')}
                  onClick={() => void deleteSelectedAccess()}
                >
                  <Icon name="close" size={17} />
                  {deleting ? 'Suppression…' : 'Supprimer définitivement l’accès'}
                </button>
              </div>
            </>
          )}
        </aside>
      </section>
    </div>
  );
}
