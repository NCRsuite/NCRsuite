import { FormEvent, useEffect, useMemo, useState } from 'react';
import { supabase } from '../lib/supabase';
import { Icon } from './Icon';

interface MetierAdminOrganization {
  id: string;
  name: string;
  business_type: string;
  owner_email: string | null;
  monthly_price_cents: number;
  setup_fee_cents: number;
  member_limit: number;
  site_limit: number;
  active_sites: number;
  enabled_modules: number;
  white_label_enabled: boolean;
  custom_domain: string | null;
  custom_domain_status: string;
  contract_reference: string | null;
  organization_status: string;
  created_at: string;
}

interface MetierAdminModule {
  module_key: string;
  display_name: string;
  description: string;
  category: string;
  core_module: boolean;
  enabled: boolean;
}

interface MetierAdminConfiguration {
  organization: {
    id: string;
    name: string;
    business_type: string;
    business_type_label: string;
    business_type_locked: boolean;
    minimum_monthly_price_cents: number | null;
    monthly_price_cents: number;
    member_limit: number;
    site_limit: number;
    storage_limit_mb: number;
    setup_fee_cents: number;
    contract_reference: string | null;
    white_label_enabled: boolean;
    custom_domain: string | null;
    custom_domain_status: 'not_configured' | 'pending' | 'verified' | 'active' | 'error';
    custom_domain_verified_at: string | null;
    modules_configured: boolean;
  };
  modules: MetierAdminModule[];
}

const statusLabels: Record<string, string> = {
  not_configured: 'Non configuré',
  pending: 'DNS en attente',
  verified: 'Vérifié',
  active: 'Actif',
  error: 'Erreur DNS'
};

function money(cents: number) {
  return new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR' }).format((cents || 0) / 100);
}

