import { FormEvent, useEffect, useMemo, useState } from 'react';
import { Icon } from '../components/Icon';
import { useOrganization } from '../contexts/OrganizationContext';
import { supabase } from '../lib/supabase';

interface MetierOrganizationConfig {
  id: string;
  name: string;
  business_type: string;
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
  show_ncr_branding: boolean;
}

interface MetierUsage {
  active_members: number;
  active_sites: number;
  custom_roles: number;
  enabled_modules: number;
}

interface MetierSite {
  id: string;
  name: string;
  code: string | null;
  address: string | null;
  postal_code: string | null;
  city: string | null;
  phone: string | null;
  email: string | null;
  timezone: string;
  is_primary: boolean;
  status: 'active' | 'inactive' | 'archived';
  created_at: string;
}

interface MetierModule {
  module_key: string;
  display_name: string;
  description: string;
  category: string;
  icon_key: string;
  enabled: boolean;
  core_module: boolean;
}

interface MetierRole {
  id: string;
  role_key: string;
  label: string;
  base_role: 'manager' | 'employee' | 'viewer';
  module_keys: string[];
  active: boolean;
}

interface MetierMember {
  user_id: string;
  full_name: string;
  email: string;
  role: string;
  custom_role_id: string | null;
  status: string;
}

interface MetierSummary {
  organization: MetierOrganizationConfig;
  usage: MetierUsage;
  sites: MetierSite[];
  modules: MetierModule[];
  roles: MetierRole[];
  members: MetierMember[];
}

const categoryLabels: Record<string, string> = {
  socle: 'Socle NCR Suite',
  'relation-client': 'Relation client',
  equipe: 'Équipe et accès',
  identite: 'Identité',
  operations: 'Opérations',
  securite: 'Sécurité',
  documents: 'Documents',
  formation: 'Formation',
  artisan: 'Artisan'
};

const domainStatusLabels: Record<MetierOrganizationConfig['custom_domain_status'], string> = {
  not_configured: 'Non configuré',
  pending: 'DNS en attente',
  verified: 'Domaine vérifié',
  active: 'Actif',
  error: 'Configuration à corriger'
};

function money(cents: number) {
  return new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR' }).format((cents || 0) / 100);
}

function emptySite(): Omit<MetierSite, 'id' | 'status' | 'created_at'> {
  return {
    name: '',
    code: '',
    address: '',
    postal_code: '',
    city: '',
    phone: '',
    email: '',
    timezone: 'Europe/Paris',
    is_primary: false
  };
}

