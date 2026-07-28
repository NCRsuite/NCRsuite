import { useEffect, useMemo, useState } from 'react';
import { useLocation } from 'react-router-dom';
import { Icon } from '../components/Icon';
import { PremiumSkeleton } from '../components/PremiumSkeleton';
import { SecurityAddonsPanel } from '../components/SecurityAddonsPanel';
import { TrainingModulesPanel } from '../components/TrainingModulesPanel';
import { businessPacks } from '../config/businessPacks';
import { planLabel } from '../config/planEntitlements';
import { getDomainOffer, OFFER_FEATURE_LABELS } from '../config/domainOfferCatalog';
import { useOrganization } from '../contexts/OrganizationContext';
import { supabase } from '../lib/supabase';
import type { BusinessType, Plan, SubscriptionStatus } from '../types';

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
  recommended?: boolean;
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
  scheduled_plan_key: Plan | null;
  scheduled_change_at: string | null;
  payment_failed_at: string | null;
  grace_period_ends_at: string | null;
  access_restricted_at: string | null;
  data_retention_mode: 'preserve';
  access_allowed: boolean;
  data_retained: boolean;
}

interface BillingUsageItem {
  key: string;
  label: string;
  value: string | number;
}

interface BillingUsage {
  active_members: number;
  member_limit: number;
  clients: number;
  active_services: number;
  appointments_this_month: number;
  storage_bytes: number;
  available?: boolean;
  usage_items?: BillingUsageItem[];
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
  effective_at: string | null;
  stripe_schedule_id: string | null;
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
  business_type?: BusinessType;
  business_type_label?: string;
  access_allowed?: boolean;
  data_retained?: boolean;
  subscription: BillingSubscription;
  usage: BillingUsage;
  plans: BillingPlan[];
  open_request: OpenRequest | null;
  history: BillingHistoryItem[];
  terms: BillingTerms;
}

interface SubscriptionPortfolioItem {
  organizationId: string;
  organizationName: string;
  businessType: BusinessType;
  portal: BillingPortalData | null;
  error: string | null;
}

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
  organization_status_changed: 'Statut de l’entreprise modifié',
  stripe_checkout_created: 'Paiement préparé',
  stripe_checkout_completed: 'Souscription confirmée',
  stripe_invoice_paid: 'Paiement reçu',
  stripe_invoice_payment_failed: 'Paiement à régulariser',
  stripe_subscription_updated: 'Abonnement actualisé',
  stripe_subscription_deleted: 'Abonnement résilié'
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
  if (request.status === 'payment_pending' && request.provider === 'stripe') return 'Paiement en attente';
  if (request.status === 'payment_pending') return 'Paiement en attente de validation';
  if (request.request_type === 'metier') return 'Étude de la demande Métier';
  return 'Validation NCR en attente';
}

async function functionErrorMessage(error: unknown, fallback: string) {
  const context = (error as { context?: Response } | null)?.context;
  if (context) {
    try {
      const body = await context.clone().json() as { error?: unknown };
      if (typeof body.error === 'string' && body.error.trim()) return body.error;
    } catch {
      // Le message standard Supabase reste disponible ci-dessous.
    }
  }
  return error instanceof Error && error.message ? error.message : fallback;
}