export function MetierAdminPanel({ canManage }: { canManage: boolean }) {
  const [organizations, setOrganizations] = useState<MetierAdminOrganization[]>([]);
  const [selectedId, setSelectedId] = useState('');
  const [configuration, setConfiguration] = useState<MetierAdminConfiguration | null>(null);
  const [monthlyPrice, setMonthlyPrice] = useState('69.90');
  const [memberLimit, setMemberLimit] = useState(10);
  const [siteLimit, setSiteLimit] = useState(5);
  const [storageLimitMb, setStorageLimitMb] = useState(5000);
  const [setupFee, setSetupFee] = useState('290.00');
  const [contractReference, setContractReference] = useState('');
  const [whiteLabel, setWhiteLabel] = useState(false);
  const [customDomain, setCustomDomain] = useState('');
  const [domainStatus, setDomainStatus] = useState<MetierAdminConfiguration['organization']['custom_domain_status']>('not_configured');
  const [enabledModules, setEnabledModules] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');

  async function loadOrganizations(preferredId?: string) {
    if (!supabase) return;
    const { data, error: requestError } = await supabase.rpc('admin_list_metier_organizations');
    if (requestError) throw requestError;
    const rows = (Array.isArray(data) ? data : []) as MetierAdminOrganization[];
    setOrganizations(rows);
    const nextId = preferredId && rows.some((row) => row.id === preferredId)
      ? preferredId
      : selectedId && rows.some((row) => row.id === selectedId)
        ? selectedId
        : rows[0]?.id ?? '';
    setSelectedId(nextId);
    return nextId;
  }

  async function loadConfiguration(id: string) {
    if (!supabase || !id) {
      setConfiguration(null);
      return;
    }
    const { data, error: requestError } = await supabase.rpc('admin_metier_configuration', { p_organization_id: id });
    if (requestError) throw requestError;
    const next = data as MetierAdminConfiguration;
    setConfiguration(next);
    setMonthlyPrice((next.organization.monthly_price_cents / 100).toFixed(2));
    setMemberLimit(next.organization.member_limit);
    setSiteLimit(next.organization.site_limit);
    setStorageLimitMb(next.organization.storage_limit_mb);
    setSetupFee((next.organization.setup_fee_cents / 100).toFixed(2));
    setContractReference(next.organization.contract_reference ?? '');
    setWhiteLabel(next.organization.white_label_enabled);
    setCustomDomain(next.organization.custom_domain ?? '');
    setDomainStatus(next.organization.custom_domain_status ?? 'not_configured');
    setEnabledModules(next.modules.filter((module) => module.enabled).map((module) => module.module_key));
  }

  async function loadAll() {
    setLoading(true);
    setError('');
    try {
      const id = await loadOrganizations();
      if (id) await loadConfiguration(id);
      else setConfiguration(null);
    } catch (caught: any) {
      setError(caught?.message ?? 'Impossible de charger les offres Métier.');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void loadAll();
  }, []);

  async function changeOrganization(id: string) {
    setSelectedId(id);
    setLoading(true);
    setError('');
    setMessage('');
    try {
      await loadConfiguration(id);
    } catch (caught: any) {
      setError(caught?.message ?? 'Configuration indisponible.');
    } finally {
      setLoading(false);
    }
  }

  const groupedModules = useMemo(() => {
    const groups = new Map<string, MetierAdminModule[]>();
    for (const module of configuration?.modules ?? []) {
      const current = groups.get(module.category) ?? [];
      current.push(module);
      groups.set(module.category, current);
    }
    return [...groups.entries()];
  }, [configuration]);

  function toggleModule(module: MetierAdminModule) {
    if (module.core_module || !canManage) return;
    setEnabledModules((current) => current.includes(module.module_key)
      ? current.filter((key) => key !== module.module_key)
      : [...current, module.module_key]);
  }

  async function save(event: FormEvent) {
    event.preventDefault();
    if (!supabase || !selectedId || !canManage) return;
    const monthlyPriceCents = Math.round(Number(monthlyPrice.replace(',', '.')) * 100);
    const setupFeeCents = Math.round(Number(setupFee.replace(',', '.')) * 100);
    if (!Number.isFinite(monthlyPriceCents) || monthlyPriceCents < 0) {
      setError('Le tarif mensuel est invalide.');
      return;
    }
    const minimumPrice = configuration?.organization.minimum_monthly_price_cents;
    const businessLabel = configuration?.organization.business_type_label ?? 'ce domaine';
    if (minimumPrice !== null && minimumPrice !== undefined && monthlyPriceCents < minimumPrice) {
      setError(`Le tarif minimum pour ${businessLabel} est de ${money(minimumPrice)} HT/mois.`);
      return;
    }
    if (!Number.isFinite(setupFeeCents) || setupFeeCents < 0) {
      setError('Les frais de configuration sont invalides.');
      return;
    }

    setSaving(true);
    setError('');
    setMessage('');
    const { error: requestError } = await supabase.rpc('admin_update_metier_configuration_v2', {
      p_organization_id: selectedId,
      p_monthly_price_cents: monthlyPriceCents,
      p_member_limit: memberLimit,
      p_site_limit: siteLimit,
      p_storage_limit_mb: storageLimitMb,
      p_setup_fee_cents: setupFeeCents,
      p_contract_reference: contractReference.trim() || null,
      p_white_label_enabled: whiteLabel,
      p_custom_domain: customDomain.trim() || null,
      p_custom_domain_status: customDomain.trim() ? domainStatus : 'not_configured',
      p_enabled_modules: enabledModules
    });
    setSaving(false);
    if (requestError) setError(requestError.message);
    else {
      setMessage('La configuration Métier a été enregistrée.');
      await loadOrganizations(selectedId);
      await loadConfiguration(selectedId);
    }
  }

  const selected = organizations.find((row) => row.id === selectedId);

  if (loading && organizations.length === 0) return <section className="panel list-state">Chargement des offres Métier…</section>;

  return (
    <section className="metier-admin-panel">
      <div className="billing-admin-heading">
        <div><p className="eyebrow">OFFRES MÉTIER</p><h2>Contrats et environnements sur mesure</h2><p>Configure les limites, établissements, modules, marque blanche et domaine propre de chaque client Métier.</p></div>
        <button className="secondary-button" type="button" onClick={() => void loadAll()}>Actualiser</button>
      </div>

      {error && <div className="error-message page-message" role="alert">{error}</div>}
      {message && <div className="success-message page-message" role="status">{message}</div>}

      {organizations.length === 0 ? (
        <section className="panel admin-editor-empty">
          <span><Icon name="tool" size={28} /></span><h2>Aucune entreprise en offre Métier</h2><p>Passe d’abord une entreprise sur la formule Métier depuis l’onglet Entreprises. Elle apparaîtra ensuite ici.</p>
        </section>
      ) : (
        <div className="metier-admin-layout">
          <aside className="panel metier-admin-company-list">
            <div className="panel-header"><div><p className="eyebrow">CLIENTS MÉTIER</p><h3>{organizations.length} entreprise(s)</h3></div></div>
            <div className="metier-admin-company-buttons">
              {organizations.map((organization) => (
                <button type="button" key={organization.id} className={selectedId === organization.id ? 'active' : ''} onClick={() => void changeOrganization(organization.id)}>
                  <span className="admin-company-avatar">{organization.name.slice(0, 1).toUpperCase()}</span>
                  <span><strong>{organization.name}</strong><small>{organization.owner_email || organization.business_type}</small><em>{organization.active_sites}/{organization.site_limit} sites · {organization.enabled_modules} modules</em></span>
                  <Icon name="chevronRight" size={17} />
                </button>
              ))}
            </div>
          </aside>

          {configuration && selected && (
            <form className="panel metier-admin-editor" onSubmit={save}>
              <div className="admin-editor-company">
                <span className="admin-company-avatar large">{selected.name.slice(0, 1).toUpperCase()}</span>
                <div><p className="eyebrow">CONFIGURATION CONTRACTUELLE</p><h2>{selected.name}</h2><small>{selected.owner_email || 'Propriétaire non identifié'} · {money(selected.monthly_price_cents)} HT/mois</small></div>
              </div>

              {!canManage && <div className="info-message">Le rôle Support permet la consultation, mais pas la modification.</div>}

              <section className="metier-admin-domain-lock">
                <div className="metier-admin-domain-lock-icon"><Icon name={selected.business_type === 'securite' ? 'shield' : selected.business_type === 'formation' ? 'graduation' : selected.business_type === 'restauration' ? 'utensils' : selected.business_type === 'nettoyage' ? 'sparkles' : 'scissors'} size={24} /></div>
                <div>
                  <p className="eyebrow">DOMAINE MÉTIER UNIQUE</p>
                  <h3>{configuration.organization.business_type_label}</h3>
                  <p>Cet espace et cet abonnement donnent accès uniquement aux fonctions de ce domaine. Une seconde activité nécessite un autre espace entreprise et un abonnement distinct.</p>
                </div>
                <span className="admin-status-pill positive">Domaine verrouillé</span>
              </section>

              <div className="metier-admin-form-grid">
                <label>Référence du contrat<input maxLength={120} value={contractReference} onChange={(event) => setContractReference(event.target.value)} disabled={!canManage} placeholder="Ex. NCR-MET-2026-001" /></label>
                <label>Tarif mensuel HT<div className="admin-price-input"><input inputMode="decimal" value={monthlyPrice} onChange={(event) => setMonthlyPrice(event.target.value)} disabled={!canManage} /><span>€</span></div>{configuration.organization.minimum_monthly_price_cents !== null ? <small>Minimum {money(configuration.organization.minimum_monthly_price_cents)} HT/mois pour ce domaine</small> : <small>Tarif défini selon le devis et la configuration</small>}</label>
                <label>Frais de configuration HT<div className="admin-price-input"><input inputMode="decimal" value={setupFee} onChange={(event) => setSetupFee(event.target.value)} disabled={!canManage} /><span>€</span></div></label>
                <label>Limite d’utilisateurs<input type="number" min={1} max={100} value={memberLimit} onChange={(event) => setMemberLimit(Number(event.target.value))} disabled={!canManage} /></label>
                <label>Limite d’établissements<input type="number" min={1} max={50} value={siteLimit} onChange={(event) => setSiteLimit(Number(event.target.value))} disabled={!canManage} /></label>
                <label>Stockage inclus (Mo)<input type="number" min={100} max={100000} step={100} value={storageLimitMb} onChange={(event) => setStorageLimitMb(Number(event.target.value))} disabled={!canManage} /><small>{Math.round(storageLimitMb / 100) / 10} Go</small></label>
                <label className="admin-checkbox-field"><input type="checkbox" checked={whiteLabel} onChange={(event) => setWhiteLabel(event.target.checked)} disabled={!canManage} /><span><strong>Autoriser la marque blanche</strong><small>Le client pourra masquer la signature NCR Suite.</small></span></label>
              </div>

              <section className="metier-admin-domain-section">
                <div><p className="eyebrow">DOMAINE CLIENT</p><h3>Domaine personnalisé</h3><p className="muted">Le statut doit correspondre à la configuration réellement effectuée dans Cloudflare.</p></div>
                <div className="metier-admin-domain-grid">
                  <label>Domaine<input value={customDomain} onChange={(event) => setCustomDomain(event.target.value.toLowerCase().replace(/^https?:\/\//, '').replace(/\/$/, ''))} disabled={!canManage} placeholder="rdv.entreprise.fr" /></label>
                  <label>Statut<select value={domainStatus} onChange={(event) => setDomainStatus(event.target.value as typeof domainStatus)} disabled={!canManage || !customDomain}><option value="not_configured">Non configuré</option><option value="pending">DNS en attente</option><option value="verified">Vérifié</option><option value="active">Actif</option><option value="error">Erreur DNS</option></select></label>
                </div>
                {customDomain && <div className="metier-domain-preview"><span className={`admin-status-pill ${domainStatus === 'active' ? 'positive' : domainStatus === 'error' ? 'negative' : 'warning'}`}>{statusLabels[domainStatus]}</span><code>https://{customDomain}</code></div>}
              </section>

              <section className="metier-admin-modules-section">
                <div><p className="eyebrow">MODULES CONTRACTUELS</p><h3>Fonctions de {configuration.organization.business_type_label}</h3><p className="muted">Seuls les modules compatibles avec le domaine sélectionné sont proposés. Les modules des autres métiers ne peuvent pas être ajoutés à cet espace.</p></div>
                {groupedModules.map(([category, modules]) => (
                  <div className="metier-admin-module-group" key={category}><strong>{category}</strong><div>{modules.map((module) => {
                    const checked = module.core_module || enabledModules.includes(module.module_key);
                    return <label key={module.module_key} className={checked ? 'active' : ''}><input type="checkbox" checked={checked} onChange={() => toggleModule(module)} disabled={!canManage || module.core_module} /><span><b>{module.display_name}</b><small>{module.description}</small></span>{module.core_module && <em>Socle</em>}</label>;
                  })}</div></div>
                ))}
              </section>

              <div className="info-message">Le domaine n’est pas ajouté automatiquement dans Cloudflare. Après enregistrement, configure manuellement le domaine personnalisé dans Cloudflare Pages, puis passe son statut à Actif.</div>
              {canManage && <button className="primary-button full" type="submit" disabled={saving}>{saving ? 'Enregistrement…' : 'Enregistrer la configuration Métier'}</button>}
            </form>
          )}
        </div>
      )}
    </section>
  );
}
