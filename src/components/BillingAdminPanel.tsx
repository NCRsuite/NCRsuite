import { FormEvent, useEffect, useMemo, useState } from 'react';
import { supabase } from '../lib/supabase';
import type { BusinessType, Plan } from '../types';
import { businessPacks } from '../config/businessPacks';
import { Icon } from './Icon';

interface BillingSettings {
  default_provider: 'manual' | 'qonto' | 'stripe';
  default_trial_days: number;
  default_trial_plan: Plan;
  terms_version: string;
  terms_text: string;
  cancellation_text: string;
  stripe_livemode: boolean;
  grace_period_days: number;
  payment_required_before_access: boolean;
  downgrade_at_period_end: boolean;
  qonto_exceptional_payment_url: string | null;
  qonto_exceptional_instructions: string;
}

interface TrialPolicy {
  enabled: boolean;
  trial_days: number;
  payment_required_before_access: boolean;
  manual_review: boolean;
  plan_mode: 'requested_plan';
  data_retention_mode: 'preserve';
}

interface ActiveTrialOrganization {
  id: string;
  name: string;
  business_type: BusinessType;
  plan: Plan;
  organization_status: 'trial';
  subscription_status: 'trialing' | string;
  trial_ends_at: string | null;
  owner_email: string | null;
  active_members: number;
  last_activity_at: string | null;
}

interface BillingPlanLink {
  business_type: string;
  business_type_label: string;
  plan_key: Plan;
  display_name: string;
  monthly_price_cents: number;
  member_limit: number;
  provider: 'manual' | 'qonto' | 'stripe';
  checkout_url: string | null;
  active: boolean;
  sort_order: number;
  stripe_price_id: string | null;
  stripe_livemode: boolean;
}

interface BillingDomain {
  business_type: string;
  display_name: string;
}

interface BillingConfiguration {
  settings: BillingSettings;
  domains: BillingDomain[];
  plans: BillingPlanLink[];
}

interface SubscriptionRequest {
  id: string;
  organization_id: string;
  organization_name: string;
  owner_email: string | null;
  current_plan: Plan;
  requested_plan: Plan;
  request_type: 'upgrade' | 'downgrade' | 'reactivation' | 'metier';
  status: 'payment_pending' | 'pending_review' | 'approved' | 'rejected' | 'canceled';
  provider: 'manual' | 'qonto' | 'stripe';
  request_reference: string;
  provider_payment_reference: string | null;
  created_at: string;
  review_note: string | null;
  effective_at?: string | null;
}

interface SecurityAddonLink {
  addon_key: string;
  display_name: string;
  short_description: string;
  monthly_price_cents: number;
  available_plans: Plan[];
  provider: 'manual' | 'qonto' | 'stripe';
  checkout_url: string | null;
  checkout_active: boolean;
  sort_order: number;
  stripe_price_id: string | null;
  stripe_livemode: boolean;
}

interface SecurityAddonConfiguration {
  addons: SecurityAddonLink[];
}

interface SecurityAddonRequest {
  id: string;
  organization_id: string;
  organization_name: string;
  owner_email: string | null;
  addon_key: string;
  addon_name: string;
  action: 'add' | 'remove';
  status: 'payment_pending' | 'pending_review' | 'approved' | 'rejected' | 'canceled';
  provider: 'manual' | 'qonto' | 'stripe';
  request_reference: string;
  provider_payment_reference: string | null;
  created_at: string;
  review_note: string | null;
}

interface TrainingModuleLink {
  module_key: string;
  display_name: string;
  short_description: string;
  monthly_price_cents: number;
  available_plans: Plan[];
  provider: 'manual' | 'qonto' | 'stripe';
  checkout_url: string | null;
  checkout_active: boolean;
  sort_order: number;
  stripe_price_id: string | null;
  stripe_livemode: boolean;
}

interface TrainingModuleConfiguration {
  modules: TrainingModuleLink[];
}

interface TrainingModuleRequest {
  id: string;
  organization_id: string;
  organization_name: string;
  owner_email: string | null;
  module_key: string;
  module_name: string;
  action: 'add' | 'remove';
  status: 'payment_pending' | 'pending_review' | 'approved' | 'rejected' | 'canceled';
  provider: 'manual' | 'qonto' | 'stripe';
  request_reference: string;
  provider_payment_reference: string | null;
  created_at: string;
  review_note: string | null;
}

const planLabels: Record<Plan, string> = {
  decouverte: 'Découverte',
  essentielle: 'Essentielle',
  professionnelle: 'Professionnelle',
  metier: 'Métier'
};

function money(cents: number) {
  return new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR' }).format((cents || 0) / 100);
}

