import { useEffect, useMemo, useState } from 'react';
import { AdminCreateSpaceModal } from '../components/AdminCreateSpaceModal';
import { BillingAdminPanel } from '../components/BillingAdminPanel';
import { MetierAdminPanel } from '../components/MetierAdminPanel';
import { Icon } from '../components/Icon';
import { useAuth } from '../contexts/AuthContext';
import { usePlatformAdmin } from '../contexts/PlatformAdminContext';
import { businessPacks, businessTypeOptions } from '../config/businessPacks';
import { getDomainPlans } from '../config/domainPlans';
import { supabase } from '../lib/supabase';
import type { BusinessType, OrganizationStatus, Plan, SubscriptionStatus } from '../types';

interface AdminMetrics {
  organizations_total: number;
  organizations_active: number;
  organizations_trial: number;
  organizations_suspended: number;
  active_users: number;
  estimated_mrr_cents: number;
  trials_ending_soon: number;
}

interface AdminOrganization {
  id: string;
  name: string;
  slug: string;
  business_type: BusinessType;
  plan: Plan;
  organization_status: OrganizationStatus;
  subscription_status: SubscriptionStatus;
  monthly_price_cents: number;
  trial_ends_at: string | null;
  current_period_end: string | null;
  cancel_at_period_end: boolean;
  provider: 'manual' | 'qonto' | 'stripe';
  internal_notes: string | null;
  owner_email: string | null;
  active_members: number;
  clients_count: number;
  appointments_count: number;
  last_activity_at: string | null;
  created_at: string;
}

const emptyMetrics: AdminMetrics = {
  organizations_total: 0,
  organizations_active: 0,
  organizations_trial: 0,
  organizations_suspended: 0,
  active_users: 0,
  estimated_mrr_cents: 0,
  trials_ending_soon: 0
};

const planValues: Plan[] = ['decouverte', 'essentielle', 'professionnelle', 'metier'];

const planLabels: Record<Plan, string> = {
  decouverte: 'Découverte',
  essentielle: 'Essentielle',
  professionnelle: 'Professionnelle',
  metier: 'Métier'
};

const trainingPlanAdminSummary: Record<Plan, string> = {
  decouverte: 'Socle Formation, documents de session, feuille d’émargement vierge et attestations automatiques.',
  essentielle: 'Ajoute l’émargement numérique avec signatures, le PDF d’émargement et la personnalisation des documents et e-mails.',
  professionnelle: 'Ajoute les évaluations, le dossier complet, le multi-site et les accès employés avec rôles.',
  metier: 'Configuration sur mesure : modules, limites, rôles, sites, identité et domaine selon le contrat.'
};

function adminPlansFor(businessType: BusinessType) {
  const definitions = getDomainPlans(businessType);
  return planValues.map((value) => ({
    value,
    label: definitions[value].label,
    defaultPrice: definitions[value].monthlyPriceCents,
    memberLimit: definitions[value].memberLimit,
    detail: definitions[value].detail
  }));
}

const organizationStatusLabels: Record<OrganizationStatus, string> = {
  trial: 'Essai',
  active: 'Active',
  suspended: 'Suspendue',
  closed: 'Fermée'
};

const subscriptionStatusLabels: Record<SubscriptionStatus, string> = {
  trialing: 'Période d’essai',
  active: 'Actif',
  past_due: 'Paiement en retard',
  paused: 'En pause',
  canceled: 'Résilié'
};

function money(cents: number) {
  return new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR' }).format((cents || 0) / 100);
}

function dateLabel(value: string | null) {
  if (!value) return '—';
  return new Intl.DateTimeFormat('fr-FR', { dateStyle: 'medium' }).format(new Date(value));
}

function inputDate(value: string | null) {
  return value ? value.slice(0, 10) : '';
}

function dateToIso(value: string) {
  return value ? new Date(`${value}T23:59:59`).toISOString() : null;
}

function statusClass(value: string) {
  if (['active', 'trial', 'trialing'].includes(value)) return 'positive';
  if (['suspended', 'paused', 'past_due'].includes(value)) return 'warning';
  if (['closed', 'canceled'].includes(value)) return 'negative';
  return '';
}