export function MetierWorkspacePage() {
  const { organization, refreshOrganizations } = useOrganization();
  const [summary, setSummary] = useState<MetierSummary | null>(null);
  const [activeTab, setActiveTab] = useState<'overview' | 'sites' | 'modules' | 'roles' | 'identity'>('overview');
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState('');
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');

  const [siteId, setSiteId] = useState<string | null>(null);
  const [siteForm, setSiteForm] = useState(emptySite());
  const [showSiteForm, setShowSiteForm] = useState(false);

  const [roleId, setRoleId] = useState<string | null>(null);
  const [roleLabel, setRoleLabel] = useState('');
  const [roleBase, setRoleBase] = useState<'manager' | 'employee' | 'viewer'>('employee');
  const [roleModules, setRoleModules] = useState<string[]>([]);
  const [showRoleForm, setShowRoleForm] = useState(false);

  const canManage = ['owner', 'admin'].includes(organization?.role ?? 'viewer');

  async function load() {
    if (!organization || !supabase || organization.plan !== 'metier') {
      setLoading(false);
      return;
    }
    setLoading(true);
    setError('');
    const { data, error: requestError } = await supabase.rpc('metier_workspace_summary', {
      p_organization_id: organization.id
    });
    if (requestError) setError(requestError.message);
    else setSummary(data as MetierSummary);
    setLoading(false);
  }

  useEffect(() => {
    setSummary(null);
    setActiveTab('overview');
    void load();
  }, [organization?.id, organization?.plan]);

  const moduleGroups = useMemo(() => {
    const result = new Map<string, MetierModule[]>();
    for (const module of summary?.modules ?? []) {
      const current = result.get(module.category) ?? [];
      current.push(module);
      result.set(module.category, current);
    }
    return [...result.entries()];
  }, [summary]);

  const enabledRoleModules = useMemo(
    () => (summary?.modules ?? []).filter((module) => module.enabled && !module.core_module),
    [summary]
  );

  if (!organization) return null;

  if (organization.plan !== 'metier') {
    return (
      <div className="page metier-workspace-page">
        <header className="page-header"><div><p className="eyebrow">OFFRE MÉTIER</p><h1>Configuration sur mesure</h1><p>Un environnement dédié aux structures multi-sites et aux besoins spécifiques.</p></div></header>
        <section className="panel upgrade-panel metier-upgrade-panel">
          <div className="upgrade-icon"><Icon name="tool" size={28} /></div>
          <div><p className="eyebrow">SUR ÉTUDE</p><h2>Une configuration adaptée à votre organisation</h2><p>Établissements multiples, modules à la carte, rôles personnalisés, limites contractuelles, marque blanche et domaine propre.</p></div>
          <span className="plan-lock-badge">Devis personnalisé</span>
        </section>
      </div>
    );
  }

  function editSite(site: MetierSite) {
    setSiteId(site.id);
    setSiteForm({
      name: site.name,
      code: site.code ?? '',
      address: site.address ?? '',
      postal_code: site.postal_code ?? '',
      city: site.city ?? '',
      phone: site.phone ?? '',
      email: site.email ?? '',
      timezone: site.timezone || 'Europe/Paris',
      is_primary: site.is_primary
    });
    setShowSiteForm(true);
  }

  function newSite() {
    setSiteId(null);
    setSiteForm(emptySite());
    setShowSiteForm(true);
  }

  async function saveSite(event: FormEvent) {
    event.preventDefault();
    if (!supabase || !organization || !canManage) return;
    setBusy('site');
    setError('');
    setMessage('');
    const { error: requestError } = await supabase.rpc('metier_upsert_site', {
      p_organization_id: organization.id,
      p_site_id: siteId,
      p_name: siteForm.name,
      p_code: siteForm.code || null,
      p_address: siteForm.address || null,
      p_postal_code: siteForm.postal_code || null,
      p_city: siteForm.city || null,
      p_phone: siteForm.phone || null,
      p_email: siteForm.email || null,
      p_timezone: siteForm.timezone,
      p_is_primary: siteForm.is_primary
    });
    setBusy('');
    if (requestError) setError(requestError.message);
    else {
      setMessage(siteId ? 'L’établissement a été mis à jour.' : 'L’établissement a été créé.');
      setShowSiteForm(false);
      setSiteId(null);
      setSiteForm(emptySite());
      await load();
    }
  }

  async function setSiteStatus(site: MetierSite, status: 'active' | 'inactive' | 'archived') {
    if (!supabase || !organization || !canManage) return;
    if (status === 'archived' && !window.confirm(`Archiver ${site.name} ?`)) return;
    setBusy(`site-${site.id}`);
    setError('');
    const { error: requestError } = await supabase.rpc('metier_set_site_status', {
      p_organization_id: organization.id,
      p_site_id: site.id,
      p_status: status
    });
    setBusy('');
    if (requestError) setError(requestError.message);
    else {
      setMessage(status === 'active' ? 'L’établissement est actif.' : status === 'inactive' ? 'L’établissement est désactivé.' : 'L’établissement est archivé.');
      await load();
    }
  }


  function newRole() {
    setRoleId(null);
    setRoleLabel('');
    setRoleBase('employee');
    setRoleModules(enabledRoleModules.map((module) => module.module_key));
    setShowRoleForm(true);
  }

  function editRole(role: MetierRole) {
    setRoleId(role.id);
    setRoleLabel(role.label);
    setRoleBase(role.base_role);
    setRoleModules(role.module_keys ?? []);
    setShowRoleForm(true);
  }

  function toggleRoleModule(moduleKey: string) {
    setRoleModules((current) => current.includes(moduleKey) ? current.filter((key) => key !== moduleKey) : [...current, moduleKey]);
  }

  async function saveRole(event: FormEvent) {
    event.preventDefault();
    if (!supabase || !organization || !canManage) return;
    setBusy('role');
    setError('');
    const { error: requestError } = await supabase.rpc('metier_upsert_custom_role', {
      p_organization_id: organization.id,
      p_role_id: roleId,
      p_label: roleLabel,
      p_base_role: roleBase,
      p_module_keys: roleModules
    });
    setBusy('');
    if (requestError) setError(requestError.message);
    else {
      setMessage(roleId ? 'Le rôle personnalisé a été mis à jour.' : 'Le rôle personnalisé a été créé.');
      setShowRoleForm(false);
      await load();
      refreshOrganizations();
    }
  }

  async function deleteRole(role: MetierRole) {
    if (!supabase || !organization || !canManage) return;
    if (!window.confirm(`Supprimer le rôle « ${role.label} » ? Les utilisateurs repasseront sur leur rôle système.`)) return;
    setBusy(`role-${role.id}`);
    setError('');
    const { error: requestError } = await supabase.rpc('metier_delete_custom_role', {
      p_organization_id: organization.id,
      p_role_id: role.id
    });
    setBusy('');
    if (requestError) setError(requestError.message);
    else {
      setMessage('Le rôle personnalisé a été supprimé.');
      await load();
    }
  }

  async function assignRole(member: MetierMember, customRoleId: string) {
    if (!supabase || !organization || !canManage || member.role === 'owner') return;
    setBusy(`member-${member.user_id}`);
    setError('');
    const { error: requestError } = await supabase.rpc('metier_assign_custom_role', {
      p_organization_id: organization.id,
      p_user_id: member.user_id,
      p_role_id: customRoleId || null
    });
    setBusy('');
    if (requestError) setError(requestError.message);
    else {
      setMessage('Le profil d’accès a été attribué.');
      await load();
      refreshOrganizations();
    }
  }

  const config = summary?.organization;
  const usage = summary?.usage;

  return (
    <div className="page metier-workspace-page">
      <header className="page-header metier-page-header">
        <div><p className="eyebrow">OFFRE MÉTIER</p><h1>Configuration sur mesure</h1><p>Pilotez vos établissements, modules, profils d’accès et identité en marque blanche.</p></div>
        <button className="secondary-button" type="button" onClick={() => void load()} disabled={loading}>Actualiser</button>
      </header>

      {error && <div className="error-message page-message" role="alert">{error}</div>}
      {message && <div className="success-message page-message" role="status">{message}</div>}

      {loading || !summary ? <section className="panel list-state">Chargement de la configuration Métier…</section> : (
        <>
          <section className="metier-summary-grid">
            <article className="panel"><span><Icon name="building" size={21} /></span><div><small>Établissements</small><strong>{usage?.active_sites ?? 0} / {config?.site_limit ?? 0}</strong><em>sites actifs</em></div></article>
            <article className="panel"><span><Icon name="users" size={21} /></span><div><small>Accès</small><strong>{usage?.active_members ?? 0} / {config?.member_limit ?? 0}</strong><em>utilisateurs actifs</em></div></article>
            <article className="panel"><span><Icon name="tool" size={21} /></span><div><small>Modules</small><strong>{usage?.enabled_modules ?? 0}</strong><em>activés</em></div></article>
            <article className="panel"><span><Icon name="shield" size={21} /></span><div><small>Profils sur mesure</small><strong>{usage?.custom_roles ?? 0}</strong><em>rôles actifs</em></div></article>
          </section>

          <nav className="metier-tabs" aria-label="Configuration de l’offre Métier">
            {[
              ['overview', 'Vue d’ensemble', 'activity'],
              ['sites', 'Établissements', 'building'],
              ['modules', 'Modules', 'tool'],
              ['roles', 'Rôles', 'users'],
              ['identity', 'Marque blanche', 'sparkles']
            ].map(([key, label, icon]) => (
              <button key={key} type="button" className={activeTab === key ? 'active' : ''} onClick={() => setActiveTab(key as typeof activeTab)}>
                <Icon name={icon as any} size={19} /><span>{label}</span>
              </button>
            ))}
          </nav>

          {activeTab === 'overview' && (
            <div className="metier-overview-layout">
              <section className="panel metier-contract-card">
                <div className="panel-header"><div><p className="eyebrow">CONTRAT</p><h2>Configuration attribuée par NCR</h2></div></div>
                <div className="metier-contract-grid">
                  <div><span>Référence</span><strong>{config?.contract_reference || 'Non renseignée'}</strong></div>
                  <div><span>Frais de configuration</span><strong>{money(config?.setup_fee_cents ?? 0)}</strong></div>
                  <div><span>Stockage prévu</span><strong>{Math.round((config?.storage_limit_mb ?? 0) / 100) / 10} Go</strong></div>
                  <div><span>Signature NCR</span><strong>{config?.white_label_enabled ? 'Optionnelle' : 'Conservée'}</strong></div>
                </div>
                <div className="info-message">Les limites contractuelles, le domaine et l’activation de la marque blanche sont gérés par NCR depuis l’administration centrale.</div>
              </section>
              <section className="panel metier-readiness-card">
                <div><p className="eyebrow">ÉTAT DE PRÉPARATION</p><h2>Votre environnement</h2></div>
                <ul className="metier-check-list">
                  <li className={(usage?.active_sites ?? 0) > 0 ? 'done' : ''}><Icon name={(usage?.active_sites ?? 0) > 0 ? 'check' : 'close'} size={17} /><span>Au moins un établissement configuré</span></li>
                  <li className={(usage?.enabled_modules ?? 0) > 3 ? 'done' : ''}><Icon name={(usage?.enabled_modules ?? 0) > 3 ? 'check' : 'close'} size={17} /><span>Modules métier sélectionnés</span></li>
                  <li className={config?.white_label_enabled ? 'done' : ''}><Icon name={config?.white_label_enabled ? 'check' : 'close'} size={17} /><span>Marque blanche autorisée</span></li>
                  <li className={config?.custom_domain_status === 'active' ? 'done' : ''}><Icon name={config?.custom_domain_status === 'active' ? 'check' : 'close'} size={17} /><span>Domaine personnalisé actif</span></li>
                </ul>
              </section>
            </div>
          )}

          {activeTab === 'sites' && (
            <section className="panel metier-sites-panel">
              <div className="panel-header"><div><p className="eyebrow">MULTI-ÉTABLISSEMENTS</p><h2>Sites et agences</h2><p className="muted">Créez jusqu’à {config?.site_limit} établissements selon votre contrat.</p></div>{canManage && <button className="primary-button" type="button" onClick={newSite}>Ajouter un établissement</button>}</div>
              {(summary.sites ?? []).length === 0 ? <div className="admin-empty-state">Aucun établissement configuré.</div> : (
                <div className="metier-site-list">
                  {summary.sites.map((site) => (
                    <article key={site.id} className={`metier-site-card ${site.status}`}>
                      <span className="metier-site-icon"><Icon name="building" size={22} /></span>
                      <div className="metier-site-main"><strong>{site.name}</strong><span>{[site.address, site.postal_code, site.city].filter(Boolean).join(' · ') || 'Adresse non renseignée'}</span><small>{site.code ? `Code ${site.code} · ` : ''}{site.email || site.phone || site.timezone}</small></div>
                      <div className="metier-site-badges">{site.is_primary && <span className="status-chip active">Principal</span>}<span className={`status-chip ${site.status === 'active' ? 'active' : 'inactive'}`}>{site.status === 'active' ? 'Actif' : 'Inactif'}</span></div>
                      {canManage && <div className="metier-site-actions"><button className="secondary-button compact-button" type="button" onClick={() => editSite(site)}>Modifier</button><button className="secondary-button compact-button" type="button" disabled={busy === `site-${site.id}`} onClick={() => setSiteStatus(site, site.status === 'active' ? 'inactive' : 'active')}>{site.status === 'active' ? 'Désactiver' : 'Activer'}</button><button className="danger-text-button" type="button" onClick={() => setSiteStatus(site, 'archived')}>Archiver</button></div>}
                    </article>
                  ))}
                </div>
              )}
            </section>
          )}

          {activeTab === 'modules' && (
            <section className="metier-module-sections">
              <div className="panel metier-module-intro"><div><p className="eyebrow">MODULES À LA CARTE</p><h2>Construisez votre environnement</h2><p>Les modules prévus dans votre contrat sont activés par NCR. Les rubriques non retenues disparaissent automatiquement de la navigation.</p></div></div>
              {moduleGroups.map(([category, modules]) => (
                <section className="panel metier-module-group" key={category}>
                  <div className="panel-header"><div><h3>{categoryLabels[category] || category}</h3></div></div>
                  <div className="metier-module-grid">
                    {modules.map((module) => (
                      <article key={module.module_key} className={`metier-module-card ${module.enabled ? 'enabled' : ''} ${module.core_module ? 'core' : ''}`}>
                        <span><Icon name={module.icon_key as any} size={21} /></span><div><strong>{module.display_name}</strong><small>{module.description}</small></div><em>{module.core_module ? 'Socle' : module.enabled ? 'Inclus au contrat' : 'Non inclus'}</em>
                      </article>
                    ))}
                  </div>
                </section>
              ))}
            </section>
          )}

          {activeTab === 'roles' && (
            <div className="metier-roles-layout">
              <section className="panel metier-role-list-panel">
                <div className="panel-header"><div><p className="eyebrow">PROFILS D’ACCÈS</p><h2>Rôles personnalisés</h2><p className="muted">Un rôle personnalisé limite les rubriques visibles et conserve un niveau de sécurité système.</p></div>{canManage && <button className="primary-button" type="button" onClick={newRole}>Créer un rôle</button>}</div>
                {summary.roles.length === 0 ? <div className="admin-empty-state">Aucun rôle personnalisé.</div> : <div className="metier-role-list">{summary.roles.map((role) => <article key={role.id}><div><strong>{role.label}</strong><span>Niveau système : {role.base_role}</span><small>{role.module_keys.length} module(s) visible(s)</small></div>{canManage && <div><button className="secondary-button compact-button" type="button" onClick={() => editRole(role)}>Modifier</button><button className="danger-text-button" type="button" disabled={busy === `role-${role.id}`} onClick={() => void deleteRole(role)}>Supprimer</button></div>}</article>)}</div>}
              </section>
              <section className="panel metier-member-roles-panel">
                <div className="panel-header"><div><p className="eyebrow">ATTRIBUTION</p><h2>Utilisateurs</h2></div></div>
                <div className="metier-member-role-list">
                  {summary.members.map((member) => (
                    <label key={member.user_id} className="metier-member-role-row"><span className="team-avatar">{member.full_name.slice(0, 1).toUpperCase()}</span><span><strong>{member.full_name}</strong><small>{member.email} · rôle système {member.role}</small></span>{['owner', 'admin'].includes(member.role) ? <em>{member.role === 'owner' ? 'Propriétaire' : 'Administrateur'}</em> : <select value={member.custom_role_id ?? ''} onChange={(event) => void assignRole(member, event.target.value)} disabled={!canManage || busy === `member-${member.user_id}`}><option value="">Accès collaborateur standard</option>{summary.roles.map((role) => <option key={role.id} value={role.id}>{role.label}</option>)}</select>}</label>
                  ))}
                </div>
              </section>
            </div>
          )}

          {activeTab === 'identity' && (
            <div className="metier-identity-layout">
              <section className="panel metier-white-label-card">
                <span className={`metier-identity-icon ${config?.white_label_enabled ? 'active' : ''}`}><Icon name="sparkles" size={27} /></span>
                <div><p className="eyebrow">MARQUE BLANCHE</p><h2>{config?.white_label_enabled ? 'Option activée' : 'Option non activée'}</h2><p>{config?.white_label_enabled ? 'Vous pouvez masquer la mention « Propulsé par NCR Suite » depuis la page Personnalisation.' : 'La signature NCR Suite reste visible. L’activation est réalisée par NCR après validation commerciale.'}</p></div>
              </section>
              <section className="panel metier-domain-card">
                <div className="panel-header"><div><p className="eyebrow">DOMAINE PERSONNALISÉ</p><h2>{config?.custom_domain || 'Aucun domaine configuré'}</h2></div><span className={`admin-status-pill ${config?.custom_domain_status === 'active' ? 'positive' : config?.custom_domain_status === 'error' ? 'negative' : 'warning'}`}>{domainStatusLabels[config?.custom_domain_status ?? 'not_configured']}</span></div>
                <p>Le domaine doit être déclaré dans Cloudflare et validé par NCR avant sa mise en service. Cette étape n’est jamais automatique afin d’éviter une mauvaise configuration DNS.</p>
                {config?.custom_domain && <code className="metier-domain-url">https://{config.custom_domain}</code>}
              </section>
            </div>
          )}
        </>
      )}

      {showSiteForm && (
        <div className="modal-backdrop" role="presentation" onMouseDown={() => setShowSiteForm(false)}>
          <form className="modal-card metier-site-form" onSubmit={saveSite} onMouseDown={(event) => event.stopPropagation()}>
            <div className="modal-header"><div><p className="eyebrow">ÉTABLISSEMENT</p><h2>{siteId ? 'Modifier le site' : 'Nouveau site'}</h2></div><button type="button" className="icon-button" onClick={() => setShowSiteForm(false)}><Icon name="close" size={20} /></button></div>
            <div className="form-grid">
              <label>Nom<input required minLength={2} maxLength={120} value={siteForm.name} onChange={(event) => setSiteForm({ ...siteForm, name: event.target.value })} /></label>
              <label>Code interne<input maxLength={30} value={siteForm.code ?? ''} onChange={(event) => setSiteForm({ ...siteForm, code: event.target.value })} placeholder="Ex. NICE-01" /></label>
              <label className="full-field">Adresse<input maxLength={300} value={siteForm.address ?? ''} onChange={(event) => setSiteForm({ ...siteForm, address: event.target.value })} /></label>
              <label>Code postal<input maxLength={20} value={siteForm.postal_code ?? ''} onChange={(event) => setSiteForm({ ...siteForm, postal_code: event.target.value })} /></label>
              <label>Ville<input maxLength={120} value={siteForm.city ?? ''} onChange={(event) => setSiteForm({ ...siteForm, city: event.target.value })} /></label>
              <label>Téléphone<input type="tel" value={siteForm.phone ?? ''} onChange={(event) => setSiteForm({ ...siteForm, phone: event.target.value })} /></label>
              <label>E-mail<input type="email" value={siteForm.email ?? ''} onChange={(event) => setSiteForm({ ...siteForm, email: event.target.value })} /></label>
              <label className="full-field admin-checkbox-field"><input type="checkbox" checked={siteForm.is_primary} onChange={(event) => setSiteForm({ ...siteForm, is_primary: event.target.checked })} /><span><strong>Établissement principal</strong><small>Il devient le site de référence de l’organisation.</small></span></label>
            </div>
            <div className="modal-actions"><button className="secondary-button" type="button" onClick={() => setShowSiteForm(false)}>Annuler</button><button className="primary-button" type="submit" disabled={busy === 'site'}>{busy === 'site' ? 'Enregistrement…' : 'Enregistrer'}</button></div>
          </form>
        </div>
      )}

      {showRoleForm && (
        <div className="modal-backdrop" role="presentation" onMouseDown={() => setShowRoleForm(false)}>
          <form className="modal-card metier-role-form" onSubmit={saveRole} onMouseDown={(event) => event.stopPropagation()}>
            <div className="modal-header"><div><p className="eyebrow">RÔLE PERSONNALISÉ</p><h2>{roleId ? 'Modifier le rôle' : 'Nouveau rôle'}</h2></div><button type="button" className="icon-button" onClick={() => setShowRoleForm(false)}><Icon name="close" size={20} /></button></div>
            <div className="form-grid"><label>Nom du rôle<input required minLength={2} maxLength={80} value={roleLabel} onChange={(event) => setRoleLabel(event.target.value)} placeholder="Ex. Responsable de site" /></label><label>Niveau de sécurité<select value={roleBase} onChange={(event) => setRoleBase(event.target.value as typeof roleBase)}><option value="viewer">Consultation</option><option value="employee">Collaborateur</option><option value="manager">Responsable</option></select></label></div>
            <div className="metier-role-module-picker"><strong>Rubriques visibles</strong><div>{enabledRoleModules.map((module) => <label key={module.module_key}><input type="checkbox" checked={roleModules.includes(module.module_key)} onChange={() => toggleRoleModule(module.module_key)} /><span>{module.display_name}</span></label>)}</div></div>
            <div className="info-message">Le niveau système limite les actions autorisées. Les rubriques sélectionnées ne peuvent jamais donner davantage de droits que ce niveau.</div>
            <div className="modal-actions"><button className="secondary-button" type="button" onClick={() => setShowRoleForm(false)}>Annuler</button><button className="primary-button" type="submit" disabled={busy === 'role'}>{busy === 'role' ? 'Enregistrement…' : 'Enregistrer le rôle'}</button></div>
          </form>
        </div>
      )}
    </div>
  );
}
