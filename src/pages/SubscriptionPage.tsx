import { useEffect, useMemo, useState } from 'react';
import { Icon } from '../components/Icon';
import { PLAN_DEFINITIONS, planLabel } from '../config/planEntitlements';
import { useOrganization } from '../contexts/OrganizationContext';
import { supabase } from '../lib/supabase';
import type { Plan, SubscriptionStatus } from '../types';

type BillingProvider = 'manual' | 'qonto' | 'stripe';

interface BillingPlan {
  plan_key: Plan;
  display_name: string;
  monthly_price_cents: number;
  member_limit: number;
  features: Record<string, boolean>;
  short_description: string | null;
  sort_order: number;
  provider: BillingProvider;
  checkout_url: string | null;
  checkout_active: boolean;
}

interface BillingSubscription {
  plan: Plan;
  plan_name: string;
  organization_status: 'trial' | 'active' | 'suspended' | 'closed';
  subscription_status: SubscriptionStatus;
  provider: BillingProvider;
  monthly_price_cents: number;
  trial_ends_at: string | null;
  current_period_start: string | null;
  current_period_end: string | null;
  cancel_at_period_end: boolean;
  payment_confirmed_at: string | null;
}

interface BillingUsage {
  active_members: number;
  member_limit: number;
  clients: number;
  active_services: number;
  appointments_this_month: number;
  storage_bytes: number;
}

interface OpenRequest {
  id: string;
  current_plan: Plan;
  requested_plan: Plan;
  request_type: 'upgrade' | 'downgrade' | 'reactivation' | 'metier';
  status: 'payment_pending' | 'pending_review';
  provider: BillingProvider;
  request_reference: string;
  checkout_url_snapshot: string | null;
  created_at: string;
}

interface BillingHistoryItem {
  event_type: string;
  from_plan: Plan | null;
  to_plan: Plan | null;
  metadata: Record<string, unknown>;
  created_at: string;
}

interface BillingTerms {
  version: string;
  text: string;
  cancellation_text: string;
}

interface BillingPortalData {
  subscription: BillingSubscription;
  usage: BillingUsage;
  plans: BillingPlan[];
  open_request: OpenRequest | null;
  history: BillingHistoryItem[];
  terms: BillingTerms;
}

const featureLabels: Record<string, string> = {
  public_booking: 'Réservation publique',
  confirmation_emails: 'Confirmations par e-mail',
  automatic_reminders: 'Rappels automatiques',
  online_booking_management: 'Modification et annulation en ligne',
  calendar_links: 'Ajout au calendrier',
  team_access: 'Comptes collaborateurs',
  manager_role: 'Rôle Responsable',
  commercial_branding: 'Personnalisation complète',
  white_label: 'Marque blanche'
};

const statusLabels: Record<SubscriptionStatus, string> = {
  trialing: 'Période d’essai',
  active: 'Actif',
  past_due: 'Paiement à régulariser',
  paused: 'En pause',
  canceled: 'Résilié'
};

const historyLabels: Record<string, string> = {
  change_requested: 'Demande de changement envoyée',
  request_canceled: 'Demande annulée',
  request_rejected: 'Demande refusée',
  request_approved: 'Demande validée',
  plan_changed: 'Formule modifiée',
  organization_status_changed: 'Statut de l’entreprise modifié'
};

function money(cents: number) {
  return new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR' }).format((cents || 0) / 100);
}

function dateLabel(value: string | null) {
  if (!value) return '—';
  return new Intl.DateTimeFormat('fr-FR', { dateStyle: 'long' }).format(new Date(value));
}

function formatBytes(bytes: number) {
  if (!bytes) return '0 Mo';
  const megabytes = bytes / (1024 * 1024);
  return megabytes < 1 ? `${Math.max(1, Math.round(bytes / 1024))} Ko` : `${megabytes.toFixed(megabytes >= 10 ? 0 : 1)} Mo`;
}

function requestStatusLabel(request: OpenRequest) {
  if (request.status === 'payment_pending') return 'Paiement Qonto en attente de validation';
  if (request.request_type === 'metier') return 'Étude de la demande Métier';
  return 'Validation NCR en attente';
}