export function SubscriptionPage() {
  const { organization, organizations, selectOrganization, refreshOrganizations } = useOrganization();
  const location = useLocation();
  const [data, setData] = useState<BillingPortalData | null>(null);
  const [loading, setLoading] = useState(true);
  const [portfolioLoading, setPortfolioLoading] = useState(false);
  const [portfolio, setPortfolio] = useState<SubscriptionPortfolioItem[]>([]);
  const [pendingPlan, setPendingPlan] = useState<Plan | null>(null);
  const [acceptedTerms, setAcceptedTerms] = useState(false);
  const [openingPortal, setOpeningPortal] = useState(false);
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

  async function loadPortfolio() {
    if (!supabase || organizations.length === 0) {
      setPortfolio([]);
      return;
    }
    setPortfolioLoading(true);
    const client = supabase;
    const rows = await Promise.all(organizations.map(async (item): Promise<SubscriptionPortfolioItem> => {
      const { data: response, error: requestError } = await client.rpc('organization_billing_portal', {
        p_organization_id: item.id
      });
      return {
        organizationId: item.id,
        organizationName: item.name,
        businessType: item.business_type,
        portal: requestError ? null : response as BillingPortalData,
        error: requestError?.message ?? null
      };
    }));
    setPortfolio(rows);
    setPortfolioLoading(false);
  }

  useEffect(() => {
    void load();
  }, [organization?.id]);

  useEffect(() => {
    const stripeResult = new URLSearchParams(location.search).get('stripe');
    if (stripeResult === 'success') {
      setMessage('Paiement confirmé. L’abonnement se synchronise automatiquement.');
      const firstRefresh = window.setTimeout(() => void load(), 1200);
      const secondRefresh = window.setTimeout(() => void load(), 4200);
      return () => {
        window.clearTimeout(firstRefresh);
        window.clearTimeout(secondRefresh);
      };
    }
    if (stripeResult === 'cancel') {
      setMessage('Paiement interrompu. La demande reste disponible si tu souhaites la reprendre.');
    }
  }, [location.search, organization?.id]);

  useEffect(() => {
    if (loading || !data || location.hash !== '#training-modules') return;
    const timer = window.setTimeout(() => {
      document.getElementById('training-modules')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }, 80);
    return () => window.clearTimeout(timer);
  }, [data, loading, location.hash, location.search]);

  useEffect(() => {
    void loadPortfolio();
  }, [organizations.map((item) => item.id).join('|')]);

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
    if (plan.provider !== 'stripe' || !plan.checkout_active) {
      setError('Le tarif de cette formule doit être configuré par NCR Suite.');
      return;
    }

    setPendingPlan(plan.plan_key);
    setError('');
    setMessage('');

    const { data: response, error: requestError } = await supabase.functions.invoke('create-stripe-checkout', {
      body: {
        organizationId: organization.id,
        planKey: plan.plan_key,
        acceptTerms: true
      }
    });
    setPendingPlan(null);
    if (requestError) {
      setError(await functionErrorMessage(requestError, 'Le paiement sécurisé ne peut pas être ouvert.'));
      await load();
      return;
    }
    if (response?.destination === 'scheduled' && response?.effectiveAt) {
      setMessage(
        `Rétrogradation programmée au ${dateLabel(String(response.effectiveAt))}. `
        + 'Les droits premium seront retirés à cette date, sans suppression des données existantes.'
      );
      refreshOrganizations();
      await Promise.all([load(), loadPortfolio()]);
      return;
    }
    if (!response?.url) {
      setError('La page de paiement n’est pas disponible pour le moment.');
      await load();
      return;
    }
    setMessage(response.destination === 'portal'
      ? `Demande ${response.reference ?? ''} enregistrée. Ouverture de la confirmation…`
      : `Demande ${response.reference ?? ''} enregistrée. Ouverture du paiement sécurisé…`);
    window.location.assign(String(response.url));
  }

  async function resumeStripeCheckout(request: OpenRequest) {
    if (!organization || !supabase || !canManage) return;
    setPendingPlan(request.requested_plan);
    setError('');
    setMessage('');
    const { data: response, error: requestError } = await supabase.functions.invoke('create-stripe-checkout', {
      body: {
        organizationId: organization.id,
        requestId: request.id
      }
    });
    setPendingPlan(null);
    if (requestError) {
      setError(await functionErrorMessage(requestError, 'Le paiement sécurisé ne peut pas être repris.'));
      return;
    }
    if (response?.destination === 'scheduled' && response?.effectiveAt) {
      setMessage(
        `Rétrogradation déjà programmée au ${dateLabel(String(response.effectiveAt))}. `
        + 'Les données premium resteront conservées.'
      );
      refreshOrganizations();
      await Promise.all([load(), loadPortfolio()]);
      return;
    }
    if (!response?.url) {
      setError('La page de paiement n’est pas disponible pour le moment.');
      return;
    }
    window.location.assign(String(response.url));
  }

  async function openStripePortal() {
    if (!organization || !supabase || !canManage) return;
    setOpeningPortal(true);
    setError('');
    const { data: response, error: requestError } = await supabase.functions.invoke('create-stripe-portal', {
      body: { organizationId: organization.id }
    });
    setOpeningPortal(false);
    if (requestError || !response?.url) {
      setError(await functionErrorMessage(requestError, 'La gestion des paiements ne peut pas être ouverte.'));
      return;
    }
    window.location.assign(String(response.url));
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
      await Promise.all([load(), loadPortfolio()]);
    }
  }

  const activePortfolio = portfolio.filter((item) => item.portal && ['active', 'trialing'].includes(item.portal.subscription.subscription_status));
  const portfolioMonthlyTotal = activePortfolio.reduce((sum, item) => sum + (item.portal?.subscription.monthly_price_cents ?? 0), 0);

  if (!organization) return null;

  const usesStripe = data?.subscription.provider === 'stripe'
    || Boolean(data?.plans.some((plan) => plan.provider === 'stripe' && plan.checkout_active));

  return (
    <div className="page subscription-page">
      <header className="page-header subscription-header">
        <div>
          <p className="eyebrow">ABONNEMENT</p>
          <h1>Ma formule NCR Suite</h1>
          <p>Consulte ton utilisation et compare les offres adaptées à ton domaine{data?.business_type_label ? ` ${data.business_type_label}` : ''}.</p>
        </div>
        <span className="subscription-provider-badge"><Icon name="creditCard" size={18} /> Paiement sécurisé</span>
      </header>

      {error && <div className="error-message page-message" role="alert">{error}</div>}
      {message && <div className="success-message page-message" role="status">{message}</div>}

      {organizations.length > 1 && (
        <section className="panel subscription-portfolio-panel">
          <div className="panel-header subscription-portfolio-header">
            <div><p className="eyebrow">TOUS MES DOMAINES</p><h2>Mes abonnements NCR Suite</h2><p>Chaque domaine dispose de sa formule, de son tarif et de son historique séparés.</p></div>
            <div className="subscription-portfolio-total"><small>Total mensuel actif</small><strong>{portfolioLoading ? '…' : money(portfolioMonthlyTotal)}</strong><span>HT / mois</span></div>
          </div>
          {portfolioLoading && portfolio.length === 0 ? <PremiumSkeleton label="Chargement de vos abonnements" rows={3} /> : (
            <div className="subscription-portfolio-grid">
              {portfolio.map((item) => {
                const portal = item.portal;
                const current = item.organizationId === organization.id;
                return (
                  <article key={item.organizationId} className={`subscription-portfolio-card${current ? ' current' : ''}`}>
                    <span className="subscription-portfolio-icon"><Icon name={businessPacks[item.businessType].icon} size={20} /></span>
                    <div className="subscription-portfolio-main">
                      <small>{businessPacks[item.businessType].label}</small>
                      <strong>{item.organizationName}</strong>
                      {portal ? <span>{portal.subscription.plan_name} · {money(portal.subscription.monthly_price_cents)} HT/mois</span> : <span>Abonnement indisponible</span>}
                    </div>
                    {portal && <span className={`subscription-status ${portal.subscription.subscription_status}`}>{statusLabels[portal.subscription.subscription_status]}</span>}
                    <button type="button" className={current ? 'secondary-button compact-button' : 'primary-button compact-button'} onClick={() => selectOrganization(item.organizationId)} disabled={current}>
                      {current ? 'Affiché' : 'Voir cet abonnement'}
                    </button>
                    {item.error && <small className="subscription-portfolio-error">{item.error}</small>}
                  </article>
                );
              })}
            </div>
          )}
        </section>
      )}

      {loading && <section className="panel subscription-loading"><PremiumSkeleton label="Chargement de l’abonnement" rows={4} /></section>}

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
                <span>Mode de paiement <strong>{data.subscription.provider === 'stripe' ? 'Paiement en ligne' : 'Gestion manuelle'}</strong></span>
                <span>Conservation des données <strong>Garantie</strong></span>
              </div>
              {data.subscription.provider === 'stripe' && canManage && (
                <div className="subscription-current-actions">
                  <button type="button" className="secondary-button" onClick={() => void openStripePortal()} disabled={openingPortal}>
                    <Icon name="creditCard" size={17} /> {openingPortal ? 'Ouverture…' : 'Gérer mes paiements'}
                  </button>
                </div>
              )}
            </article>

            <article className="panel subscription-usage-card">
              <div><p className="eyebrow">UTILISATION</p><h2>Activité de l’espace</h2></div>
              <div className="subscription-usage-grid">
                {(data.usage.usage_items?.length ? data.usage.usage_items : [
                  { key: 'members', label: 'Utilisateurs', value: `${data.usage.active_members} / ${data.usage.member_limit}` },
                  { key: 'clients', label: 'Clients', value: data.usage.clients },
                  { key: 'services', label: 'Prestations actives', value: data.usage.active_services },
                  { key: 'appointments', label: 'RDV ce mois', value: data.usage.appointments_this_month },
                  { key: 'storage', label: 'Fichiers de marque', value: formatBytes(data.usage.storage_bytes) }
                ]).map((item) => <span key={item.key}><small>{item.label}</small><strong>{item.value}</strong></span>)}
              </div>
              <div className="subscription-progress"><span style={{ width: `${Math.min(100, (data.usage.active_members / Math.max(1, data.usage.member_limit)) * 100)}%` }} /></div>
            </article>
          </section>

          {data.subscription.subscription_status === 'past_due' && data.subscription.access_allowed && (
            <section className="panel subscription-request-banner">
              <span className="subscription-request-icon"><Icon name="alert" size={22} /></span>
              <div>
                <p className="eyebrow">PAIEMENT À RÉGULARISER</p>
                <h2>Délai de grâce jusqu’au {dateLabel(data.subscription.grace_period_ends_at)}</h2>
                <p>L’espace reste accessible jusque-là. Après cette date, les droits seront suspendus mais toutes les données resteront conservées.</p>
              </div>
              {canManage && <button className="primary-button" type="button" onClick={() => void openStripePortal()} disabled={openingPortal}>Régulariser le paiement</button>}
            </section>
          )}

          {data.subscription.cancel_at_period_end && (
            <section className="panel subscription-request-banner">
              <span className="subscription-request-icon"><Icon name="clock" size={22} /></span>
              <div>
                <p className="eyebrow">RÉSILIATION PROGRAMMÉE</p>
                <h2>Accès maintenu jusqu’au {dateLabel(data.subscription.current_period_end)}</h2>
                <p>À l’échéance, les droits seront retirés. Les données resteront stockées et seront retrouvées après une réactivation.</p>
              </div>
              {canManage && <button className="secondary-button" type="button" onClick={() => void openStripePortal()} disabled={openingPortal}>Gérer mon abonnement</button>}
            </section>
          )}

          {!data.subscription.access_allowed && (
            <section className="panel subscription-request-banner">
              <span className="subscription-request-icon"><Icon name="lock" size={22} /></span>
              <div>
                <p className="eyebrow">ACCÈS MÉTIER SUSPENDU</p>
                <h2>Vos données sont conservées</h2>
                <p>Aucun client, dossier, document ou historique n’a été supprimé. Régularisez ou réactivez l’offre pour retrouver les fonctions autorisées.</p>
              </div>
              {canManage && data.subscription.provider === 'stripe' && <button className="primary-button" type="button" onClick={() => void openStripePortal()} disabled={openingPortal}>Gérer mon paiement</button>}
            </section>
          )}

          {data.open_request && (
            <section className="panel subscription-request-banner">
              <span className="subscription-request-icon"><Icon name="activity" size={22} /></span>
              <div>
                <p className="eyebrow">DEMANDE EN COURS · {data.open_request.request_reference}</p>
                <h2>{planLabel(data.open_request.current_plan)} → {planLabel(data.open_request.requested_plan)}</h2>
                <p>
                  {data.open_request.effective_at
                    ? `Rétrogradation programmée au ${dateLabel(data.open_request.effective_at)}. Les droits premium changeront à cette date, sans suppression des données.`
                    : `${requestStatusLabel(data.open_request)}. La formule change uniquement après confirmation du paiement.`}
                </p>
              </div>
              <div className="subscription-request-actions">
                {data.open_request.provider === 'stripe' && !data.open_request.effective_at && canManage && (
                  <button className="primary-button" type="button" onClick={() => void resumeStripeCheckout(data.open_request as OpenRequest)} disabled={pendingPlan !== null}>
                    {pendingPlan ? 'Préparation…' : 'Reprendre le paiement'}
                  </button>
                )}
                {data.open_request.provider !== 'stripe' && data.open_request.checkout_url_snapshot && <a className="primary-button" href={data.open_request.checkout_url_snapshot}>Reprendre le paiement</a>}
                {canManage && !data.open_request.effective_at && <button className="secondary-button" type="button" onClick={cancelOpenRequest}>Annuler la demande</button>}
                {canManage && data.open_request.effective_at && <button className="secondary-button" type="button" onClick={() => void openStripePortal()} disabled={openingPortal}>Gérer mon abonnement</button>}
              </div>
            </section>
          )}

          {data.business_type === 'securite' && ['decouverte', 'essentielle'].includes(data.subscription.plan) && <SecurityAddonsPanel />}
          {data.business_type === 'formation' && ['decouverte', 'essentielle'].includes(data.subscription.plan) && <TrainingModulesPanel />}

          <section id="subscription-plans" className="subscription-plans-section">
            <div className="section-heading-row">
              <div><p className="eyebrow">FORMULES</p><h2>Choisir le niveau adapté</h2><p>{usesStripe ? 'Le paiement sécurisé active et synchronise automatiquement l’abonnement.' : 'Le paiement déclenche une demande dont l’activation est validée par NCR Suite.'}</p></div>
            </div>

            <div className="subscription-plan-grid">
              {orderedPlans.map((plan, planIndex) => {
                const current = plan.plan_key === data.subscription.plan;
                const currentIsPaid = current && data.subscription.subscription_status === 'active';
                const isMetier = plan.plan_key === 'metier';
                const domainOffer = data.business_type ? getDomainOffer(data.business_type) : null;
                const enabledFeatures = Object.entries(plan.features).filter(([, active]) => Boolean(active));
                const previousPlan = planIndex > 0 ? orderedPlans[planIndex - 1] : null;
                const previousFeatures = new Set(Object.entries(previousPlan?.features ?? {}).filter(([, active]) => Boolean(active)).map(([feature]) => feature));
                const displayedFeatures = enabledFeatures.filter(([feature]) => !previousFeatures.has(feature));
                const progressiveLabel = planIndex === 0 ? 'SOCLE INCLUS' : `EN PLUS DE ${previousPlan?.display_name.toUpperCase()}`;
                const accessUnit = domainOffer
                  ? (plan.member_limit > 1 ? domainOffer.accessUnitPlural : domainOffer.accessUnitSingular)
                  : 'accès';
                return (
                  <article key={plan.plan_key} className={`subscription-plan-card${current ? ' current' : ''}${plan.recommended ? ' recommended' : ''}`}>
                    {plan.recommended && <span className="subscription-recommended">RECOMMANDÉE</span>}
                    <div className="subscription-plan-card-header">
                      <div><p className="eyebrow">{current ? 'FORMULE ACTUELLE' : 'FORMULE'}</p><h3>{plan.display_name}</h3></div>
                      {current && <Icon name="check" size={20} />}
                    </div>
                    <p className="subscription-plan-description">{plan.short_description}</p>
                    <strong className="subscription-card-price">{isMetier ? `À partir de ${money(plan.monthly_price_cents)}` : money(plan.monthly_price_cents)}<small>{isMetier ? ' HT / mois · sur étude' : ' HT / mois'}</small></strong>
                    {progressiveLabel && <p className="eyebrow">{progressiveLabel}</p>}
                    <ul>
                      <li><Icon name="users" size={16} /> {planIndex > 0 ? `Passe à ${plan.member_limit} ${accessUnit}` : `Jusqu’à ${plan.member_limit} ${accessUnit}`}</li>
                      {displayedFeatures.map(([feature]) => <li key={feature}><Icon name="check" size={16} /> {OFFER_FEATURE_LABELS[feature as keyof typeof OFFER_FEATURE_LABELS] ?? feature}</li>)}
                    </ul>
                    <button
                      type="button"
                      className={current ? 'secondary-button full' : 'primary-button full'}
                      disabled={currentIsPaid || !canManage || !plan.checkout_active || Boolean(data.open_request) || pendingPlan !== null}
                      onClick={() => requestPlan(plan)}
                    >
                      {pendingPlan === plan.plan_key ? 'Création de la demande…' : currentIsPaid ? 'Formule active' : !plan.checkout_active ? 'Tarif à configurer' : current ? 'Réactiver cette formule' : 'Choisir cette formule'}
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
