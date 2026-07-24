import { useEffect, useMemo, useState } from 'react';
import { useOrganization } from '../contexts/OrganizationContext';
import { supabase } from '../lib/supabase';
import type { IconName, Plan } from '../types';
import { Icon } from './Icon';

interface TrainingModuleCatalogItem {
  module_key: string;
  display_name: string;
  short_description: string;
  monthly_price_cents: number;
  available_plans: Plan[];
  feature_keys: string[];
  prerequisite_modules: string[];
  icon_key: IconName;
  sort_order: number;
  active: boolean;
  included_by_plan: boolean;
  available_for_plan: boolean;
  prerequisites_met: boolean;
  provider: 'manual' | 'qonto' | 'stripe';
  checkout_active: boolean;
  checkout_url: string | null;
}

interface TrainingModuleRequest {
  id: string;
  module_key: string;
  action: 'add' | 'remove';
  status: 'payment_pending' | 'pending_review';
  provider: 'manual' | 'qonto' | 'stripe';
  checkout_url_snapshot: string | null;
  request_reference: string;
  created_at: string;
}

interface TrainingModulePortal {
  organization_id: string;
  plan: Plan;
  base_monthly_price_cents: number;
  active_modules_monthly_price_cents: number;
  pending_modules_monthly_delta_cents: number;
  next_plan: { plan_key: Plan; display_name: string; monthly_price_cents: number } | null;
  catalog: TrainingModuleCatalogItem[];
  requests: TrainingModuleRequest[];
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

function requestStatusLabel(request: TrainingModuleRequest) {
  if (request.action === 'remove') return 'Retrait en attente de validation';
  return request.status === 'payment_pending' ? 'Paiement à valider' : 'Activation en attente';
}

export function TrainingModulesPanel() {
  const { organization, refreshOrganizations } = useOrganization();
  const canManage = ['owner', 'admin'].includes(organization?.role ?? 'viewer');
  const [portal, setPortal] = useState<TrainingModulePortal | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState('');
  const [acceptedTerms, setAcceptedTerms] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');

  async function load() {
    if (!organization || organization.business_type !== 'formation' || !supabase) return;
    setLoading(true);
    setError('');
    const { data, error: loadError } = await supabase.rpc('training_module_portal', {
      p_organization_id: organization.id
    });
    if (loadError) setError(loadError.message);
    else setPortal(data as TrainingModulePortal);
    setLoading(false);
  }

  useEffect(() => {
    void load();
  }, [organization?.id]);

  const requestsByModule = useMemo(
    () => new Map((portal?.requests ?? []).map((request) => [request.module_key, request])),
    [portal?.requests]
  );
  const labelsByModule = useMemo(
    () => new Map((portal?.catalog ?? []).map((item) => [item.module_key, item.display_name])),
    [portal?.catalog]
  );
  const activeDependents = useMemo(() => {
    const map = new Map<string, string[]>();
    for (const item of portal?.catalog ?? []) {
      if (!item.active) continue;
      for (const prerequisite of item.prerequisite_modules) {
        map.set(prerequisite, [...(map.get(prerequisite) ?? []), item.display_name]);
      }
    }
    return map;
  }, [portal?.catalog]);

  const activeTotal = (portal?.base_monthly_price_cents ?? 0) + (portal?.active_modules_monthly_price_cents ?? 0);
  const projectedTotal = Math.max(0, activeTotal + (portal?.pending_modules_monthly_delta_cents ?? 0));
  const shouldRecommendNextPlan = Boolean(portal?.next_plan && projectedTotal >= portal.next_plan.monthly_price_cents);

  async function requestChange(item: TrainingModuleCatalogItem, action: 'add' | 'remove') {
    if (!organization || !supabase || !canManage) return;
    if (!acceptedTerms) {
      setError('Accepte les conditions d’abonnement avant de modifier les modules.');
      return;
    }
    setBusy(item.module_key);
    setError('');
    setMessage('');
    const { data, error: requestError } = await supabase.rpc('request_training_module_change', {
      p_organization_id: organization.id,
      p_module_key: item.module_key,
      p_action: action,
      p_accept_terms: true
    });
    setBusy('');
    if (requestError) {
      setError(requestError.message);
      return;
    }
    const response = data as {
      checkout_url?: string | null;
      reference?: string;
      upgrade_recommended?: boolean;
      next_plan_name?: string | null;
    } | null;
    if (action === 'add' && response?.upgrade_recommended && response.next_plan_name) {
      setMessage(`Demande ${response.reference ?? ''} enregistrée. La formule ${response.next_plan_name} est désormais plus avantageuse que ce total de modules.`);
    } else {
      setMessage(action === 'add'
        ? `Demande enregistrée${response?.reference ? ` · ${response.reference}` : ''}. Le module sera activé après validation.`
        : 'La demande de retrait a été transmise à NCR Solutions.');
    }
    await load();
    refreshOrganizations();
    if (response?.checkout_url) window.location.assign(response.checkout_url);
  }

  async function cancelRequest(request: TrainingModuleRequest) {
    if (!organization || !supabase || !canManage) return;
    setBusy(request.module_key);
    setError('');
    const { error: cancelError } = await supabase.rpc('cancel_training_module_request', {
      p_organization_id: organization.id,
      p_request_id: request.id
    });
    setBusy('');
    if (cancelError) setError(cancelError.message);
    else {
      setMessage('La demande a été annulée.');
      await load();
    }
  }

  if (!organization || organization.business_type !== 'formation') return null;

  return (
    <section className="security-addons-section training-modules-section">
      <div className="security-addons-heading training-modules-heading">
        <div>
          <p className="eyebrow">MODULES FORMATION À LA CARTE</p>
          <h2>Fais évoluer ta formule selon tes besoins</h2>
          <p>Le total est comparé en permanence avec l’offre supérieure afin de toujours afficher l’option la plus avantageuse.</p>
        </div>
        <div className="security-addons-total">
          <small>{portal?.pending_modules_monthly_delta_cents ? 'TOTAL APRÈS VALIDATION' : 'TOTAL ACTUEL'}</small>
          <strong>{loading ? '…' : money(projectedTotal)}</strong>
          <span>HT / mois</span>
        </div>
      </div>

      {error && <div className="error-message page-message" role="alert">{error}</div>}
      {message && <div className="success-message page-message" role="status">{message}</div>}

      {portal && (
        <div className="security-addons-summary">
          <span><small>Formule de base</small><strong>{planLabels[portal.plan]} · {money(portal.base_monthly_price_cents)}</strong></span>
          <span><small>Modules actifs</small><strong>{money(portal.active_modules_monthly_price_cents)}</strong></span>
          <span><small>Demandes en cours</small><strong>{portal.requests.length || 'Aucune'}</strong></span>
        </div>
      )}

      {shouldRecommendNextPlan && portal?.next_plan && (
        <div className="security-addons-recommendation">
          <span><Icon name="sparkles" size={22} /></span>
          <div>
            <strong>La formule {portal.next_plan.display_name} est plus avantageuse</strong>
            <p>Le total projeté atteint {money(projectedTotal)}. La formule {portal.next_plan.display_name} coûte {money(portal.next_plan.monthly_price_cents)} HT/mois et inclut davantage de fonctions.</p>
          </div>
          <a className="primary-button compact-button" href="#subscription-plans">Comparer les formules</a>
        </div>
      )}

      {loading ? <div className="panel subscription-loading">Chargement des modules Formation…</div> : (
        <div className="security-addons-grid">
          {(portal?.catalog ?? []).map((item) => {
            const request = requestsByModule.get(item.module_key);
            const dependencies = item.prerequisite_modules.map((key) => labelsByModule.get(key) ?? key);
            const dependents = activeDependents.get(item.module_key) ?? [];
            const lockedForPlan = !item.available_for_plan && !item.active && !item.included_by_plan;
            const canAdd = item.available_for_plan && item.prerequisites_met && !item.active && !request && !item.included_by_plan;
            const canRemove = item.active && !request && dependents.length === 0;
            const totalAfterActivation = projectedTotal + item.monthly_price_cents;
            const upgradeWouldBeCheaper = Boolean(
              portal?.next_plan
              && canAdd
              && totalAfterActivation >= portal.next_plan.monthly_price_cents
            );

            return (
              <article key={item.module_key} className={`security-addon-card${item.active ? ' active' : ''}${item.included_by_plan ? ' included' : ''}${lockedForPlan ? ' locked' : ''}`}>
                <div className="security-addon-card-top">
                  <span className="security-addon-icon"><Icon name={item.icon_key || 'graduation'} size={22} /></span>
                  <div>
                    <strong>{item.display_name}</strong>
                    <small>Module fonctionnel</small>
                  </div>
                  {item.included_by_plan ? <span className="security-addon-state included">Inclus</span>
                    : item.active ? <span className="security-addon-state active">Actif</span>
                    : request ? <span className="security-addon-state pending">En attente</span>
                    : lockedForPlan ? <span className="security-addon-state locked"><Icon name="lock" size={13} /> {item.available_plans.map((plan) => planLabels[plan]).join(' / ')}</span>
                    : null}
                </div>
                <p>{item.short_description}</p>
                <strong className="security-addon-price">+ {money(item.monthly_price_cents)} <small>HT / mois</small></strong>
                {dependencies.length > 0 && <div className={`security-addon-dependency${item.prerequisites_met ? ' ready' : ''}`}><Icon name={item.prerequisites_met ? 'check' : 'lock'} size={14} /> Nécessite : {dependencies.join(', ')}</div>}
                {dependents.length > 0 && <div className="security-addon-dependency">Utilisé par : {dependents.join(', ')}</div>}
                {upgradeWouldBeCheaper && portal?.next_plan && (
                  <div className="training-module-upgrade-hint">
                    <Icon name="sparkles" size={15} />
                    <span>Avec ce module : {money(totalAfterActivation)}. L’offre {portal.next_plan.display_name} est à {money(portal.next_plan.monthly_price_cents)}.</span>
                  </div>
                )}
                {request ? (
                  <div className="security-addon-request">
                    <small>{requestStatusLabel(request)} · {request.request_reference}</small>
                    {request.checkout_url_snapshot && <a className="primary-button compact-button" href={request.checkout_url_snapshot}>Reprendre le paiement</a>}
                    <button type="button" className="secondary-button compact-button" onClick={() => void cancelRequest(request)} disabled={!canManage || busy === item.module_key}>Annuler</button>
                  </div>
                ) : item.included_by_plan ? <div className="security-addon-included-note"><Icon name="check" size={15} /> Déjà compris dans la formule {planLabels[portal!.plan]}.</div>
                  : item.active ? <button type="button" className="secondary-button full danger" onClick={() => void requestChange(item, 'remove')} disabled={!canManage || !canRemove || busy === item.module_key}>{dependents.length > 0 ? 'Désactiver les dépendances d’abord' : busy === item.module_key ? 'Envoi…' : 'Demander le retrait'}</button>
                  : <button type="button" className="primary-button full" onClick={() => void requestChange(item, 'add')} disabled={!canManage || !canAdd || busy === item.module_key}>{busy === item.module_key ? 'Création…' : lockedForPlan ? 'Formule non compatible' : !item.prerequisites_met ? 'Activer le prérequis' : upgradeWouldBeCheaper ? 'Ajouter ou comparer l’offre' : 'Ajouter ce module'}</button>}
              </article>
            );
          })}
        </div>
      )}

      <label className="subscription-terms-check security-addon-terms">
        <input type="checkbox" checked={acceptedTerms} onChange={(event) => setAcceptedTerms(event.target.checked)} disabled={!canManage} />
        <span><strong>J’accepte les conditions d’abonnement pour les modules à la carte</strong><small>L’activation intervient après validation du paiement ou de la demande par NCR Solutions. Une montée de formule retire automatiquement les suppléments devenus inclus.</small></span>
      </label>
      {!canManage && <div className="info-message">Seul le propriétaire ou un administrateur peut ajouter ou retirer des modules.</div>}
    </section>
  );
}
