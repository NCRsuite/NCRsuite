import { FormEvent, useEffect, useMemo, useState } from 'react';
import { supabase } from '../lib/supabase';
import type { Plan } from '../types';
import { Icon } from './Icon';

interface BillingSettings {
  default_provider: 'manual' | 'qonto' | 'stripe';
  default_trial_days: number;
  default_trial_plan: Plan;
  terms_version: string;
  terms_text: string;
  cancellation_text: string;
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

export function BillingAdminPanel({ canManage, onChanged }: { canManage: boolean; onChanged?: () => void }) {
  const [configuration, setConfiguration] = useState<BillingConfiguration | null>(null);
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
      trainingRequestsResult
    ] = await Promise.all([
      supabase.rpc('admin_billing_configuration'),
      supabase.rpc('admin_list_subscription_requests', { p_status: null }),
      supabase.rpc('admin_security_addon_configuration'),
      supabase.rpc('admin_list_security_addon_requests', { p_status: null }),
      supabase.rpc('admin_training_module_configuration'),
      supabase.rpc('admin_list_training_module_requests', { p_status: null })
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
    const { error: requestError } = await supabase.rpc('admin_update_billing_plan_link', {
      p_business_type: plan.business_type,
      p_plan_key: plan.plan_key,
      p_provider: plan.provider,
      p_checkout_url: plan.checkout_url || null,
      p_active: plan.active
    });
    setSaving('');
    if (requestError) setError(requestError.message);
    else {
      setMessage(`Le paiement ${plan.display_name} — ${plan.business_type_label} a été configuré.`);
      await load();
    }
  }

  async function saveSettings(event: FormEvent) {
    event.preventDefault();
    if (!supabase || !canManage || !configuration) return;
    setSaving('settings');
    setMessage('');
    setError('');
    const settings = configuration.settings;
    const { error: requestError } = await supabase.rpc('admin_update_billing_settings', {
      p_default_provider: settings.default_provider,
      p_default_trial_days: settings.default_trial_days,
      p_default_trial_plan: settings.default_trial_plan,
      p_terms_version: settings.terms_version,
      p_terms_text: settings.terms_text,
      p_cancellation_text: settings.cancellation_text
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
    const { error: requestError } = await supabase.rpc('admin_update_security_addon_link', {
      p_addon_key: addon.addon_key,
      p_provider: addon.provider,
      p_checkout_url: addon.checkout_url || null,
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
    const { error: requestError } = await supabase.rpc('admin_update_training_module_link', {
      p_module_key: module.module_key,
      p_provider: module.provider,
      p_checkout_url: module.checkout_url || null,
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
        <div><p className="eyebrow">ABONNEMENTS & QONTO</p><h2>Paiements par domaine métier</h2><p>Chaque domaine conserve les mêmes niveaux de formule, mais ses propres tarifs, fonctions et liens Qonto.</p></div>
        <button className="secondary-button" type="button" onClick={load}>Actualiser</button>
      </div>

      {error && <div className="error-message page-message" role="alert">{error}</div>}
      {message && <div className="success-message page-message" role="status">{message}</div>}

      <div className="billing-admin-grid">
        <article className="panel billing-requests-panel">
          <div className="panel-header"><div><p className="eyebrow">À TRAITER</p><h3>Demandes d’abonnement</h3></div><span>{openRequests.length}</span></div>
          {openRequests.length === 0 ? <div className="admin-empty-state">Aucune demande en attente.</div> : (
            <div className="billing-request-list">
              {openRequests.map((request) => (
                <article key={request.id} className="billing-request-card">
                  <div className="billing-request-top">
                    <span className="admin-company-avatar">{request.organization_name.slice(0, 1).toUpperCase()}</span>
                    <div><strong>{request.organization_name}</strong><small>{request.owner_email || 'E-mail propriétaire non disponible'}</small></div>
                    <span className={`admin-status-pill ${request.status === 'payment_pending' ? 'warning' : 'positive'}`}>{request.status === 'payment_pending' ? 'Paiement à vérifier' : 'Étude manuelle'}</span>
                  </div>
                  <div className="billing-request-route"><b>{planLabels[request.current_plan]}</b><Icon name="chevronRight" size={18} /><b>{planLabels[request.requested_plan]}</b></div>
                  <p>Référence <strong>{request.request_reference}</strong> · {request.provider === 'qonto' ? 'Qonto' : request.provider} · {dateLabel(request.created_at)}</p>
                  {request.status === 'payment_pending' && (
                    <label>Référence du paiement Qonto (facultatif)<input value={paymentReferences[request.id] ?? ''} onChange={(event) => setPaymentReferences((current) => ({ ...current, [request.id]: event.target.value }))} placeholder="Ex. identifiant visible dans Qonto" disabled={!canManage} /></label>
                  )}
                  <label>Note interne<textarea rows={2} value={reviewNotes[request.id] ?? ''} onChange={(event) => setReviewNotes((current) => ({ ...current, [request.id]: event.target.value }))} placeholder="Vérification, échange client…" disabled={!canManage} /></label>
                  {canManage && (
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

        <article className="panel billing-links-panel">
          <div className="panel-header billing-domain-header">
            <div><p className="eyebrow">LIENS DE PAIEMENT</p><h3>Formules Qonto par domaine</h3></div>
            <label>Domaine
              <select value={selectedBusinessType} onChange={(event) => setSelectedBusinessType(event.target.value)}>
                {(configuration.domains ?? []).map((domain) => <option key={domain.business_type} value={domain.business_type}>{domain.display_name}</option>)}
              </select>
            </label>
          </div>
          <p className="muted">Crée un lien récurrent propre à chaque tarif. Une formule Formation ne doit jamais utiliser le lien Qonto de la Coiffure.</p>
          <div className="billing-plan-link-list">
            {visiblePlans.map((plan) => (
              <div className="billing-plan-link-row" key={`${plan.business_type}-${plan.plan_key}`}>
                <div><strong>{plan.display_name}</strong><small>{plan.plan_key === 'metier' ? `Base contractuelle ${money(plan.monthly_price_cents)} HT / mois` : `${money(plan.monthly_price_cents)} HT / mois`} · {plan.member_limit} accès</small></div>
                <select value={plan.provider} onChange={(event) => updatePlanLocal(plan.business_type, plan.plan_key, { provider: event.target.value as BillingPlanLink['provider'] })} disabled={!canManage}>
                  <option value="qonto">Qonto</option>
                  <option value="manual">Manuel</option>
                  <option value="stripe">Stripe (plus tard)</option>
                </select>
                <input type="url" value={plan.checkout_url ?? ''} onChange={(event) => updatePlanLocal(plan.business_type, plan.plan_key, { checkout_url: event.target.value })} placeholder={plan.plan_key === 'metier' ? 'Facultatif — offre sur étude' : 'https://...'} disabled={!canManage} />
                <label className="compact-switch"><input type="checkbox" checked={plan.active} onChange={(event) => updatePlanLocal(plan.business_type, plan.plan_key, { active: event.target.checked })} disabled={!canManage} /><span>{plan.active ? 'Actif' : 'Inactif'}</span></label>
                {canManage && <button className="secondary-button compact-button" type="button" onClick={() => savePlanLink(plan)} disabled={saving === `plan-${plan.business_type}-${plan.plan_key}`}>{saving === `plan-${plan.business_type}-${plan.plan_key}` ? '…' : 'Enregistrer'}</button>}
              </div>
            ))}
          </div>
        </article>
      </div>

      <div className="billing-admin-grid security-addon-admin-grid">
        <article className="panel billing-requests-panel">
          <div className="panel-header"><div><p className="eyebrow">MODULES SÉCURITÉ</p><h3>Demandes à la carte</h3></div><span>{openSecurityAddonRequests.length}</span></div>
          {openSecurityAddonRequests.length === 0 ? <div className="admin-empty-state">Aucune demande de module en attente.</div> : (
            <div className="billing-request-list">
              {openSecurityAddonRequests.map((request) => (
                <article key={request.id} className="billing-request-card security-addon-admin-request">
                  <div className="billing-request-top">
                    <span className="admin-company-avatar"><Icon name="shield" size={19} /></span>
                    <div><strong>{request.organization_name}</strong><small>{request.owner_email || 'E-mail propriétaire non disponible'}</small></div>
                    <span className={`admin-status-pill ${request.status === 'payment_pending' ? 'warning' : 'positive'}`}>{request.status === 'payment_pending' ? 'Paiement à vérifier' : 'Validation manuelle'}</span>
                  </div>
                  <div className="billing-request-route"><b>{request.action === 'add' ? 'Ajouter' : 'Retirer'}</b><Icon name="chevronRight" size={18} /><b>{request.addon_name}</b></div>
                  <p>Référence <strong>{request.request_reference}</strong> · {request.provider === 'qonto' ? 'Qonto' : request.provider} · {dateLabel(request.created_at)}</p>
                  {request.status === 'payment_pending' && <label>Référence du paiement Qonto (facultatif)<input value={paymentReferences[request.id] ?? ''} onChange={(event) => setPaymentReferences((current) => ({ ...current, [request.id]: event.target.value }))} placeholder="Identifiant visible dans Qonto" disabled={!canManage} /></label>}
                  <label>Note interne<textarea rows={2} value={reviewNotes[request.id] ?? ''} onChange={(event) => setReviewNotes((current) => ({ ...current, [request.id]: event.target.value }))} placeholder="Contrôle ou échange avec le client…" disabled={!canManage} /></label>
                  {canManage && <div className="billing-request-buttons"><button className="primary-button" type="button" onClick={() => reviewSecurityAddonRequest(request, 'approve')} disabled={saving === `addon-request-${request.id}`}>{saving === `addon-request-${request.id}` ? 'Traitement…' : request.action === 'add' ? 'Valider et activer' : 'Valider le retrait'}</button><button className="secondary-button danger" type="button" onClick={() => reviewSecurityAddonRequest(request, 'reject')} disabled={saving === `addon-request-${request.id}`}>Refuser</button></div>}
                </article>
              ))}
            </div>
          )}
        </article>

        <article className="panel billing-links-panel">
          <div className="panel-header"><div><p className="eyebrow">PAIEMENTS MODULES</p><h3>Liens Qonto Sécurité</h3></div></div>
          <p className="muted">Chaque module peut disposer de son propre lien récurrent. Sans lien actif, la demande remonte en validation manuelle.</p>
          <div className="billing-plan-link-list">
            {securityAddonConfiguration.addons.map((addon) => (
              <div className="billing-plan-link-row" key={addon.addon_key}>
                <div><strong>{addon.display_name}</strong><small>{money(addon.monthly_price_cents)} HT / mois · {addon.available_plans.map((plan) => planLabels[plan]).join(', ')}</small></div>
                <select value={addon.provider} onChange={(event) => updateSecurityAddonLocal(addon.addon_key, { provider: event.target.value as SecurityAddonLink['provider'] })} disabled={!canManage}><option value="qonto">Qonto</option><option value="manual">Manuel</option><option value="stripe">Stripe (plus tard)</option></select>
                <input type="url" value={addon.checkout_url ?? ''} onChange={(event) => updateSecurityAddonLocal(addon.addon_key, { checkout_url: event.target.value })} placeholder="https://..." disabled={!canManage} />
                <label className="compact-switch"><input type="checkbox" checked={addon.checkout_active} onChange={(event) => updateSecurityAddonLocal(addon.addon_key, { checkout_active: event.target.checked })} disabled={!canManage} /><span>{addon.checkout_active ? 'Actif' : 'Inactif'}</span></label>
                {canManage && <button className="secondary-button compact-button" type="button" onClick={() => saveSecurityAddonLink(addon)} disabled={saving === `addon-link-${addon.addon_key}`}>{saving === `addon-link-${addon.addon_key}` ? '…' : 'Enregistrer'}</button>}
              </div>
            ))}
          </div>
        </article>
      </div>

      <div className="billing-admin-grid security-addon-admin-grid training-module-admin-grid">
        <article className="panel billing-requests-panel">
          <div className="panel-header"><div><p className="eyebrow">MODULES FORMATION</p><h3>Demandes à la carte</h3></div><span>{openTrainingModuleRequests.length}</span></div>
          {openTrainingModuleRequests.length === 0 ? <div className="admin-empty-state">Aucune demande de module Formation en attente.</div> : (
            <div className="billing-request-list">
              {openTrainingModuleRequests.map((request) => (
                <article key={request.id} className="billing-request-card security-addon-admin-request">
                  <div className="billing-request-top">
                    <span className="admin-company-avatar"><Icon name="graduation" size={19} /></span>
                    <div><strong>{request.organization_name}</strong><small>{request.owner_email || 'E-mail propriétaire non disponible'}</small></div>
                    <span className={`admin-status-pill ${request.status === 'payment_pending' ? 'warning' : 'positive'}`}>{request.status === 'payment_pending' ? 'Paiement à vérifier' : 'Validation manuelle'}</span>
                  </div>
                  <div className="billing-request-route"><b>{request.action === 'add' ? 'Ajouter' : 'Retirer'}</b><Icon name="chevronRight" size={18} /><b>{request.module_name}</b></div>
                  <p>Référence <strong>{request.request_reference}</strong> · {request.provider === 'qonto' ? 'Qonto' : request.provider} · {dateLabel(request.created_at)}</p>
                  {request.status === 'payment_pending' && <label>Référence du paiement Qonto (facultatif)<input value={paymentReferences[request.id] ?? ''} onChange={(event) => setPaymentReferences((current) => ({ ...current, [request.id]: event.target.value }))} placeholder="Identifiant visible dans Qonto" disabled={!canManage} /></label>}
                  <label>Note interne<textarea rows={2} value={reviewNotes[request.id] ?? ''} onChange={(event) => setReviewNotes((current) => ({ ...current, [request.id]: event.target.value }))} placeholder="Contrôle ou échange avec le client…" disabled={!canManage} /></label>
                  {canManage && <div className="billing-request-buttons"><button className="primary-button" type="button" onClick={() => reviewTrainingModuleRequest(request, 'approve')} disabled={saving === `training-module-request-${request.id}`}>{saving === `training-module-request-${request.id}` ? 'Traitement…' : request.action === 'add' ? 'Valider et activer' : 'Valider le retrait'}</button><button className="secondary-button danger" type="button" onClick={() => reviewTrainingModuleRequest(request, 'reject')} disabled={saving === `training-module-request-${request.id}`}>Refuser</button></div>}
                </article>
              ))}
            </div>
          )}
        </article>

        <article className="panel billing-links-panel">
          <div className="panel-header"><div><p className="eyebrow">PAIEMENTS MODULES</p><h3>Liens Qonto Formation</h3></div></div>
          <p className="muted">Chaque module peut disposer de son propre lien récurrent. Sans lien actif, la demande remonte en validation manuelle.</p>
          <div className="billing-plan-link-list">
            {trainingModuleConfiguration.modules.map((module) => (
              <div className="billing-plan-link-row" key={module.module_key}>
                <div><strong>{module.display_name}</strong><small>{money(module.monthly_price_cents)} HT / mois · {module.available_plans.map((plan) => planLabels[plan]).join(', ')}</small></div>
                <select value={module.provider} onChange={(event) => updateTrainingModuleLocal(module.module_key, { provider: event.target.value as TrainingModuleLink['provider'] })} disabled={!canManage}><option value="qonto">Qonto</option><option value="manual">Manuel</option><option value="stripe">Stripe (plus tard)</option></select>
                <input type="url" value={module.checkout_url ?? ''} onChange={(event) => updateTrainingModuleLocal(module.module_key, { checkout_url: event.target.value })} placeholder="https://..." disabled={!canManage} />
                <label className="compact-switch"><input type="checkbox" checked={module.checkout_active} onChange={(event) => updateTrainingModuleLocal(module.module_key, { checkout_active: event.target.checked })} disabled={!canManage} /><span>{module.checkout_active ? 'Actif' : 'Inactif'}</span></label>
                {canManage && <button className="secondary-button compact-button" type="button" onClick={() => saveTrainingModuleLink(module)} disabled={saving === `training-module-link-${module.module_key}`}>{saving === `training-module-link-${module.module_key}` ? '…' : 'Enregistrer'}</button>}
              </div>
            ))}
          </div>
        </article>
      </div>

      <form className="panel billing-settings-panel" onSubmit={saveSettings}>
        <div className="panel-header"><div><p className="eyebrow">RÈGLES COMMERCIALES</p><h3>Essai et conditions</h3></div></div>
        <div className="admin-form-grid">
          <label>Prestataire par défaut<select value={configuration.settings.default_provider} onChange={(event) => setConfiguration({ ...configuration, settings: { ...configuration.settings, default_provider: event.target.value as BillingSettings['default_provider'] } })} disabled={!canManage}><option value="qonto">Qonto</option><option value="manual">Manuel</option><option value="stripe">Stripe (préparé)</option></select></label>
          <label>Durée d’essai<input type="number" min={0} max={90} value={configuration.settings.default_trial_days} onChange={(event) => setConfiguration({ ...configuration, settings: { ...configuration.settings, default_trial_days: Number(event.target.value) } })} disabled={!canManage} /><small>0 désactive l’essai pour les prochaines entreprises.</small></label>
          <label>Formule pendant l’essai<select value={configuration.settings.default_trial_plan} onChange={(event) => setConfiguration({ ...configuration, settings: { ...configuration.settings, default_trial_plan: event.target.value as Plan } })} disabled={!canManage}>{(Object.entries(planLabels) as Array<[Plan, string]>).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></label>
          <label>Version des conditions<input value={configuration.settings.terms_version} onChange={(event) => setConfiguration({ ...configuration, settings: { ...configuration.settings, terms_version: event.target.value } })} disabled={!canManage} /></label>
          <label className="full-field">Conditions d’abonnement<textarea rows={4} maxLength={5000} value={configuration.settings.terms_text} onChange={(event) => setConfiguration({ ...configuration, settings: { ...configuration.settings, terms_text: event.target.value } })} disabled={!canManage} /></label>
          <label className="full-field">Conditions de résiliation<textarea rows={4} maxLength={5000} value={configuration.settings.cancellation_text} onChange={(event) => setConfiguration({ ...configuration, settings: { ...configuration.settings, cancellation_text: event.target.value } })} disabled={!canManage} /></label>
        </div>
        {canManage && <button className="primary-button" type="submit" disabled={saving === 'settings'}>{saving === 'settings' ? 'Enregistrement…' : 'Enregistrer les règles'}</button>}
      </form>
    </section>
  );
}
