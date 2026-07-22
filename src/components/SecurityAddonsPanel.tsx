import { useEffect, useMemo, useState } from 'react';
import { useOrganization } from '../contexts/OrganizationContext';
import { supabase } from '../lib/supabase';
import type { IconName, Plan } from '../types';
import { Icon } from './Icon';

interface SecurityAddonCatalogItem {
  addon_key: string;
  display_name: string;
  short_description: string;
  monthly_price_cents: number;
  available_plans: Plan[];
  feature_keys: string[];
  prerequisite_addons: string[];
  member_limit_delta: number;
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

interface SecurityAddonRequest {
  id: string;
  addon_key: string;
  action: 'add' | 'remove';
  status: 'payment_pending' | 'pending_review';
  provider: 'manual' | 'qonto' | 'stripe';
  checkout_url_snapshot: string | null;
  request_reference: string;
  created_at: string;
}

interface SecurityAddonPortal {
  organization_id: string;
  plan: Plan;
  base_monthly_price_cents: number;
  base_member_limit: number;
  active_addons_monthly_price_cents: number;
  effective_member_limit: number;
  next_plan: { plan_key: Plan; display_name: string; monthly_price_cents: number } | null;
  catalog: SecurityAddonCatalogItem[];
  requests: SecurityAddonRequest[];
}

function money(cents: number) {
  return new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR' }).format((cents || 0) / 100);
}

const planLabels: Record<Plan, string> = {
  decouverte: 'Découverte',
  essentielle: 'Essentielle',
  professionnelle: 'Professionnelle',
  metier: 'Métier'
};

function requestStatusLabel(request: SecurityAddonRequest) {
  if (request.action === 'remove') return 'Retrait en attente de validation';
  return request.status === 'payment_pending' ? 'Paiement à valider' : 'Activation en attente';
}

export function SecurityAddonsPanel() {
  const { organization, refreshOrganizations } = useOrganization();
  const canManage = ['owner', 'admin'].includes(organization?.role ?? 'viewer');
  const [portal, setPortal] = useState<SecurityAddonPortal | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState('');
  const [acceptedTerms, setAcceptedTerms] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');

  async function load() {
    if (!organization || organization.business_type !== 'securite' || !supabase) return;
    setLoading(true);
    setError('');
    const { data, error: loadError } = await supabase.rpc('security_addon_portal', {
      p_organization_id: organization.id
    });
    if (loadError) setError(loadError.message);
    else setPortal(data as SecurityAddonPortal);
    setLoading(false);
  }

  useEffect(() => {
    void load();
  }, [organization?.id]);

  const requestsByAddon = useMemo(() => new Map((portal?.requests ?? []).map((request) => [request.addon_key, request])), [portal?.requests]);
  const labelsByAddon = useMemo(() => new Map((portal?.catalog ?? []).map((item) => [item.addon_key, item.display_name])), [portal?.catalog]);
  const activeDependents = useMemo(() => {
    const map = new Map<string, string[]>();
    for (const item of portal?.catalog ?? []) {
      if (!item.active) continue;
      for (const prerequisite of item.prerequisite_addons) {
        map.set(prerequisite, [...(map.get(prerequisite) ?? []), item.display_name]);
      }
    }
    return map;
  }, [portal?.catalog]);

  const totalMonthly = (portal?.base_monthly_price_cents ?? 0) + (portal?.active_addons_monthly_price_cents ?? 0);
  const shouldRecommendNextPlan = Boolean(portal?.next_plan && totalMonthly >= portal.next_plan.monthly_price_cents);

  async function requestChange(item: SecurityAddonCatalogItem, action: 'add' | 'remove') {
    if (!organization || !supabase || !canManage) return;
    if (!acceptedTerms) {
      setError('Accepte les conditions d’abonnement avant de modifier les modules.');
      return;
    }
    setBusy(item.addon_key);
    setError('');
    setMessage('');
    const { data, error: requestError } = await supabase.rpc('request_security_addon_change', {
      p_organization_id: organization.id,
      p_addon_key: item.addon_key,
      p_action: action,
      p_accept_terms: true
    });
    setBusy('');
    if (requestError) {
      setError(requestError.message);
      return;
    }
    const response = data as { status?: string; checkout_url?: string | null; reference?: string } | null;
    setMessage(action === 'add'
      ? `Demande enregistrée${response?.reference ? ` · ${response.reference}` : ''}. Le module sera activé après validation.`
      : 'La demande de retrait a été transmise à NCR Solutions.');
    await load();
    refreshOrganizations();
    if (response?.checkout_url) window.location.assign(response.checkout_url);
  }

  async function cancelRequest(request: SecurityAddonRequest) {
    if (!organization || !supabase || !canManage) return;
    setBusy(request.addon_key);
    setError('');
    const { error: cancelError } = await supabase.rpc('cancel_security_addon_request', {
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

  if (!organization || organization.business_type !== 'securite') return null;

  return (
    <section className="security-addons-section">
      <div className="security-addons-heading">
        <div>
          <p className="eyebrow">MODULES À LA CARTE</p>
          <h2>Compose ton offre Sécurité</h2>
          <p>Ajoute uniquement les outils nécessaires. NCR Suite compare automatiquement le total avec la formule supérieure.</p>
        </div>
        <div className="security-addons-total">
          <small>TOTAL ACTUEL</small>
          <strong>{loading ? '…' : money(totalMonthly)}</strong>
          <span>HT / mois</span>
        </div>
      </div>

      {error && <div className="error-message page-message" role="alert">{error}</div>}
      {message && <div className="success-message page-message" role="status">{message}</div>}

      {portal && (
        <div className="security-addons-summary">
          <span><small>Formule de base</small><strong>{planLabels[portal.plan]} · {money(portal.base_monthly_price_cents)}</strong></span>
          <span><small>Modules actifs</small><strong>{money(portal.active_addons_monthly_price_cents)}</strong></span>
          <span><small>Accès agents</small><strong>{portal.effective_member_limit || 'Aucun accès terrain'}</strong></span>
        </div>
      )}

      {shouldRecommendNextPlan && portal?.next_plan && (
        <div className="security-addons-recommendation">
          <span><Icon name="sparkles" size={22} /></span>
          <div>
            <strong>La formule {portal.next_plan.display_name} est maintenant plus avantageuse</strong>
            <p>Ton total atteint {money(totalMonthly)}. La formule {portal.next_plan.display_name} coûte {money(portal.next_plan.monthly_price_cents)} HT/mois et inclut davantage de fonctions.</p>
          </div>
          <a className="primary-button compact-button" href="#subscription-plans">Comparer les formules</a>
        </div>
      )}

      {loading ? <div className="panel subscription-loading">Chargement des modules Sécurité…</div> : (
        <div className="security-addons-grid">
          {(portal?.catalog ?? []).map((item) => {
            const request = requestsByAddon.get(item.addon_key);
            const dependencies = item.prerequisite_addons.map((key) => labelsByAddon.get(key) ?? key);
            const dependents = activeDependents.get(item.addon_key) ?? [];
            const lockedForPlan = !item.available_for_plan && !item.active && !item.included_by_plan;
            const canAdd = item.available_for_plan && item.prerequisites_met && !item.active && !request && !item.included_by_plan;
            const canRemove = item.active && !request && dependents.length === 0;
            return (
              <article key={item.addon_key} className={`security-addon-card${item.active ? ' active' : ''}${item.included_by_plan ? ' included' : ''}${lockedForPlan ? ' locked' : ''}`}>
                <div className="security-addon-card-top">
                  <span className="security-addon-icon"><Icon name={item.icon_key || 'shield'} size={22} /></span>
                  <div>
                    <strong>{item.display_name}</strong>
                    <small>{item.member_limit_delta > 0 ? `+${item.member_limit_delta} accès agents` : 'Module fonctionnel'}</small>
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
                {request ? (
                  <div className="security-addon-request">
                    <small>{requestStatusLabel(request)} · {request.request_reference}</small>
                    {request.checkout_url_snapshot && <a className="primary-button compact-button" href={request.checkout_url_snapshot}>Reprendre le paiement</a>}
                    <button type="button" className="secondary-button compact-button" onClick={() => void cancelRequest(request)} disabled={!canManage || busy === item.addon_key}>Annuler</button>
                  </div>
                ) : item.included_by_plan ? <div className="security-addon-included-note"><Icon name="check" size={15} /> Déjà compris dans la formule {planLabels[portal!.plan]}.</div>
                  : item.active ? <button type="button" className="secondary-button full danger" onClick={() => void requestChange(item, 'remove')} disabled={!canManage || !canRemove || busy === item.addon_key}>{dependents.length > 0 ? 'Désactiver les dépendances d’abord' : busy === item.addon_key ? 'Envoi…' : 'Demander le retrait'}</button>
                  : <button type="button" className="primary-button full" onClick={() => void requestChange(item, 'add')} disabled={!canManage || !canAdd || busy === item.addon_key}>{busy === item.addon_key ? 'Création…' : lockedForPlan ? 'Formule non compatible' : !item.prerequisites_met ? 'Activer le prérequis' : 'Ajouter ce module'}</button>}
              </article>
            );
          })}
        </div>
      )}

      <label className="subscription-terms-check security-addon-terms">
        <input type="checkbox" checked={acceptedTerms} onChange={(event) => setAcceptedTerms(event.target.checked)} disabled={!canManage} />
        <span><strong>J’accepte les conditions d’abonnement pour les modules à la carte</strong><small>L’activation intervient après validation du paiement ou de la demande par NCR Solutions. Les opérations sont historisées.</small></span>
      </label>
      {!canManage && <div className="info-message">Seul le propriétaire ou un administrateur peut ajouter ou retirer des modules.</div>}
    </section>
  );
}