export function SubscriptionPage() {
  const { organization } = useOrganization();
  const [data, setData] = useState<BillingPortalData | null>(null);
  const [loading, setLoading] = useState(true);
  const [pendingPlan, setPendingPlan] = useState<Plan | null>(null);
  const [acceptedTerms, setAcceptedTerms] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  const canManage = ['owner', 'admin'].includes(organization?.role ?? 'viewer');

  async function load() {
    if (!organization || !supabase) return;
    setLoading(true);
    setError('');
    const { data: response, error: requestError } = await supabase.rpc('organization_billing_portal', {
      p_organization_id: organization.id
    });
    if (requestError) setError(requestError.message);
    else setData(response as BillingPortalData);
    setLoading(false);
  }

  useEffect(() => {
    void load();
  }, [organization?.id]);

  const orderedPlans = useMemo(
    () => [...(data?.plans ?? [])].sort((a, b) => a.sort_order - b.sort_order),
    [data?.plans]
  );

  async function requestPlan(plan: BillingPlan) {
    if (!organization || !supabase || !canManage) return;
    if (!acceptedTerms) {
      setError('Coche l’acceptation des conditions avant de poursuivre.');
      return;
    }

    setPendingPlan(plan.plan_key);
    setError('');
    setMessage('');
    const { data: response, error: requestError } = await supabase.rpc('request_subscription_change', {
      p_organization_id: organization.id,
      p_requested_plan: plan.plan_key,
      p_accept_terms: true
    });
    setPendingPlan(null);

    if (requestError) {
      setError(requestError.message);
      return;
    }

    const result = response as { status: string; checkout_url: string | null; reference: string };
    if (result.checkout_url) {
      setMessage(`Demande ${result.reference} enregistrée. Redirection vers le paiement sécurisé Qonto…`);
      window.setTimeout(() => window.location.assign(result.checkout_url as string), 850);
    } else if (plan.plan_key === 'metier') {
      setMessage(`Demande ${result.reference} transmise. NCR Solutions te recontactera pour cadrer l’offre Métier.`);
      await load();
    } else {
      setMessage(`Demande ${result.reference} transmise à NCR Solutions pour validation.`);
      await load();
    }
  }

  async function cancelOpenRequest() {
    if (!organization || !data?.open_request || !supabase || !canManage) return;
    setError('');
    setMessage('');
    const { error: requestError } = await supabase.rpc('cancel_subscription_change_request', {
      p_organization_id: organization.id,
      p_request_id: data.open_request.id
    });
    if (requestError) setError(requestError.message);
    else {
      setMessage('La demande de changement a été annulée.');
      await load();
    }
  }

  if (!organization) return null;

  return (
    <div className="page subscription-page">
      <header className="page-header subscription-header">
        <div>
          <p className="eyebrow">ABONNEMENT</p>
          <h1>Ma formule NCR Suite</h1>
          <p>Consulte ton utilisation, compare les offres et demande un changement de formule.</p>
        </div>
        <span className="subscription-provider-badge"><Icon name="creditCard" size={18} /> Paiement par Qonto</span>
      </header>

      {error && <div className="error-message page-message" role="alert">{error}</div>}
      {message && <div className="success-message page-message" role="status">{message}</div>}

      {loading && <section className="panel subscription-loading">Chargement de l’abonnement…</section>}

      {!loading && data && (
        <>
          <section className="subscription-summary-grid">
            <article className="panel subscription-current-card">
              <div className="subscription-current-top">
                <span className="subscription-plan-icon"><Icon name="creditCard" size={24} /></span>
                <div><small>FORMULE ACTUELLE</small><h2>{data.subscription.plan_name}</h2></div>
                <span className={`subscription-status ${data.subscription.subscription_status}`}>{statusLabels[data.subscription.subscription_status]}</span>
              </div>
              <strong className="subscription-price">{money(data.subscription.monthly_price_cents)} <small>HT / mois</small></strong>
              <div className="subscription-dates">
                {data.subscription.subscription_status === 'trialing' && <span>Fin de l’essai <strong>{dateLabel(data.subscription.trial_ends_at)}</strong></span>}
                {data.subscription.current_period_end && <span>Prochaine échéance <strong>{dateLabel(data.subscription.current_period_end)}</strong></span>}
                <span>Mode de paiement <strong>{data.subscription.provider === 'qonto' ? 'Qonto' : data.subscription.provider === 'stripe' ? 'Stripe (préparé)' : 'Gestion manuelle'}</strong></span>
              </div>
            </article>

            <article className="panel subscription-usage-card">
              <div><p className="eyebrow">UTILISATION</p><h2>Activité de l’espace</h2></div>
              <div className="subscription-usage-grid">
                <span><small>Utilisateurs</small><strong>{data.usage.active_members} / {data.usage.member_limit}</strong></span>
                <span><small>Clients</small><strong>{data.usage.clients}</strong></span>
                <span><small>Prestations actives</small><strong>{data.usage.active_services}</strong></span>
                <span><small>RDV ce mois</small><strong>{data.usage.appointments_this_month}</strong></span>
                <span><small>Fichiers de marque</small><strong>{formatBytes(data.usage.storage_bytes)}</strong></span>
              </div>
              <div className="subscription-progress"><span style={{ width: `${Math.min(100, (data.usage.active_members / Math.max(1, data.usage.member_limit)) * 100)}%` }} /></div>
            </article>
          </section>

          {data.open_request && (
            <section className="panel subscription-request-banner">
              <span className="subscription-request-icon"><Icon name="activity" size={22} /></span>
              <div>
                <p className="eyebrow">DEMANDE EN COURS · {data.open_request.request_reference}</p>
                <h2>{planLabel(data.open_request.current_plan)} → {planLabel(data.open_request.requested_plan)}</h2>
                <p>{requestStatusLabel(data.open_request)}. La formule ne change qu’après validation par NCR Solutions.</p>
              </div>
              <div className="subscription-request-actions">
                {data.open_request.checkout_url_snapshot && <a className="primary-button" href={data.open_request.checkout_url_snapshot}>Reprendre le paiement</a>}
                {canManage && <button className="secondary-button" type="button" onClick={cancelOpenRequest}>Annuler la demande</button>}
              </div>
            </section>
          )}

          <section className="subscription-plans-section">
            <div className="section-heading-row">
              <div><p className="eyebrow">FORMULES</p><h2>Choisir le niveau adapté</h2><p>Le paiement Qonto déclenche une demande ; l’activation est validée depuis l’administration NCR.</p></div>
            </div>

            <div className="subscription-plan-grid">
              {orderedPlans.map((plan) => {
                const current = plan.plan_key === data.subscription.plan;
                const currentIsPaid = current && data.subscription.subscription_status === 'active';
                const isMetier = plan.plan_key === 'metier';
                const enabledFeatures = Object.entries(plan.features).filter(([, active]) => Boolean(active));
                return (
                  <article key={plan.plan_key} className={`subscription-plan-card${current ? ' current' : ''}${plan.plan_key === 'professionnelle' ? ' recommended' : ''}`}>
                    {plan.plan_key === 'professionnelle' && <span className="subscription-recommended">RECOMMANDÉE</span>}
                    <div className="subscription-plan-card-header">
                      <div><p className="eyebrow">{current ? 'FORMULE ACTUELLE' : 'FORMULE'}</p><h3>{plan.display_name}</h3></div>
                      {current && <Icon name="check" size={20} />}
                    </div>
                    <p className="subscription-plan-description">{plan.short_description}</p>
                    <strong className="subscription-card-price">{isMetier ? 'Sur étude' : money(plan.monthly_price_cents)}<small>{isMetier ? ' configuration personnalisée' : ' HT / mois'}</small></strong>
                    <ul>
                      <li><Icon name="users" size={16} /> Jusqu’à {plan.member_limit} accès</li>
                      {enabledFeatures.slice(0, 8).map(([feature]) => <li key={feature}><Icon name="check" size={16} /> {featureLabels[feature] ?? feature}</li>)}
                    </ul>
                    <button
                      type="button"
                      className={current ? 'secondary-button full' : 'primary-button full'}
                      disabled={currentIsPaid || !canManage || Boolean(data.open_request) || pendingPlan !== null}
                      onClick={() => requestPlan(plan)}
                    >
                      {pendingPlan === plan.plan_key ? 'Création de la demande…' : currentIsPaid ? 'Formule active' : current ? 'Conserver cette formule' : isMetier ? 'Demander une étude' : plan.checkout_active ? 'Choisir avec Qonto' : 'Envoyer une demande'}
                    </button>
                  </article>
                );
              })}
            </div>
          </section>

          <section className="panel subscription-terms-panel">
            <label className="subscription-terms-check">
              <input type="checkbox" checked={acceptedTerms} onChange={(event) => setAcceptedTerms(event.target.checked)} disabled={!canManage || Boolean(data.open_request)} />
              <span><strong>J’accepte les conditions d’abonnement — version {data.terms.version}</strong><small>{data.terms.text}</small></span>
            </label>
            <p><strong>Résiliation :</strong> {data.terms.cancellation_text}</p>
            {!canManage && <div className="info-message">Seul le propriétaire ou un administrateur peut demander un changement de formule.</div>}
          </section>

          <section className="panel subscription-history-panel">
            <div className="panel-header"><div><p className="eyebrow">HISTORIQUE</p><h2>Évolution de l’abonnement</h2></div></div>
            {data.history.length === 0 ? <p className="muted">Aucun changement enregistré pour le moment.</p> : (
              <div className="subscription-history-list">
                {data.history.map((item, index) => (
                  <article key={`${item.created_at}-${index}`}>
                    <span><Icon name="activity" size={17} /></span>
                    <div><strong>{historyLabels[item.event_type] ?? item.event_type}</strong><small>{item.from_plan && item.to_plan ? `${planLabel(item.from_plan)} → ${planLabel(item.to_plan)} · ` : ''}{dateLabel(item.created_at)}</small></div>
                  </article>
                ))}
              </div>
            )}
          </section>
        </>
      )}
    </div>
  );
}