function dateLabel(value: string) {
  return new Intl.DateTimeFormat('fr-FR', { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(value));
}

function trialDaysRemaining(value: string | null) {
  if (!value) return 0;
  return Math.max(0, Math.ceil((new Date(value).getTime() - Date.now()) / 86400000));
}

export function BillingAdminPanel({ canManage, onChanged, onOpenOrganization }: { canManage: boolean; onChanged?: () => void; onOpenOrganization?: (organizationId: string) => void }) {
  const [billingView, setBillingView] = useState<'operations' | 'catalogue' | 'settings'>('operations');
  const [configuration, setConfiguration] = useState<BillingConfiguration | null>(null);
  const [trialPolicy, setTrialPolicy] = useState<TrialPolicy | null>(null);
  const [trialDaysDraft, setTrialDaysDraft] = useState(7);
  const [activeTrials, setActiveTrials] = useState<ActiveTrialOrganization[]>([]);
  const [requests, setRequests] = useState<SubscriptionRequest[]>([]);
  const [securityAddonConfiguration, setSecurityAddonConfiguration] = useState<SecurityAddonConfiguration>({ addons: [] });
  const [securityAddonRequests, setSecurityAddonRequests] = useState<SecurityAddonRequest[]>([]);
  const [trainingModuleConfiguration, setTrainingModuleConfiguration] = useState<TrainingModuleConfiguration>({ modules: [] });
  const [trainingModuleRequests, setTrainingModuleRequests] = useState<TrainingModuleRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState('');
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [paymentReferences, setPaymentReferences] = useState<Record<string, string>>({});
  const [reviewNotes, setReviewNotes] = useState<Record<string, string>>({});
  const [selectedBusinessType, setSelectedBusinessType] = useState('coiffure');

  const openRequests = useMemo(
    () => requests.filter((request) => ['payment_pending', 'pending_review'].includes(request.status)),
    [requests]
  );

  const openSecurityAddonRequests = useMemo(
    () => securityAddonRequests.filter((request) => ['payment_pending', 'pending_review'].includes(request.status)),
    [securityAddonRequests]
  );

  const openTrainingModuleRequests = useMemo(
    () => trainingModuleRequests.filter((request) => ['payment_pending', 'pending_review'].includes(request.status)),
    [trainingModuleRequests]
  );

  const pendingOperations = openRequests.length + openSecurityAddonRequests.length + openTrainingModuleRequests.length;

  const visiblePlans = useMemo(
    () => (configuration?.plans ?? [])
      .filter((plan) => plan.business_type === selectedBusinessType)
      .sort((a, b) => a.sort_order - b.sort_order),
    [configuration?.plans, selectedBusinessType]
  );

  async function load() {
    if (!supabase) return;
    setLoading(true);
    setError('');
    const [
      configurationResult,
      requestsResult,
      addonConfigurationResult,
      addonRequestsResult,
      trainingConfigurationResult,
      trainingRequestsResult,
      trialPolicyResult,
      activeTrialsResult
    ] = await Promise.all([
      supabase.rpc('admin_billing_configuration'),
      supabase.rpc('admin_list_subscription_requests', { p_status: null }),
      supabase.rpc('admin_security_addon_configuration'),
      supabase.rpc('admin_list_security_addon_requests', { p_status: null }),
      supabase.rpc('admin_training_module_configuration'),
      supabase.rpc('admin_list_training_module_requests', { p_status: null }),
      supabase.rpc('admin_get_trial_policy'),
      supabase.rpc('admin_list_organizations', { p_search: null, p_plan: null, p_status: 'trial' })
    ]);
    if (configurationResult.error) setError(configurationResult.error.message);
    else {
      const next = configurationResult.data as BillingConfiguration;
      setConfiguration(next);
      if (next.domains?.length && !next.domains.some((domain) => domain.business_type === selectedBusinessType)) {
        setSelectedBusinessType(next.domains[0].business_type);
      }
    }
    if (requestsResult.error) setError(requestsResult.error.message);
    else setRequests((requestsResult.data ?? []) as SubscriptionRequest[]);
    if (addonConfigurationResult.error) setError(addonConfigurationResult.error.message);
    else setSecurityAddonConfiguration((addonConfigurationResult.data ?? { addons: [] }) as SecurityAddonConfiguration);
    if (addonRequestsResult.error) setError(addonRequestsResult.error.message);
    else setSecurityAddonRequests((addonRequestsResult.data ?? []) as SecurityAddonRequest[]);
    if (trainingConfigurationResult.error) setError(trainingConfigurationResult.error.message);
    else setTrainingModuleConfiguration((trainingConfigurationResult.data ?? { modules: [] }) as TrainingModuleConfiguration);
    if (trainingRequestsResult.error) setError(trainingRequestsResult.error.message);
    else setTrainingModuleRequests((trainingRequestsResult.data ?? []) as TrainingModuleRequest[]);
    if (trialPolicyResult.error) setError(trialPolicyResult.error.message);
    else {
      const nextTrialPolicy = trialPolicyResult.data as TrialPolicy;
      setTrialPolicy(nextTrialPolicy);
      setTrialDaysDraft(nextTrialPolicy?.trial_days ?? 7);
    }
    if (activeTrialsResult.error) setError(activeTrialsResult.error.message);
    else {
      const rows = (Array.isArray(activeTrialsResult.data) ? activeTrialsResult.data : []) as ActiveTrialOrganization[];
      setActiveTrials(rows.sort((a, b) => new Date(a.trial_ends_at ?? '9999-12-31').getTime() - new Date(b.trial_ends_at ?? '9999-12-31').getTime()));
    }
    setLoading(false);
  }

  useEffect(() => {
    void load();
  }, []);

  function updatePlanLocal(businessType: string, planKey: Plan, updates: Partial<BillingPlanLink>) {
    setConfiguration((current) => current ? {
      ...current,
      plans: current.plans.map((plan) => plan.business_type === businessType && plan.plan_key === planKey ? { ...plan, ...updates } : plan)
    } : current);
  }

  async function savePlanLink(plan: BillingPlanLink) {
    if (!supabase || !canManage) return;
    setSaving(`plan-${plan.business_type}-${plan.plan_key}`);
    setMessage('');
    setError('');
    const { error: requestError } = await supabase.rpc('admin_update_stripe_catalog_item', {
      p_item_type: 'plan',
      p_business_type: plan.business_type,
      p_item_key: plan.plan_key,
      p_stripe_price_id: plan.stripe_price_id || null,
      p_livemode: configuration?.settings.stripe_livemode ?? false,
      p_active: plan.active
    });
    setSaving('');
    if (requestError) setError(requestError.message);
    else {
      setMessage(`Le paiement ${plan.display_name} — ${plan.business_type_label} a été configuré.`);
      await load();
    }
  }

  async function saveTrialPolicy() {
    if (!supabase || !canManage) return;
    const days = Math.max(0, Math.min(30, Math.round(trialDaysDraft)));
    setSaving('trial-policy');
    setMessage('');
    setError('');
    const { data, error: requestError } = await supabase.rpc('admin_update_trial_policy', { p_trial_days: days });
    setSaving('');
    if (requestError) { setError(requestError.message); return; }
    const next = data as TrialPolicy;
    setTrialPolicy(next);
    setTrialDaysDraft(next?.trial_days ?? days);
    setMessage(days > 0 ? `L’essai public est configuré sur ${days} jours, sans carte bancaire avant l’accès.` : 'L’essai public est désactivé.');
    await load();
    onChanged?.();
  }

  async function saveSettings(event?: FormEvent) {
    event?.preventDefault();
    if (!supabase || !canManage || !configuration) return;
    setSaving('settings');
    setMessage('');
    setError('');
    const settings = configuration.settings;
    const { error: requestError } = await supabase.rpc('admin_update_billing_settings_v2', {
      p_stripe_livemode: settings.stripe_livemode,
      p_grace_period_days: settings.grace_period_days,
      p_payment_required_before_access: settings.payment_required_before_access,
      p_downgrade_at_period_end: settings.downgrade_at_period_end,
      p_terms_version: settings.terms_version,
      p_terms_text: settings.terms_text,
      p_cancellation_text: settings.cancellation_text,
      p_qonto_exceptional_payment_url: settings.qonto_exceptional_payment_url || null,
      p_qonto_exceptional_instructions: settings.qonto_exceptional_instructions
    });
    setSaving('');
    if (requestError) setError(requestError.message);
    else {
      setMessage('Les règles de facturation ont été enregistrées.');
      await load();
    }
  }

  async function reviewRequest(request: SubscriptionRequest, decision: 'approve' | 'reject') {
    if (!supabase || !canManage) return;
    setSaving(`request-${request.id}`);
    setMessage('');
    setError('');
    const { error: requestError } = await supabase.rpc('admin_review_subscription_request', {
      p_request_id: request.id,
      p_decision: decision,
      p_note: reviewNotes[request.id]?.trim() || null,
      p_provider_payment_reference: paymentReferences[request.id]?.trim() || null
    });
    setSaving('');
    if (requestError) setError(requestError.message);
    else {
      setMessage(decision === 'approve' ? `La formule de ${request.organization_name} est activée.` : `La demande de ${request.organization_name} est refusée.`);
      await load();
      onChanged?.();
    }
  }

  function updateSecurityAddonLocal(addonKey: string, updates: Partial<SecurityAddonLink>) {
    setSecurityAddonConfiguration((current) => ({
      ...current,
      addons: current.addons.map((addon) => addon.addon_key === addonKey ? { ...addon, ...updates } : addon)
    }));
  }

  async function saveSecurityAddonLink(addon: SecurityAddonLink) {
    if (!supabase || !canManage) return;
    setSaving(`addon-link-${addon.addon_key}`);
    setMessage('');
    setError('');
    const { error: requestError } = await supabase.rpc('admin_update_stripe_catalog_item', {
      p_item_type: 'security_addon',
      p_business_type: 'securite',
      p_item_key: addon.addon_key,
      p_stripe_price_id: addon.stripe_price_id || null,
      p_livemode: configuration?.settings.stripe_livemode ?? false,
      p_active: addon.checkout_active
    });
    setSaving('');
    if (requestError) setError(requestError.message);
    else {
      setMessage(`Le paiement du module ${addon.display_name} a été configuré.`);
      await load();
    }
  }

  async function reviewSecurityAddonRequest(request: SecurityAddonRequest, decision: 'approve' | 'reject') {
    if (!supabase || !canManage) return;
    setSaving(`addon-request-${request.id}`);
    setMessage('');
    setError('');
    const { error: requestError } = await supabase.rpc('admin_review_security_addon_request', {
      p_request_id: request.id,
      p_decision: decision,
      p_note: reviewNotes[request.id]?.trim() || null,
      p_provider_payment_reference: paymentReferences[request.id]?.trim() || null
    });
    setSaving('');
    if (requestError) setError(requestError.message);
    else {
      setMessage(decision === 'approve'
        ? `${request.addon_name} a été ${request.action === 'add' ? 'activé' : 'retiré'} pour ${request.organization_name}.`
        : `La demande de module de ${request.organization_name} a été refusée.`);
      await load();
      onChanged?.();
    }
  }

  function updateTrainingModuleLocal(moduleKey: string, updates: Partial<TrainingModuleLink>) {
    setTrainingModuleConfiguration((current) => ({
      ...current,
      modules: current.modules.map((module) => module.module_key === moduleKey ? { ...module, ...updates } : module)
    }));
  }

  async function saveTrainingModuleLink(module: TrainingModuleLink) {
    if (!supabase || !canManage) return;
    setSaving(`training-module-link-${module.module_key}`);
    setMessage('');
    setError('');
    const { error: requestError } = await supabase.rpc('admin_update_stripe_catalog_item', {
      p_item_type: 'training_module',
      p_business_type: 'formation',
      p_item_key: module.module_key,
      p_stripe_price_id: module.stripe_price_id || null,
      p_livemode: configuration?.settings.stripe_livemode ?? false,
      p_active: module.checkout_active
    });
    setSaving('');
    if (requestError) setError(requestError.message);
    else {
      setMessage(`Le paiement du module ${module.display_name} a été configuré.`);
      await load();
    }
  }

  async function reviewTrainingModuleRequest(request: TrainingModuleRequest, decision: 'approve' | 'reject') {
    if (!supabase || !canManage) return;
    setSaving(`training-module-request-${request.id}`);
    setMessage('');
    setError('');
    const { error: requestError } = await supabase.rpc('admin_review_training_module_request', {
      p_request_id: request.id,
      p_decision: decision,
      p_note: reviewNotes[request.id]?.trim() || null,
      p_provider_payment_reference: paymentReferences[request.id]?.trim() || null
    });
    setSaving('');
    if (requestError) setError(requestError.message);
    else {
      setMessage(decision === 'approve'
        ? `${request.module_name} a été ${request.action === 'add' ? 'activé' : 'retiré'} pour ${request.organization_name}.`
        : `La demande de module Formation de ${request.organization_name} a été refusée.`);
      await load();
      onChanged?.();
    }
  }

  if (loading) return <section className="panel billing-admin-loading">Chargement de la facturation…</section>;
  if (!configuration) return <section className="panel"><div className="error-message">Configuration de facturation indisponible.</div></section>;

  return (
    <section className="billing-admin-section">
      <div className="billing-admin-heading">
        <div><p className="eyebrow">ABONNEMENTS & STRIPE</p><h2>Pilotage commercial</h2><p>Traite d’abord ce qui demande une action. Les réglages Stripe et les paramètres avancés restent disponibles sans encombrer la vue quotidienne.</p></div>
        <button className="secondary-button" type="button" onClick={load}>Actualiser</button>
      </div>

      <nav className="billing-admin-view-tabs" aria-label="Sections de la facturation NCR">
        <button type="button" className={billingView === 'operations' ? 'active' : ''} onClick={() => setBillingView('operations')}><Icon name="activity" size={16} /><span><strong>À traiter</strong><small>Essais et demandes</small></span>{pendingOperations > 0 && <b>{pendingOperations}</b>}</button>
        <button type="button" className={billingView === 'catalogue' ? 'active' : ''} onClick={() => setBillingView('catalogue')}><Icon name="creditCard" size={16} /><span><strong>Catalogue Stripe</strong><small>Prix et modules</small></span></button>
        <button type="button" className={billingView === 'settings' ? 'active' : ''} onClick={() => setBillingView('settings')}><Icon name="settings" size={16} /><span><strong>Règles & paramètres</strong><small>Essai, impayés, conditions</small></span></button>
      </nav>

      {error && <div className="error-message page-message" role="alert">{error}</div>}
      {message && <div className="success-message page-message" role="status">{message}</div>}

      <div className="billing-admin-grid">
        <article className={`panel billing-requests-panel${billingView !== 'operations' ? ' billing-view-hidden' : ''}`}>
          <div className="panel-header"><div><p className="eyebrow">À TRAITER</p><h3>Demandes d’abonnement</h3></div><span>{openRequests.length}</span></div>
          {openRequests.length === 0 ? <div className="admin-empty-state">Aucune demande en attente.</div> : (
            <div className="billing-request-list">
              {openRequests.map((request) => (
                <article key={request.id} className="billing-request-card">
                  <div className="billing-request-top">
                    <span className="admin-company-avatar">{request.organization_name.slice(0, 1).toUpperCase()}</span>
                    <div><strong>{request.organization_name}</strong><small>{request.owner_email || 'E-mail propriétaire non disponible'}</small></div>
                    <span className={`admin-status-pill ${request.status === 'payment_pending' ? 'warning' : 'positive'}`}>{request.provider === 'stripe' ? (request.effective_at ? 'Changement programmé' : 'Synchronisation Stripe') : request.status === 'payment_pending' ? 'Paiement à vérifier' : 'Étude manuelle'}</span>
                  </div>
                  <div className="billing-request-route"><b>{planLabels[request.current_plan]}</b><Icon name="chevronRight" size={18} /><b>{planLabels[request.requested_plan]}</b></div>
                  <p>Référence <strong>{request.request_reference}</strong> · {request.provider === 'qonto' ? 'Qonto' : request.provider} · {dateLabel(request.created_at)}</p>
                  {request.status === 'payment_pending' && request.provider !== 'stripe' && (
                    <label>Référence du paiement Qonto (facultatif)<input value={paymentReferences[request.id] ?? ''} onChange={(event) => setPaymentReferences((current) => ({ ...current, [request.id]: event.target.value }))} placeholder="Ex. identifiant visible dans Qonto" disabled={!canManage} /></label>
                  )}
                  <label>Note interne<textarea rows={2} value={reviewNotes[request.id] ?? ''} onChange={(event) => setReviewNotes((current) => ({ ...current, [request.id]: event.target.value }))} placeholder="Vérification, échange client…" disabled={!canManage} /></label>
                  {request.provider === 'stripe' && <div className="info-message">{request.effective_at ? `Application automatique le ${dateLabel(request.effective_at)}. Les données premium restent conservées.` : 'Stripe validera automatiquement cette demande après le paiement.'}</div>}
                  {canManage && request.provider !== 'stripe' && (
                    <div className="billing-request-buttons">
                      <button className="primary-button" type="button" onClick={() => reviewRequest(request, 'approve')} disabled={saving === `request-${request.id}`}>{saving === `request-${request.id}` ? 'Traitement…' : 'Valider et activer'}</button>
                      <button className="secondary-button danger" type="button" onClick={() => reviewRequest(request, 'reject')} disabled={saving === `request-${request.id}`}>Refuser</button>
                    </div>
                  )}
                </article>
              ))}
            </div>
          )}
        </article>

        <article className={`panel billing-links-panel${billingView !== 'catalogue' ? ' billing-view-hidden' : ''}`}>
          <div className="panel-header billing-domain-header">
            <div><p className="eyebrow">PRIX RÉCURRENTS</p><h3>Formules Stripe par domaine</h3></div>
            <label>Domaine
              <select value={selectedBusinessType} onChange={(event) => setSelectedBusinessType(event.target.value)}>
                {(configuration.domains ?? []).map((domain) => <option key={domain.business_type} value={domain.business_type}>{domain.display_name}</option>)}
              </select>
            </label>
          </div>
          <p className="muted">Saisis le Price ID Stripe correspondant au bon métier et à la bonne formule. Le mode actif est {configuration.settings.stripe_livemode ? 'Production' : 'Test'}.</p>
          <div className="billing-plan-link-list">
            {visiblePlans.map((plan) => (
              <div className="billing-plan-link-row" key={`${plan.business_type}-${plan.plan_key}`}>
                <div><strong>{plan.display_name}</strong><small>{plan.plan_key === 'metier' ? `Base contractuelle ${money(plan.monthly_price_cents)} HT / mois` : `${money(plan.monthly_price_cents)} HT / mois`} · {plan.member_limit} accès</small></div>
                <span className="subscription-provider-badge"><Icon name="creditCard" size={15} /> Stripe</span>
                <input value={plan.stripe_price_id ?? ''} onChange={(event) => updatePlanLocal(plan.business_type, plan.plan_key, { stripe_price_id: event.target.value })} placeholder="price_..." disabled={!canManage} />
                <label className="compact-switch"><input type="checkbox" checked={plan.active} onChange={(event) => updatePlanLocal(plan.business_type, plan.plan_key, { active: event.target.checked })} disabled={!canManage} /><span>{plan.active ? 'Actif' : 'Inactif'}</span></label>
                {canManage && <button className="secondary-button compact-button" type="button" onClick={() => savePlanLink(plan)} disabled={saving === `plan-${plan.business_type}-${plan.plan_key}`}>{saving === `plan-${plan.business_type}-${plan.plan_key}` ? '…' : 'Enregistrer'}</button>}
              </div>
            ))}
          </div>
        </article>
      </div>

      <div className="billing-admin-grid security-addon-admin-grid">
        <article className={`panel billing-requests-panel${billingView !== 'operations' ? ' billing-view-hidden' : ''}`}>
          <div className="panel-header"><div><p className="eyebrow">MODULES SÉCURITÉ</p><h3>Demandes à la carte</h3></div><span>{openSecurityAddonRequests.length}</span></div>
          {openSecurityAddonRequests.length === 0 ? <div className="admin-empty-state">Aucune demande de module en attente.</div> : (
            <div className="billing-request-list">
              {openSecurityAddonRequests.map((request) => (
                <article key={request.id} className="billing-request-card security-addon-admin-request">
                  <div className="billing-request-top">
                    <span className="admin-company-avatar"><Icon name="shield" size={19} /></span>
                    <div><strong>{request.organization_name}</strong><small>{request.owner_email || 'E-mail propriétaire non disponible'}</small></div>
                    <span className={`admin-status-pill ${request.status === 'payment_pending' ? 'warning' : 'positive'}`}>{request.provider === 'stripe' ? 'Synchronisation Stripe' : request.status === 'payment_pending' ? 'Paiement à vérifier' : 'Validation manuelle'}</span>
                  </div>
                  <div className="billing-request-route"><b>{request.action === 'add' ? 'Ajouter' : 'Retirer'}</b><Icon name="chevronRight" size={18} /><b>{request.addon_name}</b></div>
                  <p>Référence <strong>{request.request_reference}</strong> · {request.provider === 'qonto' ? 'Qonto' : request.provider} · {dateLabel(request.created_at)}</p>
                  {request.status === 'payment_pending' && request.provider !== 'stripe' && <label>Référence du paiement Qonto (facultatif)<input value={paymentReferences[request.id] ?? ''} onChange={(event) => setPaymentReferences((current) => ({ ...current, [request.id]: event.target.value }))} placeholder="Identifiant visible dans Qonto" disabled={!canManage} /></label>}
                  <label>Note interne<textarea rows={2} value={reviewNotes[request.id] ?? ''} onChange={(event) => setReviewNotes((current) => ({ ...current, [request.id]: event.target.value }))} placeholder="Contrôle ou échange avec le client…" disabled={!canManage} /></label>
                  {request.provider === 'stripe' && <div className="info-message">Le webhook Stripe activera ou retirera ce module automatiquement. Les données du module ne seront pas supprimées.</div>}
                  {canManage && request.provider !== 'stripe' && <div className="billing-request-buttons"><button className="primary-button" type="button" onClick={() => reviewSecurityAddonRequest(request, 'approve')} disabled={saving === `addon-request-${request.id}`}>{saving === `addon-request-${request.id}` ? 'Traitement…' : request.action === 'add' ? 'Valider et activer' : 'Valider le retrait'}</button><button className="secondary-button danger" type="button" onClick={() => reviewSecurityAddonRequest(request, 'reject')} disabled={saving === `addon-request-${request.id}`}>Refuser</button></div>}
                </article>
              ))}
            </div>
          )}
        </article>

        <article className={`panel billing-links-panel${billingView !== 'catalogue' ? ' billing-view-hidden' : ''}`}>
          <div className="panel-header"><div><p className="eyebrow">PRIX RÉCURRENTS</p><h3>Modules Stripe Sécurité</h3></div></div>
          <p className="muted">Chaque module actif doit posséder son propre Price ID récurrent Stripe.</p>
          <div className="billing-plan-link-list">
            {securityAddonConfiguration.addons.map((addon) => (
              <div className="billing-plan-link-row" key={addon.addon_key}>
                <div><strong>{addon.display_name}</strong><small>{money(addon.monthly_price_cents)} HT / mois · {addon.available_plans.map((plan) => planLabels[plan]).join(', ')}</small></div>
                <span className="subscription-provider-badge"><Icon name="creditCard" size={15} /> Stripe</span>
                <input value={addon.stripe_price_id ?? ''} onChange={(event) => updateSecurityAddonLocal(addon.addon_key, { stripe_price_id: event.target.value })} placeholder="price_..." disabled={!canManage} />
                <label className="compact-switch"><input type="checkbox" checked={addon.checkout_active} onChange={(event) => updateSecurityAddonLocal(addon.addon_key, { checkout_active: event.target.checked })} disabled={!canManage} /><span>{addon.checkout_active ? 'Actif' : 'Inactif'}</span></label>
                {canManage && <button className="secondary-button compact-button" type="button" onClick={() => saveSecurityAddonLink(addon)} disabled={saving === `addon-link-${addon.addon_key}`}>{saving === `addon-link-${addon.addon_key}` ? '…' : 'Enregistrer'}</button>}
              </div>
            ))}
          </div>
        </article>
      </div>

      <div className="billing-admin-grid security-addon-admin-grid training-module-admin-grid">
        <article className={`panel billing-requests-panel${billingView !== 'operations' ? ' billing-view-hidden' : ''}`}>
          <div className="panel-header"><div><p className="eyebrow">MODULES FORMATION</p><h3>Demandes à la carte</h3></div><span>{openTrainingModuleRequests.length}</span></div>
          {openTrainingModuleRequests.length === 0 ? <div className="admin-empty-state">Aucune demande de module Formation en attente.</div> : (
            <div className="billing-request-list">
              {openTrainingModuleRequests.map((request) => (
                <article key={request.id} className="billing-request-card security-addon-admin-request">
                  <div className="billing-request-top">
                    <span className="admin-company-avatar"><Icon name="graduation" size={19} /></span>
                    <div><strong>{request.organization_name}</strong><small>{request.owner_email || 'E-mail propriétaire non disponible'}</small></div>
                    <span className={`admin-status-pill ${request.status === 'payment_pending' ? 'warning' : 'positive'}`}>{request.provider === 'stripe' ? 'Synchronisation Stripe' : request.status === 'payment_pending' ? 'Paiement à vérifier' : 'Validation manuelle'}</span>
                  </div>
                  <div className="billing-request-route"><b>{request.action === 'add' ? 'Ajouter' : 'Retirer'}</b><Icon name="chevronRight" size={18} /><b>{request.module_name}</b></div>
                  <p>Référence <strong>{request.request_reference}</strong> · {request.provider === 'qonto' ? 'Qonto' : request.provider} · {dateLabel(request.created_at)}</p>
                  {request.status === 'payment_pending' && request.provider !== 'stripe' && <label>Référence du paiement Qonto (facultatif)<input value={paymentReferences[request.id] ?? ''} onChange={(event) => setPaymentReferences((current) => ({ ...current, [request.id]: event.target.value }))} placeholder="Identifiant visible dans Qonto" disabled={!canManage} /></label>}
                  <label>Note interne<textarea rows={2} value={reviewNotes[request.id] ?? ''} onChange={(event) => setReviewNotes((current) => ({ ...current, [request.id]: event.target.value }))} placeholder="Contrôle ou échange avec le client…" disabled={!canManage} /></label>
                  {request.provider === 'stripe' && <div className="info-message">Le webhook Stripe activera ou retirera ce module automatiquement. Les données du module ne seront pas supprimées.</div>}
                  {canManage && request.provider !== 'stripe' && <div className="billing-request-buttons"><button className="primary-button" type="button" onClick={() => reviewTrainingModuleRequest(request, 'approve')} disabled={saving === `training-module-request-${request.id}`}>{saving === `training-module-request-${request.id}` ? 'Traitement…' : request.action === 'add' ? 'Valider et activer' : 'Valider le retrait'}</button><button className="secondary-button danger" type="button" onClick={() => reviewTrainingModuleRequest(request, 'reject')} disabled={saving === `training-module-request-${request.id}`}>Refuser</button></div>}
                </article>
              ))}
            </div>
          )}
        </article>

        <article className={`panel billing-links-panel${billingView !== 'catalogue' ? ' billing-view-hidden' : ''}`}>
          <div className="panel-header"><div><p className="eyebrow">PRIX RÉCURRENTS</p><h3>Modules Stripe Formation</h3></div></div>
          <p className="muted">Chaque module actif doit posséder son propre Price ID récurrent Stripe.</p>
          <div className="billing-plan-link-list">
            {trainingModuleConfiguration.modules.map((module) => (
              <div className="billing-plan-link-row" key={module.module_key}>
                <div><strong>{module.display_name}</strong><small>{money(module.monthly_price_cents)} HT / mois · {module.available_plans.map((plan) => planLabels[plan]).join(', ')}</small></div>
                <span className="subscription-provider-badge"><Icon name="creditCard" size={15} /> Stripe</span>
                <input value={module.stripe_price_id ?? ''} onChange={(event) => updateTrainingModuleLocal(module.module_key, { stripe_price_id: event.target.value })} placeholder="price_..." disabled={!canManage} />
                <label className="compact-switch"><input type="checkbox" checked={module.checkout_active} onChange={(event) => updateTrainingModuleLocal(module.module_key, { checkout_active: event.target.checked })} disabled={!canManage} /><span>{module.checkout_active ? 'Actif' : 'Inactif'}</span></label>
                {canManage && <button className="secondary-button compact-button" type="button" onClick={() => saveTrainingModuleLink(module)} disabled={saving === `training-module-link-${module.module_key}`}>{saving === `training-module-link-${module.module_key}` ? '…' : 'Enregistrer'}</button>}
              </div>
            ))}
          </div>
        </article>
      </div>

      <section className={`panel billing-settings-panel admin-trial-policy-panel${billingView !== 'settings' ? ' billing-view-hidden' : ''}`}>
        <div className="panel-header"><div><p className="eyebrow">ESSAIS & CONVERSION</p><h3>Essai public contrôlé</h3><p>Le prospect teste exactement l’offre demandée. NCR valide d’abord la demande, aucune carte bancaire n’est requise avant l’essai et les données restent conservées après expiration.</p></div><span className={`admin-status-pill ${trialPolicy?.enabled ? 'positive' : 'warning'}`}>{trialPolicy?.enabled ? 'ACTIF' : 'DÉSACTIVÉ'}</span></div>
        <div className="admin-trial-policy-grid">
          <label>Durée de l’essai<div className="admin-space-unit-field"><input type="number" min={0} max={30} value={trialDaysDraft} onChange={(event) => setTrialDaysDraft(Number(event.target.value))} disabled={!canManage} /><span>jours</span></div><small>0 désactive l’essai public. Valeur recommandée au lancement : 7 jours.</small></label>
          <div className="admin-trial-policy-facts">
            <span><Icon name="check" size={16} /><b>Validation NCR</b><small>Obligatoire avant ouverture</small></span>
            <span><Icon name="creditCard" size={16} /><b>Carte bancaire</b><small>Non demandée avant l’essai</small></span>
            <span><Icon name="clipboard" size={16} /><b>Formule testée</b><small>Offre choisie par le prospect</small></span>
            <span><Icon name="lock" size={16} /><b>Données</b><small>Conservées après expiration</small></span>
          </div>
        </div>
        {canManage && <button className="primary-button" type="button" onClick={() => void saveTrialPolicy()} disabled={saving === 'trial-policy'}>{saving === 'trial-policy' ? 'Enregistrement…' : 'Enregistrer la politique d’essai'}</button>}
      </section>

      <section className={`panel billing-settings-panel admin-active-trials-panel${billingView !== 'operations' ? ' billing-view-hidden' : ''}`}>
        <div className="panel-header"><div><p className="eyebrow">ESSAIS EN COURS</p><h3>{activeTrials.length} espace{activeTrials.length > 1 ? 's' : ''} en période d’essai</h3><p>Les essais les plus proches de leur échéance remontent en premier pour te permettre d’agir sans chercher l’entreprise ailleurs.</p></div></div>
        {activeTrials.length === 0 ? (
          <div className="admin-positive-empty"><Icon name="check" size={24} /><div><strong>Aucun essai actif</strong><small>Les prochains espaces validés en essai apparaîtront automatiquement ici.</small></div></div>
        ) : (
          <div className="admin-active-trials-list">
            {activeTrials.map((organization) => {
              const days = trialDaysRemaining(organization.trial_ends_at);
              return <div className={`admin-active-trial-row${days <= 3 ? ' ending' : ''}`} key={organization.id}>
                <span className="admin-active-trial-icon"><Icon name={businessPacks[organization.business_type].icon} size={18} /></span>
                <span className="admin-active-trial-company"><strong>{organization.name}</strong><small>{businessPacks[organization.business_type].label} · {planLabels[organization.plan]} · {organization.owner_email || 'propriétaire non identifié'}</small></span>
                <span className="admin-active-trial-usage"><small>Utilisateurs</small><strong>{organization.active_members}</strong></span>
                <span className={`admin-active-trial-days${days <= 3 ? ' warning' : ''}`}><small>Fin d’essai</small><strong>J-{days}</strong><em>{organization.trial_ends_at ? dateLabel(organization.trial_ends_at) : 'À définir'}</em></span>
                {onOpenOrganization && <button type="button" className="secondary-button compact" onClick={() => onOpenOrganization(organization.id)}>Gérer</button>}
              </div>;
            })}
          </div>
        )}
      </section>

      <form className={`panel billing-settings-panel${billingView !== 'settings' ? ' billing-view-hidden' : ''}`} onSubmit={saveSettings}>
        <div className="panel-header"><div><p className="eyebrow">RÈGLES COMMERCIALES</p><h3>Stripe, impayés et conditions</h3></div></div>
        <div className="admin-form-grid">
          <label>Environnement Stripe<select value={configuration.settings.stripe_livemode ? 'live' : 'test'} onChange={(event) => setConfiguration({ ...configuration, settings: { ...configuration.settings, stripe_livemode: event.target.value === 'live' } })} disabled={!canManage}><option value="test">Test</option><option value="live">Production</option></select></label>
          <label>Délai de grâce en cas d’impayé<input type="number" min={0} max={30} value={configuration.settings.grace_period_days} onChange={(event) => setConfiguration({ ...configuration, settings: { ...configuration.settings, grace_period_days: Number(event.target.value) } })} disabled={!canManage} /><small>Après ce délai, les droits sont bloqués mais les données restent conservées.</small></label>
          <div className="admin-trial-rule-summary"><Icon name="lock" size={17} /><span><strong>Accès d’essai sans carte bancaire</strong><small>Les demandes d’essai validées par NCR accèdent à l’offre choisie pendant la durée définie ci-dessus.</small></span></div>
          <label className="compact-switch"><input type="checkbox" checked={configuration.settings.downgrade_at_period_end} onChange={(event) => setConfiguration({ ...configuration, settings: { ...configuration.settings, downgrade_at_period_end: event.target.checked } })} disabled={!canManage} /><span>Rétrogradation à l’échéance</span></label>
          <label>Version des conditions<input value={configuration.settings.terms_version} onChange={(event) => setConfiguration({ ...configuration, settings: { ...configuration.settings, terms_version: event.target.value } })} disabled={!canManage} /></label>
          <label className="full-field">Conditions d’abonnement<textarea rows={4} maxLength={5000} value={configuration.settings.terms_text} onChange={(event) => setConfiguration({ ...configuration, settings: { ...configuration.settings, terms_text: event.target.value } })} disabled={!canManage} /></label>
          <label className="full-field">Conditions de résiliation<textarea rows={4} maxLength={5000} value={configuration.settings.cancellation_text} onChange={(event) => setConfiguration({ ...configuration, settings: { ...configuration.settings, cancellation_text: event.target.value } })} disabled={!canManage} /></label>
        </div>
        {canManage && <button className="primary-button" type="submit" disabled={saving === 'settings'}>{saving === 'settings' ? 'Enregistrement…' : 'Enregistrer les règles'}</button>}
      </form>

      <article className={`panel billing-settings-panel${billingView !== 'settings' ? ' billing-view-hidden' : ''}`}>
        <div className="panel-header"><div><p className="eyebrow">PAIEMENTS EXCEPTIONNELS</p><h3>Qonto hors abonnement</h3></div></div>
        <div className="admin-form-grid">
          <label className="full-field">Lien Qonto exceptionnel<input type="url" value={configuration.settings.qonto_exceptional_payment_url ?? ''} onChange={(event) => setConfiguration({ ...configuration, settings: { ...configuration.settings, qonto_exceptional_payment_url: event.target.value } })} placeholder="https://pay.qonto.com/..." disabled={!canManage} /></label>
          <label className="full-field">Utilisation autorisée<textarea rows={3} maxLength={3000} value={configuration.settings.qonto_exceptional_instructions} onChange={(event) => setConfiguration({ ...configuration, settings: { ...configuration.settings, qonto_exceptional_instructions: event.target.value } })} disabled={!canManage} /></label>
        </div>
        <p className="muted">Réservé aux prestations sur devis, installations, paramétrages, formations personnalisées, factures ponctuelles et virements convenus. Ce lien ne pilote aucun droit dans NCR Suite.</p>
        {canManage && <button className="primary-button" type="button" onClick={() => void saveSettings()} disabled={saving === 'settings'}>{saving === 'settings' ? 'Enregistrement…' : 'Enregistrer Qonto exceptionnel'}</button>}
      </article>
    </section>
  );
}