export function PlatformAdminPage() {
  const [activeSection, setActiveSection] = useState<'overview' | 'billing' | 'metier'>('overview');
  const { user, signOut } = useAuth();
  const { profile, canManage } = usePlatformAdmin();
  const [metrics, setMetrics] = useState<AdminMetrics>(emptyMetrics);
  const [organizations, setOrganizations] = useState<AdminOrganization[]>([]);
  const [selected, setSelected] = useState<AdminOrganization | null>(null);
  const [search, setSearch] = useState('');
  const [domainFilter, setDomainFilter] = useState<'all' | BusinessType>('all');
  const [planFilter, setPlanFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [showCreateSpace, setShowCreateSpace] = useState(false);

  const [editPlan, setEditPlan] = useState<Plan>('decouverte');
  const [editOrganizationStatus, setEditOrganizationStatus] = useState<OrganizationStatus>('active');
  const [editSubscriptionStatus, setEditSubscriptionStatus] = useState<SubscriptionStatus>('active');
  const [editPrice, setEditPrice] = useState('0.00');
  const [editTrialEnd, setEditTrialEnd] = useState('');
  const [editPeriodEnd, setEditPeriodEnd] = useState('');
  const [editCancelAtPeriodEnd, setEditCancelAtPeriodEnd] = useState(false);
  const [editNotes, setEditNotes] = useState('');

  function populateEditor(org: AdminOrganization) {
    setSelected(org);
    setEditPlan(org.plan);
    setEditOrganizationStatus(org.organization_status);
    setEditSubscriptionStatus(org.subscription_status);
    setEditPrice((org.monthly_price_cents / 100).toFixed(2));
    setEditTrialEnd(inputDate(org.trial_ends_at));
    setEditPeriodEnd(inputDate(org.current_period_end));
    setEditCancelAtPeriodEnd(org.cancel_at_period_end);
    setEditNotes(org.internal_notes ?? '');
    setMessage('');
    setError('');
  }

  async function loadDashboard() {
    if (!supabase) return;
    const { data, error: requestError } = await supabase.rpc('admin_platform_dashboard');
    if (requestError) throw requestError;
    setMetrics((data ?? emptyMetrics) as AdminMetrics);
  }

  async function loadOrganizations(preserveSelection = true) {
    if (!supabase) return;
    const { data, error: requestError } = await supabase.rpc('admin_list_organizations', {
      p_search: search.trim() || null,
      p_plan: planFilter || null,
      p_status: statusFilter || null
    });
    if (requestError) throw requestError;
    const rows = (Array.isArray(data) ? data : []) as AdminOrganization[];
    setOrganizations(rows);
    if (preserveSelection && selected) {
      const nextSelected = rows.find((row) => row.id === selected.id);
      if (nextSelected) populateEditor(nextSelected);
      else setSelected(null);
    }
  }

  async function loadAll(preserveSelection = true) {
    setLoading(true);
    setError('');
    try {
      await Promise.all([loadDashboard(), loadOrganizations(preserveSelection)]);
    } catch (requestError: any) {
      setError(requestError?.message ?? 'Impossible de charger l’administration NCR.');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void loadAll(false);
  }, []);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      void loadOrganizations(false).catch((requestError: any) => setError(requestError?.message ?? 'Recherche impossible.'));
    }, 280);
    return () => window.clearTimeout(timer);
  }, [search, planFilter, statusFilter]);

  const domainCounts = useMemo(() => {
    const counts = new Map<BusinessType, number>();
    for (const organization of organizations) counts.set(organization.business_type, (counts.get(organization.business_type) ?? 0) + 1);
    return counts;
  }, [organizations]);

  const visibleOrganizations = useMemo(
    () => organizations.filter((organization) => domainFilter === 'all' || organization.business_type === domainFilter),
    [organizations, domainFilter]
  );

  const organizationGroups = useMemo(() => businessTypeOptions
    .map((domain) => ({
      domain,
      organizations: visibleOrganizations.filter((organization) => organization.business_type === domain.id)
    }))
    .filter((group) => group.organizations.length > 0), [visibleOrganizations]);

  const selectedPlans = useMemo(() => adminPlansFor(selected?.business_type ?? 'coiffure'), [selected?.business_type]);
  const selectedPlan = useMemo(() => selectedPlans.find((plan) => plan.value === editPlan), [selectedPlans, editPlan]);

  function changePlan(value: Plan) {
    setEditPlan(value);
    const defaultPrice = selectedPlans.find((plan) => plan.value === value)?.defaultPrice ?? 0;
    setEditPrice((defaultPrice / 100).toFixed(2));
  }

  async function handleSpaceCreated(_organizationId: string, organizationName: string) {
    setShowCreateSpace(false);
    setSearch('');
    setDomainFilter('all');
    setPlanFilter('');
    setStatusFilter('');
    setError('');
    setMessage(`L’espace ${organizationName} a été créé. Le propriétaire le verra dans « Changer d’entreprise » avec son abonnement séparé.`);
    await loadAll(false);
  }

  async function saveSubscription(event: React.FormEvent) {
    event.preventDefault();
    if (!selected || !supabase || !canManage) return;

    const priceCents = Math.round(Number(editPrice.replace(',', '.')) * 100);
    if (!Number.isFinite(priceCents) || priceCents < 0) {
      setError('Le tarif mensuel est invalide.');
      return;
    }

    setSaving(true);
    setError('');
    setMessage('');
    const { error: requestError } = await supabase.rpc('admin_update_organization_subscription', {
      p_organization_id: selected.id,
      p_plan: editPlan,
      p_organization_status: editOrganizationStatus,
      p_subscription_status: editSubscriptionStatus,
      p_monthly_price_cents: priceCents,
      p_trial_ends_at: dateToIso(editTrialEnd),
      p_current_period_end: dateToIso(editPeriodEnd),
      p_cancel_at_period_end: editCancelAtPeriodEnd,
      p_internal_notes: editNotes.trim() || null
    });

    if (requestError) {
      setError(requestError.message);
    } else {
      setMessage('L’abonnement et l’accès de l’entreprise ont été mis à jour.');
      await loadAll(true);
    }
    setSaving(false);
  }

  return (
    <div className="platform-admin-page">
      <header className="platform-admin-topbar">
        <div className="platform-admin-brand">
          <img src="/brand/ncr-suite-logo-horizontal.png" alt="NCR Suite" />
          <span>Administration centrale</span>
        </div>
        <div className="platform-admin-account">
          <span><strong>{user?.user_metadata?.full_name || 'NCR Admin'}</strong><small>{profile?.role === 'super_admin' ? 'Super-administrateur' : 'Support'}</small></span>
          <button className="icon-button" type="button" onClick={() => signOut()} aria-label="Se déconnecter"><Icon name="logout" size={19} /></button>
        </div>
      </header>

      <main className="platform-admin-content">
        <section className="platform-admin-hero">
          <div>
            <p className="eyebrow">NCR SUITE CONTROL CENTER</p>
            <h1>Pilote toutes les entreprises depuis un seul espace.</h1>
            <p>Ce compte est exclusivement réservé à l’administration NCR. Les espaces métier, rendez-vous, prestations et données clients ne sont jamais affichés ici.</p>
          </div>
          <button type="button" className="secondary-button" onClick={() => loadAll(true)} disabled={loading}>Actualiser</button>
        </section>

        {error && <div className="error-message page-message" role="alert">{error}</div>}
        {message && <div className="success-message page-message" role="status">{message}</div>}

        <nav className="platform-admin-tabs" aria-label="Sections de l’administration NCR">
          <button type="button" className={activeSection === 'overview' ? 'active' : ''} onClick={() => setActiveSection('overview')}>
            <Icon name="building" size={19} />
            <span><strong>Entreprises</strong><small>Comptes, accès et formules</small></span>
          </button>
          <button type="button" className={activeSection === 'billing' ? 'active' : ''} onClick={() => setActiveSection('billing')}>
            <Icon name="creditCard" size={19} />
            <span><strong>Abonnements & paiements</strong><small>Demandes, Qonto et conditions</small></span>
          </button>
          <button type="button" className={activeSection === 'metier' ? 'active' : ''} onClick={() => setActiveSection('metier')}>
            <Icon name="tool" size={19} />
            <span><strong>Offres Métier</strong><small>Modules, sites et marque blanche</small></span>
          </button>
        </nav>

        {activeSection === 'overview' && (<>
        <section className="platform-admin-metrics">
          <article><span className="admin-metric-icon"><Icon name="building" size={22} /></span><div><small>Entreprises</small><strong>{metrics.organizations_total}</strong><em>{metrics.organizations_active} actives</em></div></article>
          <article><span className="admin-metric-icon"><Icon name="creditCard" size={22} /></span><div><small>MRR estimé</small><strong>{money(metrics.estimated_mrr_cents)}</strong><em>abonnements actifs</em></div></article>
          <article><span className="admin-metric-icon"><Icon name="users" size={22} /></span><div><small>Accès actifs</small><strong>{metrics.active_users}</strong><em>toutes entreprises</em></div></article>
          <article><span className="admin-metric-icon"><Icon name="activity" size={22} /></span><div><small>Essais</small><strong>{metrics.organizations_trial}</strong><em>{metrics.trials_ending_soon} finissent sous 7 jours</em></div></article>
          <article><span className="admin-metric-icon danger"><Icon name="lock" size={22} /></span><div><small>Suspendues</small><strong>{metrics.organizations_suspended}</strong><em>accès métier bloqué</em></div></article>
        </section>

        <section className="platform-admin-workspace">
          <article className="panel admin-organizations-panel">
            <div className="panel-header admin-list-header">
              <div><p className="eyebrow">ENTREPRISES</p><h2>Comptes clients</h2></div>
              <div className="admin-list-header-actions">
                <span>{visibleOrganizations.length} résultat(s) · {organizationGroups.length} domaine(s)</span>
                {canManage && (
                  <button type="button" className="primary-button compact" onClick={() => setShowCreateSpace(true)}>
                    <Icon name="plus" size={17} />
                    Créer un espace
                  </button>
                )}
              </div>
            </div>

            <div className="admin-filters">
              <label className="admin-search-field"><Icon name="search" size={17} /><input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Nom, identifiant ou e-mail…" /></label>
              <select value={domainFilter} onChange={(event) => setDomainFilter(event.target.value as 'all' | BusinessType)} aria-label="Filtrer par domaine">
                <option value="all">Tous les domaines</option>
                {businessTypeOptions.map((domain) => <option key={domain.id} value={domain.id}>{domain.label} ({domainCounts.get(domain.id) ?? 0})</option>)}
              </select>
              <select value={planFilter} onChange={(event) => setPlanFilter(event.target.value)} aria-label="Filtrer par formule">
                <option value="">Toutes les formules</option>
                {planValues.map((plan) => <option key={plan} value={plan}>{planLabels[plan]}</option>)}
              </select>
              <select value={statusFilter} onChange={(event) => setStatusFilter(event.target.value)} aria-label="Filtrer par statut">
                <option value="">Tous les statuts</option>
                <option value="trial">Essai</option>
                <option value="active">Active</option>
                <option value="suspended">Suspendue</option>
                <option value="closed">Fermée</option>
              </select>
            </div>

            <div className="admin-organization-list admin-domain-organization-list">
              {loading && <div className="admin-empty-state">Chargement des entreprises…</div>}
              {!loading && visibleOrganizations.length === 0 && <div className="admin-empty-state">Aucune entreprise ne correspond aux filtres.</div>}
              {!loading && organizationGroups.map(({ domain, organizations: domainOrganizations }) => (
                <section className="admin-domain-group" key={domain.id}>
                  <header className="admin-domain-group-header">
                    <span className="admin-domain-group-icon"><Icon name={businessPacks[domain.id].icon} size={18} /></span>
                    <div><strong>{domain.label}</strong><small>{domainOrganizations.length} entreprise{domainOrganizations.length > 1 ? 's' : ''}</small></div>
                  </header>
                  <div className="admin-domain-group-rows">
                    {domainOrganizations.map((org) => (
                      <button key={org.id} type="button" className={`admin-organization-row${selected?.id === org.id ? ' selected' : ''}`} onClick={() => populateEditor(org)}>
                        <span className="admin-company-avatar">{org.name.slice(0, 1).toUpperCase()}</span>
                        <span className="admin-company-main"><strong>{org.name}</strong><small>{org.owner_email || org.slug}</small></span>
                        <span className="admin-company-stats"><small>{org.active_members} utilisateur(s)</small><small>{org.clients_count} client(s)</small></span>
                        <span className="admin-company-plan">{planLabels[org.plan]}<small>{money(org.monthly_price_cents)}/mois</small></span>
                        <span className={`admin-status-pill ${statusClass(org.organization_status)}`}>{organizationStatusLabels[org.organization_status]}</span>
                        <Icon name="chevronRight" size={18} />
                      </button>
                    ))}
                  </div>
                </section>
              ))}
            </div>
          </article>

          <aside className="panel admin-editor-panel">
            {!selected ? (
              <div className="admin-editor-empty">
                <span><Icon name="building" size={28} /></span>
                <h2>Sélectionne une entreprise</h2>
                <p>Tu pourras consulter son activité et gérer sa formule sans entrer dans ses données métier.</p>
              </div>
            ) : (
              <form onSubmit={saveSubscription} className="admin-subscription-form">
                <div className="admin-editor-company">
                  <span className="admin-company-avatar large">{selected.name.slice(0, 1).toUpperCase()}</span>
                  <div><p className="eyebrow">ABONNEMENT</p><h2>{selected.name}</h2><small>{selected.owner_email || 'Propriétaire non identifié'}</small></div>
                </div>

                <div className="admin-detail-strip">
                  <div><span>Créée</span><strong>{dateLabel(selected.created_at)}</strong></div>
                  <div><span>Rendez-vous</span><strong>{selected.appointments_count}</strong></div>
                  <div><span>Dernière activité</span><strong>{dateLabel(selected.last_activity_at)}</strong></div>
                </div>

                {!canManage && <div className="info-message">Ton rôle Support permet la consultation, mais pas la modification des formules.</div>}

                <div className="admin-form-grid">
                  <label>
                    Formule
                    <select value={editPlan} onChange={(event) => changePlan(event.target.value as Plan)} disabled={!canManage}>
                      {selectedPlans.map((plan) => <option key={plan.value} value={plan.value}>{plan.label}</option>)}
                    </select>
                    <small>Limite prévue : {selectedPlan?.memberLimit ?? 1} accès · tarif catalogue {money(selectedPlan?.defaultPrice ?? 0)} HT/mois.</small>
                  </label>
                  <label>
                    Tarif mensuel HT
                    <div className="admin-price-input"><input inputMode="decimal" value={editPrice} onChange={(event) => setEditPrice(event.target.value)} disabled={!canManage} /><span>€</span></div>
                    <small>Modifiable pour les offres Métier ou les accords spécifiques.</small>
                  </label>
                  {selected.business_type === 'formation' && (
                    <div className="info-message full-field">
                      <strong>{selectedPlan?.label} — offre Formation</strong>
                      <span>{trainingPlanAdminSummary[editPlan]}</span>
                      <small>{selectedPlan?.detail}</small>
                    </div>
                  )}
                  <label>
                    Accès de l’entreprise
                    <select value={editOrganizationStatus} onChange={(event) => setEditOrganizationStatus(event.target.value as OrganizationStatus)} disabled={!canManage}>
                      <option value="trial">Essai</option>
                      <option value="active">Active</option>
                      <option value="suspended">Suspendue</option>
                      <option value="closed">Fermée</option>
                    </select>
                  </label>
                  <label>
                    État de l’abonnement
                    <select value={editSubscriptionStatus} onChange={(event) => setEditSubscriptionStatus(event.target.value as SubscriptionStatus)} disabled={!canManage}>
                      <option value="trialing">Période d’essai</option>
                      <option value="active">Actif</option>
                      <option value="past_due">Paiement en retard</option>
                      <option value="paused">En pause</option>
                      <option value="canceled">Résilié</option>
                    </select>
                  </label>
                  <label>
                    Fin de l’essai
                    <input type="date" value={editTrialEnd} onChange={(event) => setEditTrialEnd(event.target.value)} disabled={!canManage} />
                  </label>
                  <label>
                    Fin de période
                    <input type="date" value={editPeriodEnd} onChange={(event) => setEditPeriodEnd(event.target.value)} disabled={!canManage} />
                  </label>
                  <label className="admin-checkbox-field full-field">
                    <input type="checkbox" checked={editCancelAtPeriodEnd} onChange={(event) => setEditCancelAtPeriodEnd(event.target.checked)} disabled={!canManage} />
                    <span><strong>Résiliation en fin de période</strong><small>L’accès reste actif jusqu’à la date prévue.</small></span>
                  </label>
                  <label className="full-field">
                    Note interne NCR
                    <textarea rows={4} maxLength={2000} value={editNotes} onChange={(event) => setEditNotes(event.target.value)} disabled={!canManage} placeholder="Échange commercial, particularité du contrat, incident de paiement…" />
                  </label>
                </div>

                <div className="admin-current-status">
                  <span className={`admin-status-pill ${statusClass(editOrganizationStatus)}`}>{organizationStatusLabels[editOrganizationStatus]}</span>
                  <span className={`admin-status-pill ${statusClass(editSubscriptionStatus)}`}>{subscriptionStatusLabels[editSubscriptionStatus]}</span>
                  <span>{selected.provider === 'qonto' ? 'Paiement Qonto' : selected.provider === 'stripe' ? 'Paiement Stripe' : 'Gestion manuelle'}</span>
                </div>

                {canManage && <button className="primary-button full" type="submit" disabled={saving}>{saving ? 'Enregistrement…' : 'Enregistrer la formule et l’accès'}</button>}
              </form>
            )}
          </aside>
        </section>
        </>)}

        {activeSection === 'billing' && (
          <BillingAdminPanel canManage={canManage} onChanged={() => void loadAll(true)} />
        )}

        {activeSection === 'metier' && (
          <MetierAdminPanel canManage={canManage} />
        )}
      </main>

      {showCreateSpace && (
        <AdminCreateSpaceModal
          onClose={() => setShowCreateSpace(false)}
          onCreated={handleSpaceCreated}
        />
      )}
    </div>
  );
}
